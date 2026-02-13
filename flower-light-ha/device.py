"""Flower Light BLE device communication."""
import asyncio
import logging
import struct
from typing import Any, Callable

import msgpack
from bleak import BleakClient
from bleak.exc import BleakError
from bleak_retry_connector import (
    BleakClientWithServiceCache,
    establish_connection,
)

from .const import (
    CHAR_BATTERY_LEVEL,
    CHAR_BRIGHTNESS,
    CHAR_COMMAND,
    CHAR_FIRMWARE,
    CHAR_MANUFACTURER,
    CHAR_MAX_OPEN,
    CHAR_MODEL,
    CHAR_NAME,
    CHAR_SERIAL,
    CHAR_SPEED,
    CHAR_STATE,
    CMD_PLAY_ANIMATION,
    CMD_WRITE_CUSTOMIZATION,
    CMD_WRITE_PETALS,
    CMD_WRITE_RGB_COLOR,
    CMD_WRITE_STATE,
)

_LOGGER = logging.getLogger(__name__)


class FlowerLightDevice:
    """Represents a Flower Light BLE device."""

    def __init__(self, ble_device, name: str | None = None) -> None:
        """Initialize the device."""
        self._ble_device = ble_device
        self.address = ble_device.address
        self.name = name or ble_device.name or "Flower Light"
        self._client: BleakClientWithServiceCache | None = None
        self._message_id = 1
        self._is_on = False
        self._brightness = 100
        self._rgb_color = (255, 255, 255)
        self._petal_position = 0
        self._battery_level = None
        self._callback: Callable | None = None
        self._model = None
        self._manufacturer = None
        self._firmware = None
        self._serial = None

    async def connect(self) -> bool:
        """Connect to the device."""
        try:
            _LOGGER.debug("Attempting to connect to %s (%s)", self.name, self.address)
            
            # Use bleak_retry_connector for reliable connection
            self._client = await establish_connection(
                BleakClientWithServiceCache,
                self._ble_device,
                self.name,
                disconnected_callback=self._handle_disconnect,
            )
            
            _LOGGER.info("Connected to %s (%s)", self.name, self.address)
            
            # Give device a moment to settle
            await asyncio.sleep(0.5)
            
            # Start notifications for state updates (optional, don't fail if unavailable)
            try:
                await self._client.start_notify(CHAR_STATE, self._notification_handler)
                _LOGGER.debug("State notifications enabled")
            except Exception as e:
                _LOGGER.debug("Could not enable state notifications (this is OK): %s", e)

            # Acknowledge takeover so device can exit pairing mode.
            # Empty CMD_WRITE_STATE triggers the firmware remote-control callback
            # without changing petals/color values.
            try:
                await self._send_command(CMD_WRITE_STATE, {})
                _LOGGER.debug("Sent pairing acknowledgment command")
            except Exception as e:
                _LOGGER.debug("Could not send pairing acknowledgment: %s", e)
            
            # Read initial state (optional, don't fail connection)
            try:
                await self._read_device_info()
            except Exception as e:
                _LOGGER.debug("Could not read device info (this is OK): %s", e)
            
            try:
                await self._read_config()
            except Exception as e:
                _LOGGER.debug("Could not read config (this is OK): %s", e)
            
            return True
            
        except asyncio.TimeoutError:
            _LOGGER.error("Timeout connecting to %s", self.address)
            return False
        except BleakError as e:
            _LOGGER.error("BleakError connecting to %s: %s", self.address, e)
            return False
        except Exception as e:
            _LOGGER.error("Unexpected error connecting to %s: %s", self.address, e, exc_info=True)
            return False

    def _handle_disconnect(self, client: BleakClient) -> None:
        """Handle disconnection."""
        _LOGGER.warning("Device %s disconnected", self.address)
        if self._callback:
            self._callback()

    async def disconnect(self) -> None:
        """Disconnect from the device."""
        if self._client and self._client.is_connected:
            try:
                await self._client.stop_notify(CHAR_STATE)
            except Exception:
                pass
            await self._client.disconnect()
            _LOGGER.info("Disconnected from %s", self.name)

    @property
    def is_connected(self) -> bool:
        """Return if device is connected."""
        return self._client is not None and self._client.is_connected

    def set_state_callback(self, callback: Callable) -> None:
        """Set callback for state updates."""
        self._callback = callback

    def _notification_handler(self, sender, data: bytearray) -> None:
        """Handle notifications from the device."""
        _LOGGER.debug("Received notification: %s", data.hex())
        # Parse state updates here if needed
        # The JS code suggests device sends state updates via this characteristic
        if self._callback:
            self._callback()

    async def _send_command(self, cmd_type: int, payload: dict[str, Any]) -> None:
        """Send a command to the device."""
        if not self.is_connected:
            raise BleakError("Device not connected")

        # Firmware expects: [type(2B)][id(2B)][payload_len(2B)] + msgpack payload
        payload_bytes = msgpack.packb(payload or {}, use_bin_type=True)
        if len(payload_bytes) > 255:
            raise ValueError(f"Command payload too large: {len(payload_bytes)} bytes")

        message_id = self._message_id & 0xFFFF
        packet = struct.pack(">HHH", cmd_type, message_id, len(payload_bytes)) + payload_bytes
        self._message_id = (message_id + 1) & 0xFFFF

        _LOGGER.debug(
            "Sending command type=%s id=%s payload=%s packet=%s",
            cmd_type,
            message_id,
            payload,
            packet.hex(),
        )

        await self._client.write_gatt_char(CHAR_COMMAND, packet, response=True)

    async def turn_on(
        self,
        rgb: tuple[int, int, int] | None = None,
        brightness: int | None = None,
        petal_position: int | None = None,
        transition: int = 1000,
    ) -> None:
        """Turn on the light."""
        if rgb is not None:
            self._rgb_color = rgb
        if brightness is not None:
            self._brightness = brightness
        if petal_position is not None:
            self._petal_position = petal_position

        r, g, b = self._rgb_color
        
        # Apply brightness to RGB values
        brightness_factor = self._brightness / 100.0
        r = int(r * brightness_factor)
        g = int(g * brightness_factor)
        b = int(b * brightness_factor)

        await self._send_command(
            CMD_WRITE_STATE,
            {
                "l": self._petal_position,  # petal level (0-100)
                "r": r,
                "g": g,
                "b": b,
                "t": transition,  # transition time in ms
            },
        )
        self._is_on = True

    async def turn_off(self, transition: int = 1000) -> None:
        """Turn off the light."""
        await self._send_command(
            CMD_WRITE_STATE,
            {
                "l": self._petal_position,
                "r": 0,
                "g": 0,
                "b": 0,
                "t": transition,
            },
        )
        self._is_on = False

    async def set_rgb_color(
        self, r: int, g: int, b: int, transition: int = 1000
    ) -> None:
        """Set RGB color."""
        self._rgb_color = (r, g, b)
        
        # Apply brightness
        brightness_factor = self._brightness / 100.0
        r = int(r * brightness_factor)
        g = int(g * brightness_factor)
        b = int(b * brightness_factor)
        
        await self._send_command(
            CMD_WRITE_RGB_COLOR,
            {"r": r, "g": g, "b": b, "t": transition},
        )

    async def set_petal_position(self, level: int, transition: int = 1000) -> None:
        """Set petal opening position (0-100%)."""
        self._petal_position = max(0, min(100, level))
        await self._send_command(
            CMD_WRITE_PETALS,
            {"l": self._petal_position, "t": transition},
        )

    async def play_animation(self, animation_id: int) -> None:
        """Play a built-in animation."""
        await self._send_command(CMD_PLAY_ANIMATION, {"a": animation_id})

    async def set_brightness_config(self, brightness: int) -> None:
        """Set the device's brightness configuration (0-100)."""
        await self._send_command(
            CMD_WRITE_CUSTOMIZATION,
            {
                "brg": max(0, min(100, brightness)),
            },
        )

    async def _read_device_info(self) -> None:
        """Read device information."""
        if not self.is_connected:
            return

        # Try to read each characteristic, but don't fail if any are missing
        try:
            data = await self._client.read_gatt_char(CHAR_MANUFACTURER)
            self._manufacturer = data.decode("utf-8", errors="ignore").strip("\x00")
            _LOGGER.debug("Manufacturer: %s", self._manufacturer)
        except Exception as e:
            _LOGGER.debug("Could not read manufacturer: %s", e)
            self._manufacturer = "Unknown"

        try:
            data = await self._client.read_gatt_char(CHAR_MODEL)
            self._model = data.decode("utf-8", errors="ignore").strip("\x00")
            _LOGGER.debug("Model: %s", self._model)
        except Exception as e:
            _LOGGER.debug("Could not read model: %s", e)
            self._model = "Flower Light"

        try:
            data = await self._client.read_gatt_char(CHAR_FIRMWARE)
            self._firmware = data.decode("utf-8", errors="ignore").strip("\x00")
            _LOGGER.debug("Firmware: %s", self._firmware)
        except Exception as e:
            _LOGGER.debug("Could not read firmware: %s", e)

        try:
            data = await self._client.read_gatt_char(CHAR_SERIAL)
            self._serial = data.decode("utf-8", errors="ignore").strip("\x00")
            _LOGGER.debug("Serial: %s", self._serial)
        except Exception as e:
            _LOGGER.debug("Could not read serial: %s", e)

    async def _read_config(self) -> None:
        """Read device configuration."""
        if not self.is_connected:
            return

        try:
            data = await self._client.read_gatt_char(CHAR_NAME)
            device_name = data.decode("utf-8", errors="ignore").strip("\x00")
            if device_name:
                self.name = device_name
                _LOGGER.debug("Device name: %s", device_name)
        except Exception as e:
            _LOGGER.debug("Could not read name: %s", e)

        try:
            data = await self._client.read_gatt_char(CHAR_BRIGHTNESS)
            if len(data) > 0:
                self._brightness = data[0]
                _LOGGER.debug("Brightness config: %s", self._brightness)
        except Exception as e:
            _LOGGER.debug("Could not read brightness: %s", e)

    async def update_battery(self) -> int | None:
        """Update battery level."""
        if not self.is_connected:
            return None

        try:
            data = await self._client.read_gatt_char(CHAR_BATTERY_LEVEL)
            if len(data) > 0:
                self._battery_level = data[0]
                return self._battery_level
        except Exception as e:
            _LOGGER.debug("Could not read battery level: %s", e)
        return None

    @property
    def is_on(self) -> bool:
        """Return if light is on."""
        return self._is_on

    @property
    def brightness(self) -> int:
        """Return brightness (0-100)."""
        return self._brightness

    @property
    def rgb_color(self) -> tuple[int, int, int]:
        """Return RGB color."""
        return self._rgb_color

    @property
    def petal_position(self) -> int:
        """Return petal position (0-100)."""
        return self._petal_position

    @property
    def battery_level(self) -> int | None:
        """Return battery level."""
        return self._battery_level

    @property
    def model(self) -> str | None:
        """Return device model."""
        return self._model

    @property
    def manufacturer(self) -> str | None:
        """Return manufacturer."""
        return self._manufacturer

    @property
    def firmware_version(self) -> str | None:
        """Return firmware version."""
        return self._firmware

    @property
    def serial_number(self) -> str | None:
        """Return serial number."""
        return self._serial
