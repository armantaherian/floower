"""Config flow for Flower Light integration."""
from __future__ import annotations

import logging
from typing import Any

from bleak import BleakScanner
import voluptuous as vol

from homeassistant import config_entries
from homeassistant.components.bluetooth import (
    BluetoothServiceInfoBleak,
    async_discovered_service_info,
)
from homeassistant.const import CONF_ADDRESS, CONF_NAME
from homeassistant.data_entry_flow import FlowResult

from .const import DOMAIN, SERVICE_COMMAND

_LOGGER = logging.getLogger(__name__)


class FlowerLightConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Flower Light."""

    VERSION = 1

    def __init__(self) -> None:
        """Initialize the config flow."""
        self._discovered_devices: dict[str, BluetoothServiceInfoBleak] = {}

    async def async_step_bluetooth(
        self, discovery_info: BluetoothServiceInfoBleak
    ) -> FlowResult:
        """Handle bluetooth discovery."""
        _LOGGER.debug("Discovered Flower Light: %s", discovery_info)
        
        await self.async_set_unique_id(discovery_info.address)
        self._abort_if_unique_id_configured()

        self.context["title_placeholders"] = {
            "name": discovery_info.name or discovery_info.address
        }

        return await self.async_step_bluetooth_confirm()

    async def async_step_bluetooth_confirm(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Confirm discovery."""
        if user_input is not None:
            return self.async_create_entry(
                title=self.context["title_placeholders"]["name"],
                data={},
            )

        self._set_confirm_only()
        return self.async_show_form(
            step_id="bluetooth_confirm",
            description_placeholders=self.context["title_placeholders"],
        )

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Handle user-initiated setup."""
        if user_input is not None:
            address = user_input[CONF_ADDRESS]
            await self.async_set_unique_id(address)
            self._abort_if_unique_id_configured()
            
            device_info = self._discovered_devices[address]
            
            return self.async_create_entry(
                title=device_info.name or address,
                data={
                    CONF_ADDRESS: address,
                    CONF_NAME: device_info.name,
                },
            )

        # Discover nearby Flower Light devices
        current_addresses = self._async_current_ids()
        
        # Use Home Assistant's Bluetooth integration to find devices
        for discovery_info in async_discovered_service_info(self.hass):
            if discovery_info.address in current_addresses:
                continue
            # Check if device advertises the Flower Light service
            if SERVICE_COMMAND.lower() in [
                s.lower() for s in discovery_info.service_uuids
            ]:
                self._discovered_devices[discovery_info.address] = discovery_info

        if not self._discovered_devices:
            return self.async_abort(reason="no_devices_found")

        # Create list for user selection
        devices = {
            address: f"{info.name or 'Unknown'} ({address})"
            for address, info in self._discovered_devices.items()
        }

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_ADDRESS): vol.In(devices),
                }
            ),
        )
