import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MapPin } from "lucide-react-native";
import * as Location from "expo-location";
import FieldMap from "@/components/maps/FieldMap";

export default function FieldsScreen() {
  const [location, setLocation] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // Ask for permission
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }

      // Get current position
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    })();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <MapPin size={36} color="#059669" />
        <Text style={styles.title}>My Field Location</Text>
      </View>

      {errorMsg ? (
        <Text style={styles.error}>{errorMsg}</Text>
      ) : location ? (
        <FieldMap location={location} />
      ) : (
        <ActivityIndicator size="large" color="#059669" />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0fdf4",
  },
  header: {
    alignItems: "center",
    marginVertical: 1,
    marginTop:30,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#052e16",
    marginTop: 8,
  },
  error: {
    color: "red",
    fontSize: 16,
    textAlign: "center",
    marginTop: 20,
  },
  map: {
    flex: 1,
    borderRadius: 42,
    margin: 0,
    marginTop:10,

  },
});
