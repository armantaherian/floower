const UUID = {
  serviceCommand: "28e17913-66c1-475f-a76e-86b5242f4cec",
  serviceConfig: "96f75832-8ce3-4800-b528-b39225282e9e",
  serviceConnect: "c1724350-5989-4741-a21b-5878621468fa",
  serviceBattery: 0x180f,
  serviceDeviceInfo: 0x180a,

  charCommand: "03c6eedc-22b5-4a0e-9110-2cd0131cd528",
  charState: "ac292c4b-8bd0-439b-9260-2d9526fff89a",

  charName: "ab130585-2b27-498e-a5a5-019391317350",
  charSpeed: "a54d8bbb-379b-425e-8d6e-84d0b20309aa",
  charBrightness: "2be47e11-088c-47aa-ae77-e2453d840833",
  charMaxOpen: "86bbd86c-6056-446e-a63b-ebb313bb65a5",
  charColorScheme: "10b8879e-0ea0-4fe2-9055-a244a1eaca8b",

  charWifiSsid: "31c43b5e-6aed-47b7-bf10-0c7bbd563024",
  charFloudDeviceId: "297a6db3-168a-42a6-9fbe-29e5c6e56f16",
  charFloudTokenHash: "8ba180d5-c5af-4240-a1e8-9314b1470874",
  charWifiStatus: "bf970815-44d5-416b-a737-0bf74195d4b5",

  charBatteryLevel: 0x2a19,
  charBatteryPowerState: 0x2a1a,

  charModel: 0x2a24,
  charSerial: 0x2a25,
  charFirmware: 0x2a26,
  charHardware: 0x2a27,
  charManufacturer: 0x2a29,
};

const CMD = {
  writePetals: 64,
  writeRgbColor: 65,
  writeState: 67,
  playAnimation: 69,
  runOtaUpdate: 70,
  writeWifi: 71,
  writeName: 74,
  writeCustomization: 75,
  writeColorScheme: 77,
};

const WIFI_STATUS_TEXT = {
  0: "Disabled",
  1: "Not configured",
  2: "Failed",
  3: "Floud unauthorized",
  4: "Floud connected",
  5: "Connecting",
};

const ui = {
  connectBtn: byId("connectBtn"),
  disconnectBtn: byId("disconnectBtn"),
  refreshBtn: byId("refreshBtn"),
  bleStatus: byId("bleStatus"),
  wifiStatus: byId("wifiStatus"),
  batteryStatus: byId("batteryStatus"),

  petalsInput: byId("petalsInput"),
  petalsValue: byId("petalsValue"),
  colorInput: byId("colorInput"),
  transitionInput: byId("transitionInput"),
  setStateBtn: byId("setStateBtn"),
  setPetalsBtn: byId("setPetalsBtn"),
  setColorBtn: byId("setColorBtn"),
  animationSelect: byId("animationSelect"),
  playAnimationBtn: byId("playAnimationBtn"),

  nameInput: byId("nameInput"),
  saveNameBtn: byId("saveNameBtn"),
  speedInput: byId("speedInput"),
  brightnessInput: byId("brightnessInput"),
  maxOpenInput: byId("maxOpenInput"),
  saveCustomizationBtn: byId("saveCustomizationBtn"),

  ssidInput: byId("ssidInput"),
  pwdInput: byId("pwdInput"),
  deviceIdInput: byId("deviceIdInput"),
  tokenInput: byId("tokenInput"),
  saveWifiBtn: byId("saveWifiBtn"),

  colorSchemeInput: byId("colorSchemeInput"),
  schemePreview: byId("schemePreview"),
  saveSchemeBtn: byId("saveSchemeBtn"),

  modelInfo: byId("modelInfo"),
  serialInfo: byId("serialInfo"),
  firmwareInfo: byId("firmwareInfo"),
  hardwareInfo: byId("hardwareInfo"),
  manufacturerInfo: byId("manufacturerInfo"),
  tokenHashInfo: byId("tokenHashInfo"),

  log: byId("log"),
};

const actionControlIds = [
  "setStateBtn",
  "setPetalsBtn",
  "setColorBtn",
  "playAnimationBtn",
  "saveNameBtn",
  "saveCustomizationBtn",
  "saveWifiBtn",
  "saveSchemeBtn",
];

