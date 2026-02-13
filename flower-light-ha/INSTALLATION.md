# Quick Installation Guide

## Step 1: Prepare the Files

1. **Upload to GitHub**:
   - Create a new repository named `flower-light-ha`
   - Upload all files from the `custom_components/flower_light/` directory
   - Make sure the repository is public

2. **Update the README**:
   - Replace `YOUR_USERNAME` with your actual GitHub username in:
     - README.md
     - This installation guide

## Step 2: Install via HACS

### First Time HACS Setup:
If you don't have HACS installed:

1. Follow the HACS installation guide: https://hacs.xyz/docs/setup/download
2. Restart Home Assistant
3. Go to Settings → Devices & Services
4. Click "Add Integration" and search for "HACS"
5. Follow the authentication process

### Add Flower Light Integration:

1. **Open HACS**:
   - Sidebar → HACS → Integrations

2. **Add Custom Repository**:
   - Click the three dots (⋮) in the top right
   - Select "Custom repositories"
   - Paste: `https://github.com/YOUR_USERNAME/flower-light-ha`
   - Category: Integration
   - Click "Add"

3. **Install**:
   - Click "+ Explore & Download Repositories"
   - Search for "Flower Light"
   - Click "Download"
   - Restart Home Assistant

## Step 3: Add Your Device

1. **Navigate to Integrations**:
   - Settings → Devices & Services
   - Click "+ Add Integration" (bottom right)

2. **Search for Flower Light**:
   - Type "flower light" in the search box
   - Click on "Flower Light"

3. **Select Your Device**:
   - Your flower light should appear in the list
   - If it doesn't appear:
     * Make sure it's powered on
     * Make sure it's not connected to the web app
     * Make sure Bluetooth is enabled on your Raspberry Pi
     * Click "Refresh" or try again

4. **Confirm**:
   - Click "Submit"
   - Your device will be added!

## Step 4: Verify Installation

You should now see three new entities:

1. **Light Entity**: `light.flower_light`
   - Go to Overview → Click the light bulb icon
   - You can turn it on/off and change colors

2. **Petal Position**: `number.flower_light_petal_position`
   - Slider to control petal opening (0-100%)

3. **Battery Sensor**: `sensor.flower_light_battery`
   - Shows battery percentage

## Troubleshooting

### "No devices found"
- Power cycle the flower light
- Make sure it's in Bluetooth range (< 10 meters)
- Disconnect it from your phone/web app first
- Check Home Assistant logs: Settings → System → Logs

### "Cannot connect"
- The device only supports one connection at a time
- Close the web app if it's running
- Restart the flower light
- Restart Home Assistant

### Integration doesn't appear in HACS
- Make sure the repository is public on GitHub
- Verify the URL is correct
- Try clearing HACS cache: Settings → System → Repairs

## Alternative: Manual Installation

If HACS doesn't work, you can install manually:

1. **SSH into Home Assistant**:
   ```bash
   # Navigate to custom_components
   cd /config/custom_components
   
   # Create directory
   mkdir -p flower_light
   cd flower_light
   ```

2. **Copy Files**:
   - Download all files from your GitHub repository
   - Copy them to `/config/custom_components/flower_light/`

3. **File Structure Should Look Like**:
   ```
   /config/custom_components/flower_light/
   ├── __init__.py
   ├── manifest.json
   ├── const.py
   ├── device.py
   ├── config_flow.py
   ├── light.py
   ├── number.py
   ├── sensor.py
   ├── strings.json
   └── hacs.json
   ```

4. **Restart Home Assistant**

5. **Add Integration** (same as Step 3 above)

## Testing

Once installed, try this quick test:

1. **Turn on the light**:
   ```yaml
   service: light.turn_on
   target:
     entity_id: light.flower_light
   data:
     rgb_color: [255, 0, 0]  # Red
     brightness: 255
   ```

2. **Open petals**:
   ```yaml
   service: number.set_value
   target:
     entity_id: number.flower_light_petal_position
   data:
     value: 75
   ```

3. **Try an effect**:
   ```yaml
   service: light.turn_on
   target:
     entity_id: light.flower_light
   data:
     effect: "Rainbow"
   ```

If all three work, you're good to go! 🎉

## Next Steps

- Check out the automation examples in README.md
- Create your first scene or automation
- Add the device to your dashboard
- Consider creating a "wind mode" automation using the petal position

## Support

- GitHub Issues: https://github.com/YOUR_USERNAME/flower-light-ha/issues
- Home Assistant Community: https://community.home-assistant.io/
