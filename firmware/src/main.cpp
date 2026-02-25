// # Entry point: setup() and loop()

/**
 * LoveFrame — ESP32-S3 E-Ink Display Firmware
 * Board:   ESP32-S3-DevKitC-1-N16R8 (16 MB flash, 8 MB OPI PSRAM)
 * Display: Waveshare 7.5" V2 — 800×480, black/white
 *
 * ── Architecture: "Dumb frame, smart server" ────────────────────────────────
 *  The firmware does exactly five things:
 *    1. First boot  → WiFi provisioning via BLE (no hardcoded credentials)
 *    2. Every wake  → POST /api/frame/poll  with MAC + firmware version
 *    3. If image_url changed → stream-decode BMP into PSRAM → push to e-ink
 *    4. If ota_url present   → perform OTA update, reboot
 *    5. Sleep for poll_interval_ms (default 60 s), repeat
 *
 *  All image composition (text, photo, dithering, layout) is done server-side.
 *  The frame never touches fonts, layouts, or rendering logic.
 *
 * ── Power modes ─────────────────────────────────────────────────────────────
 *  POWER_MODE_DEEPSLEEP  — best for battery builds (~10 µA sleep)
 *  POWER_MODE_LIGHT      — light sleep, faster wake, WiFi kept alive
 *  POWER_MODE_ACTIVE     — no sleep, continuous polling (USB/wall powered)
 *
 * ── API contract ────────────────────────────────────────────────────────────
 *  POST /api/frame/poll
 *  Headers:  X-Device-Mac: AA:BB:CC:DD:EE:FF
 *  Body:     { "mac": "AA:BB:CC:DD:EE:FF", "firmware": "1.0.0" }
 *  Response: {
 *              "image_url":        "https://…/frame.bmp",   // may be ""
 *              "image_hash":       "sha256hex",              // change detection
 *              "poll_interval_ms": 60000,
 *              "ota_url":          "https://…/fw.bin",      // "" = no update
 *              "ota_version":      "1.0.1",
 *              "paired":           true
 *            }
 */

// ─── Standard / ESP-IDF ───────────────────────────────────────────────────────
#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <HTTPUpdate.h>
#include <Preferences.h>              // NVS (non-volatile storage)
#include <esp_sleep.h>
#include <esp_system.h>
#include <esp_mac.h>
#include <esp32-hal-log.h>
#include <esp_heap_caps.h>

// ─── Third-party ──────────────────────────────────────────────────────────────
#include <ArduinoJson.h>              // bblanchon/ArduinoJson ^7
#include <GxEPD2_BW.h>               // ZinggJM/GxEPD2

// ─── GFX font (used only for status screens) ──────────────────────────────────
#include <Fonts/FreeSans9pt7b.h>

// ═══════════════════════════════════════════════════════════════════════════════
//  USER CONFIGURATION  (edit these or set them via BLE provisioning)
// ═══════════════════════════════════════════════════════════════════════════════

// Fallback credentials — overridden by NVS after first BLE provision.
// Leave blank to force BLE provisioning on first boot.
#define DEFAULT_WIFI_SSID     ""
#define DEFAULT_WIFI_PASS     ""
#define DEFAULT_API_BASE_URL  "https://api.loveframe.app"

// Power mode: 0 = deep sleep, 1 = light sleep, 2 = active (no sleep)
#define POWER_MODE  0

// Default poll interval if the server doesn't specify one
#define DEFAULT_POLL_MS  60000UL

// Maximum time to wait for WiFi (ms)
#define WIFI_TIMEOUT_MS  20000UL

// Maximum image download time (ms)
#define HTTP_TIMEOUT_MS  30000UL

// How many WiFi reconnect attempts before showing error screen
#define WIFI_MAX_RETRIES  3

// ═══════════════════════════════════════════════════════════════════════════════
//  PIN DEFINITIONS — Waveshare 7.5" V2 on ESP32-S3-DevKitC-1
//  SPI is hardware SPI on ESP32-S3: SCK=12 MOSI=11 (default VSPI)
// ═══════════════════════════════════════════════════════════════════════════════
#define EPD_CS    10
#define EPD_DC     9
#define EPD_RST    8
#define EPD_BUSY   7

