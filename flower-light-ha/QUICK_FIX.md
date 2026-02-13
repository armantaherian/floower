# Quick Fix for Connection Issue

## The Problem

Home Assistant complained:
```
BleakClient.connect() called without bleak-retry-connector
```

This means the integration wasn't using the proper Bluetooth connection method that HA recommends.

## The Solution ✅

I've updated the integration to use `bleak-retry-connector`, which provides:
- Automatic retry logic for flaky connections
- Better connection caching
- More reliable Bluetooth communication
- Proper disconnect handling

## What Changed

**Files updated:**
1. `manifest.json` - Added `bleak-retry-connector` dependency
2. `device.py` - Switched from `BleakClient` to `establish_connection()`

## Installation Steps

### Option 1: Replace All Files (Recommended)

1. **Delete the old integration**:
   ```bash
   rm -rf /config/custom_components/flower_light
   ```

2. **Copy the new files**:
   - Download the updated `custom_components_flower_light` folder
   - Copy it to `/config/custom_components/flower_light/`

3. **Restart Home Assistant**:
   - Settings → System → Restart

4. **Add the device again**:
   - Settings → Devices & Services → Add Integration → Flower Light

### Option 2: Update Just Two Files (Faster)

1. **Update manifest.json**:
   Replace `/config/custom_components/flower_light/manifest.json` with the new version

2. **Update device.py**:
   Replace `/config/custom_components/flower_light/device.py` with the new version

3. **Restart Home Assistant**

4. **Try connecting again**

## Expected Behavior Now

When you try to add the device, you should see:

1. ✅ Device discovered in the list
2. ✅ Click device → Connection starts
3. ✅ Progress indicator (might take 5-10 seconds)
4. ✅ Success! Device added
5. ✅ Three entities appear: light, petal_position, battery

## If It Still Fails

Check the logs again (Settings → System → Logs) and look for:

### Good signs (these are OK):
```
Could not read manufacturer (this is OK)
Could not enable state notifications (this is OK)
Could not read device info (this is OK)
```

### Bad signs (actual problems):
```
Timeout connecting to...
BleakError: Device not found
org.bluez.Error.Failed
```

If you see bad signs:

1. **Make sure web app is closed** - This is still the #1 issue
2. **Power cycle the flower light** - Turn it off and on
3. **Check Bluetooth range** - Move closer to Raspberry Pi
4. **Restart Bluetooth**:
   ```bash
   sudo systemctl restart bluetooth
   ```

## Testing

After installing the fix, test it:

1. **Add the integration** (should work now)
2. **Turn on the light**:
   ```yaml
   service: light.turn_on
   target:
     entity_id: light.flower_light
   data:
     rgb_color: [255, 0, 0]
   ```
3. **Check if it turns red** ✅

If that works, you're all set! 🎉

## Why This Matters

The `bleak-retry-connector` library:
- Handles temporary Bluetooth disconnections
- Retries failed operations automatically
- Maintains a connection cache
- Is the standard for all HA Bluetooth integrations

Without it, connections are less reliable and HA shows that warning.

## Next Steps

Once connected:
- Try all the features (color, brightness, effects, petals)
- Create your first automation
- Add to your dashboard
- Check out the examples in README.md

Need more help? Check TROUBLESHOOTING.md for detailed debugging steps.