const state = {
  device: null,
  server: null,
  services: {},
  chars: {},
  messageId: 1,
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

bindEvents();
setConnectedUi(false);
renderColorSchemePreview();
log("Ready. Use Chrome/Edge on HTTPS or http://localhost.");

function bindEvents() {
  ui.connectBtn.addEventListener("click", connect);
  ui.disconnectBtn.addEventListener("click", disconnect);
  ui.refreshBtn.addEventListener("click", refreshAll);

  ui.petalsInput.addEventListener("input", () => {
    ui.petalsValue.textContent = `${ui.petalsInput.value}%`;
  });

  ui.setStateBtn.addEventListener("click", async () => {
    try {
      const rgb = hexToRgb(ui.colorInput.value);
      await sendCommand(CMD.writeState, {
        l: clampInt(ui.petalsInput.value, 0, 100),
        r: rgb.r,
        g: rgb.g,
        b: rgb.b,
        t: clampInt(ui.transitionInput.value, 0, 60000),
      });
    } catch (err) {
      reportError(err);
    }
  });

  ui.setPetalsBtn.addEventListener("click", async () => {
    try {
      await sendCommand(CMD.writePetals, {
        l: clampInt(ui.petalsInput.value, 0, 100),
        t: clampInt(ui.transitionInput.value, 0, 60000),
      });
    } catch (err) {
      reportError(err);
    }
  });

  ui.setColorBtn.addEventListener("click", async () => {
    try {
      const rgb = hexToRgb(ui.colorInput.value);
      await sendCommand(CMD.writeRgbColor, {
        r: rgb.r,
        g: rgb.g,
        b: rgb.b,
        t: clampInt(ui.transitionInput.value, 0, 60000),
      });
    } catch (err) {
      reportError(err);
    }
  });

  ui.playAnimationBtn.addEventListener("click", async () => {
    try {
      const selected = Number.parseInt(ui.animationSelect.value, 10);
      if (Number.isNaN(selected) || selected < 0 || selected > 255) {
        throw new Error("Invalid animation selection.");
      }
      await sendCommand(CMD.playAnimation, {
        a: selected,
      });
    } catch (err) {
      reportError(err);
    }
  });

  ui.saveNameBtn.addEventListener("click", async () => {
    try {
      await sendCommand(CMD.writeName, {
        n: ui.nameInput.value.trim(),
      });
      await delay(150);
      await refreshConfigAndInfo();
    } catch (err) {
      reportError(err);
    }
  });

  ui.saveCustomizationBtn.addEventListener("click", async () => {
    try {
      await sendCommand(CMD.writeCustomization, {
        spd: clampInt(ui.speedInput.value, 5, 255),
        brg: clampInt(ui.brightnessInput.value, 0, 100),
        mol: clampInt(ui.maxOpenInput.value, 0, 100),
      });
      await delay(150);
      await refreshConfigAndInfo();
    } catch (err) {
      reportError(err);
    }
  });

  ui.saveWifiBtn.addEventListener("click", async () => {
    try {
      const payload = {
        ssid: ui.ssidInput.value,
        pwd: ui.pwdInput.value,
        dvc: ui.deviceIdInput.value,
        tkn: ui.tokenInput.value,
      };
      await sendCommand(CMD.writeWifi, payload);
      await delay(150);
      await refreshConfigAndInfo();
    } catch (err) {
      reportError(err);
    }
  });

  ui.colorSchemeInput.addEventListener("input", renderColorSchemePreview);

  ui.saveSchemeBtn.addEventListener("click", async () => {
    try {
      const colors = parseColorList(ui.colorSchemeInput.value);
      if (colors.length < 1 || colors.length > 10) {
        throw new Error("Color scheme must contain 1-10 colors.");
      }
      const encodedScheme = colors.map((hex) => encodeHsFromHex(hex));
      await sendCommand(CMD.writeColorScheme, encodedScheme);
      await delay(150);
      await refreshConfigAndInfo();
    } catch (err) {
      reportError(err);
    }
  });
}

async function connect() {
  if (!navigator.bluetooth) {
    reportError(new Error("Web Bluetooth is not available in this browser."));
    return;
  }

  try {
    state.device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [UUID.serviceCommand] }],
      optionalServices: [
        UUID.serviceConfig,
        UUID.serviceConnect,
        UUID.serviceBattery,
        UUID.serviceDeviceInfo,
      ],
    });

    state.device.addEventListener("gattserverdisconnected", onDisconnected);

    state.server = await state.device.gatt.connect();
    log(`Connected to ${state.device.name || state.device.id}.`);

    await discoverServicesAndCharacteristics();
    await startNotifications();
    setConnectedUi(true);
    ui.bleStatus.textContent = `Connected (${state.device.name || "Unnamed"})`;

    await refreshAll();
  } catch (err) {
    reportError(err);
  }
}

