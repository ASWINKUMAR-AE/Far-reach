// metro.config.js
const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  config.resolver.extraNodeModules = {
    ...(config.resolver.extraNodeModules || {}),
    'react-native/Libraries/Image/Image': require.resolve('react-native-web'),
    'react-native/Libraries/Image/ImageBackground': require.resolve('react-native-web'),
  };

  const defaultResolveRequest = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === 'web' && (moduleName === 'react-native-maps' || moduleName.startsWith('react-native-maps/'))) {
      return {
        type: 'sourceFile',
        filePath: path.resolve(__dirname, 'components/maps/react-native-maps.web.js'),
      };
    }
    if (defaultResolveRequest) {
      return defaultResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  };

  return config;
})();
