"""Deterministic controller/cursor/retry tests; no physical GPIO needed."""
import importlib.util
import http.client
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock

spec = importlib.util.spec_from_file_location('poll_device', Path(__file__).resolve().parents[1] / 'examples/poll_device.py')
poller = importlib.util.module_from_spec(spec)
spec.loader.exec_module(poller)


def state(sequence, kind='feed'):
    return {'petId': 'mochi-01', 'mood': 'happy', 'hunger': 80,
            'reactionSeq': sequence, 'reactionType': kind}


class PollerTests(unittest.TestCase):
    def test_boot_skips_stale_feed_and_dispatches_new_sequence_once(self):
        controller = Mock()
        consumer = poller.ReactionConsumer(controller, sound=True, report=Mock())
        self.assertFalse(consumer.consume(state(7)))
        self.assertFalse(consumer.consume(state(7)))
        self.assertTrue(consumer.consume(state(8)))
        self.assertFalse(consumer.consume(state(8)))
        controller.wag_tail.assert_called_once_with()
        controller.play_happy_sound.assert_called_once_with()
        # Restart baselines an already fed state without replaying it.
        restarted = poller.ReactionConsumer(controller, sound=True, report=Mock())
        self.assertFalse(restarted.consume(state(8)))
        controller.wag_tail.assert_called_once()

    def test_other_reactions_do_not_wag_and_database_replacement_rebaselines(self):
        controller = Mock()
        consumer = poller.ReactionConsumer(controller, report=Mock())
        for sequence, kind in [(5, 'feed'), (6, 'level_up'), (7, 'greeting'), (8, None), (1, 'feed'), (1, 'feed')]:
            consumer.consume(state(sequence, kind))
        controller.wag_tail.assert_not_called()
        consumer.consume(state(2))
        controller.wag_tail.assert_called_once()
        controller.play_happy_sound.assert_not_called()

    def test_hardware_and_sound_errors_do_not_repeat_motion(self):
        for failing in ['wag_tail', 'play_happy_sound']:
            with self.subTest(failing=failing):
                controller = Mock()
                getattr(controller, failing).side_effect = RuntimeError('injected controller error')
                consumer = poller.ReactionConsumer(controller, sound=True, report=Mock())
                consumer.consume(state(0))
                consumer.consume(state(1))
                consumer.consume(state(1))
                controller.wag_tail.assert_called_once_with()

    def test_invalid_snapshots_never_advance_the_cursor(self):
        consumer = poller.ReactionConsumer(report=Mock())
        consumer.consume(state(1))
        for snapshot in [None, [], {}, {**state(2), 'reactionSeq': True},
                         {**state(2), 'reactionSeq': -1}, {**state(2), 'reactionSeq': 2.5},
                         {**state(2), 'hunger': None}, {**state(2), 'petId': 'other'},
                         {**state(2), 'reactionType': 'unknown'}, {**state(2), 'letter': 'private'}]:
            with self.assertRaises(ValueError):
                consumer.consume(snapshot)
            self.assertEqual(consumer.sequence, 1)

    def test_reconnect_keeps_cursor_and_resets_capped_backoff(self):
        controller = Mock()
        consumer = poller.ReactionConsumer(controller, report=Mock())
        snapshots = iter([state(3), OSError('offline'), http.client.IncompleteRead(b'partial'), OSError('offline'),
                          state(4), state(4), OSError('offline')])
        delays = []

        class Stop:
            def is_set(self):
                return False

            def wait(self, seconds):
                delays.append(seconds)
                return len(delays) == 7

        def fetch(*_):
            result = next(snapshots)
            if isinstance(result, Exception):
                raise result
            return result

        poller.run_poller('unused', consumer, Stop(), interval=1, max_retry=2, fetch=fetch)
        self.assertEqual(delays, [1, 1, 2, 2, 1, 1, 1])
        controller.wag_tail.assert_called_once_with()

    def test_module_adapter_and_exclusive_lock(self):
        with tempfile.TemporaryDirectory(prefix='mochi-controller-') as directory:
            module = Path(directory) / 'controller.py'
            module.write_text('def wag_tail():\n    pass\n')
            controller = poller.load_controller(str(module))
            self.assertTrue(callable(controller.wag_tail))
            with self.assertRaises(ValueError):
                poller.load_controller(str(module), sound=True)
            lock = Path(directory) / 'poller.lock'
            with poller.single_instance(lock):
                with self.assertRaises(RuntimeError):
                    with poller.single_instance(lock):
                        self.fail('Second lock should fail')
            with poller.single_instance(lock):
                pass


if __name__ == '__main__':
    unittest.main(verbosity=2)