async function disconnect() {
  if (state.device?.gatt?.connected) {
    state.device.gatt.disconnect();
  }
  onDisconnected();
}

function onDisconnected() {
  log("Disconnected.");
  state.server = null;
  state.services = {};
  state.chars = {};
  setConnectedUi(false);
  ui.bleStatus.textContent = "Disconnected";
  ui.wifiStatus.textContent = "Unknown";
  ui.batteryStatus.textContent = "Unknown";
}

async function discoverServicesAndCharacteristics() {
  state.services.command = await state.server.getPrimaryService(UUID.serviceCommand);
  state.chars.command = await state.services.command.getCharacteristic(UUID.charCommand);
  state.chars.state = await state.services.command.getCharacteristic(UUID.charState);

  state.services.config = await getOptionalService(UUID.serviceConfig);
  state.services.connect = await getOptionalService(UUID.serviceConnect);
  state.services.battery = await getOptionalService(UUID.serviceBattery);
  state.services.deviceInfo = await getOptionalService(UUID.serviceDeviceInfo);

  if (state.services.config) {
    state.chars.name = await getOptionalCharacteristic(state.services.config, UUID.charName);
    state.chars.speed = await getOptionalCharacteristic(state.services.config, UUID.charSpeed);
    state.chars.brightness = await getOptionalCharacteristic(state.services.config, UUID.charBrightness);
    state.chars.maxOpen = await getOptionalCharacteristic(state.services.config, UUID.charMaxOpen);
    state.chars.colorScheme = await getOptionalCharacteristic(state.services.config, UUID.charColorScheme);
  }

  if (state.services.connect) {
    state.chars.wifiSsid = await getOptionalCharacteristic(state.services.connect, UUID.charWifiSsid);
    state.chars.floudDeviceId = await getOptionalCharacteristic(state.services.connect, UUID.charFloudDeviceId);
    state.chars.floudTokenHash = await getOptionalCharacteristic(state.services.connect, UUID.charFloudTokenHash);
    state.chars.wifiStatus = await getOptionalCharacteristic(state.services.connect, UUID.charWifiStatus);
  }

  if (state.services.battery) {
    state.chars.batteryLevel = await getOptionalCharacteristic(state.services.battery, UUID.charBatteryLevel);
    state.chars.batteryPowerState = await getOptionalCharacteristic(state.services.battery, UUID.charBatteryPowerState);
  }

  if (state.services.deviceInfo) {
    state.chars.model = await getOptionalCharacteristic(state.services.deviceInfo, UUID.charModel);
    state.chars.serial = await getOptionalCharacteristic(state.services.deviceInfo, UUID.charSerial);
    state.chars.firmware = await getOptionalCharacteristic(state.services.deviceInfo, UUID.charFirmware);
    state.chars.hardware = await getOptionalCharacteristic(state.services.deviceInfo, UUID.charHardware);
    state.chars.manufacturer = await getOptionalCharacteristic(state.services.deviceInfo, UUID.charManufacturer);
  }
}

async function getOptionalService(uuid) {
  try {
    return await state.server.getPrimaryService(uuid);
  } catch {
    return null;
  }
}

async function getOptionalCharacteristic(service, uuid) {
  try {
    return await service.getCharacteristic(uuid);
  } catch {
    return null;
  }
}

async function startNotifications() {
  await startNotify(state.chars.state, onStateNotification);
  await startNotify(state.chars.batteryLevel, onBatteryLevelNotification);
  await startNotify(state.chars.batteryPowerState, onBatteryPowerStateNotification);
  await startNotify(state.chars.wifiStatus, onWifiStatusNotification);
}

