#include <Wire.h>
#include "rgb_lcd.h"
#include <Servo.h>

rgb_lcd lcd;
Servo tail;

// =====================================================================
//  COMMANDS (sent by the Mochi website over USB, or typed in the
//  Serial Monitor at 9600 baud):
//    i = idle (pink, blinking)      p = happy (yellow, ^ ^ + tail wag)
//    w = worried (orange, shaking)  d = sad (blue, droopy + tears)
//    t = talking (idle eyes + gentle tail sway while the pet speaks)   NEW
//    z = sleep: everything OFF (screen + backlight off, tail servo released)  NEW
//  The website sends z when the pet sleeps, i when it's listening,
//  t while it talks, p/w/d for reports and cheers.
// =====================================================================

// ===== IDLE: big sparkly open eye, 3 tiles wide x 2 tall =====
byte O_TL[8] = {0b00000,0b00011,0b00111,0b01111,0b01111,0b11111,0b11111,0b11111};
byte O_TM[8] = {0b11111,0b11111,0b11111,0b00111,0b00011,0b00011,0b00111,0b11111};
byte O_TR[8] = {0b00000,0b11000,0b11100,0b11110,0b11110,0b11111,0b11111,0b11111};
byte O_BL[8] = {0b11111,0b11111,0b11111,0b01111,0b01111,0b00111,0b00011,0b00000};
byte O_BM[8] = {0b11111,0b11111,0b11111,0b11111,0b11111,0b11111,0b11111,0b11111};
byte O_BR[8] = {0b11111,0b11111,0b00111,0b00110,0b11110,0b11100,0b11000,0b00000};
byte* OPEN[6] = {O_TL, O_TM, O_TR, O_BL, O_BM, O_BR};

// closed (soft curved line)
byte BLANK[8] = {0,0,0,0,0,0,0,0};
byte C_BL[8]  = {0,0,0,0b10000,0b11000,0b01110,0b00111,0};
byte C_BM[8]  = {0,0,0,0,0,0,0b11111,0};
byte C_BR[8]  = {0,0,0,0b00001,0b00011,0b01110,0b11100,0};
byte* CLOSED[6] = {BLANK, BLANK, BLANK, C_BL, C_BM, C_BR};

// ===== HAPPY ^ ^ =====
byte P_TL[8] = {0,0,0,0b00001,0b00111,0b01100,0b11000,0b10000};
byte P_TM[8] = {0,0,0,0b11111,0b11111,0,0,0};
byte P_TR[8] = {0,0,0,0b10000,0b11100,0b00110,0b00011,0b00001};
byte* HAPPY[3] = {P_TL, P_TM, P_TR};

// ===== WORRIED: hollow ring eye with a small pupil (3x2 tiles) =====
byte W_TL[8] = {0b00000,0b00011,0b00111,0b01111,0b01110,0b11100,0b11100,0b11000};
byte W_TM[8] = {0b11111,0b11111,0b11111,0b00000,0b00000,0b00000,0b00000,0b01110};
byte W_TR[8] = {0b00000,0b11000,0b11100,0b11110,0b01110,0b00111,0b00111,0b00011};
byte W_BL[8] = {0b11000,0b11100,0b11100,0b01110,0b01111,0b00111,0b00011,0b00000};
byte W_BM[8] = {0b01110,0b01110,0b00000,0b00000,0b00000,0b11111,0b11111,0b11111};
byte W_BR[8] = {0b00011,0b00111,0b00111,0b01110,0b11110,0b11100,0b11000,0b00000};
byte* WORRIED_T[6] = {W_TL, W_TM, W_TR, W_BL, W_BM, W_BR};

// ===== SAD: droopy slanted eyes, 3x1 tiles each (left set + mirrored right set) =====
byte S_L0[8] = {0b00000,0b00000,0b00000,0b00011,0b11111,0b11111,0b01111,0b00111};
byte S_L1[8] = {0b00000,0b00000,0b00111,0b11111,0b11111,0b11111,0b11111,0b11111};
byte S_L2[8] = {0b00000,0b00000,0b11110,0b11111,0b11111,0b11111,0b11110,0b11100};
byte S_R0[8] = {0b00000,0b00000,0b01111,0b11111,0b11111,0b11111,0b01111,0b00111};
byte S_R1[8] = {0b00000,0b00000,0b11100,0b11111,0b11111,0b11111,0b11111,0b11111};
byte S_R2[8] = {0b00000,0b00000,0b00000,0b11000,0b11111,0b11111,0b11110,0b11100};
byte* SAD_T[6] = {S_L0, S_L1, S_L2, S_R0, S_R1, S_R2};
byte TEAR[5] = {0b00100,0b00100,0b01110,0b01110,0b00100};   // falls down tile 6

