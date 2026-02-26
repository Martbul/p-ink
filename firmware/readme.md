# p-ink — Firmware

> **ESP32-S3 firmware for the wall-mounted e-ink display.**

The frame is intentionally "dumb" — it does nothing except poll the server, download a pre-composed BMP image, and push it to the display. All logic (image composition, content selection, timing) lives on the backend. This keeps the firmware simple, stable, and easy to update.

---

## What it does

On every wake cycle, the firmware does exactly this:

1. Connect to WiFi (credentials stored in NVS flash)
2. `POST /api/frame/poll` with the device MAC address
3. Read the server response — image URL, image hash, poll interval, optional OTA URL
4. If the image hash has changed → stream-download the BMP → render to display
5. Sleep for `poll_interval_ms` (default 60 seconds), then repeat

Nothing else. The frame never makes decisions about what to show, when to change, or how to lay out content.

---

## Hardware

| Component | Part |
|-----------|------|
| MCU | ESP32-S3-DevKitC-1-N16R8 |
| Flash | 16 MB |
| RAM | 8 MB OPI PSRAM |
| Display | Waveshare 7.5" V2 e-Paper (800×480, black/white) |
| Power | USB-C (development) or 3.7 V LiPo + charger module (production) |

---

## Wiring

```
ESP32-S3 Pin    →    Waveshare 7.5" V2
─────────────────────────────────────
GPIO 11 (MOSI)  →    DIN
GPIO 12 (SCK)   →    CLK
GPIO 10 (CS)    →    CS
GPIO  9 (DC)    →    DC
GPIO  8 (RST)   →    RST
GPIO  7 (BUSY)  ←    BUSY
3.3 V           →    VCC
GND             →    GND
```

The display is SPI write-only — MISO is not connected.

---

## Project layout

```
firmware/
├── main.cpp               Main firmware — all logic in one file
├── platformio.ini         PlatformIO config (board, libraries, flags)
├── provision_serial.py    Push WiFi credentials via serial (Python)
└── README.md              This file
```

---

## First-time setup

### 1. Install PlatformIO

```bash
pip install platformio
# or: install the VSCode PlatformIO extension
```

### 2. Flash the firmware

```bash
cd firmware/
pio run -t upload -e p-ink_s3
```

### 3. Open the serial monitor

```bash
pio device monitor
```

You should see the MAC address printed on boot. Note it down — you'll need it to pair the frame in the web app.

### 4. Provision WiFi credentials

The frame has no display UI for entering WiFi credentials. Use one of these methods:

**Option A — Serial provisioner (recommended)**
```bash
pip install pyserial
python3 provision_serial.py \
  --port /dev/ttyUSB0 \       # or COM3 on Windows
  --ssid "YourNetwork" \
  --pass "yourpassword" \
  --api "https://api.p-ink.app"
```

**Option B — Hardcode in `main.cpp`** (for development only)
```cpp
#define DEFAULT_WIFI_SSID  "YourNetwork"
#define DEFAULT_WIFI_PASS  "yourpassword"
```
Then reflash.

### 5. Pair the frame in the web app

Go to `p-ink.app/onboarding/pair` and enter the MAC address shown in the serial monitor. The server will now recognise this device and start serving images to it.

---

## Power modes

Set `POWER_MODE` at the top of `main.cpp` before flashing:

| Mode | Value | Sleep current | Best for |
|------|-------|--------------|----------|
| Deep sleep | `0` | ~10 µA | Battery-powered builds |
| Light sleep | `1` | ~2 mA | Faster wake, WiFi kept alive |
| Active (no sleep) | `2` | ~80 mA | USB/wall-powered, debugging |

In deep-sleep mode (`0`), each wake cycle re-runs `setup()` from scratch. The last-displayed image hash is stored in `RTC_DATA_ATTR` memory, which survives deep sleep.

---

## Image format

The server must return a **24-bit Windows BMP**, exactly 800×480 pixels. The firmware:

1. Reads the BMP file header to find the pixel data offset
2. Allocates row buffers in PSRAM (8 MB available — the full 800×480×3 ≈ 1.1 MB fits easily)
3. Buffers all rows (BMP is stored bottom-up, display expects top-down)
4. Pushes rows to the e-ink display pixel by pixel
5. Applies a luminance threshold (> 128 = white, ≤ 128 = black) as a safety net — the server should pre-dither images to pure B/W before sending

