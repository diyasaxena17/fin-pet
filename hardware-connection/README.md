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

## Run it with the app (recommended)

The squirrel is run by a small background program on the laptop it's plugged into,
`windows-bridge.ps1` (Windows, nothing to install). The app has no hardware screen.

1. Plug the squirrel in by USB and close the Arduino IDE Serial Monitor (only one
   program can use the port).
2. Double-click **`start-squirrel-bridge.bat`**. It finds the Arduino by itself and
   prints what it does. Leave the window open; closing it puts the squirrel to sleep.
3. The phone's NFC automation (iPhone Shortcuts → Automation → NFC → "Get Contents of
   URL") opens the fixed tap link
   `https://ntfy.sh/mochi-tii645ranyxe/publish?message=wake`. The app and bridge use
   the same code (`VITE_MOCHI_TAP_CODE` / `MOCHI_TAP_CODE` change it), so the chip never
   needs reprogramming. The NFC chip is only for waking the squirrel.

| When | Squirrel |
| --- | --- |
| Bridge started | Asleep (`z`) |
| NFC tap | Happy dance (`p`), then today's budget from the app: worried (`w`) if up to 25% over, sad (`d`) if more |
| Daily check-in completed (while awake) | Budget mood |
| Level up, savings added, goal reached (while awake) | Happy dance |
| Spending synced from the bank goes over budget (while awake) | Worried or sad |
| Pet tab test buttons | Wake and play that mood |
| 10 quiet minutes, or closing the bridge | Asleep, screen off, servo released |

Messages travel over the same private ntfy.sh topic: the phone sends `wake`, the app
sends `mood:<letter>` (only acts while awake) or `mood!:<letter>` (wakes first).

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
