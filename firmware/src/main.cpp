/**
 * p-ink — ESP32-S3 E-Ink Display Firmware
 * ════════════════════════════════════════
 * Board:   ESP32-S3-DevKitC-1-N16R8  (16 MB flash, 8 MB OPI PSRAM)
 * Display: Waveshare 7.5" V2          (800×480, black/white)
 *
 * ── Philosophy: "Dumb frame, smart server" ──────────────────────────────────
 *   The ESP32 does exactly this and nothing else:
 *     1. On first boot with no WiFi → wait for credentials via serial
 *     2. Connect to WiFi
 *     3. POST /api/frame/poll  →  receive image_url + image_hash
 *     4. If hash changed       →  stream BMP from URL into PSRAM → push to display
 *     5. Sleep poll_interval_ms, repeat
 *
 *   All composition (layout, fonts, dithering, content selection) is server-side.
 *
 * ── Power modes ─────────────────────────────────────────────────────────────
 *   POWER_MODE 0 = deep sleep  (~10 µA between polls) — for battery builds
 *   POWER_MODE 1 = light sleep (~2 mA)                — faster wake
 *   POWER_MODE 2 = active / no sleep                  — USB/wall, development
 *
 * ── Serial provisioning ─────────────────────────────────────────────────────
 *   On first boot (no WiFi in NVS), firmware prints MAC address and waits
 *   for a JSON command on Serial (115200 baud):
 *     {"cmd":"provision","wifi_ssid":"...","wifi_pass":"...","api_base":"..."}
 *   Use provision_serial.py to send this from your PC.
 *   Responds: PROVISION_OK  or  PROVISION_FAIL:<reason>
 *
 * ── API contract ────────────────────────────────────────────────────────────
 *   POST /api/frame/poll
 *   Headers: X-Device-Mac: AA:BB:CC:DD:EE:FF
 *            User-Agent:   p-ink/1.0.0
 *   Body:    { "mac": "...", "firmware": "1.0.0", "boot_count": 42 }
 *
 *   Response 200:
 *   {
 *     "image_url":        "https://cdn.../frame.bmp",
 *     "image_hash":       "sha256hex",
 *     "poll_interval_ms": 60000,
 *     "ota_url":          "",
 *     "ota_version":      "",
 *     "paired":           true
 *   }
 *   Response 404: device unknown → show "Pair this frame" on screen
 */

// ─── Core / ESP-IDF ──────────────────────────────────────────────────────────
#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <HTTPUpdate.h>
#include <Preferences.h>
#include <esp_sleep.h>
#include <esp_mac.h>
#include <esp_heap_caps.h>

#include <ArduinoJson.h> // bblanchon/ArduinoJson ^7
#include <GxEPD2_BW.h>   // ZinggJM/GxEPD2
#include <Fonts/FreeSans9pt7b.h>

#define DEFAULT_WIFI_SSID ""
#define DEFAULT_WIFI_PASS ""
#define DEFAULT_API_BASE "https://api.p-ink.app"

#define POWER_MODE 2

#define DEFAULT_POLL_MS 60000UL
#define WIFI_TIMEOUT_MS 20000UL
#define HTTP_TIMEOUT_MS 30000UL
#define WIFI_MAX_RETRIES 3
#define SERIAL_TIMEOUT_MS 60000UL // how long to wait for serial provisioning

#define EPD_CS 10
#define EPD_DC 9
#define EPD_RST 8
#define EPD_BUSY 7

using Display = GxEPD2_BW<GxEPD2_750_T7, GxEPD2_750_T7::HEIGHT>;
Display display(GxEPD2_750_T7(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY));

RTC_DATA_ATTR char rtc_lastImageHash[65] = {0};
RTC_DATA_ATTR uint32_t rtc_bootCount = 0;

Preferences prefs;
String g_mac;
String g_wifiSsid;
String g_wifiPass;
String g_apiBase;
uint32_t g_pollMs = DEFAULT_POLL_MS;

#define TAG "p-ink"
#define LOGI(fmt, ...) log_i("[" TAG "] " fmt, ##__VA_ARGS__)
#define LOGW(fmt, ...) log_w("[" TAG "] " fmt, ##__VA_ARGS__)
#define LOGE(fmt, ...) log_e("[" TAG "] " fmt, ##__VA_ARGS__)

// ═════════════════════════════════════════════════════════════════════════════
//  NVS CONFIG
// ═════════════════════════════════════════════════════════════════════════════

