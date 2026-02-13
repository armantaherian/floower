"""Sensor platform for Flower Light integration."""
from __future__ import annotations

import logging

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import PERCENTAGE
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .device import FlowerLightDevice

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Flower Light sensor entities."""
    device: FlowerLightDevice = hass.data[DOMAIN][entry.entry_id]
    
    async_add_entities([FlowerBatterySensor(device, entry)])


class FlowerBatterySensor(SensorEntity):
    """Battery sensor for Flower Light."""

    _attr_has_entity_name = True
    _attr_name = "Battery"
    _attr_device_class = SensorDeviceClass.BATTERY
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = PERCENTAGE

    def __init__(self, device: FlowerLightDevice, entry: ConfigEntry) -> None:
        """Initialize the sensor."""
        self._device = device
        self._attr_unique_id = f"{entry.unique_id}_battery"
        self._attr_device_info = {
            "identifiers": {(DOMAIN, entry.unique_id)},
        }

    @property
    def native_value(self) -> int | None:
        """Return the battery level."""
        return self._device.battery_level

    @property
    def available(self) -> bool:
        """Return if entity is available."""
        return self._device.is_connected

    async def async_update(self) -> None:
        """Update the battery level."""
        await self._device.update_battery()
