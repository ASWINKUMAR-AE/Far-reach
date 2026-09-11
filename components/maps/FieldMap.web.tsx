import React from "react";
import { View, StyleSheet, Text } from "react-native";

interface FieldMapProps {
  location: { latitude: number; longitude: number };
}

export default function FieldMap({ location }: FieldMapProps) {
  const bbox = `${location.longitude - 0.01}%2C${location.latitude - 0.01}%2C${location.longitude + 0.01}%2C${location.latitude + 0.01}`;

  return (
    <View style={styles.mapContainer}>
      {/* @ts-ignore */}
      <iframe
        title="Field Map"
        width="100%"
        height="100%"
        style={{ border: 0, borderRadius: 24, width: "100%", height: "100%" }}
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${location.latitude}%2C${location.longitude}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 24,
    overflow: "hidden",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  },
});