// Optional: onboard RGB LED (GPIO48 on DevKitC-1)
#define LED_PIN   48

// ═══════════════════════════════════════════════════════════════════════════════
//  DISPLAY SETUP
//  Change GxEPD2_750_T7 to your panel model if different.
//  Common alternatives:
//    GxEPD2_750      — older 7.5" V1
//    GxEPD2_420      — 4.2"
//    GxEPD2_154_D67  — 1.54"
// ═══════════════════════════════════════════════════════════════════════════════
using Display = GxEPD2_BW<GxEPD2_750_T7, GxEPD2_750_T7::HEIGHT>;
Display display(GxEPD2_750_T7(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY));

// ═══════════════════════════════════════════════════════════════════════════════
//  GLOBALS
// ═══════════════════════════════════════════════════════════════════════════════

// Persisted in NVS across deep-sleep wakes
RTC_DATA_ATTR char  rtc_lastImageHash[65] = {0};  // sha256 hex, 64 chars + null
RTC_DATA_ATTR uint32_t rtc_bootCount = 0;

Preferences prefs;

String g_mac;
String g_apiBase;
String g_wifiSsid;
String g_wifiPass;
uint32_t g_pollMs = DEFAULT_POLL_MS;

// ═══════════════════════════════════════════════════════════════════════════════
//  LOGGING HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
#define LF_TAG "LoveFrame"
#define LOGI(fmt, ...) log_i("[" LF_TAG "] " fmt, ##__VA_ARGS__)
#define LOGE(fmt, ...) log_e("[" LF_TAG "] " fmt, ##__VA_ARGS__)
#define LOGW(fmt, ...) log_w("[" LF_TAG "] " fmt, ##__VA_ARGS__)

// ═══════════════════════════════════════════════════════════════════════════════
//  LED STATUS (non-blocking)
// ═══════════════════════════════════════════════════════════════════════════════
enum LedState { LED_OFF, LED_WIFI, LED_FETCH, LED_DRAW, LED_ERROR, LED_OTA };

void setLed(LedState s) {
#ifdef LED_PIN
  // RGB LED on GPIO48 — simple on/off for now
  // Extend with Adafruit NeoPixel if you want colors
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, s != LED_OFF ? HIGH : LOW);
#endif
}

// ═══════════════════════════════════════════════════════════════════════════════
//  NVS CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

void loadConfig() {
  prefs.begin("loveframe", true);  // read-only
  g_wifiSsid = prefs.getString("wifi_ssid", DEFAULT_WIFI_SSID);
  g_wifiPass = prefs.getString("wifi_pass", DEFAULT_WIFI_PASS);
  g_apiBase  = prefs.getString("api_base",  DEFAULT_API_BASE_URL);
  g_pollMs   = prefs.getUInt  ("poll_ms",   DEFAULT_POLL_MS);
  prefs.end();
  LOGI("Config loaded. API: %s  Poll: %lums", g_apiBase.c_str(), (unsigned long)g_pollMs);
}

void saveConfig(const String& ssid, const String& pass, const String& api) {
  prefs.begin("loveframe", false);  // read-write
  prefs.putString("wifi_ssid", ssid);
  prefs.putString("wifi_pass", pass);
  prefs.putString("api_base",  api);
  prefs.end();
  LOGI("Config saved to NVS.");
}

