"""Light platform for Flower Light integration."""
from __future__ import annotations

import logging
from typing import Any

from homeassistant.components.light import (
    ATTR_BRIGHTNESS,
    ATTR_EFFECT,
    ATTR_RGB_COLOR,
    ATTR_TRANSITION,
    ColorMode,
    LightEntity,
    LightEntityFeature,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import (
    DEFAULT_TRANSITION_MS,
    DOMAIN,
    EFFECT_TO_ANIMATION_ID,
    EFFECT_WIND,
    EFFECT_LIST,
)
from .device import FlowerLightDevice

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Flower Light from a config entry."""
    device: FlowerLightDevice = hass.data[DOMAIN][entry.entry_id]
    
    async_add_entities([FlowerLight(device, entry)])


class FlowerLight(LightEntity):
    """Representation of a Flower Light."""

    _attr_has_entity_name = True
    _attr_name = None
    _attr_color_mode = ColorMode.RGB
    _attr_supported_color_modes = {ColorMode.RGB}
    _attr_supported_features = LightEntityFeature.EFFECT | LightEntityFeature.TRANSITION
    _attr_effect_list = EFFECT_LIST

    def __init__(self, device: FlowerLightDevice, entry: ConfigEntry) -> None:
        """Initialize the light."""
        self._device = device
        self._attr_effect = None
        self._attr_unique_id = f"{entry.unique_id}_light"
        self._attr_device_info = {
            "identifiers": {(DOMAIN, entry.unique_id)},
            "name": entry.title,
            "manufacturer": device.manufacturer or "Unknown",
            "model": device.model or "Flower Light",
            "sw_version": device.firmware_version,
        }
        
        # Set callback for state updates
        device.set_state_callback(self._handle_state_update)

    def _handle_state_update(self) -> None:
        """Handle state update from device."""
        if self._attr_effect == EFFECT_WIND and not self._device.wind_mode_active:
            self._attr_effect = None
        self.schedule_update_ha_state()

    @property
    def is_on(self) -> bool:
        """Return true if light is on."""
        return self._device.is_on

    @property
    def brightness(self) -> int:
        """Return the brightness of the light (0-255)."""
        # Device uses 0-100, HA uses 0-255
        return int(self._device.brightness * 2.55)

    @property
    def rgb_color(self) -> tuple[int, int, int]:
        """Return the RGB color value."""
        return self._device.rgb_color

    @property
    def available(self) -> bool:
        """Return if entity is available."""
        return self._device.is_connected

    async def async_turn_on(self, **kwargs: Any) -> None:
        """Turn on the light."""
        rgb = kwargs.get(ATTR_RGB_COLOR)
        brightness = kwargs.get(ATTR_BRIGHTNESS)
        effect = kwargs.get(ATTR_EFFECT)
        transition = kwargs.get(ATTR_TRANSITION, DEFAULT_TRANSITION_MS / 1000.0)
        
        # Convert HA transition (seconds) to device transition (milliseconds)
        transition_ms = int(transition * 1000)
        
        # Convert HA brightness (0-255) to device brightness (0-100)
        brightness_pct = None
        if brightness is not None:
            brightness_pct = int(brightness / 2.55)
        
        if effect:
            # Play animation effect
            if effect == EFFECT_WIND:
                await self._device.start_wind_mode()
                self._attr_effect = EFFECT_WIND
            else:
                animation_id = EFFECT_TO_ANIMATION_ID.get(effect)
                if animation_id is None:
                    _LOGGER.warning("Unsupported effect requested: %s", effect)
                    return
                await self._device.play_animation(animation_id)
                self._attr_effect = effect
        else:
            # Regular color/brightness change
            await self._device.turn_on(
                rgb=rgb,
                brightness=brightness_pct,
                transition=transition_ms,
            )
            self._attr_effect = None
        
        self.async_write_ha_state()

    async def async_turn_off(self, **kwargs: Any) -> None:
        """Turn off the light."""
        transition = kwargs.get(ATTR_TRANSITION, DEFAULT_TRANSITION_MS / 1000.0)
        transition_ms = int(transition * 1000)

        await self._device.stop_wind_mode()
        await self._device.turn_off(transition=transition_ms)
        self._attr_effect = None
        self.async_write_ha_state()
