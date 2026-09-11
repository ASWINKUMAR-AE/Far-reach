import React from "react";
import MapView, { Marker } from "react-native-maps";
import { StyleSheet } from "react-native";

interface FieldMapProps {
  location: { latitude: number; longitude: number };
}

export default function FieldMap({ location }: FieldMapProps) {
  return (
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
    >
      <Marker
        coordinate={{
          latitude: location.latitude,
          longitude: location.longitude,
        }}
        title="My Field"
        description="Current Location"
      />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
    borderRadius: 42,
    margin: 0,
    marginTop: 10,
  },
});
