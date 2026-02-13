#!/bin/bash
# One-Command Fix for Flower Light Integration
# Run this on your Home Assistant host

set -e

echo "🌸 Flower Light Integration - Quick Fix Installer"
echo "=================================================="
echo ""

# Check if running on HA
if [ ! -d "/config" ]; then
    echo "❌ Error: /config directory not found"
    echo "This script must be run on the Home Assistant host"
    exit 1
fi

echo "📋 Step 1: Removing old integration..."
rm -rf /config/custom_components/flower_light
echo "✅ Old files removed"

echo ""
echo "📋 Step 2: Creating directory..."
mkdir -p /config/custom_components/flower_light
echo "✅ Directory created"

echo ""
echo "📋 Step 3: You need to manually copy the files now"
echo ""
echo "Copy these files to /config/custom_components/flower_light/:"
echo "  - __init__.py"
echo "  - manifest.json (MUST have bleak-retry-connector)"
echo "  - const.py"
echo "  - device.py (MUST have establish_connection)"
echo "  - config_flow.py"
echo "  - light.py"
echo "  - number.py"
echo "  - sensor.py"
echo "  - strings.json"
echo "  - hacs.json (optional)"
echo ""
echo "After copying files, restart Home Assistant:"
echo "  ha core restart"
echo ""
echo "Then add the integration via UI:"
echo "  Settings → Devices & Services → Add Integration → Flower Light"
