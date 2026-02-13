"""Number platform for Flower Light integration."""
from __future__ import annotations

import logging

from homeassistant.components.number import NumberEntity, NumberMode
from homeassistant.config_entries import ConfigEntry
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
    """Set up Flower Light number entities."""
    device: FlowerLightDevice = hass.data[DOMAIN][entry.entry_id]
    
    async_add_entities([FlowerPetalPosition(device, entry)])


class FlowerPetalPosition(NumberEntity):
    """Number entity for controlling petal position."""

    _attr_has_entity_name = True
    _attr_name = "Petal Position"
    _attr_icon = "mdi:flower"
    _attr_native_min_value = 0
    _attr_native_max_value = 100
    _attr_native_step = 1
    _attr_native_unit_of_measurement = "%"
    _attr_mode = NumberMode.SLIDER

    def __init__(self, device: FlowerLightDevice, entry: ConfigEntry) -> None:
        """Initialize the number entity."""
        self._device = device
        self._attr_unique_id = f"{entry.unique_id}_petal_position"
        self._attr_device_info = {
            "identifiers": {(DOMAIN, entry.unique_id)},
        }

    @property
    def native_value(self) -> float:
        """Return the current petal position."""
        return self._device.petal_position

    @property
    def available(self) -> bool:
        """Return if entity is available."""
        return self._device.is_connected

    async def async_set_native_value(self, value: float) -> None:
        """Set the petal position."""
        await self._device.set_petal_position(int(value))
        self.async_write_ha_state()
