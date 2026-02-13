# Flower Light Connection Troubleshooting Guide

## Quick Fixes (Try These First)

### 1. **Disconnect from Web App**
The device can only maintain ONE Bluetooth connection at a time.

```bash
# Close your web browser completely
# Or clear the Bluetooth connection in browser DevTools:
# F12 → Application → Storage → Clear Site Data
```

### 2. **Power Cycle the Device**
- Turn off the flower light completely
- Wait 10 seconds
- Turn it back on
- Wait for it to fully boot (LED should stabilize)
- Try adding to HA again

### 3. **Check Bluetooth Range**
- Move the flower light closer to your Raspberry Pi (< 3 meters)
- Make sure there are no metal objects or walls blocking the signal

### 4. **Restart Home Assistant**
```bash
# In HA UI: Settings → System → Restart
# Or via SSH:
ha core restart
```

## Debugging Steps

### Step 1: Check Home Assistant Logs

**Location**: Settings → System → Logs

**Look for lines containing**: `flower_light`, `FlowerLight`, or `bleak`

**Common error messages and solutions**:

#### Error: "Timeout connecting to..."
```
Timeout connecting to XX:XX:XX:XX:XX:XX
```
**Solution**: 
- Device is out of range or powered off
- Check battery level
- Move closer to Raspberry Pi

#### Error: "BleakError: Device with address XX:XX:XX:XX:XX:XX was not found"
```
BleakError connecting to XX:XX:XX:XX:XX:XX: Device with address XX:XX:XX:XX:XX:XX was not found
```
**Solution**:
- Device is not advertising (might be connected to web app)
- Disconnect from all other devices
- Power cycle the flower light

#### Error: "bleak.exc.BleakDBusError: org.bluez.Error.InProgress"
```
BleakDBusError: org.bluez.Error.InProgress
```
**Solution**:
- Bluetooth stack is busy with another operation
- Restart Bluetooth service:
```bash
sudo systemctl restart bluetooth
```

#### Error: "Could not read manufacturer" or similar characteristic errors
```
Could not read manufacturer: [Errno X] ...
```
**Solution**:
- This is usually OK - the device may not have all optional characteristics
- If connection still fails, the device firmware might be different than expected

### Step 2: Check Bluetooth Service Status

```bash
# SSH into your Raspberry Pi
ssh homeassistant@homeassistant.local

# Check if Bluetooth is running
sudo systemctl status bluetooth

# If not running:
sudo systemctl start bluetooth
sudo systemctl enable bluetooth

# Check Bluetooth adapter
hciconfig

# Should show:
# hci0:   Type: Primary  Bus: UART
#         BD Address: XX:XX:XX:XX:XX:XX  ACL MTU: 1021:8  SCO MTU: 64:1
#         UP RUNNING
```

### Step 3: Verify Device is Discoverable

```bash
# Scan for BLE devices
sudo bluetoothctl
[bluetooth]# scan on

# Look for your flower light in the output
# Should show the service UUID: 28e17913-66c1-475f-a76e-86b5242f4cec

# To exit:
[bluetooth]# quit
```

### Step 4: Test Direct Connection

Create a test script to verify basic connectivity:

```python
# Save as test_flower.py
import asyncio
from bleak import BleakScanner, BleakClient

SERVICE_UUID = "28e17913-66c1-475f-a76e-86b5242f4cec"

async def test():
    print("Scanning for Flower Light...")
    devices = await BleakScanner.discover(timeout=10.0)
    
    flower = None
    for d in devices:
        if SERVICE_UUID.lower() in [s.lower() for s in d.metadata.get("uuids", [])]:
            print(f"Found Flower Light: {d.name} ({d.address})")
            flower = d
            break
    
    if not flower:
        print("No Flower Light found!")
        return
    
    print(f"Attempting to connect to {flower.address}...")
    async with BleakClient(flower.address, timeout=30.0) as client:
        print(f"Connected: {client.is_connected}")
        print(f"Services:")
        for service in client.services:
            print(f"  {service.uuid}")

asyncio.run(test())
```

Run it:
```bash
python3 test_flower.py
```

### Step 5: Check Integration Files

Verify all files are in the correct location:

```bash
ls -la /config/custom_components/flower_light/

# Should show:
# __init__.py
# manifest.json
# const.py
# device.py
# config_flow.py
# light.py
# number.py
# sensor.py
# strings.json
```

