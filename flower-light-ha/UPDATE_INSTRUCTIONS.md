# CRITICAL: How to Properly Update the Integration

## The Problem

Home Assistant is **STILL using the old files** even though you may have copied new ones. This is because:
1. Home Assistant caches Python modules
2. The integration needs to be completely removed and re-added
3. Sometimes a simple restart isn't enough

## Step-by-Step Fix (Follow Exactly)

### Step 1: Remove the Integration Completely

1. **In Home Assistant UI**:
   - Go to Settings → Devices & Services
   - Find "Flower Light" 
   - Click the three dots (⋮) → Delete
   - Confirm deletion

2. **In Home Assistant UI again**:
   - Go to Settings → System → Restart
   - Wait for restart to complete

### Step 2: Delete Old Files Completely

**Via SSH** (recommended):
```bash
# SSH into Home Assistant
ssh root@homeassistant.local
# or
ssh homeassistant@homeassistant.local

# Remove old integration files completely
rm -rf /config/custom_components/flower_light

# Verify it's gone
ls /config/custom_components/
# flower_light should NOT be in the list
```

**Via File Editor** (if no SSH):
- Install "File editor" add-on if not installed
- Navigate to `/config/custom_components/`
- Delete the entire `flower_light` folder

### Step 3: Copy New Files

1. **Download the updated integration** from the outputs folder

2. **Copy to Home Assistant**:

**Via SSH**:
```bash
# Create the directory
mkdir -p /config/custom_components/flower_light

# Copy all files (you'll need to upload them first)
# Use SCP or SFTP to upload the files to /config/custom_components/flower_light/
```

**Via File Editor / Samba**:
- Create folder: `/config/custom_components/flower_light/`
- Copy ALL these files into it:
  - `__init__.py`
  - `manifest.json` ⭐ (CRITICAL - must be new version)
  - `const.py`
  - `device.py` ⭐ (CRITICAL - must be new version)
  - `config_flow.py`
  - `light.py`
  - `number.py`
  - `sensor.py`
  - `strings.json`
  - `hacs.json`

### Step 4: Verify the New Files

**Check manifest.json contains**:
```bash
cat /config/custom_components/flower_light/manifest.json
```

Should show:
```json
"requirements": ["bleak>=0.21.0", "bleak-retry-connector>=3.1.0", "msgpack>=1.0.0"]
```

⚠️ If you see just `["bleak>=0.21.0", "msgpack>=1.0.0"]` - the file wasn't updated!

**Check device.py contains**:
```bash
head -15 /config/custom_components/flower_light/device.py
```

Should show:
```python
from bleak_retry_connector import (
    BleakClientWithServiceCache,
    establish_connection,
)
```

⚠️ If you don't see this - the file wasn't updated!

### Step 5: Restart Home Assistant

```bash
# Via SSH
ha core restart

# OR in UI: Settings → System → Restart
```

### Step 6: Clear Browser Cache (Important!)

Press `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac) to hard refresh the page

### Step 7: Add Integration Again

1. Go to Settings → Devices & Services
2. Click "+ Add Integration"
3. Search for "Flower Light"
4. Select it
5. Choose your device from the list
6. Click Submit

## How to Know It Worked

### Success ✅:
- No warning about `bleak-retry-connector` in logs
- Device connects within 10-15 seconds
- Three entities appear: light, petal_position, battery

### Still Failing ❌:
- Same error message appears
- Check logs: Settings → System → Logs
- Search for "flower_light"

## If Still Getting the Error

The old files are STILL being used. Try this nuclear option:

### Nuclear Option: Full Clean

```bash
# SSH into Home Assistant
ssh root@homeassistant.local

# 1. Remove integration
rm -rf /config/custom_components/flower_light

# 2. Clear Python cache
rm -rf /config/.storage/core.restore_state
rm -rf /tmp/*

# 3. Restart container
docker restart homeassistant

# Wait 2 minutes for full restart

# 4. Copy new files again
mkdir -p /config/custom_components/flower_light
# Upload the new files

# 5. Restart again
docker restart homeassistant

# 6. Try adding integration
```

## Verification Script

Create this file to verify which version you have:

**check_version.sh**:
```bash
#!/bin/bash
echo "Checking Flower Light integration files..."
echo ""
echo "=== Checking manifest.json ==="
grep "bleak-retry-connector" /config/custom_components/flower_light/manifest.json
if [ $? -eq 0 ]; then
    echo "✅ manifest.json is UPDATED (has bleak-retry-connector)"
else
    echo "❌ manifest.json is OLD (missing bleak-retry-connector)"
fi

echo ""
echo "=== Checking device.py ==="
grep "establish_connection" /config/custom_components/flower_light/device.py
if [ $? -eq 0 ]; then
    echo "✅ device.py is UPDATED (has establish_connection)"
else
    echo "❌ device.py is OLD (missing establish_connection)"
fi

echo ""
echo "=== File timestamps ==="
ls -lh /config/custom_components/flower_light/ | grep -E "(manifest|device)"
```

Run it:
```bash
chmod +x check_version.sh
./check_version.sh
```

## Last Resort: Manual File Content

If nothing works, I can give you the EXACT content to copy-paste into each file via the File Editor.

Let me know which step you're stuck on!