void loadConfig()
{
  prefs.begin("p-ink", /*readOnly=*/true);
  g_wifiSsid = prefs.getString("wifi_ssid", DEFAULT_WIFI_SSID);
  g_wifiPass = prefs.getString("wifi_pass", DEFAULT_WIFI_PASS);
  g_apiBase = prefs.getString("api_base", DEFAULT_API_BASE);
  g_pollMs = prefs.getUInt("poll_ms", DEFAULT_POLL_MS);
  prefs.end();
  LOGI("Config: SSID=%s  API=%s  poll=%lums",
       g_wifiSsid.isEmpty() ? "(none)" : g_wifiSsid.c_str(),
       g_apiBase.c_str(), (unsigned long)g_pollMs);
}

void saveConfig(const String &ssid, const String &pass, const String &api)
{
  prefs.begin("p-ink", /*readOnly=*/false);
  prefs.putString("wifi_ssid", ssid);
  prefs.putString("wifi_pass", pass);
  prefs.putString("api_base", api);
  prefs.end();
  LOGI("Config saved to NVS.");
}

void savePollInterval(uint32_t ms)
{
  prefs.begin("p-ink", false);
  prefs.putUInt("poll_ms", ms);
  prefs.end();
}

// ═════════════════════════════════════════════════════════════════════════════
//  MAC ADDRESS
// ═════════════════════════════════════════════════════════════════════════════

