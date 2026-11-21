#!/usr/bin/env python3
"""Pi integration example; prints reactions without importing GPIO libraries."""
import argparse
import json
import time
import urllib.error
import urllib.request


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('backend', help='e.g. http://192.168.1.23:3000')
    args = parser.parse_args()
    sequence = None
    while True:
        try:
            with urllib.request.urlopen(args.backend.rstrip('/') + '/api/device/state', timeout=3) as response:
                state = json.load(response)
            current = state['reactionSeq']
            if sequence is None or current < sequence:
                sequence = current  # Baseline only on first connection/new database.
            elif current > sequence:
                sequence = current  # Consume before calling a physical driver.
                print(json.dumps(state), flush=True)
                # Hardware owner: dispatch state['reactionType'] to the tail/sound driver.
                # feed -> wag, level_up -> celebrate, greeting -> wave.
        except (OSError, ValueError, KeyError) as error:
            print(f'Waiting for Mochi: {error}', flush=True)
        time.sleep(1)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        pass