async function startNotify(characteristic, handler) {
  if (!characteristic || !characteristic.properties.notify) {
    return;
  }
  await characteristic.startNotifications();
  characteristic.addEventListener("characteristicvaluechanged", handler);
}

function onStateNotification(event) {
  applyStateData(event.target.value);
}

function onBatteryLevelNotification(event) {
  const level = event.target.value.getUint8(0);
  updateBatteryText(level, null);
}

function onBatteryPowerStateNotification(event) {
  const powerState = event.target.value.getUint8(0);
  updateBatteryText(null, powerState);
}

function onWifiStatusNotification(event) {
  const statusCode = event.target.value.getUint8(0);
  ui.wifiStatus.textContent = wifiStatusText(statusCode);
}

async function refreshAll() {
  if (!state.server) {
    return;
  }
  await refreshState();
  await refreshConfigAndInfo();
  await refreshBatteryAndWifiStatus();
  log("Refreshed values from device.");
}

async function refreshState() {
  const value = await state.chars.state.readValue();
  applyStateData(value);
}

function applyStateData(dataView) {
  if (!dataView || dataView.byteLength < 4) {
    return;
  }
  const petals = dataView.getInt8(0);
  const r = dataView.getUint8(1);
  const g = dataView.getUint8(2);
  const b = dataView.getUint8(3);

  ui.petalsInput.value = clampInt(petals, 0, 100);
  ui.petalsValue.textContent = `${ui.petalsInput.value}%`;
  ui.colorInput.value = rgbToHex(r, g, b);
}

async function refreshConfigAndInfo() {
  if (state.chars.name) {
    ui.nameInput.value = await readTextCharacteristic(state.chars.name);
  }
  if (state.chars.speed) {
    ui.speedInput.value = (await readU8Characteristic(state.chars.speed)).toString();
  }
  if (state.chars.brightness) {
    ui.brightnessInput.value = (await readU8Characteristic(state.chars.brightness)).toString();
  }
  if (state.chars.maxOpen) {
    ui.maxOpenInput.value = (await readU8Characteristic(state.chars.maxOpen)).toString();
  }

  if (state.chars.colorScheme) {
    const bytes = await readBytesCharacteristic(state.chars.colorScheme);
    const colors = decodeColorSchemeBytes(bytes);
    ui.colorSchemeInput.value = colors.join("\n");
    renderColorSchemePreview();
  }

  if (state.chars.wifiSsid) {
    ui.ssidInput.value = await readTextCharacteristic(state.chars.wifiSsid);
  }
  if (state.chars.floudDeviceId) {
    ui.deviceIdInput.value = await readTextCharacteristic(state.chars.floudDeviceId);
  }
  if (state.chars.floudTokenHash) {
    ui.tokenHashInfo.textContent = await readTextCharacteristic(state.chars.floudTokenHash);
  }

  if (state.chars.model) {
    ui.modelInfo.textContent = await readTextCharacteristic(state.chars.model);
  }
  if (state.chars.serial) {
    ui.serialInfo.textContent = await readTextCharacteristic(state.chars.serial);
  }
  if (state.chars.firmware) {
    ui.firmwareInfo.textContent = await readTextCharacteristic(state.chars.firmware);
  }
  if (state.chars.hardware) {
    ui.hardwareInfo.textContent = await readTextCharacteristic(state.chars.hardware);
  }
  if (state.chars.manufacturer) {
    ui.manufacturerInfo.textContent = await readTextCharacteristic(state.chars.manufacturer);
  }
}

async function refreshBatteryAndWifiStatus() {
  let level = null;
  let power = null;

  if (state.chars.batteryLevel) {
    level = await readU8Characteristic(state.chars.batteryLevel);
  }
  if (state.chars.batteryPowerState) {
    power = await readU8Characteristic(state.chars.batteryPowerState);
  }
  updateBatteryText(level, power);

  if (state.chars.wifiStatus) {
    const status = await readU8Characteristic(state.chars.wifiStatus);
    ui.wifiStatus.textContent = wifiStatusText(status);
  }
}

