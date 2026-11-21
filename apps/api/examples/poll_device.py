#!/usr/bin/env python3
"""Poll Mochi on a Pi; optionally call an existing controller's no-argument functions."""
import argparse
from contextlib import contextmanager
import fcntl
import importlib
import importlib.util
import json
import math
import os
from pathlib import Path
import signal
import sys
import threading
import urllib.parse
import urllib.request


def log(message):
    print(message, file=sys.stderr, flush=True)


def device_endpoint(backend):
    parsed = urllib.parse.urlsplit(backend)
    if (parsed.scheme not in ('http', 'https') or not parsed.hostname or
            parsed.username or parsed.password or parsed.query or parsed.fragment or
            parsed.path not in ('', '/')):
        raise ValueError('Use the backend origin, e.g. http://192.168.1.23:3000')
    if parsed.port is not None and not 1 <= parsed.port <= 65535:
        raise ValueError('Invalid backend port')
    return backend.rstrip('/') + '/api/device/state'


def validate_state(state):
    if not isinstance(state, dict) or set(state) != {'petId', 'mood', 'hunger', 'reactionSeq', 'reactionType'}:
        raise ValueError('Invalid device state fields')
    if state['petId'] != 'mochi-01' or state['mood'] not in ('neutral', 'happy'):
        raise ValueError('Invalid pet or mood')
    if type(state['reactionSeq']) is not int or not 0 <= state['reactionSeq'] <= 9007199254740991:
        raise ValueError('Invalid reaction sequence')
    if type(state['hunger']) is not int or not 0 <= state['hunger'] <= 100:
        raise ValueError('Invalid hunger')
    if state['reactionType'] not in (None, 'feed', 'level_up', 'greeting'):
        raise ValueError('Invalid reaction type')
    return state


def fetch_state(endpoint, timeout):
    # A LAN device should connect directly, even if HTTP_PROXY is inherited.
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    with opener.open(endpoint, timeout=timeout) as response:
        body = response.read(4097)
    if len(body) > 4096:
        raise ValueError('Oversized device response')
    return validate_state(json.loads(body))


def load_controller(name, sound=False):
    if name.endswith('.py') or '/' in name:
        path = Path(name).expanduser().resolve(strict=True)
        spec = importlib.util.spec_from_file_location('_mochi_hardware_controller', path)
        if spec is None or spec.loader is None:
            raise ValueError('Cannot load the controller file')
        sys.path.insert(0, str(path.parent))  # Permit the controller's sibling imports.
        module = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
    else:
        module = importlib.import_module(name)
    if not callable(getattr(module, 'wag_tail', None)):
        raise ValueError('Controller must expose wag_tail() with no required arguments')
    if sound and not callable(getattr(module, 'play_happy_sound', None)):
        raise ValueError('--sound requires controller.play_happy_sound()')
    return module


class ReactionConsumer:
    """Single-process, at-most-once dispatch; every boot baselines the first snapshot."""
    def __init__(self, controller=None, sound=False, report=log):
        self.sequence = None
        self.controller = controller
        self.sound = sound
        self.report = report

    def consume(self, snapshot):
        state = validate_state(snapshot)
        current = state['reactionSeq']
        if self.sequence is None or current < self.sequence:
            reason = 'Initial baseline' if self.sequence is None else 'Database sequence decreased; new baseline'
            self.sequence = current
            self.report(f'{reason}: {current}; no animation')
            return False
        if current == self.sequence:
            return False
        # Consume BEFORE invoking hardware. An actuator error must never repeat a wag.
        self.sequence = current
        if state['reactionType'] == 'feed' and self.controller is not None:
            try:
                self.controller.wag_tail()
                self.report(f'Feed {current}: wag_tail() completed')
            except Exception as error:
                self.report(f'Feed {current}: wag_tail() failed ({error}); consumed, not retried')
                return True
            if self.sound:
                try:
                    self.controller.play_happy_sound()
                except Exception as error:
                    self.report(f'Feed {current}: sound failed ({error}); wag will not be repeated')
        return True


def run_poller(endpoint, consumer, stop, interval=1, timeout=3, max_retry=8, fetch=fetch_state):
    retry = interval
    disconnected = False
    while not stop.is_set():
        try:
            state = fetch(endpoint, timeout)
            consumed = consumer.consume(state)
        except (OSError, ValueError, TypeError) as error:
            log(f'Waiting for Mochi: {error}; reconnecting in {retry:g}s')
            disconnected = True
            if stop.wait(retry):
                break
            retry = min(max_retry, retry * 2)
            continue
        if disconnected:
            log('Reconnected to Mochi; retained reaction sequence')
        disconnected = False
        retry = interval
        if consumed:
            print(json.dumps(state), flush=True)
        if stop.wait(interval):
            break


@contextmanager
def single_instance(path):
    path = Path(path).expanduser()
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            raise RuntimeError(f'Another poller holds {path}; run only one controller process') from error
        yield
        # Closing the descriptor releases the lock even after a crash. No stale PID file.


def positive_seconds(value):
    value = float(value)
    if not math.isfinite(value) or not .05 <= value <= 60:
        raise argparse.ArgumentTypeError('Use a finite duration from 0.05 to 60 seconds')
    return value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('backend', help='backend origin, e.g. http://192.168.1.23:3000')
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--controller', help='existing Python module name or .py file exposing wag_tail()')
    mode.add_argument('--dry-run', action='store_true', help='print events without GPIO (default)')
    parser.add_argument('--sound', action='store_true', help='also call play_happy_sound() after a successful wag')
    parser.add_argument('--interval', type=positive_seconds, default=1)
    parser.add_argument('--timeout', type=positive_seconds, default=3)
    parser.add_argument('--max-retry', type=positive_seconds, default=8)
    parser.add_argument('--lock-file', default=str(Path(os.environ.get('XDG_STATE_HOME', '~/.local/state')).expanduser() / 'mochi/poller.lock'))
    args = parser.parse_args()
    if args.sound and not args.controller:
        parser.error('--sound requires --controller')
    if args.max_retry < args.interval:
        parser.error('--max-retry must be at least --interval')
    try:
        endpoint = device_endpoint(args.backend)
        stop = threading.Event()
        signal.signal(signal.SIGTERM, lambda *_: stop.set())
        signal.signal(signal.SIGINT, lambda *_: stop.set())
        with single_instance(args.lock_file):
            controller = load_controller(args.controller, args.sound) if args.controller else None
            log('Controller loaded; waiting for baseline' if controller else 'DRY RUN: no hardware controller; waiting for baseline')
            consumer = ReactionConsumer(controller, args.sound)
            run_poller(endpoint, consumer, stop, args.interval, args.timeout, args.max_retry)
    except Exception as error:
        parser.exit(1, f'Mochi poller failed: {error}\n')


if __name__ == '__main__':
    main()
