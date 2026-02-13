# Flower Light Home Assistant Integration

A custom Home Assistant integration for Bluetooth-controlled flower-shaped RGB lights with motorized petals.

## Features

- 🎨 **Full RGB Color Control** - Set any color with smooth transitions
- 🌸 **Petal Motion Control** - Open/close petals from 0-100%
- ✨ **Built-in Effects** - 8 pre-programmed animations (Breathing, Rainbow, Sunrise, Sunset, Party, Ocean, Forest, Fireplace)
- 🔋 **Battery Monitoring** - Track battery level
- ⚡ **Smooth Transitions** - Configurable transition times for color and petal changes
- 🎯 **Native HA Integration** - Works with automations, scenes, and scripts

## What You'll Get in Home Assistant

### Entities Created:

1. **Light Entity** (`light.flower_light`)
   - On/Off control
   - RGB color picker
   - Brightness slider (0-100%)
   - Effect selector (8 animations)
   - Transition time support

2. **Petal Position Control** (`number.flower_light_petal_position`)
   - Slider to control petal opening (0-100%)
   - Independent from color control

3. **Battery Sensor** (`sensor.flower_light_battery`)
   - Shows current battery percentage

## Installation

### Method 1: HACS (Recommended)

1. **Install HACS** if you haven't already: https://hacs.xyz/docs/setup/download

2. **Add Custom Repository**:
   - Go to HACS → Integrations
   - Click the three dots in the top right
   - Select "Custom repositories"
   - Add repository URL: `https://github.com/YOUR_USERNAME/flower-light-ha`
   - Category: Integration
   - Click "Add"

3. **Install the Integration**:
   - Search for "Flower Light" in HACS
   - Click "Download"
   - Restart Home Assistant

4. **Add the Device**:
   - Go to Settings → Devices & Services
   - Click "+ Add Integration"
   - Search for "Flower Light"
   - Select your device from the list
   - Click "Submit"

### Method 2: Manual Installation

1. **Download the Integration**:
   ```bash
   cd /config/custom_components
   git clone https://github.com/YOUR_USERNAME/flower-light-ha flower_light
   ```

2. **Restart Home Assistant**

3. **Add the Device**:
   - Go to Settings → Devices & Services
   - Click "+ Add Integration"
   - Search for "Flower Light"
   - Select your device from the list

## Usage Examples

### Basic Control

```yaml
# Turn on with specific color
service: light.turn_on
target:
  entity_id: light.flower_light
data:
  rgb_color: [255, 100, 150]
  brightness: 200
  transition: 2

# Open petals to 50%
service: number.set_value
target:
  entity_id: number.flower_light_petal_position
data:
  value: 50
```

### Automations

**Morning Wake-Up Animation**:
```yaml
automation:
  - alias: "Flower Morning Bloom"
    trigger:
      - platform: time
        at: "07:00:00"
    action:
      # Start with closed petals and dim light
      - service: number.set_value
        target:
          entity_id: number.flower_light_petal_position
        data:
          value: 0
      - service: light.turn_on
        target:
          entity_id: light.flower_light
        data:
          rgb_color: [255, 200, 100]  # Warm sunrise color
          brightness: 50
      - delay:
          seconds: 2
      # Gradually open petals
      - service: number.set_value
        target:
          entity_id: number.flower_light_petal_position
        data:
          value: 80
      # Increase brightness
      - service: light.turn_on
        target:
          entity_id: light.flower_light
        data:
          brightness: 255
          transition: 5
```

**Party Mode**:
```yaml
automation:
  - alias: "Flower Party Mode"
    trigger:
      - platform: state
        entity_id: input_boolean.party_mode
        to: "on"
    action:
      - service: light.turn_on
        target:
          entity_id: light.flower_light
        data:
          effect: "Party"
      - service: number.set_value
        target:
          entity_id: number.flower_light_petal_position
        data:
          value: 100
```

**Low Battery Notification**:
```yaml
automation:
  - alias: "Flower Light Low Battery"
    trigger:
      - platform: numeric_state
        entity_id: sensor.flower_light_battery
        below: 20
    action:
      - service: notify.mobile_app
        data:
          message: "Flower Light battery is low ({{ states('sensor.flower_light_battery') }}%)"
```

### Scripts

**Breathing Effect with Petal Motion**:
```yaml
script:
  flower_breathing:
    alias: "Flower Breathing Animation"
    sequence:
      - repeat:
          count: 10
          sequence:
            # Inhale - close petals, dim
            - service: number.set_value
              target:
                entity_id: number.flower_light_petal_position
              data:
                value: 30
            - service: light.turn_on
              target:
                entity_id: light.flower_light
              data:
                brightness: 100
                transition: 2
            - delay:
                seconds: 2
            # Exhale - open petals, brighten
            - service: number.set_value
              target:
                entity_id: number.flower_light_petal_position
              data:
                value: 80
            - service: light.turn_on
              target:
                entity_id: light.flower_light
              data:
                brightness: 255
                transition: 2
            - delay:
                seconds: 2
```

## Lovelace Dashboard Cards

**Basic Control Card**:
```yaml
type: entities
title: Flower Light
entities:
  - entity: light.flower_light
  - entity: number.flower_light_petal_position
  - entity: sensor.flower_light_battery
```

**Advanced Card with Effects**:
```yaml
type: vertical-stack
cards:
  - type: light
    entity: light.flower_light
    name: Flower Light
  - type: entities
    entities:
      - entity: number.flower_light_petal_position
        name: Petal Opening
      - entity: sensor.flower_light_battery
        name: Battery Level
  - type: button
    name: Sunrise Effect
    tap_action:
      action: call-service
      service: light.turn_on
      target:
        entity_id: light.flower_light
      data:
        effect: Sunrise
```

## Troubleshooting

### Device Not Found
- Ensure Bluetooth is enabled on your Raspberry Pi
- Make sure the flower light is powered on and in range
- Check that the device is not connected to your phone's web app
- Try restarting Home Assistant

### Connection Issues
- The device can only maintain one Bluetooth connection at a time
- Disconnect from the web app before adding to Home Assistant
- Check Home Assistant logs: Settings → System → Logs

### Commands Not Working
- Verify the device is shown as "Available" in HA
- Check battery level - low battery may cause issues
- Try reloading the integration: Settings → Devices & Services → Flower Light → ⋮ → Reload

## Development

### Project Structure
```
custom_components/flower_light/
├── __init__.py          # Integration setup
├── manifest.json        # Integration metadata
├── const.py            # Constants and UUIDs
├── device.py           # Bluetooth device communication
├── config_flow.py      # UI configuration
├── light.py            # Light entity
├── number.py           # Petal position control
├── sensor.py           # Battery sensor
└── strings.json        # UI translations
```

### Protocol Details

The device uses:
- **MessagePack** encoding for commands
- **Bluetooth LE GATT** characteristics
- Command structure: `{id: <int>, cmd: <command_type>, ...params}`

Main commands:
- `CMD_WRITE_STATE (67)` - Set color and petal position
- `CMD_WRITE_RGB_COLOR (65)` - Set RGB color only
- `CMD_WRITE_PETALS (64)` - Set petal position only
- `CMD_PLAY_ANIMATION (69)` - Play built-in effect

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - See LICENSE file for details

## Credits

Created by [Your Name]
Based on the Flower Light Bluetooth protocol

## Support

- Report issues: https://github.com/YOUR_USERNAME/flower-light-ha/issues
- Home Assistant Community: https://community.home-assistant.io/