const int LEFT_EYE = 3, RIGHT_EYE = 10;   // starting columns

enum Mood { IDLE, HAPPY_M, WORRIED, SAD, SLEEPING, TALKING };   // SLEEPING + TALKING are new
Mood mood = IDLE;
unsigned long nextBlink = 0, nextTick = 0, nextSway = 0;
int tearFrame = -1;
bool shake = false, swayRight = false;
unsigned long moodEnd = 0;
bool tailOn = false;             // servo attached?
bool wasConnected = false;       // has the website (or Serial Monitor) been connected?

// NEW: power the eyes + tail back on (after sleeping)
void hardwareOn() {
  if (!tailOn) { tail.attach(9); tailOn = true; }   // servo signal on D9
  lcd.display();
}
// NEW: switch everything off for sleep
void hardwareOff() {
  lcd.clear();
  lcd.setRGB(0, 0, 0);           // backlight off
  lcd.noDisplay();               // screen off
  if (tailOn) {
    tail.write(90);              // park the tail in the middle
    delay(300);
    tail.detach();               // stop driving the servo: no buzzing or twitching
    tailOn = false;
  }
}
const unsigned long MOOD_MS = 5000;   // how long worried/sad last (milliseconds)

// ---------- drawing helpers ----------
// Idle stage: 0 = 100% open, 1 = 75%, 2 = 50%, 3 = 25%, 4 = closed
void showStage(int s) {
  if (s >= 4) {
    for (int t = 0; t < 6; t++) lcd.createChar(t, CLOSED[t]);
    return;
  }
  int lid = s * 4;
  byte buf[8];
  for (int t = 0; t < 6; t++) {
    int yOffset = (t < 3) ? 0 : 8;
    for (int r = 0; r < 8; r++)
      buf[r] = (yOffset + r < lid) ? 0 : OPEN[t][r];
    lcd.createChar(t, buf);
  }
}

void showHappy(bool up) {
  byte buf[8];
  for (int t = 0; t < 3; t++) {
    for (int r = 0; r < 8; r++)
      buf[r] = up ? (r < 7 ? HAPPY[t][r + 1] : 0) : HAPPY[t][r];
    lcd.createChar(t, buf);
  }
  for (int t = 3; t < 6; t++) lcd.createChar(t, BLANK);
}

// two-row eyes (idle / happy / worried): tiles 0-2 on top, 3-5 below. off = column shift
void drawEyesAt(int off) {
  for (int row = 0; row < 2; row++) {
    lcd.setCursor(0, row);
    lcd.print("                ");
    for (int i = 0; i < 3; i++) {
      lcd.setCursor(LEFT_EYE + off + i, row);  lcd.write((uint8_t)(row * 3 + i));
      lcd.setCursor(RIGHT_EYE + off + i, row); lcd.write((uint8_t)(row * 3 + i));
    }
  }
}

// single-row sad eyes: left eye = tiles 0-2, right eye = tiles 3-5, tear tile 6 below outer corners
void drawSad() {
  lcd.clear();
  for (int i = 0; i < 3; i++) {
    lcd.setCursor(LEFT_EYE + i, 0);  lcd.write((uint8_t)i);
    lcd.setCursor(RIGHT_EYE + i, 0); lcd.write((uint8_t)(3 + i));
  }
  lcd.setCursor(LEFT_EYE, 1);      lcd.write((uint8_t)6);
  lcd.setCursor(RIGHT_EYE + 2, 1); lcd.write((uint8_t)6);
}

// ---------- animations ----------
void blink() {
  for (int s = 0; s <= 4; s++) { showStage(s); delay(30); }
  delay(60);
  for (int s = 4; s >= 0; s--) { showStage(s); delay(35); }
}

void happyEyes() {
  lcd.setRGB(255, 190, 40);
  for (int s = 0; s <= 2; s++) { showStage(s); delay(40); }
  unsigned long end = millis() + 2500;
  bool up = false;
  while (millis() < end) {
    showHappy(up);
    tail.write(up ? 135 : 45);          // wag with each bounce
    up = !up;
    delay(220);
  }
  tail.write(90);
  for (int s = 2; s >= 0; s--) { showStage(s); delay(50); }
  lcd.setRGB(255, 140, 180);
}

