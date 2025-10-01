// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");

const defaultConfig = getDefaultConfig(__dirname);

// Aktifkan require.context
defaultConfig.transformer.unstable_allowRequireContext = true;

module.exports = defaultConfig;
