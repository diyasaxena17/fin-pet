# Squirrel hardware (Arduino 101)

The physical Mochi: a 16x2 Grove RGB LCD shows the eyes and a servo wags the tail.
This is the hardware controller that `apps/api/HARDWARE_DEMO.md` leaves to the
hardware owner. Nothing here changes the app, API, contracts or lockfile.

## Parts and wiring

- Arduino 101 (Intel Curie) with a Grove Base Shield
- Grove LCD RGB Backlight on an **I2C** Grove port
- Tail servo signal on **D9**

## Flash the sketch

1. Arduino IDE 2 → Boards Manager → install **Intel Curie Boards**.
2. Library Manager → install **Grove - LCD RGB Backlight** (Seeed Studio).
3. Open `squirrel.ino`, select **Arduino/Genuino 101** and its port, then Upload.

## Serial commands (9600 baud, one letter)

| Letter | Squirrel |
| --- | --- |
| `i` | Idle: pink, blinking |
| `p` | Happy dance: ^ ^ eyes, tail wag (about 2.5 s), then idle |
| `w` | Worried: orange, shaking eyes (5 s) |
| `d` | Sad: blue, droopy eyes, tears (5 s) |
| `t` | Talking: idle eyes with a gentle tail sway |
| `z` | Sleep: screen and backlight off, servo released |

The sketch replies `READY` at start and `OK <letter>` per command. It starts
asleep and goes back to sleep when the USB connection closes.

## Use it from the app (recommended)

The web app drives the squirrel itself: no bridge, poller or Pi needed
(`apps/web/src/hardware/`).

1. Open the app in **Chrome or Edge on a computer** with the squirrel plugged in by USB.
   Close the Arduino IDE Serial Monitor first: only one program can use the port.
2. Click **Squirrel · Not connected** (bottom right), then **Connect squirrel (USB)**
   and pick the Arduino. Next time the app reconnects by itself.
3. Copy the **NFC tap link** into the phone's NFC automation (iPhone Shortcuts →
   Automation → NFC → "Get Contents of URL"). The link goes through ntfy.sh, so it
   works on any network. Each install gets its own private link.

What the squirrel does:

| When | Squirrel |
| --- | --- |
| Connected, before any tap | Asleep (`z`) |
| NFC tap (or **Wake up**) | Happy dance (`p`), then today's budget: worried (`w`) if up to 25% over, sad (`d`) if more |
| Daily check-in completed | Budget mood: happy if under, worried/sad if over |
| Level up, savings added, goal reached | Happy dance |
| New spending pushes today over budget | Worried or sad |
| App is speaking (voice preview) | Tail sway (`t`) |
| **Goodbye (sleep)**, Disconnect, or closing the app | Asleep, screen off, servo released |

While asleep, app events don't wake it: only the NFC tap (or **Wake up**) does.

## Use with the existing device poller

The poller (`apps/api/examples/poll_device.py`) calls `wag_tail()` for feed
reactions. Plug the Arduino into the Pi (or a Linux/macOS laptop), then:

```sh
MOCHI_SQUIRREL_PORT=/dev/ttyACM0 \
python3 apps/api/examples/poll_device.py http://<LAPTOP_LAN_IP>:3000 \
  --controller hardware-connection/squirrel_controller.py
```

Quick test without the backend: `python3 hardware-connection/squirrel_controller.py p`.
The controller uses only the Python standard library on Linux/macOS; on Windows,
`pip install pyserial` and set `MOCHI_SQUIRREL_PORT=COM13` (the poller itself
needs Linux/macOS because it uses `fcntl`).

Observed so far: sketch compiled and uploaded to the Arduino 101 on Windows
(COM13); `p` and `z` were acknowledged with `OK p` / `OK z`. The poller and
controller have not yet been run against the C++ backend on a Pi.