function updateBatteryText(level, powerState) {
  const current = ui.batteryStatus.textContent;
  const levelPart = level === null ? (current.match(/\d+%/)?.[0] ?? "?") : `${level}%`;

  let modePart = "";
  if (powerState !== null) {
    modePart = powerState === 0b00111011 ? "charging" : "battery";
  } else {
    modePart = current.includes("charging") ? "charging" : "battery";
  }
  ui.batteryStatus.textContent = `${levelPart} (${modePart})`;
}

function wifiStatusText(code) {
  return `${WIFI_STATUS_TEXT[code] || "Unknown"} (${code})`;
}

async function sendCommand(type, payload) {
  if (!state.chars.command) {
    throw new Error("Command characteristic is not available.");
  }

  const payloadBytes = payload === undefined || payload === null
    ? new Uint8Array(0)
    : encodeMsgPack(payload);

  if (payloadBytes.length > 255) {
    throw new Error(`Payload too large (${payloadBytes.length} > 255).`);
  }

  const packet = new Uint8Array(6 + payloadBytes.length);
  const view = new DataView(packet.buffer);

  view.setUint16(0, type, false);
  view.setUint16(2, state.messageId & 0xffff, false);
  view.setUint16(4, payloadBytes.length, false);
  packet.set(payloadBytes, 6);

  state.messageId = (state.messageId + 1) & 0xffff;

  if (state.chars.command.properties.writeWithoutResponse && state.chars.command.writeValueWithoutResponse) {
    await state.chars.command.writeValueWithoutResponse(packet);
  } else {
    await state.chars.command.writeValue(packet);
  }

  log(`Sent command ${type} (${payloadBytes.length} B)`);
}

async function readTextCharacteristic(characteristic) {
  const data = await characteristic.readValue();
  const bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  return decoder.decode(bytes);
}

async function readU8Characteristic(characteristic) {
  const data = await characteristic.readValue();
  return data.getUint8(0);
}

async function readBytesCharacteristic(characteristic) {
  const data = await characteristic.readValue();
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

function setConnectedUi(connected) {
  ui.connectBtn.disabled = connected;
  ui.disconnectBtn.disabled = !connected;
  ui.refreshBtn.disabled = !connected;

  for (const id of actionControlIds) {
    ui[id].disabled = !connected;
  }
}

function renderColorSchemePreview() {
  const colors = parseColorList(ui.colorSchemeInput.value, true);
  ui.schemePreview.innerHTML = "";
  for (const hex of colors.slice(0, 10)) {
    const swatch = document.createElement("div");
    swatch.className = "swatch";
    swatch.style.backgroundColor = hex;
    ui.schemePreview.appendChild(swatch);
  }
}

function parseColorList(raw, quiet = false) {
  if (!raw.trim()) {
    return [];
  }

  const tokens = raw
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const colors = [];
  for (const token of tokens) {
    const match = token.match(/^#?([0-9a-fA-F]{6})$/);
    if (!match) {
      if (quiet) {
        continue;
      }
      throw new Error(`Invalid color '${token}'. Use #RRGGBB format.`);
    }
    colors.push(`#${match[1].toLowerCase()}`);
  }

  if (!quiet && colors.length > 10) {
    throw new Error("Color scheme supports up to 10 colors.");
  }

  return quiet ? colors.slice(0, 10) : colors;
}

function decodeColorSchemeBytes(bytes) {
  const colors = [];
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    const encodedHs = (bytes[i] << 8) | bytes[i + 1];
    const hue = ((encodedHs >> 7) & 0x1ff) / 360;
    const sat = (encodedHs & 0x7f) / 100;
    const rgb = hsvToRgb(hue, sat, 1);
    colors.push(rgbToHex(rgb.r, rgb.g, rgb.b));
  }
  return colors;
}

function encodeHsFromHex(hex) {
  const rgb = hexToRgb(hex);
  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
  const h = clampInt(Math.floor(hsv.h * 360), 0, 511);
  const s = clampInt(Math.floor(hsv.s * 100), 0, 127);
  return (h << 7) | (s & 0x7f);
}

function rgbToHsv(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === rn) {
      h = ((gn - bn) / d) % 6;
    } else if (max === gn) {
      h = (bn - rn) / d + 2;
    } else {
      h = (rn - gn) / d + 4;
    }
    h /= 6;
    if (h < 0) {
      h += 1;
    }
  }

  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

