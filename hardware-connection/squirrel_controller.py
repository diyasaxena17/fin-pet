"""Arduino squirrel controller for apps/api/examples/poll_device.py.

The poller calls wag_tail() when the app reports a feed reaction; this sends the
squirrel its happy-dance command over USB serial. Standard library only on
Linux/macOS (Raspberry Pi); Windows needs `pip install pyserial`.

    python3 apps/api/examples/poll_device.py http://<LAPTOP_LAN_IP>:3000 \
        --controller hardware-connection/squirrel_controller.py

Serial port: MOCHI_SQUIRREL_PORT (for example /dev/ttyACM0 or COM13). If unset,
the first /dev/ttyACM* or /dev/ttyUSB* is used. The port stays open while the
poller runs, because the sketch sleeps when its USB connection closes.
"""
import glob
import os
import sys

BAUD = 9600
_port = None


def _find_port():
    name = os.environ.get('MOCHI_SQUIRREL_PORT')
    if name:
        return name
    for pattern in ('/dev/ttyACM*', '/dev/ttyUSB*', '/dev/cu.usbmodem*'):
        found = sorted(glob.glob(pattern))
        if found:
            return found[0]
    raise RuntimeError('Squirrel not found: set MOCHI_SQUIRREL_PORT (e.g. /dev/ttyACM0 or COM13)')


class _PosixPort:
    def __init__(self, name):
        import termios
        import tty
        self.fd = os.open(name, os.O_RDWR | os.O_NOCTTY)
        tty.setraw(self.fd)
        attrs = termios.tcgetattr(self.fd)
        speed = getattr(termios, 'B%d' % BAUD)
        attrs[4] = attrs[5] = speed
        termios.tcsetattr(self.fd, termios.TCSANOW, attrs)

    def write(self, data):
        os.write(self.fd, data)


class _PySerialPort:
    def __init__(self, name):
        import serial  # pyserial, only needed on Windows
        self.port = serial.Serial(name, BAUD, timeout=1)

    def write(self, data):
        self.port.write(data)


def _open():
    global _port
    if _port is None:
        name = _find_port()
        _port = _PySerialPort(name) if sys.platform.startswith('win') else _PosixPort(name)
        _port.write(b'i')  # wake up: eyes open, idle
    return _port


def send(letter):
    """Send one squirrel command: i idle, p happy, w worried, d sad, t talking, z sleep."""
    if letter not in 'ipwdtz' or len(letter) != 1:
        raise ValueError('Unknown squirrel command: %r' % letter)
    _open().write(letter.encode('ascii'))


def wag_tail():
    """Called by poll_device.py for a feed reaction: happy dance (^ ^ eyes, tail wag)."""
    send('p')


def worried():
    send('w')


def sad():
    send('d')


def sleep():
    send('z')


if __name__ == '__main__':
    # Manual test: python3 hardware-connection/squirrel_controller.py p
    send(sys.argv[1] if len(sys.argv) > 1 else 'p')
    print('Sent', sys.argv[1] if len(sys.argv) > 1 else 'p', 'to', _find_port())
