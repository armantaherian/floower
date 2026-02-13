# Floower Web App

Browser-based controller for the BLE protocol implemented in:
- `platformio/floower/src/connect/BluetoothConnect.cpp`
- `platformio/floower/src/connect/CommandProtocol.cpp`

## Requirements

- Chrome or Edge desktop (Web Bluetooth support)
- Secure context (`https://...`) or `http://localhost`
- Firmware based on `platformio/floower` (command characteristic UUID `03c6eedc-22b5-4a0e-9110-2cd0131cd528`)
- Node.js 18+ and OpenSSL (for local cert generation)

## Run on HTTPS localhost

From repository root:

```bash
cd webapp
npm run cert:generate
npm run dev:https
```

Open:

- `https://localhost:8443`

Then click `Connect` and choose your Floower device.

If browser warns about self-signed cert, proceed once for local development.

## Optional Environment Variables

- `PORT` (default `8443`)
- `HOST` (default `localhost`)
- `HTTPS_CERT` (default `./certs/localhost-cert.pem`)
- `HTTPS_KEY` (default `./certs/localhost-key.pem`)

## Supported Controls

- Live petals/color state + animations
- Wind mode: calm petals motion (web-driven periodic petals commands)
- Name
- Speed / brightness / max open level
- WiFi SSID/password + Floud device/token
- Color scheme (1-10 colors)
- Read-only battery, WiFi status, device info, token hash

## Notes

- This app writes the same command frames as firmware: `CommandMessageHeader` + MsgPack payload.
- BLE command path is write-only in firmware, so readbacks come from read/notify characteristics.
- Legacy sketch in `src/floower-esp32` uses a different BLE protocol and is not targeted by this UI.
