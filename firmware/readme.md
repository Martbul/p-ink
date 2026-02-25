# LoveFrame Firmware

ESP32-S3 firmware for the Waveshare 7.5" V2 e-ink display.

## Hardware

| Component | Part |
|-----------|------|
| MCU | ESP32-S3-DevKitC-1-N16R8 (16 MB flash, 8 MB OPI PSRAM) |
| Display | Waveshare 7.5" V2 e-Paper HAT (800×480, B/W) |
| Power | USB-C or 3.7V LiPo via LiPo charger module |

## Wiring (SPI)

```
ESP32-S3          Waveshare 7.5" V2
─────────         ─────────────────
GPIO 11  MOSI  →  DIN
GPIO 12  SCK   →  CLK
GPIO 10  CS    →  CS
GPIO  9  DC    →  DC
GPIO  8  RST   →  RST
GPIO  7  BUSY  ←  BUSY
3.3V           →  VCC
GND            →  GND
```

> Note: The display **does not use MISO**. SPI is write-only.

## Project Structure

```
firmware/
├── main.cpp              — Main firmware (all logic)
├── platformio.ini        — PlatformIO project config
├── provision_serial.py   — Push WiFi creds via serial (Python)
└── README.md
```

## Setup

### 1. Install PlatformIO
```bash
pip install platformio
# or install the VSCode extension
```

### 2. Flash
```bash
cd firmware/
pio run -t upload -e loveframe_s3
```

### 3. Monitor
```bash
pio device monitor
```

### 4. Provision WiFi credentials

**Option A — Serial provisioner (easiest)**
```bash
pip install pyserial
python3 provision_serial.py --port /dev/ttyUSB0 --ssid "MyWiFi" --pass "mypassword"
```

**Option B — Hardcode in main.cpp**
```cpp
#define DEFAULT_WIFI_SSID  "MyWiFi"
#define DEFAULT_WIFI_PASS  "mypassword"
```
Then reflash.

**Option C — Web setup (future)**
The device shows its MAC on screen. Visit `loveframe.app/setup` and enter the MAC to provision over BLE.

## Power Modes

Set `POWER_MODE` in `main.cpp`:

| Mode | Value | Description | Current draw (sleep) |
|------|-------|-------------|----------------------|
| Deep sleep | `0` | Best for battery | ~10 µA |
| Light sleep | `1` | Faster wake, WiFi kept | ~2 mA |
| Active | `2` | No sleep, USB/wall only | ~80 mA |

## Display Driver

If you use a different display, change this line in `main.cpp`:
```cpp
using Display = GxEPD2_BW<GxEPD2_750_T7, GxEPD2_750_T7::HEIGHT>;
Display display(GxEPD2_750_T7(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY));
```

Common alternatives from the GxEPD2 library:
- `GxEPD2_420` — 4.2" 400×300
- `GxEPD2_750` — 7.5" V1
- `GxEPD2_154_D67` — 1.54" 200×200

## API Contract

The firmware expects a single endpoint:

```
POST /api/frame/poll
Headers:
  X-Device-Mac: AA:BB:CC:DD:EE:FF
  User-Agent: LoveFrame/1.0.0
Body:
  { "mac": "AA:BB:CC:DD:EE:FF", "firmware": "1.0.0", "boot_count": 42 }

Response 200:
{
  "image_url":         "https://cdn.loveframe.app/frames/abc123.bmp",
  "image_hash":        "sha256hexstring",   // for change detection
  "poll_interval_ms":  60000,
  "ota_url":           "",                  // empty = no update
  "ota_version":       "",
  "paired":            true
}

Response 404:
  Device not registered — show pairing screen
```

The image must be a **24-bit Windows BMP**, 800×480 pixels, pre-dithered to pure black and white by the server.

## OTA Updates

Set `ota_url` in the poll response to a `.bin` file URL.
The firmware will download it and reboot automatically.

To build a `.bin` for OTA:
```bash
pio run -e loveframe_s3
# output: .pio/build/loveframe_s3/firmware.bin
```