---

## Change detection

The server returns an `image_hash` (SHA-256 hex) alongside every image URL. The firmware stores the last-rendered hash in `RTC_DATA_ATTR` (survives deep sleep). On each wake:

- If hash matches → skip download and render → go back to sleep immediately
- If hash differs → download, render, update stored hash

This means the e-ink display only physically refreshes when content actually changes. A full 7.5" e-ink refresh takes ~3 seconds and causes visible ghosting if done unnecessarily, so this matters.

---

## OTA updates

If the poll response includes a non-empty `ota_url`, the firmware downloads the binary and reboots into the new version automatically. To build a binary for OTA:

```bash
pio run -e p-ink_s3
# Output: .pio/build/p-ink_s3/firmware.bin
```

Host `firmware.bin` somewhere the device can reach (S3, CDN, your server) and set `ota_url` in the poll response. The device will update on its next poll cycle.

---

## API contract

The firmware makes exactly one API call per cycle:

```
POST /api/frame/poll
Headers:
  Content-Type:  application/json
  X-Device-Mac:  AA:BB:CC:DD:EE:FF
  User-Agent:    P-ink/1.0.0

Body:
{
  "mac":        "AA:BB:CC:DD:EE:FF",
  "firmware":   "1.0.0",
  "boot_count": 42
}

Response 200:
{
  "image_url":         "https://cdn.p-ink.app/frames/abc123.bmp",
  "image_hash":        "e3b0c44298fc1c149afbf4c8996fb924...",
  "poll_interval_ms":  60000,
  "ota_url":           "",
  "ota_version":       "",
  "paired":            true
}

Response 404:
  Device not registered. Show "Pair this frame at p-ink.app" on screen.
```

The firmware does not need to know anything about users, couples, prompts, or photos. That is entirely the backend's concern.

---

## Changing the display model

If you use a different e-ink panel, change these two lines in `main.cpp`:

```cpp
// Current: Waveshare 7.5" V2
using Display = GxEPD2_BW<GxEPD2_750_T7, GxEPD2_750_T7::HEIGHT>;
Display display(GxEPD2_750_T7(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY));

// Example: Waveshare 4.2"
using Display = GxEPD2_BW<GxEPD2_420, GxEPD2_420::HEIGHT>;
Display display(GxEPD2_420(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY));
```

Also update the BMP dimensions on the backend to match your panel.

---

## Libraries

| Library | Purpose |
|---------|---------|
| `ZinggJM/GxEPD2` | E-ink display driver |
| `adafruit/Adafruit GFX Library` | Status text rendering |
| `bblanchon/ArduinoJson v7` | JSON parsing |
| Built-in `HTTPClient` | HTTP requests |
| Built-in `HTTPUpdate` | OTA updates |
| Built-in `Preferences` | NVS config storage |

---

## Troubleshooting

**Display stays white / shows garbage**
→ Check SPI wiring. Verify pin numbers match your board variant. Try reducing `upload_speed` in `platformio.ini`.

**WiFi won't connect**
→ Run `pio device monitor` and check the RSSI reading. The ESP32-S3 only supports 2.4 GHz networks.

**Image hash never changes but you expect new content**
→ The backend is probably returning the same hash. Check the backend logs to confirm a new image is being generated.

**OTA update fails**
→ Confirm the `.bin` URL is publicly accessible. The firmware does not support HTTPS OTA without a custom TLS certificate — host OTA binaries over HTTP or use a CDN with a valid cert.

**"Not a BMP file" in serial log**
→ The backend is returning PNG or another format. The firmware only supports 24-bit Windows BMP.




# Simulate what the ESP32 does on every poll
curl -X POST https://your-backend.com/api/frame/poll \
  -H "Content-Type: application/json" \
  -H "X-Device-Mac: AA:BB:CC:DD:EE:FF" \
  -d '{"mac": "AA:BB:CC:DD:EE:FF", "firmware": "1.0.0", "boot_count": 1}'



# Exact usage when hardware arrives:
### 1. Flash
pio run -t upload -e p-ink_s3

### 2. In a separate terminal, provision
python provision_serial.py --list                          # find your port
python provision_serial.py --port COM4 --ssid "MyWiFi" --pass "mypassword"

### 3. To reset credentials and start over
pio run -t erase -e p-ink_s3
### then reflash