## Common Issues and Solutions

### Issue: "Integration doesn't appear in Add Integration list"

**Solutions**:
1. Verify files are in `/config/custom_components/flower_light/`
2. Check manifest.json is valid JSON (use https://jsonlint.com/)
3. Restart Home Assistant
4. Check logs for import errors

### Issue: "Device discovered but connection fails immediately"

**Likely causes**:
1. **Already connected elsewhere** - Close web app completely
2. **Low battery** - Charge the device
3. **Bluetooth interference** - Move away from WiFi routers, microwaves
4. **Multiple connection attempts** - Wait 30 seconds between attempts

**Try this**:
```bash
# Clear all Bluetooth pairings
sudo rm -rf /var/lib/bluetooth/*/*
sudo systemctl restart bluetooth
```

### Issue: "Connection works but entities don't appear"

This means the integration loaded but entity setup failed.

**Check logs for**:
- Errors in `light.py`, `number.py`, or `sensor.py`
- Missing dependencies

**Solution**:
```bash
# Reload the integration
# Settings → Devices & Services → Flower Light → ⋮ → Reload
```

### Issue: "msgpack not found" or import errors

**Solution**:
```bash
# SSH into HA
docker exec -it homeassistant /bin/bash

# Install dependencies
pip3 install msgpack bleak

# Exit and restart HA
exit
ha core restart
```

## Advanced Debugging

### Enable Debug Logging

Add to `configuration.yaml`:

```yaml
logger:
  default: info
  logs:
    custom_components.flower_light: debug
    bleak: debug
    homeassistant.components.bluetooth: debug
```

Restart HA and check logs again.

### Check Bluetooth Permissions

```bash
# Verify Home Assistant container can access Bluetooth
docker exec -it homeassistant ls -la /dev | grep bluetooth

# Should show:
# crw-rw---- 1 root bluetooth ... /dev/rfkill
```

### Test with Different Bluetooth Adapter

If you have a USB Bluetooth adapter:

```bash
# List adapters
hciconfig -a

# Try different adapter
# Edit /etc/bluetooth/main.conf
# ControllerMode = dual
```

## Still Not Working?

### Collect Debug Information

1. **Full logs**:
   ```bash
   # Download from Settings → System → Logs
   # Or via SSH:
   docker logs homeassistant > ha_logs.txt
   ```

2. **Bluetooth scan results**:
   ```bash
   sudo bluetoothctl
   [bluetooth]# scan on
   # Copy output
   ```

3. **Device details from web app**:
   - Open DevTools (F12) in your web browser
   - Connect with web app
   - Go to Console tab
   - Type: `state.device`
   - Copy the output

4. **Home Assistant info**:
   - Settings → About
   - Version, Installation type, OS

### Report Issue

Create an issue with:
- HA version and installation type
- Raspberry Pi model
- Full error logs
- Output from debugging steps above
- What you've already tried

## Workarounds

### Temporary: Use Web App as Bridge

If direct Bluetooth connection keeps failing, you can create a bridge:

1. Keep web app running on a computer/phone
2. Create a simple HTTP server that forwards commands
3. Use HA's REST integration to control it

(This is not ideal but can work as a temporary solution)

### Alternative: ESP32 Proxy

If your Raspberry Pi's Bluetooth is problematic:

1. Get an ESP32 board ($5)
2. Flash ESPHome with Bluetooth proxy
3. Configure HA to use ESP32's Bluetooth
4. Flower Light connects through ESP32 instead

**ESPHome config**:
```yaml
esphome:
  name: bluetooth-proxy

esp32:
  board: esp32dev

bluetooth_proxy:
  active: true
```

## Prevention Tips

1. **Don't connect to web app while using HA**
2. **Keep firmware updated** (if device has OTA updates)
3. **Monitor battery level** - low battery causes connection issues
4. **Keep device within 5 meters** of Raspberry Pi
5. **Restart HA weekly** to prevent Bluetooth stack issues

## Success Checklist

✅ Web app disconnected  
✅ Device powered on and charged  
✅ Within Bluetooth range (< 5m)  
✅ Bluetooth service running on HA  
✅ Integration files in correct location  
✅ No errors in HA logs  
✅ Device appears in Bluetooth scan  
✅ Home Assistant restarted after installing integration  

If all above are ✅ and it still fails, check for hardware issues with the device itself.