String getMac()
{
  uint8_t mac[6];
  esp_read_mac(mac, ESP_MAC_WIFI_STA);
  char buf[18];
  snprintf(buf, sizeof(buf), "%02X:%02X:%02X:%02X:%02X:%02X",
           mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  return String(buf);
}

// ═════════════════════════════════════════════════════════════════════════════
//  DISPLAY — STATUS SCREEN
//  Used before any real content is available (connecting, pairing, errors).
// ═════════════════════════════════════════════════════════════════════════════

void showStatus(const char *line1, const char *line2 = nullptr, const char *line3 = nullptr)
{
  LOGI("Status: %s", line1);
  display.setFullWindow();
  display.firstPage();
  do
  {
    display.fillScreen(GxEPD_WHITE);
    display.setTextColor(GxEPD_BLACK);
    display.setFont(&FreeSans9pt7b);

    auto printCentered = [&](const char *txt, int16_t y)
    {
      if (!txt || !*txt)
        return;
      int16_t x1, y1;
      uint16_t w, h;
      display.getTextBounds(txt, 0, y, &x1, &y1, &w, &h);
      display.setCursor((display.width() - (int16_t)w) / 2, y);
      display.print(txt);
    };

    int16_t cy = display.height() / 2 - 20;
    printCentered(line1, cy);
    if (line2)
      printCentered(line2, cy + 30);
    if (line3)
      printCentered(line3, cy + 60);
  } while (display.nextPage());
}


bool serialProvision()
{
  Serial.println();
  Serial.println("╔══════════════════════════════════════╗");
  Serial.println("║       p-ink  —  First Boot            ║");
  Serial.println("╠══════════════════════════════════════╣");
  Serial.print("║  MAC: ");
  Serial.print(g_mac);
  Serial.println("          ║");
  Serial.println("╠══════════════════════════════════════╣");
  Serial.println("║  Run provision_serial.py to send      ║");
  Serial.println("║  your WiFi credentials.               ║");
  Serial.println("╚══════════════════════════════════════╝");
  Serial.println();
  Serial.println("Waiting for provisioning data...");

  showStatus("First boot setup", g_mac.c_str(), "Run provision_serial.py");

  uint32_t deadline = millis() + SERIAL_TIMEOUT_MS;
  String line;

  while (millis() < deadline)
  {
    while (Serial.available())
    {
      char c = (char)Serial.read();
      if (c == '\n' || c == '\r')
      {
        line.trim();
        if (line.isEmpty())
          continue;

        LOGI("Received: %s", line.c_str());

        JsonDocument doc;
        DeserializationError err = deserializeJson(doc, line);
        if (err)
        {
          Serial.println("PROVISION_FAIL:bad_json");
          line = "";
          continue;
        }

        const char *cmd = doc["cmd"] | "";
        const char *ssid = doc["wifi_ssid"] | "";
        const char *pass = doc["wifi_pass"] | "";
        const char *api = doc["api_base"] | DEFAULT_API_BASE;

        if (strcmp(cmd, "provision") != 0)
        {
          Serial.println("PROVISION_FAIL:unknown_cmd");
          line = "";
          continue;
        }
        if (!ssid || strlen(ssid) == 0)
        {
          Serial.println("PROVISION_FAIL:missing_ssid");
          line = "";
          continue;
        }

        saveConfig(String(ssid), String(pass), String(api));

        Serial.println("PROVISION_OK");
        Serial.printf("  SSID:    %s\n", ssid);
        Serial.printf("  API:     %s\n", api);
        Serial.println("Rebooting in 2 seconds...");
        delay(2000);
        ESP.restart();
        return true; // never reached
      }
      else
      {
        if (line.length() < 512)
          line += c; // guard against overflow
      }
    }
    delay(10);
  }

  Serial.println("PROVISION_TIMEOUT");
  return false;
}

// ═════════════════════════════════════════════════════════════════════════════
//  WIFI
// ═════════════════════════════════════════════════════════════════════════════

bool connectWiFi()
{
  if (g_wifiSsid.isEmpty())
  {
    LOGE("No SSID.");
    return false;
  }
  LOGI("Connecting to: %s", g_wifiSsid.c_str());
  WiFi.mode(WIFI_STA);
  WiFi.begin(g_wifiSsid.c_str(), g_wifiPass.c_str());
  uint32_t t0 = millis();
  while (WiFi.status() != WL_CONNECTED)
  {
    if (millis() - t0 > WIFI_TIMEOUT_MS)
    {
      WiFi.disconnect(true);
      LOGE("Timeout.");
      return false;
    }
    delay(200);
  }
  LOGI("Connected. IP=%s  RSSI=%d dBm", WiFi.localIP().toString().c_str(), WiFi.RSSI());
  return true;
}

void disconnectWiFi()
{
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
}


struct PollResponse
{
  String imageUrl;
  String imageHash;
  String otaUrl;
  String otaVersion;
  uint32_t pollIntervalMs;
  bool paired;
  bool valid;
};

PollResponse pollServer()
{
  PollResponse r = {"", "", "", "", g_pollMs, false, false};
  String url = g_apiBase + "/api/frame/poll";
  LOGI("POST %s", url.c_str());

  HTTPClient http;
  http.begin(url);
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Mac", g_mac);
  http.addHeader("User-Agent", "p-ink/" FIRMWARE_VERSION);

  JsonDocument body;
  body["mac"] = g_mac;
  body["firmware"] = FIRMWARE_VERSION;
  body["boot_count"] = rtc_bootCount;
  String bodyStr;
  serializeJson(body, bodyStr);

  int code = http.POST(bodyStr);
  LOGI("HTTP %d", code);

  if (code == 200)
  {
    JsonDocument doc;
    if (!deserializeJson(doc, http.getStream()))
    {
      r.imageUrl = doc["image_url"] | "";
      r.imageHash = doc["image_hash"] | "";
      r.otaUrl = doc["ota_url"] | "";
      r.otaVersion = doc["ota_version"] | "";
      r.pollIntervalMs = doc["poll_interval_ms"] | g_pollMs;
      r.paired = doc["paired"] | false;
      r.valid = true;
      LOGI("paired=%d  hash=%.16s...", r.paired, r.imageHash.c_str());
    }
    else
    {
      LOGE("JSON parse error.");
    }
  }
  else if (code == 404)
  {
    r.valid = true;
    r.paired = false;
  }
  else
  {
    LOGE("Poll HTTP %d", code);
  }

  http.end();
  return r;
}


static bool streamRead(WiFiClient *s, uint8_t *buf, size_t n, uint32_t tMs = 8000)
{
  size_t got = 0;
  uint32_t t0 = millis();
  while (got < n)
  {
    if (millis() - t0 > tMs)
    {
      LOGE("Stream timeout (%d/%d bytes)", (int)got, (int)n);
      return false;
    }
    int r = s->read(buf + got, n - got);
    if (r > 0)
    {
      got += r;
      t0 = millis();
    }
    else
      delay(1);
  }
  return true;
}

bool renderBmpFromStream(WiFiClient *stream)
{
  // ── File header ───────────────────────────────────────────────────────────
  uint8_t fh[14];
  if (!streamRead(stream, fh, 14))
    return false;
  if (fh[0] != 'B' || fh[1] != 'M')
  {
    LOGE("Not a BMP");
    return false;
  }
  uint32_t pixelOffset = fh[10] | (fh[11] << 8) | (fh[12] << 16) | (fh[13] << 24);

  // ── DIB header ────────────────────────────────────────────────────────────
  uint8_t dh[40];
  if (!streamRead(stream, dh, 40))
    return false;
  int32_t bmpW = (int32_t)(dh[4] | (dh[5] << 8) | (dh[6] << 16) | (dh[7] << 24));
  int32_t bmpH = (int32_t)(dh[8] | (dh[9] << 8) | (dh[10] << 16) | (dh[11] << 24));
  uint16_t bpp = dh[14] | (dh[15] << 8);

  LOGI("BMP %dx%d bpp=%d offset=%u", bmpW, bmpH, bpp, pixelOffset);
  if (bpp != 24)
  {
    LOGE("Need 24-bit BMP");
    return false;
  }
  if (bmpW <= 0 || abs(bmpH) > 2048)
  {
    LOGE("Bad dimensions");
    return false;
  }

  bool bottomUp = (bmpH > 0);
  int32_t absH = abs(bmpH);
  int32_t rowBytes = ((bmpW * 3 + 3) / 4) * 4;

  // Skip remaining header bytes
  size_t skip = pixelOffset - 54;
  if (skip > 0)
  {
    uint8_t dump[64];
    while (skip > 0)
    {
      size_t c = min(skip, (size_t)64);
      if (!streamRead(stream, dump, c))
        return false;
      skip -= c;
    }
  }

  // ── PSRAM allocation ──────────────────────────────────────────────────────
  auto psramMalloc = [](size_t n) -> uint8_t *
  {
    uint8_t *p = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
    return p ? p : (uint8_t *)malloc(n);
  };

  uint8_t *rowBuf = psramMalloc(rowBytes);
  if (!rowBuf)
  {
    LOGE("rowBuf alloc failed");
    return false;
  }

  uint8_t **rows = nullptr;
  if (bottomUp)
  {
    rows = (uint8_t **)psramMalloc(absH * sizeof(uint8_t *));
    if (!rows)
    {
      free(rowBuf);
      LOGE("rows[] alloc failed");
      return false;
    }
    LOGI("Buffering %d rows (%d KB PSRAM)...", absH, absH * rowBytes / 1024);
    for (int32_t i = 0; i < absH; i++)
    {
      rows[i] = psramMalloc(rowBytes);
      if (!rows[i] || !streamRead(stream, rows[i], rowBytes))
      {
        for (int32_t j = 0; j < i; j++)
          free(rows[j]);
        free(rows);
        free(rowBuf);
        LOGE("Row %d failed", i);
        return false;
      }
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  LOGI("Starting e-ink refresh...");
  display.setFullWindow();
  display.firstPage();
  do
  {
    display.fillScreen(GxEPD_WHITE);
    for (int32_t y = 0; y < absH; y++)
    {
      uint8_t *src = bottomUp ? rows[absH - 1 - y] : (streamRead(stream, rowBuf, rowBytes) ? rowBuf : nullptr);
      if (!src)
        break;
      for (int32_t x = 0; x < bmpW; x++)
      {
        uint8_t b = src[x * 3 + 0], g = src[x * 3 + 1], r = src[x * 3 + 2];
        if ((uint8_t)(0.299f * r + 0.587f * g + 0.114f * b) <= 128)
          display.drawPixel(x, y, GxEPD_BLACK);
      }
    }
  } while (display.nextPage());

  // ── Free ──────────────────────────────────────────────────────────────────
  if (bottomUp && rows)
  {
    for (int32_t i = 0; i < absH; i++)
      free(rows[i]);
    free(rows);
  }
  free(rowBuf);
  LOGI("Refresh complete.");
  return true;
}

// ═════════════════════════════════════════════════════════════════════════════
//  IMAGE DOWNLOAD + RENDER
// ═════════════════════════════════════════════════════════════════════════════

bool fetchAndDisplay(const String &url)
{
  if (url.isEmpty())
    return false;
  LOGI("Fetching: %s", url.c_str());
  HTTPClient http;
  http.begin(url);
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.addHeader("User-Agent", "p-ink/" FIRMWARE_VERSION);
  int code = http.GET();
  if (code != 200)
  {
    LOGE("HTTP %d", code);
    http.end();
    return false;
  }
  LOGI("%d bytes", http.getSize());
  bool ok = renderBmpFromStream(http.getStreamPtr());
  http.end();
  return ok;
}

// ═════════════════════════════════════════════════════════════════════════════
//  OTA
// ═════════════════════════════════════════════════════════════════════════════

void performOTA(const String &url, const String &ver)
{
  LOGI("OTA v%s from %s", ver.c_str(), url.c_str());
  showStatus("Updating...", ("v" + ver).c_str(), "Do not power off");
  WiFiClient client;
  if (httpUpdate.update(client, url) == HTTP_UPDATE_FAILED)
    LOGE("OTA failed: %s", httpUpdate.getLastErrorString().c_str());
  // HTTP_UPDATE_OK reboots automatically
}

// ═════════════════════════════════════════════════════════════════════════════
//  SLEEP
// ═════════════════════════════════════════════════════════════════════════════

void enterSleep(uint32_t ms)
{
  LOGI("Sleep %lu ms", (unsigned long)ms);
  disconnectWiFi();
  display.powerOff();
  delay(100);
#if POWER_MODE == 0
  esp_sleep_enable_timer_wakeup((uint64_t)ms * 1000ULL);
  esp_deep_sleep_start();
#elif POWER_MODE == 1
  esp_sleep_enable_timer_wakeup((uint64_t)ms * 1000ULL);
  esp_light_sleep_start();
#else
  delay(ms);
#endif
}


void setup()
{
  Serial.begin(115200);
  delay(400);

  rtc_bootCount++;
  LOGI("══ p-ink v%s  boot #%lu ══", FIRMWARE_VERSION, (unsigned long)rtc_bootCount);
  LOGI("Heap: %lu B  PSRAM: %lu B", (unsigned long)ESP.getFreeHeap(), (unsigned long)ESP.getFreePsram());

  display.init(115200, true, 2, false);
  display.setRotation(0);
  display.setTextWrap(false);

  loadConfig();
  g_mac = getMac();
  LOGI("MAC: %s", g_mac.c_str());

  // First boot: no credentials → serial provisioning
  if (g_wifiSsid.isEmpty())
  {
    LOGW("No WiFi — serial provisioning mode.");
    serialProvision();
    // Returns on timeout — sleep 30 s and retry
    enterSleep(30000);
    return;
  }

  // Connect WiFi
  bool wifiOk = false;
  for (int i = 0; i < WIFI_MAX_RETRIES && !wifiOk; i++)
  {
    if (i > 0)
      delay(2000);
    wifiOk = connectWiFi();
  }
  if (!wifiOk)
  {
    showStatus("No WiFi", g_wifiSsid.c_str(), "Will retry");
    enterSleep(g_pollMs);
    return;
  }

  // Poll
  PollResponse resp = pollServer();
  if (!resp.valid)
  {
    enterSleep(g_pollMs);
    return;
  }

  if (resp.pollIntervalMs != g_pollMs)
  {
    g_pollMs = resp.pollIntervalMs;
    savePollInterval(g_pollMs);
  }

  if (!resp.otaUrl.isEmpty())
    performOTA(resp.otaUrl, resp.otaVersion);

  if (!resp.paired)
  {
    showStatus("Pair this frame", "p-ink.app/onboarding", g_mac.c_str());
    enterSleep(g_pollMs);
    return;
  }

  if (resp.imageUrl.isEmpty())
  {
    LOGI("No image yet.");
    enterSleep(g_pollMs);
    return;
  }

  if (resp.imageHash == String(rtc_lastImageHash) && rtc_lastImageHash[0] != '\0')
  {
    LOGI("Unchanged — skip refresh.");
    enterSleep(g_pollMs);
    return;
  }

  if (fetchAndDisplay(resp.imageUrl))
  {
    strncpy(rtc_lastImageHash, resp.imageHash.c_str(), 64);
    rtc_lastImageHash[64] = '\0';
  }

  enterSleep(g_pollMs);
}


void loop()
{
#if POWER_MODE >= 1
  if (WiFi.status() != WL_CONNECTED)
    connectWiFi();

  PollResponse resp = pollServer();
  if (resp.valid)
  {
    if (resp.pollIntervalMs != g_pollMs)
    {
      g_pollMs = resp.pollIntervalMs;
      savePollInterval(g_pollMs);
    }
    if (!resp.imageUrl.isEmpty() && resp.imageHash != String(rtc_lastImageHash))
    {
      if (fetchAndDisplay(resp.imageUrl))
      {
        strncpy(rtc_lastImageHash, resp.imageHash.c_str(), 64);
        rtc_lastImageHash[64] = '\0';
      }
    }
  }

  delay(g_pollMs);
#endif
}