function hsvToRgb(h, s, v) {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  let r = 0;
  let g = 0;
  let b = 0;

  switch (i % 6) {
    case 0:
      r = v;
      g = t;
      b = p;
      break;
    case 1:
      r = q;
      g = v;
      b = p;
      break;
    case 2:
      r = p;
      g = v;
      b = t;
      break;
    case 3:
      r = p;
      g = q;
      b = v;
      break;
    case 4:
      r = t;
      g = p;
      b = v;
      break;
    case 5:
      r = v;
      g = p;
      b = q;
      break;
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    throw new Error(`Invalid color ${hex}`);
  }
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHex(r, g, b) {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function toHex(v) {
  return clampInt(v, 0, 255).toString(16).padStart(2, "0");
}

function clampInt(value, min, max) {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) {
    return min;
  }
  return Math.max(min, Math.min(max, n));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function byId(id) {
  return document.getElementById(id);
}

function log(message) {
  const ts = new Date().toLocaleTimeString();
  ui.log.textContent = `[${ts}] ${message}\n${ui.log.textContent}`.slice(0, 12000);
}

function reportError(error) {
  const message = error instanceof Error ? error.message : String(error);
  log(`ERROR: ${message}`);
}

function encodeMsgPack(value) {
  const out = [];
  encodeValue(value, out);
  return Uint8Array.from(out);
}

function encodeValue(value, out) {
  if (value === null || value === undefined) {
    out.push(0xc0);
    return;
  }
  if (typeof value === "boolean") {
    out.push(value ? 0xc3 : 0xc2);
    return;
  }
  if (typeof value === "number") {
    encodeInteger(Math.trunc(value), out);
    return;
  }
  if (typeof value === "string") {
    encodeString(value, out);
    return;
  }
  if (Array.isArray(value)) {
    encodeArray(value, out);
    return;
  }
  if (typeof value === "object") {
    encodeMap(value, out);
    return;
  }
  throw new Error(`Unsupported MsgPack value type: ${typeof value}`);
}

function encodeInteger(value, out) {
  if (value >= 0) {
    if (value <= 0x7f) {
      out.push(value);
      return;
    }
    if (value <= 0xff) {
      out.push(0xcc, value);
      return;
    }
    if (value <= 0xffff) {
      out.push(0xcd, (value >> 8) & 0xff, value & 0xff);
      return;
    }
    if (value <= 0xffffffff) {
      out.push(0xce);
      pushU32(value, out);
      return;
    }
    throw new Error("Integer too large for this encoder.");
  }

  if (value >= -32) {
    out.push(0xe0 | (value + 32));
    return;
  }
  if (value >= -128) {
    out.push(0xd0, value & 0xff);
    return;
  }
  if (value >= -32768) {
    out.push(0xd1, (value >> 8) & 0xff, value & 0xff);
    return;
  }
  out.push(0xd2);
  pushU32(value >>> 0, out);
}

function encodeString(value, out) {
  const bytes = encoder.encode(value);
  const len = bytes.length;

  if (len <= 31) {
    out.push(0xa0 | len);
  } else if (len <= 255) {
    out.push(0xd9, len);
  } else if (len <= 65535) {
    out.push(0xda, (len >> 8) & 0xff, len & 0xff);
  } else {
    throw new Error("String too long for this encoder.");
  }

  for (const byte of bytes) {
    out.push(byte);
  }
}

function encodeArray(value, out) {
  const len = value.length;

  if (len <= 15) {
    out.push(0x90 | len);
  } else if (len <= 65535) {
    out.push(0xdc, (len >> 8) & 0xff, len & 0xff);
  } else {
    throw new Error("Array too long for this encoder.");
  }

  for (const item of value) {
    encodeValue(item, out);
  }
}

function encodeMap(value, out) {
  const entries = Object.entries(value).filter(([, v]) => v !== undefined);
  const len = entries.length;

  if (len <= 15) {
    out.push(0x80 | len);
  } else if (len <= 65535) {
    out.push(0xde, (len >> 8) & 0xff, len & 0xff);
  } else {
    throw new Error("Map too large for this encoder.");
  }

  for (const [key, val] of entries) {
    encodeString(key, out);
    encodeValue(val, out);
  }
}

function pushU32(value, out) {
  out.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
}
