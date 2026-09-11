// Web mock for react-native-maps
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const Marker = ({ children }) => children || null;
export const Callout = ({ children }) => children || null;
export const Polygon = () => null;
export const Polyline = () => null;
export const Circle = () => null;
export const Overlay = () => null;
export const Heatmap = () => null;
export const Geojson = () => null;

const MapView = React.forwardRef(({ children, style, initialRegion, region }, ref) => {
  const lat = region?.latitude ?? initialRegion?.latitude;
  const lon = region?.longitude ?? initialRegion?.longitude;

  if (lat !== undefined && lon !== undefined) {
    const bbox = `${lon - 0.01}%2C${lat - 0.01}%2C${lon + 0.01}%2C${lat + 0.01}`;
    return (
      <View style={[styles.container, style]}>
        <iframe
          title="OpenStreetMap"
          width="100%"
          height="100%"
          style={{ border: 0, width: '100%', height: '100%', borderRadius: 16 }}
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lon}`}
        />
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.placeholder, style]}>
      <Text style={styles.text}>Map View (Web)</Text>
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    minHeight: 200,
  },
  placeholder: {
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#64748b',
    fontSize: 14,
  },
});

export default MapView;
export { MapView };