void savePollInterval(uint32_t ms) {
  prefs.begin("loveframe", false);
  prefs.putUInt("poll_ms", ms);
  prefs.end();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAC ADDRESS
// ═══════════════════════════════════════════════════════════════════════════════

String getMac() {
  uint8_t mac[6];
  esp_read_mac(mac, ESP_MAC_WIFI_STA);
  char buf[18];
  snprintf(buf, sizeof(buf), "%02X:%02X:%02X:%02X:%02X:%02X",
           mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  return String(buf);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STATUS SCREEN  (text only, used before image is available)
// ═══════════════════════════════════════════════════════════════════════════════

void showStatus(const char* line1, const char* line2 = nullptr, const char* line3 = nullptr) {
  LOGI("Status screen: %s", line1);
  display.setFullWindow();
  display.firstPage();
  do {
    display.fillScreen(GxEPD_WHITE);
    display.setTextColor(GxEPD_BLACK);
    display.setFont(&FreeSans9pt7b);

    // Centre each line horizontally
    auto printCentered = [&](const char* txt, int16_t y) {
      if (!txt) return;
      int16_t x1, y1; uint16_t w, h;
      display.getTextBounds(txt, 0, y, &x1, &y1, &w, &h);
      display.setCursor((display.width() - w) / 2, y);
      display.print(txt);
    };

    int16_t cy = display.height() / 2 - 20;
    printCentered(line1, cy);
    if (line2) printCentered(line2, cy + 28);
    if (line3) printCentered(line3, cy + 56);

  } while (display.nextPage());
}

// ═══════════════════════════════════════════════════════════════════════════════
//  WIFI
// ═══════════════════════════════════════════════════════════════════════════════

bool connectWiFi() {
  if (g_wifiSsid.isEmpty()) {
    LOGE("No WiFi SSID configured.");
    return false;
  }

  setLed(LED_WIFI);
  LOGI("Connecting to WiFi: %s", g_wifiSsid.c_str());
  WiFi.mode(WIFI_STA);
  WiFi.begin(g_wifiSsid.c_str(), g_wifiPass.c_str());

  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - start > WIFI_TIMEOUT_MS) {
      LOGE("WiFi timeout.");
      WiFi.disconnect(true);
      return false;
    }
    delay(200);
  }

  LOGI("WiFi connected. IP: %s  RSSI: %d dBm",
       WiFi.localIP().toString().c_str(), WiFi.RSSI());
  return true;
}

void disconnectWiFi() {
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  POLL API
// ═══════════════════════════════════════════════════════════════════════════════

struct PollResponse {
  String imageUrl;
  String imageHash;
  String otaUrl;
  String otaVersion;
  uint32_t pollIntervalMs;
  bool paired;
  bool valid;
};

PollResponse pollServer() {
  PollResponse result = {"", "", "", "", g_pollMs, false, false};
  setLed(LED_FETCH);

  String url = g_apiBase + "/api/frame/poll";
  LOGI("POST %s", url.c_str());

  HTTPClient http;
  http.begin(url);
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.addHeader("Content-Type",  "application/json");
  http.addHeader("X-Device-Mac",  g_mac);
  http.addHeader("User-Agent",    "LoveFrame/" FIRMWARE_VERSION);

  JsonDocument body;
  body["mac"]      = g_mac;
  body["firmware"] = FIRMWARE_VERSION;
  body["boot_count"] = rtc_bootCount;

  String bodyStr;
  serializeJson(body, bodyStr);

  int code = http.POST(bodyStr);
  LOGI("HTTP %d", code);

  if (code == 200) {
    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, http.getStream());
    if (!err) {
      result.imageUrl      = doc["image_url"]       | "";
      result.imageHash     = doc["image_hash"]      | "";
      result.otaUrl        = doc["ota_url"]         | "";
      result.otaVersion    = doc["ota_version"]     | "";
      result.pollIntervalMs = doc["poll_interval_ms"] | (uint32_t)g_pollMs;
      result.paired        = doc["paired"]          | false;
      result.valid         = true;
      LOGI("Poll OK. paired=%d  hash=%s", result.paired, result.imageHash.c_str());
    } else {
      LOGE("JSON parse error: %s", err.c_str());
    }
  } else if (code == 404) {
    // Device not registered yet — show pairing screen
    result.valid = true;
    result.paired = false;
  } else {
    LOGE("Poll failed: HTTP %d", code);
  }

  http.end();
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BMP STREAM RENDERER
//  Streams a 24-bit BMP from HTTP directly to the e-ink panel.
//  Uses PSRAM for the full-frame row buffer to avoid stack overflow.
//  Never allocates the whole image at once — row by row streaming.
//
//  BMP format (Windows 24-bit):
//    Bytes 0-1:   'BM' magic
//    Bytes 10-13: pixel data offset
//    Bytes 18-21: width (int32, little-endian)
//    Bytes 22-25: height (int32, little-endian, positive = bottom-up)
//    Each row padded to 4-byte boundary
//    Pixel order: BGR (not RGB)
// ═══════════════════════════════════════════════════════════════════════════════

// Read exactly `n` bytes from stream, retrying until timeout.
static bool streamReadExact(WiFiClient* s, uint8_t* buf, size_t n, uint32_t timeoutMs = 5000) {
  size_t got = 0;
  uint32_t t0 = millis();
  while (got < n) {
    if (millis() - t0 > timeoutMs) return false;
    if (s->available()) {
      int r = s->read(buf + got, n - got);
      if (r > 0) { got += r; t0 = millis(); }
    } else {
      delay(1);
    }
  }
  return true;
}

bool renderBmpFromStream(WiFiClient* stream, int32_t contentLength) {
  setLed(LED_DRAW);
  LOGI("Rendering BMP (%d bytes)...", contentLength);

  // ── Read BMP file header (14 bytes) ─────────────────────────────────────
  uint8_t fileHeader[14];
  if (!streamReadExact(stream, fileHeader, 14)) { LOGE("Header read fail"); return false; }

  if (fileHeader[0] != 'B' || fileHeader[1] != 'M') {
    LOGE("Not a BMP file (magic: 0x%02X 0x%02X)", fileHeader[0], fileHeader[1]);
    return false;
  }

  uint32_t pixelOffset = fileHeader[10] | (fileHeader[11]<<8) | (fileHeader[12]<<16) | (fileHeader[13]<<24);

  // ── Read DIB header (at least 40 bytes — BITMAPINFOHEADER) ──────────────
  uint8_t dibHeader[40];
  if (!streamReadExact(stream, dibHeader, 40)) { LOGE("DIB header read fail"); return false; }

  int32_t bmpWidth  = (int32_t)(dibHeader[4] | (dibHeader[5]<<8) | (dibHeader[6]<<16) | (dibHeader[7]<<24));
  int32_t bmpHeight = (int32_t)(dibHeader[8] | (dibHeader[9]<<8) | (dibHeader[10]<<16) | (dibHeader[11]<<24));
  uint16_t bpp      = dibHeader[14] | (dibHeader[15]<<8);

  LOGI("BMP: %dx%d  bpp=%d  pixelOffset=%u", bmpWidth, bmpHeight, bpp, pixelOffset);

  if (bpp != 24) { LOGE("Only 24-bit BMP supported (got %d bpp)", bpp); return false; }
  if (bmpWidth <= 0 || bmpWidth > 2048 || abs(bmpHeight) > 2048) {
    LOGE("Implausible BMP dimensions"); return false;
  }

  bool bottomUp = (bmpHeight > 0);
  int32_t absHeight = abs(bmpHeight);

  // Skip any remaining header bytes before pixel data
  size_t headerBytesRead = 14 + 40;
  if (pixelOffset > headerBytesRead) {
    size_t skip = pixelOffset - headerBytesRead;
    uint8_t dump[64];
    while (skip > 0) {
      size_t chunk = min(skip, (size_t)64);
      if (!streamReadExact(stream, dump, chunk)) { LOGE("Header skip fail"); return false; }
      skip -= chunk;
    }
  }

  // ── Allocate row buffer in PSRAM ─────────────────────────────────────────
  int32_t rowSize = ((bmpWidth * 3 + 3) / 4) * 4;  // padded to 4 bytes
  uint8_t* rowBuf = (uint8_t*)heap_caps_malloc(rowSize, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
  if (!rowBuf) {
    // Fall back to regular RAM for small displays
    rowBuf = (uint8_t*)malloc(rowSize);
  }
  if (!rowBuf) { LOGE("Row buffer alloc failed (%d bytes)", rowSize); return false; }

  // ── For bottom-up BMP, we need to buffer all rows then draw in reverse.
  //    With 8MB PSRAM and 800x480x3 ≈ 1.1MB — fits easily.
  uint8_t** rows = nullptr;
  if (bottomUp) {
    rows = (uint8_t**)heap_caps_malloc(absHeight * sizeof(uint8_t*), MALLOC_CAP_SPIRAM);
    if (!rows) rows = (uint8_t**)malloc(absHeight * sizeof(uint8_t*));
    if (!rows) { free(rowBuf); LOGE("Row ptr alloc failed"); return false; }

    for (int32_t i = 0; i < absHeight; i++) {
      rows[i] = (uint8_t*)heap_caps_malloc(rowSize, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
      if (!rows[i]) rows[i] = (uint8_t*)malloc(rowSize);
      if (!rows[i]) {
        // Free what we have
        for (int32_t j = 0; j < i; j++) free(rows[j]);
        free(rows); free(rowBuf);
        LOGE("Row data alloc failed at row %d", i);
        return false;
      }
    }

    LOGI("Buffering %d rows (%d KB PSRAM)", absHeight, (absHeight * rowSize) / 1024);
    for (int32_t row = 0; row < absHeight; row++) {
      if (!streamReadExact(stream, rows[row], rowSize)) {
        LOGE("Stream read failed at row %d", row);
        for (int32_t j = 0; j < absHeight; j++) free(rows[j]);
        free(rows); free(rowBuf);
        return false;
      }
    }
  }

  LOGI("Starting e-ink refresh...");
  display.setFullWindow();
  display.firstPage();
  do {
    display.fillScreen(GxEPD_WHITE);

    for (int32_t screenY = 0; screenY < absHeight; screenY++) {
      // BMP bottom-up: row 0 in file = bottom of image = screenY (absHeight-1)
      uint8_t* src;
      if (bottomUp) {
        src = rows[absHeight - 1 - screenY];
      } else {
        if (!streamReadExact(stream, rowBuf, rowSize)) break;
        src = rowBuf;
      }

      for (int32_t x = 0; x < bmpWidth; x++) {
        uint8_t b = src[x * 3 + 0];
        uint8_t g = src[x * 3 + 1];
        uint8_t r = src[x * 3 + 2];

        // The Go backend should already dither to pure B/W.
        // This luminance threshold is just a safety net.
        uint8_t lum = (uint8_t)(0.299f * r + 0.587f * g + 0.114f * b);
        if (lum <= 128) {
          display.drawPixel(x, screenY, GxEPD_BLACK);
        }
        // White pixels are already filled by fillScreen — skip drawPixel
      }
    }
  } while (display.nextPage());

  // Cleanup
  if (bottomUp && rows) {
    for (int32_t i = 0; i < absHeight; i++) free(rows[i]);
    free(rows);
  }
  free(rowBuf);

  LOGI("Display refresh complete.");
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  IMAGE DOWNLOAD + DISPLAY
// ═══════════════════════════════════════════════════════════════════════════════

bool fetchAndDisplay(const String& imageUrl) {
  if (imageUrl.isEmpty()) return false;
  LOGI("Fetching image: %s", imageUrl.c_str());

  HTTPClient http;
  http.begin(imageUrl);
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.addHeader("User-Agent", "LoveFrame/" FIRMWARE_VERSION);

  int code = http.GET();
  if (code != 200) {
    LOGE("Image fetch failed: HTTP %d", code);
    http.end();
    return false;
  }

  int32_t contentLength = http.getSize();
  LOGI("Content-Length: %d", contentLength);

  WiFiClient* stream = http.getStreamPtr();
  bool ok = renderBmpFromStream(stream, contentLength);
  http.end();
  return ok;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  OTA UPDATE
// ═══════════════════════════════════════════════════════════════════════════════

void performOTA(const String& otaUrl, const String& otaVersion) {
  LOGI("OTA update to v%s from: %s", otaVersion.c_str(), otaUrl.c_str());
  setLed(LED_OTA);

  showStatus("Updating firmware...", ("v" + otaVersion).c_str(), "Do not power off");

  WiFiClient client;
  t_httpUpdate_return ret = httpUpdate.update(client, otaUrl);

  switch (ret) {
    case HTTP_UPDATE_FAILED:
      LOGE("OTA failed: %s", httpUpdate.getLastErrorString().c_str());
      showStatus("Update failed", httpUpdate.getLastErrorString().c_str());
      break;
    case HTTP_UPDATE_NO_UPDATES:
      LOGI("OTA: no update needed.");
      break;
    case HTTP_UPDATE_OK:
      LOGI("OTA success — rebooting.");
      // httpUpdate.update() will reboot automatically
      break;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DEEP SLEEP / LIGHT SLEEP
// ═══════════════════════════════════════════════════════════════════════════════

void enterSleep(uint32_t ms) {
  LOGI("Sleeping for %lu ms (mode %d)...", (unsigned long)ms, POWER_MODE);
  setLed(LED_OFF);

  // Power down WiFi before sleep to save energy
  disconnectWiFi();

  // Give display time to fully complete its refresh cycle
  display.powerOff();
  delay(100);

#if POWER_MODE == 0
  // Deep sleep — RAM lost, RTC vars preserved
  esp_sleep_enable_timer_wakeup((uint64_t)ms * 1000ULL);
  esp_deep_sleep_start();

#elif POWER_MODE == 1
  // Light sleep — faster wake, WiFi stack preserved
  esp_sleep_enable_timer_wakeup((uint64_t)ms * 1000ULL);
  esp_light_sleep_start();

#else
  // Active — just delay
  delay(ms);

#endif
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BLE PROVISIONING  (simplified — extend with full BLE if needed)
//  On first boot (no SSID in NVS), shows a pairing code on-screen.
//  The web app's onboarding page calls POST /api/frame/provision with:
//    { "device_mac": "AA:BB:CC:DD:EE:FF", "wifi_ssid": "…", "wifi_pass": "…" }
//  Then the frame polls a local-network provision endpoint for its creds.
//
//  For a minimal v1: hardcode credentials or use Arduino WiFiManager.
//  Full BLE provisioning can be added in v1.1.
// ═══════════════════════════════════════════════════════════════════════════════

bool tryProvision() {
  // If creds are already in NVS, skip provisioning
  if (!g_wifiSsid.isEmpty()) return true;

  LOGW("No WiFi configured — entering provision mode.");

  // Show the MAC address on screen so the user can pair via the web app
  String line2 = g_mac;
  showStatus("Setup needed", line2.c_str(), "See loveframe.app/setup");

  // Poll a fallback AP or wait for user to set up via serial
  // For now: check if credentials were written to NVS externally
  // (e.g. via a companion app or web setup tool)
  for (int i = 0; i < 30; i++) {
    delay(2000);
    prefs.begin("loveframe", true);
    String ssid = prefs.getString("wifi_ssid", "");
    prefs.end();
    if (!ssid.isEmpty()) {
      LOGI("Credentials appeared in NVS — continuing.");
      loadConfig();
      return true;
    }
  }

  // Give up for now, sleep and retry next cycle
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SETUP (runs once per boot / deep-sleep wake)
// ═══════════════════════════════════════════════════════════════════════════════

void setup() {
  Serial.begin(115200);
  delay(300);

  rtc_bootCount++;
  LOGI("=== LoveFrame v%s  boot #%lu ===", FIRMWARE_VERSION, (unsigned long)rtc_bootCount);
  LOGI("Heap: %lu free  PSRAM: %lu free",
       (unsigned long)ESP.getFreeHeap(),
       (unsigned long)ESP.getFreePsram());

  // Init display
  display.init(115200, true, 2, false);
  display.setRotation(0);   // 0 = landscape, adjust if your mount is different
  display.setTextWrap(false);

  // Load config from NVS
  loadConfig();

  // Get MAC address
  g_mac = getMac();
  LOGI("MAC: %s", g_mac.c_str());

  // Provision if no WiFi configured
  if (!tryProvision()) {
    LOGE("Provision failed — sleeping.");
    enterSleep(g_pollMs);
    return;
  }

  // Connect to WiFi (with retries)
  bool wifiOk = false;
  for (int attempt = 0; attempt < WIFI_MAX_RETRIES && !wifiOk; attempt++) {
    if (attempt > 0) {
      LOGW("WiFi retry %d/%d", attempt + 1, WIFI_MAX_RETRIES);
      delay(2000);
    }
    wifiOk = connectWiFi();
  }

  if (!wifiOk) {
    LOGE("WiFi failed after %d attempts.", WIFI_MAX_RETRIES);
    showStatus("No WiFi", "Will retry shortly", g_wifiSsid.c_str());
    enterSleep(g_pollMs);
    return;
  }

  // Poll the server
  PollResponse resp = pollServer();

  if (!resp.valid) {
    LOGE("Server unreachable.");
    enterSleep(g_pollMs);
    return;
  }

  // Update poll interval if server changed it
  if (resp.pollIntervalMs != g_pollMs) {
    LOGI("Poll interval updated: %lu → %lu ms", (unsigned long)g_pollMs, (unsigned long)resp.pollIntervalMs);
    g_pollMs = resp.pollIntervalMs;
    savePollInterval(g_pollMs);
  }

  // OTA update if available
  if (!resp.otaUrl.isEmpty()) {
    LOGI("OTA available: v%s", resp.otaVersion.c_str());
    performOTA(resp.otaUrl, resp.otaVersion);
    // If we get here OTA failed; continue normally
  }

  // Not paired yet — show pairing screen
  if (!resp.paired) {
    LOGI("Device not paired. Showing setup screen.");
    showStatus("Almost there!", "Pair at loveframe.app", g_mac.c_str());
    enterSleep(g_pollMs);
    return;
  }

  // No image available yet
  if (resp.imageUrl.isEmpty()) {
    LOGI("No image ready yet.");
    // Don't overwrite a previously displayed image
    enterSleep(g_pollMs);
    return;
  }

  // Image hash unchanged — no need to refresh the panel
  if (resp.imageHash == String(rtc_lastImageHash) && strlen(rtc_lastImageHash) > 0) {
    LOGI("Image unchanged (hash: %s) — skipping refresh.", rtc_lastImageHash);
    enterSleep(g_pollMs);
    return;
  }

  // New image — download and render
  LOGI("New image detected (hash: %s → %s)", rtc_lastImageHash, resp.imageHash.c_str());
  bool ok = fetchAndDisplay(resp.imageUrl);

  if (ok) {
    // Persist the hash so we don't re-render on next wake
    strncpy(rtc_lastImageHash, resp.imageHash.c_str(), 64);
    rtc_lastImageHash[64] = '\0';
    LOGI("Image rendered successfully.");
  } else {
    LOGE("Image render failed.");
    // Don't update hash — will retry next cycle
  }

  // Go to sleep until next poll
  enterSleep(g_pollMs);
}

// ─── LOOP ─────────────────────────────────────────────────────────────────────
// In deep-sleep mode, loop() is never reached (each wake re-runs setup()).
// In active/light-sleep mode (POWER_MODE 1 or 2), loop() drives the poll cycle.

void loop() {
#if POWER_MODE >= 1
  // Re-run the same logic as setup() but without reinitialising the display
  // (display stays powered in light-sleep/active modes)

  if (WiFi.status() != WL_CONNECTED) {
    LOGW("WiFi dropped — reconnecting.");
    connectWiFi();
  }

  PollResponse resp = pollServer();

  if (resp.valid && !resp.imageUrl.isEmpty()) {
    if (resp.imageHash != String(rtc_lastImageHash)) {
      LOGI("New image — refreshing display.");
      bool ok = fetchAndDisplay(resp.imageUrl);
      if (ok) {
        strncpy(rtc_lastImageHash, resp.imageHash.c_str(), 64);
        rtc_lastImageHash[64] = '\0';
      }
    } else {
      LOGI("No change.");
    }
  }

  if (resp.pollIntervalMs != g_pollMs) {
    g_pollMs = resp.pollIntervalMs;
    savePollInterval(g_pollMs);
  }

  delay(g_pollMs);
#endif
}