/**
 * p-ink — ESP32-S3 E-Ink Display Firmware
 * ════════════════════════════════════════
 * Board:   ESP32-S3-DevKitC-1-N16R8  (16 MB flash, 8 MB OPI PSRAM)
 * Display: Waveshare 7.5" V2          (800×480, black/white)
 *
 * Changes vs original:
 *   • PollResponse now carries `partner_location` (lat/lng/mode/updated_at)
 *   • renderLocationOverlay() draws a small pill in the bottom-left corner
 *     when partner_location is present (mode=coordinates shows "48.85°N 2.35°E"
 *     style text; mode=map_link shows "maps.gl/<short>" — both fit in ~140px)
 *   • Location overlay is drawn on top of the BMP after fetchAndDisplay()
 *   • rtc_lastLocationHash (8-byte CRC-style) detects when location changes
 *     so we only redraw if image OR location changed
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

#include <ArduinoJson.h>
#include <GxEPD2_BW.h>
#include <Fonts/FreeSans9pt7b.h>
#include <Fonts/FreeSansBold9pt7b.h>

#define DEFAULT_WIFI_SSID ""
#define DEFAULT_WIFI_PASS ""
#define DEFAULT_API_BASE  "https://api.p-ink.app"

#define POWER_MODE 2

#define DEFAULT_POLL_MS   60000UL
#define WIFI_TIMEOUT_MS   20000UL
#define HTTP_TIMEOUT_MS   30000UL
#define WIFI_MAX_RETRIES  3
#define SERIAL_TIMEOUT_MS 60000UL

#define EPD_CS   10
#define EPD_DC    9
#define EPD_RST   8
#define EPD_BUSY  7

using Display = GxEPD2_BW<GxEPD2_750_T7, GxEPD2_750_T7::HEIGHT>;
Display display(GxEPD2_750_T7(EPD_CS, EPD_DC, EPD_RST, EPD_BUSY));

// ── RTC memory (survives deep sleep) ─────────────────────────────────────────
RTC_DATA_ATTR char     rtc_lastImageHash[65]    = {0};
RTC_DATA_ATTR char     rtc_lastLocationHash[32] = {0}; // "<lat6>_<lng6>_<updatedAt>"
RTC_DATA_ATTR uint32_t rtc_bootCount            = 0;

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
    prefs.begin("p-ink", true);
    g_wifiSsid = prefs.getString("wifi_ssid", DEFAULT_WIFI_SSID);
    g_wifiPass = prefs.getString("wifi_pass", DEFAULT_WIFI_PASS);
    g_apiBase  = prefs.getString("api_base",  DEFAULT_API_BASE);
    g_pollMs   = prefs.getUInt  ("poll_ms",   DEFAULT_POLL_MS);
    prefs.end();
    LOGI("Config: SSID=%s  API=%s  poll=%lums",
         g_wifiSsid.isEmpty() ? "(none)" : g_wifiSsid.c_str(),
         g_apiBase.c_str(), (unsigned long)g_pollMs);
}

void saveConfig(const String &ssid, const String &pass, const String &api)
{
    prefs.begin("p-ink", false);
    prefs.putString("wifi_ssid", ssid);
    prefs.putString("wifi_pass", pass);
    prefs.putString("api_base",  api);
    prefs.end();
    LOGI("Config saved.");
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
// ═════════════════════════════════════════════════════════════════════════════

void showStatus(const char *line1, const char *line2 = nullptr, const char *line3 = nullptr)
{
    LOGI("Status: %s", line1);
    display.setFullWindow();
    display.firstPage();
    do {
        display.fillScreen(GxEPD_WHITE);
        display.setTextColor(GxEPD_BLACK);
        display.setFont(&FreeSans9pt7b);

        auto printCentered = [&](const char *txt, int16_t y) {
            if (!txt || !*txt) return;
            int16_t x1, y1; uint16_t w, h;
            display.getTextBounds(txt, 0, y, &x1, &y1, &w, &h);
            display.setCursor((display.width() - (int16_t)w) / 2, y);
            display.print(txt);
        };

        int16_t cy = display.height() / 2 - 20;
        printCentered(line1, cy);
        if (line2) printCentered(line2, cy + 30);
        if (line3) printCentered(line3, cy + 60);
    } while (display.nextPage());
}

// ═════════════════════════════════════════════════════════════════════════════
//  LOCATION OVERLAY
//  Draws a small infobox in the bottom-left corner of the display.
//  Called after the BMP has already been rendered — uses a partial window
//  so we do not re-flash the whole display.
//
//  Layout (coordinates mode):
//    ┌─────────────────────────────┐
//    │ 📍 48.8566°N  2.3522°E      │
//    │    ±50m  •  14:23           │
//    └─────────────────────────────┘
//
//  Layout (map_link mode):
//    ┌─────────────────────────────┐
//    │ 📍 maps.gl/48.856,2.352     │
//    │    14:23                    │
//    └─────────────────────────────┘
// ═════════════════════════════════════════════════════════════════════════════

// Helper: truncate a float string to n decimal places without stdlib.
// e.g. formatDeg(48.85661, 4) → "48.8566"
static void formatDeg(char *out, size_t outLen, double val, int decimals)
{
    // Handle negative
    bool neg = val < 0;
    if (neg) val = -val;

    // Integer part
    long intPart = (long)val;
    double frac  = val - (double)intPart;

    // Decimal part — multiply and round
    long mult = 1;
    for (int i = 0; i < decimals; i++) mult *= 10;
    long fracPart = (long)(frac * mult + 0.5);
    if (fracPart >= mult) { intPart++; fracPart = 0; }

    snprintf(out, outLen, "%s%ld.%0*ld", neg ? "-" : "", intPart, decimals, fracPart);
}

// Extract "HH:MM" from RFC3339 string "2024-06-15T14:23:00Z"
static void extractTime(char *out, size_t outLen, const char *rfc3339)
{
    // Find the 'T' separator
    const char *t = strchr(rfc3339, 'T');
    if (!t || strlen(t) < 6) {
        strncpy(out, "--:--", outLen);
        return;
    }
    // Copy HH:MM
    snprintf(out, outLen, "%.5s", t + 1);
}

struct FrameLocation {
    double   lat;
    double   lng;
    float    accuracyM;   // 0 = unknown
    char     mode[16];    // "coordinates" | "map_link"
    char     updatedAt[32]; // RFC3339
    bool     valid;
};

// Render a partial-window location pill.
// x0, y0 = top-left of the pill (typically bottom-left of frame).
void renderLocationOverlay(const FrameLocation &loc)
{
    // Pill dimensions
    const int16_t BOX_X = 8;
    const int16_t BOX_Y = display.height() - 58;
    const int16_t BOX_W = 220;
    const int16_t BOX_H = 50;

    // Build text strings
    char line1[48] = {0};
    char line2[48] = {0};
    char timeStr[8];
    extractTime(timeStr, sizeof(timeStr), loc.updatedAt);

    if (strcmp(loc.mode, "map_link") == 0) {
        // "maps.gl/48.8566,2.3522"
        char latStr[16], lngStr[16];
        formatDeg(latStr, sizeof(latStr), loc.lat, 4);
        formatDeg(lngStr, sizeof(lngStr), loc.lng, 4);
        snprintf(line1, sizeof(line1), "maps.gl/%s,%s", latStr, lngStr);
        snprintf(line2, sizeof(line2), "%s", timeStr);
    } else {
        // Coordinates mode: "48.8566N  2.3522E"
        char latStr[16], lngStr[16];
        formatDeg(latStr, sizeof(latStr), loc.lat < 0 ? -loc.lat : loc.lat, 4);
        formatDeg(lngStr, sizeof(lngStr), loc.lng < 0 ? -loc.lng : loc.lng, 4);
        snprintf(line1, sizeof(line1), "%s%c  %s%c",
                 latStr, loc.lat  >= 0 ? 'N' : 'S',
                 lngStr, loc.lng >= 0 ? 'E' : 'W');
        if (loc.accuracyM > 0 && loc.accuracyM < 10000) {
            snprintf(line2, sizeof(line2), "+/-%dm  %s", (int)loc.accuracyM, timeStr);
        } else {
            snprintf(line2, sizeof(line2), "%s", timeStr);
        }
    }

    LOGI("Location overlay: %s | %s", line1, line2);

    // Use a partial window to avoid a full refresh
    display.setPartialWindow(BOX_X, BOX_Y, BOX_W, BOX_H);
    display.firstPage();
    do {
        // White pill with black border
        display.fillRect(BOX_X, BOX_Y, BOX_W, BOX_H, GxEPD_WHITE);
        display.drawRect(BOX_X, BOX_Y, BOX_W, BOX_H, GxEPD_BLACK);

        display.setTextColor(GxEPD_BLACK);
        display.setFont(&FreeSansBold9pt7b);
        display.setCursor(BOX_X + 8, BOX_Y + 17);
        display.print(line1);

        display.setFont(&FreeSans9pt7b);
        display.setCursor(BOX_X + 8, BOX_Y + 36);
        display.print(line2);
    } while (display.nextPage());
}

// ═════════════════════════════════════════════════════════════════════════════
//  SERIAL PROVISIONING
// ═════════════════════════════════════════════════════════════════════════════

bool serialProvision()
{
    Serial.println();
    Serial.println("╔══════════════════════════════════════╗");
    Serial.println("║       p-ink  —  First Boot            ║");
    Serial.println("╠══════════════════════════════════════╣");
    Serial.print("║  MAC: "); Serial.print(g_mac); Serial.println("          ║");
    Serial.println("╠══════════════════════════════════════╣");
    Serial.println("║  Run provision_serial.py to send      ║");
    Serial.println("║  your WiFi credentials.               ║");
    Serial.println("╚══════════════════════════════════════╝");
    Serial.println();
    Serial.println("Waiting for provisioning data...");

    showStatus("First boot setup", g_mac.c_str(), "Run provision_serial.py");

    uint32_t deadline = millis() + SERIAL_TIMEOUT_MS;
    String line;

    while (millis() < deadline) {
        while (Serial.available()) {
            char c = (char)Serial.read();
            if (c == '\n' || c == '\r') {
                line.trim();
                if (line.isEmpty()) continue;

                LOGI("Received: %s", line.c_str());

                JsonDocument doc;
                DeserializationError err = deserializeJson(doc, line);
                if (err) { Serial.println("PROVISION_FAIL:bad_json"); line = ""; continue; }

                const char *cmd  = doc["cmd"]       | "";
                const char *ssid = doc["wifi_ssid"] | "";
                const char *pass = doc["wifi_pass"] | "";
                const char *api  = doc["api_base"]  | DEFAULT_API_BASE;

                if (strcmp(cmd, "provision") != 0) { Serial.println("PROVISION_FAIL:unknown_cmd"); line = ""; continue; }
                if (!ssid || strlen(ssid) == 0)     { Serial.println("PROVISION_FAIL:missing_ssid"); line = ""; continue; }

                saveConfig(String(ssid), String(pass), String(api));
                Serial.println("PROVISION_OK");
                Serial.printf("  SSID: %s\n  API:  %s\n", ssid, api);
                Serial.println("Rebooting in 2 seconds...");
                delay(2000);
                ESP.restart();
                return true;
            } else {
                if (line.length() < 512) line += c;
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
    if (g_wifiSsid.isEmpty()) { LOGE("No SSID."); return false; }
    LOGI("Connecting to: %s", g_wifiSsid.c_str());
    WiFi.mode(WIFI_STA);
    WiFi.begin(g_wifiSsid.c_str(), g_wifiPass.c_str());
    uint32_t t0 = millis();
    while (WiFi.status() != WL_CONNECTED) {
        if (millis() - t0 > WIFI_TIMEOUT_MS) { WiFi.disconnect(true); LOGE("Timeout."); return false; }
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

// ═════════════════════════════════════════════════════════════════════════════
//  POLL RESPONSE
// ═════════════════════════════════════════════════════════════════════════════

struct PollResponse
{
    String imageUrl;
    String imageHash;
    String otaUrl;
    String otaVersion;
    uint32_t pollIntervalMs;
    bool paired;
    bool valid;
    FrameLocation location; // zeroed / location.valid=false when not sharing
};

PollResponse pollServer()
{
    PollResponse r = {"", "", "", "", g_pollMs, false, false, {}};
    String url = g_apiBase + "/api/frame/poll";
    LOGI("POST %s", url.c_str());

    HTTPClient http;
    http.begin(url);
    http.setTimeout(HTTP_TIMEOUT_MS);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-Device-Mac",  g_mac);
    http.addHeader("User-Agent",    "p-ink/" FIRMWARE_VERSION);

    JsonDocument body;
    body["mac"]        = g_mac;
    body["firmware"]   = FIRMWARE_VERSION;
    body["boot_count"] = rtc_bootCount;
    String bodyStr;
    serializeJson(body, bodyStr);

    int code = http.POST(bodyStr);
    LOGI("HTTP %d", code);

    if (code == 200) {
        JsonDocument doc;
        if (!deserializeJson(doc, http.getStream())) {
            r.imageUrl       = doc["image_url"]        | "";
            r.imageHash      = doc["image_hash"]       | "";
            r.otaUrl         = doc["ota_url"]          | "";
            r.otaVersion     = doc["ota_version"]      | "";
            r.pollIntervalMs = doc["poll_interval_ms"] | g_pollMs;
            r.paired         = doc["paired"]           | false;
            r.valid          = true;

            // ── Parse partner_location (optional field) ───────────────────
            if (!doc["partner_location"].isNull()) {
                JsonObject loc = doc["partner_location"].as<JsonObject>();
                r.location.lat        = loc["lat"]        | 0.0;
                r.location.lng        = loc["lng"]        | 0.0;
                r.location.accuracyM  = loc["accuracy_m"] | 0.0f;
                strlcpy(r.location.mode,      loc["mode"]       | "coordinates", sizeof(r.location.mode));
                strlcpy(r.location.updatedAt, loc["updated_at"] | "",            sizeof(r.location.updatedAt));
                r.location.valid = (r.location.lat != 0.0 || r.location.lng != 0.0);
            }

            LOGI("paired=%d  hash=%.16s  location=%s",
                 r.paired, r.imageHash.c_str(),
                 r.location.valid ? "YES" : "none");
        } else {
            LOGE("JSON parse error.");
        }
    } else if (code == 404) {
        r.valid  = true;
        r.paired = false;
    } else {
        LOGE("Poll HTTP %d", code);
    }

    http.end();
    return r;
}

// ═════════════════════════════════════════════════════════════════════════════
//  BMP STREAMING RENDER  (unchanged from original)
// ═════════════════════════════════════════════════════════════════════════════

static bool streamRead(WiFiClient *s, uint8_t *buf, size_t n, uint32_t tMs = 8000)
{
    size_t got = 0;
    uint32_t t0 = millis();
    while (got < n) {
        if (millis() - t0 > tMs) { LOGE("Stream timeout (%d/%d)", (int)got, (int)n); return false; }
        int r = s->read(buf + got, n - got);
        if (r > 0) { got += r; t0 = millis(); }
        else delay(1);
    }
    return true;
}

bool renderBmpFromStream(WiFiClient *stream)
{
    uint8_t fh[14];
    if (!streamRead(stream, fh, 14)) return false;
    if (fh[0] != 'B' || fh[1] != 'M') { LOGE("Not a BMP"); return false; }
    uint32_t pixelOffset = fh[10]|(fh[11]<<8)|(fh[12]<<16)|(fh[13]<<24);

    uint8_t dh[40];
    if (!streamRead(stream, dh, 40)) return false;
    int32_t  bmpW = (int32_t)(dh[4]|(dh[5]<<8)|(dh[6]<<16)|(dh[7]<<24));
    int32_t  bmpH = (int32_t)(dh[8]|(dh[9]<<8)|(dh[10]<<16)|(dh[11]<<24));
    uint16_t bpp  = dh[14]|(dh[15]<<8);

    LOGI("BMP %dx%d bpp=%d offset=%u", bmpW, bmpH, bpp, pixelOffset);
    if (bpp != 24)                    { LOGE("Need 24-bit BMP"); return false; }
    if (bmpW <= 0 || abs(bmpH) > 2048){ LOGE("Bad dimensions"); return false; }

    bool    bottomUp = (bmpH > 0);
    int32_t absH     = abs(bmpH);
    int32_t rowBytes = ((bmpW * 3 + 3) / 4) * 4;

    size_t skip = pixelOffset - 54;
    if (skip > 0) {
        uint8_t dump[64];
        while (skip > 0) {
            size_t c = min(skip, (size_t)64);
            if (!streamRead(stream, dump, c)) return false;
            skip -= c;
        }
    }

    auto psramMalloc = [](size_t n) -> uint8_t * {
        uint8_t *p = (uint8_t *)heap_caps_malloc(n, MALLOC_CAP_SPIRAM | MALLOC_CAP_8BIT);
        return p ? p : (uint8_t *)malloc(n);
    };

    uint8_t *rowBuf = psramMalloc(rowBytes);
    if (!rowBuf) { LOGE("rowBuf alloc failed"); return false; }

    uint8_t **rows = nullptr;
    if (bottomUp) {
        rows = (uint8_t **)psramMalloc(absH * sizeof(uint8_t *));
        if (!rows) { free(rowBuf); LOGE("rows[] alloc failed"); return false; }
        LOGI("Buffering %d rows (%d KB PSRAM)...", absH, absH * rowBytes / 1024);
        for (int32_t i = 0; i < absH; i++) {
            rows[i] = psramMalloc(rowBytes);
            if (!rows[i] || !streamRead(stream, rows[i], rowBytes)) {
                for (int32_t j = 0; j < i; j++) free(rows[j]);
                free(rows); free(rowBuf);
                LOGE("Row %d failed", i); return false;
            }
        }
    }

    LOGI("Starting e-ink refresh...");
    display.setFullWindow();
    display.firstPage();
    do {
        display.fillScreen(GxEPD_WHITE);
        for (int32_t y = 0; y < absH; y++) {
            uint8_t *src = bottomUp
                ? rows[absH - 1 - y]
                : (streamRead(stream, rowBuf, rowBytes) ? rowBuf : nullptr);
            if (!src) break;
            for (int32_t x = 0; x < bmpW; x++) {
                uint8_t b = src[x*3+0], g = src[x*3+1], rv = src[x*3+2];
                if ((uint8_t)(0.299f*rv + 0.587f*g + 0.114f*b) <= 128)
                    display.drawPixel(x, y, GxEPD_BLACK);
            }
        }
    } while (display.nextPage());

    if (bottomUp && rows) {
        for (int32_t i = 0; i < absH; i++) free(rows[i]);
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
    if (url.isEmpty()) return false;
    LOGI("Fetching: %s", url.c_str());
    HTTPClient http;
    http.begin(url);
    http.setTimeout(HTTP_TIMEOUT_MS);
    http.addHeader("User-Agent", "p-ink/" FIRMWARE_VERSION);
    int code = http.GET();
    if (code != 200) { LOGE("HTTP %d", code); http.end(); return false; }
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

// ═════════════════════════════════════════════════════════════════════════════
//  LOCATION CHANGE DETECTION
//  Build a short fingerprint string and compare to the RTC copy.
//  Avoids a pointless partial refresh when nothing moved.
// ═════════════════════════════════════════════════════════════════════════════

static void makeLocationHash(char *out, size_t outLen, const FrameLocation &loc)
{
    if (!loc.valid) { strncpy(out, "none", outLen); return; }
    // Include lat+lng to 4dp and the updatedAt timestamp
    char latStr[12], lngStr[12];
    formatDeg(latStr, sizeof(latStr), loc.lat < 0 ? -loc.lat : loc.lat, 4);
    formatDeg(lngStr, sizeof(lngStr), loc.lng < 0 ? -loc.lng : loc.lng, 4);
    snprintf(out, outLen, "%s_%s_%s", latStr, lngStr, loc.updatedAt);
}

// ═════════════════════════════════════════════════════════════════════════════
//  SETUP — runs on every boot (deep sleep restarts from here)
// ═════════════════════════════════════════════════════════════════════════════

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

    if (g_wifiSsid.isEmpty()) {
        LOGW("No WiFi — serial provisioning mode.");
        serialProvision();
        enterSleep(30000);
        return;
    }

    bool wifiOk = false;
    for (int i = 0; i < WIFI_MAX_RETRIES && !wifiOk; i++) {
        if (i > 0) delay(2000);
        wifiOk = connectWiFi();
    }
    if (!wifiOk) {
        showStatus("No WiFi", g_wifiSsid.c_str(), "Will retry");
        enterSleep(g_pollMs);
        return;
    }

    PollResponse resp = pollServer();
    if (!resp.valid) { enterSleep(g_pollMs); return; }

    if (resp.pollIntervalMs != g_pollMs) {
        g_pollMs = resp.pollIntervalMs;
        savePollInterval(g_pollMs);
    }

    if (!resp.otaUrl.isEmpty())
        performOTA(resp.otaUrl, resp.otaVersion);

    if (!resp.paired) {
        showStatus("Pair this frame", "p-ink.app/onboarding", g_mac.c_str());
        enterSleep(g_pollMs);
        return;
    }

    if (resp.imageUrl.isEmpty()) {
        LOGI("No image yet.");
        enterSleep(g_pollMs);
        return;
    }

    // ── Image change check ────────────────────────────────────────────────
    bool imageChanged    = (resp.imageHash != String(rtc_lastImageHash) || rtc_lastImageHash[0] == '\0');

    // ── Location change check ─────────────────────────────────────────────
    char newLocHash[32];
    makeLocationHash(newLocHash, sizeof(newLocHash), resp.location);
    bool locationChanged = (strcmp(newLocHash, rtc_lastLocationHash) != 0);

    if (imageChanged) {
        if (fetchAndDisplay(resp.imageUrl)) {
            strncpy(rtc_lastImageHash, resp.imageHash.c_str(), 64);
            rtc_lastImageHash[64] = '\0';
        }
    }

    // Draw (or clear) the location overlay whenever it changes.
    // If the image was also redrawn above, the overlay goes on top of the
    // fresh BMP — no extra full refresh needed.
    if (locationChanged) {
        if (resp.location.valid) {
            renderLocationOverlay(resp.location);
        } else {
            // Partner stopped sharing — clear the pill area with a partial refresh
            display.setPartialWindow(8, display.height() - 58, 220, 50);
            display.firstPage();
            do { display.fillRect(8, display.height() - 58, 220, 50, GxEPD_WHITE); }
            while (display.nextPage());
        }
        strncpy(rtc_lastLocationHash, newLocHash, sizeof(rtc_lastLocationHash) - 1);
    }

    enterSleep(g_pollMs);
}

// ═════════════════════════════════════════════════════════════════════════════
//  LOOP — only used in POWER_MODE 1 and 2 (light sleep / active)
// ═════════════════════════════════════════════════════════════════════════════

void loop()
{
#if POWER_MODE >= 1
    if (WiFi.status() != WL_CONNECTED)
        connectWiFi();

    PollResponse resp = pollServer();
    if (resp.valid) {
        if (resp.pollIntervalMs != g_pollMs) {
            g_pollMs = resp.pollIntervalMs;
            savePollInterval(g_pollMs);
        }

        bool imageChanged = (!resp.imageUrl.isEmpty() &&
                             resp.imageHash != String(rtc_lastImageHash));
        if (imageChanged) {
            if (fetchAndDisplay(resp.imageUrl)) {
                strncpy(rtc_lastImageHash, resp.imageHash.c_str(), 64);
                rtc_lastImageHash[64] = '\0';
            }
        }

        char newLocHash[32];
        makeLocationHash(newLocHash, sizeof(newLocHash), resp.location);
        if (strcmp(newLocHash, rtc_lastLocationHash) != 0) {
            if (resp.location.valid) {
                renderLocationOverlay(resp.location);
            } else {
                display.setPartialWindow(8, display.height() - 58, 220, 50);
                display.firstPage();
                do { display.fillRect(8, display.height() - 58, 220, 50, GxEPD_WHITE); }
                while (display.nextPage());
            }
            strncpy(rtc_lastLocationHash, newLocHash, sizeof(rtc_lastLocationHash) - 1);
        }
    }

    delay(g_pollMs);
#endif
}