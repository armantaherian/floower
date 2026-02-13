"""The Flower Light integration."""
from __future__ import annotations

import logging

from homeassistant.components import bluetooth
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_ADDRESS, Platform
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryNotReady

from .const import DOMAIN
from .device import FlowerLightDevice

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = [Platform.LIGHT, Platform.SENSOR, Platform.NUMBER]


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Flower Light from a config entry."""
    address = entry.unique_id or entry.data.get(CONF_ADDRESS)
    
    if not address:
        _LOGGER.error("No device address found in config entry")
        return False

    _LOGGER.debug("Setting up Flower Light at address: %s", address)

    # Get the BLE device from HA's bluetooth integration
    ble_device = bluetooth.async_ble_device_from_address(
        hass, address.upper(), connectable=True
    )
    
    if not ble_device:
        raise ConfigEntryNotReady(
            f"Could not find Flower Light device with address {address}"
        )

    # Create device instance with BLE device object
    device = FlowerLightDevice(
        ble_device=ble_device,
        name=entry.title,
    )

    # Connect to device
    try:
        if not await device.connect():
            raise ConfigEntryNotReady(f"Could not connect to Flower Light at {address}")
    except Exception as e:
        _LOGGER.error("Error connecting to device: %s", e, exc_info=True)
        raise ConfigEntryNotReady(f"Could not connect to Flower Light at {address}: {e}")

    # Store device instance
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = device

    # Forward to platforms
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    if unload_ok := await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        device: FlowerLightDevice = hass.data[DOMAIN].pop(entry.entry_id)
        await device.disconnect()

    return unload_ok
