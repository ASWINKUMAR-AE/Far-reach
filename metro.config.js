// metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  config.resolver.extraNodeModules = {
    ...(config.resolver.extraNodeModules || {}),
    'react-native/Libraries/Image/Image': require.resolve('react-native-web'),
    'react-native/Libraries/Image/ImageBackground': require.resolve('react-native-web'),
  };

  return config;
})();