void worriedTick() {
  if (millis() < nextTick) return;
  shake = !shake;
  drawEyesAt(shake ? 1 : -1);           // eyes tremble left/right
  tail.write(shake ? 82 : 98);          // tail shivers
  nextTick = millis() + 140;
}

void sadTick() {
  if (millis() < nextTick) return;
  tearFrame++;
  byte buf[8];
  for (int r = 0; r < 8; r++) {
    int i = r - tearFrame;
    buf[r] = (tearFrame <= 3 && i >= 0 && i < 5) ? TEAR[i] : 0;
  }
  lcd.createChar(6, buf);
  if (tearFrame > 3) { tearFrame = -1; nextTick = millis() + 900; }   // pause between tears
  else nextTick = millis() + 120;
}

// NEW: gentle tail sway while the pet is talking
void talkTick() {
  if (millis() < nextSway) return;
  swayRight = !swayRight;
  tail.write(swayRight ? 102 : 78);
  nextSway = millis() + 320;
}

// ---------- mood switching ----------
void setMood(Mood m) {
  mood = m;
  if (m == SLEEPING) { hardwareOff(); return; }   // NEW: sleep = fully off
  hardwareOn();
  lcd.begin(16, 2);                     // restart the screen on every mood: fixes a half-drawn screen after a power dip
  lcd.clear();
  switch (m) {
    case IDLE:
    case HAPPY_M:
    case TALKING:
      lcd.setRGB(255, 140, 180);
      tail.write(90);
      showStage(0);
      drawEyesAt(0);
      nextBlink = millis() + 2000;
      nextSway = millis();
      break;
    case WORRIED:
      lcd.setRGB(255, 90, 20);
      moodEnd = millis() + MOOD_MS;
      for (int t = 0; t < 6; t++) lcd.createChar(t, WORRIED_T[t]);
      tail.write(90);
      shake = false;
      drawEyesAt(0);
      nextTick = millis();
      break;
    case SAD:
      lcd.setRGB(60, 110, 255);
      moodEnd = millis() + MOOD_MS;
      for (int t = 0; t < 6; t++) lcd.createChar(t, SAD_T[t]);
      lcd.createChar(6, BLANK);
      tail.write(35);                   // tail droops
      tearFrame = -1;
      drawSad();
      nextTick = millis() + 400;
      break;
    case SLEEPING:                      // handled above by hardwareOff()
      break;
  }
}

void setup() {
  Serial.begin(9600);
  randomSeed(analogRead(A0));
  lcd.begin(16, 2);
  hardwareOn();                         // attach the tail servo (D9)
  setMood(SLEEPING);                    // start asleep (everything off) until the website wakes it
  Serial.println("READY");
}

void loop() {
  if (Serial.available()) {
    char c = Serial.read();
    if (c >= 'A' && c <= 'Z') c += 32;  // accept capitals too
    if (c == 'i') setMood(IDLE);
    else if (c == 'p') {                // happy plays once, then returns to idle
      setMood(IDLE);
      happyEyes();
      nextBlink = millis() + random(1500, 4000);
    }
    else if (c == 'w') setMood(WORRIED);
    else if (c == 'd') setMood(SAD);
    else if (c == 't') { if (mood != TALKING) setMood(TALKING); }   // NEW
    else if (c == 'z') setMood(SLEEPING);                           // NEW
    if (c != '\n' && c != '\r') { Serial.print("OK "); Serial.println(c); }
  }

  // NEW: if the website disconnects (tab closed, cable pulled on the laptop side), go to sleep
  if (Serial) wasConnected = true;
  else if (wasConnected) { wasConnected = false; if (mood != SLEEPING) setMood(SLEEPING); }

  if (mood == SLEEPING) return;         // asleep: do nothing until a command arrives

  if ((mood == WORRIED || mood == SAD) && millis() > moodEnd) setMood(IDLE);

  if ((mood == IDLE || mood == TALKING) && millis() > nextBlink) {
    blink();
    if (random(4) == 0) { delay(100); blink(); }
    nextBlink = millis() + random(2000, 6000);
  } else if (mood == WORRIED) {
    worriedTick();
  } else if (mood == SAD) {
    sadTick();
  }
  if (mood == TALKING) talkTick();
}
