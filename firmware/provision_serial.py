#!/usr/bin/env python3
"""
p-ink — Serial Provisioner
═══════════════════════════════════════════════════════════════════════════════
Pushes WiFi credentials and API URL into the ESP32's NVS over USB serial.
Run this once after first flash — credentials are saved to flash and survive
reboots and firmware updates.

Requirements:
  pip install pyserial

Usage:
  python provision_serial.py --port COM4 --ssid "MyWiFi" --pass "mypassword"
  python provision_serial.py --port /dev/ttyUSB0 --ssid "MyWiFi" --pass "secret" --api "https://my-api.com"

Finding your port:
  Windows  ->  Device Manager -> Ports (COM & LPT) -> look for "CP210x" or "USB Serial"
  macOS    ->  ls /dev/cu.*
  Linux    ->  ls /dev/ttyUSB* or /dev/ttyACM*

Steps:
  1. Flash the firmware:  pio run -t upload -e p-ink_s3
  2. The frame prints its MAC address and waits for credentials
  3. Run this script in a separate terminal
  4. The frame saves credentials, reboots, and connects to WiFi
═══════════════════════════════════════════════════════════════════════════════
"""

import argparse
import json
import sys
import time

try:
    import serial
    import serial.tools.list_ports
except ImportError:
    print("ERROR: pyserial is not installed.")
    print("Run:  pip install pyserial")
    sys.exit(1)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def list_ports():
    """Print all available serial ports."""
    ports = list(serial.tools.list_ports.comports())
    if not ports:
        print("  (no serial ports found)")
        return
    for p in ports:
        print(f"  {p.device:12s}  {p.description}")


def wait_for_boot(ser: serial.Serial, timeout: float = 15.0) -> bool:
    """
    Drain serial output until we see the provisioning prompt.
    Returns True when ready, False on timeout.
    """
    print(f"Waiting for device boot prompt (up to {int(timeout)}s)...")
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            raw = ser.readline()
        except serial.SerialException:
            break
        line = raw.decode(errors="replace").strip()
        if line:
            print(f"  [{line}]")
        # Firmware prints one of these when ready for provisioning
        if any(kw in line for kw in ("provision_serial.py", "First Boot", "Waiting for provisioning")):
            return True
    return False


def send_and_receive(ser: serial.Serial, ssid: str, password: str, api: str) -> bool:
    """Send JSON payload, wait for PROVISION_OK or PROVISION_FAIL."""

    payload = json.dumps({
        "cmd":       "provision",
        "wifi_ssid": ssid,
        "wifi_pass": password,
        "api_base":  api,
    }) + "\n"

    print()
    print("Sending:")
    print(f"  SSID : {ssid}")
    print(f"  API  : {api}")
    print(f"  Pass : {'*' * len(password)}")
    print()

    ser.write(payload.encode("utf-8"))
    ser.flush()

    deadline = time.time() + 15.0
    while time.time() < deadline:
        try:
            raw = ser.readline()
        except serial.SerialException as e:
            print(f"  Serial error: {e}")
            return False

        line = raw.decode(errors="replace").strip()
        if not line:
            continue

        print(f"  ESP32: {line}")

        if "PROVISION_OK" in line:
            return True
        if "PROVISION_FAIL" in line:
            reason = line.split(":", 1)[1] if ":" in line else "unknown"
            print(f"\nFailed: {reason}")
            return False
        if "PROVISION_TIMEOUT" in line:
            print("\nESP32 timed out waiting for input.")
            return False

    print("\nNo response from ESP32 within 15 seconds.")
    return False


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="p-ink Serial Provisioner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--port",  "-p", help="Serial port  e.g. COM4  /dev/ttyUSB0")
    parser.add_argument("--ssid",  "-s", help="WiFi network name (SSID)")
    parser.add_argument("--pass",  "-w", dest="password", help="WiFi password")
    parser.add_argument("--api",   "-a", default="https://api.p-ink.app",
                        help="Backend API base URL (default: https://api.p-ink.app)")
    parser.add_argument("--baud",  "-b", default=115200, type=int,
                        help="Baud rate (default: 115200)")
    parser.add_argument("--list",  "-l", action="store_true",
                        help="List available serial ports and exit")
    parser.add_argument("--skip-wait", action="store_true",
                        help="Skip boot prompt detection, send credentials immediately")
    args = parser.parse_args()

    # ── List ports ────────────────────────────────────────────────────────────
    if args.list:
        print("Available serial ports:")
        list_ports()
        return

    # ── Validate ──────────────────────────────────────────────────────────────
    missing = []
    if not args.port:             missing.append("--port")
    if not args.ssid:             missing.append("--ssid")
    if args.password is None:     missing.append("--pass")
    if missing:
        print(f"ERROR: Missing required argument(s): {', '.join(missing)}")
        print()
        print("Example:")
        print('  python provision_serial.py --port COM4 --ssid "HomeNetwork" --pass "secret123"')
        print()
        print("Available ports:")
        list_ports()
        sys.exit(1)

    # ── Open port ─────────────────────────────────────────────────────────────
    print(f"Opening {args.port} at {args.baud} baud...")
    try:
        ser = serial.Serial(
            port=args.port,
            baudrate=args.baud,
            timeout=2.0,
            write_timeout=5.0,
        )
    except serial.SerialException as e:
        print(f"ERROR: Cannot open {args.port}:")
        print(f"  {e}")
        print()
        print("Available ports:")
        list_ports()
        sys.exit(1)

    # Brief pause — opening the port can trigger a reset on some boards
    time.sleep(1.5)
    ser.reset_input_buffer()

    try:
        # ── Wait for boot ─────────────────────────────────────────────────────
        if not args.skip_wait:
            ready = wait_for_boot(ser, timeout=15.0)
            if not ready:
                print()
                print("Did not see the provisioning prompt.")
                print("Make sure:")
                print("  1. Firmware is flashed  (pio run -t upload -e p-ink_s3)")
                print("  2. Device has NO stored WiFi credentials")
                print("     To erase:  pio run -t erase -e p-ink_s3  then reflash")
                print()
                print("Sending anyway (use --skip-wait to always skip this check)...")

        # ── Send ──────────────────────────────────────────────────────────────
        ok = send_and_receive(ser, args.ssid, args.password, args.api)

        if ok:
            print()
            print("=" * 50)
            print("  Provisioning successful!")
            print("=" * 50)
            print()
            print("  The frame will reboot and connect to WiFi.")
            print("  Watch the serial monitor for 'WiFi connected'.")
            print()
            print("  Next step:")
            print("  -> Open p-ink.app/onboarding and enter the MAC")
            print("     address shown on the frame's screen to pair it.")
            print()

            # Drain remaining boot log
            print("  Boot log:")
            deadline = time.time() + 8.0
            while time.time() < deadline:
                try:
                    line = ser.readline().decode(errors="replace").strip()
                    if line:
                        print(f"    {line}")
                except serial.SerialException:
                    break
        else:
            print()
            print("Provisioning failed.")
            print()
            print("Common causes:")
            print("  - Wrong COM port        (run --list to see available ports)")
            print("  - Firmware not flashed  (pio run -t upload -e p-ink_s3)")
            print("  - Credentials already stored  (pio run -t erase then reflash)")
            print("  - Bad JSON              (don't use special chars in SSID/pass without quoting)")
            sys.exit(1)

    finally:
        ser.close()


if __name__ == "__main__":
    main()