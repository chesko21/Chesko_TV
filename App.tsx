import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { StatusBar } from "expo-status-bar";
import SplashScreen from "./src/screens/SplashScreen";
import HomeScreen from "./src/screens/HomeScreen";
import VideoScreen from "./src/components/VideoScreen";
import Settings from './src/components/Settings';
import "react-native-gesture-handler";
import * as ScreenOrientation from "expo-screen-orientation";
import NetInfo from "@react-native-community/netinfo";
import Toast from "react-native-toast-message";
import { View, Text, StyleSheet, Platform } from "react-native";
import { check, request, PERMISSIONS, RESULTS } from "react-native-permissions";
import * as NavigationBar from "expo-navigation-bar"; 


const Stack = createStackNavigator();

export default function App() {
  const [isOnline, setIsOnline] = useState(true);
  const visibility = NavigationBar.useVisibility()


useEffect(() => {
  const lockOrientation = async () => {
    await ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.LANDSCAPE
    );
  };
  lockOrientation();

  if (Platform.OS === "android") {
    NavigationBar.setVisibilityAsync("hidden");
    NavigationBar.setBackgroundColorAsync("#000000");
  }

  return () => {
    ScreenOrientation.unlockAsync();
    if (Platform.OS === "android") {
      NavigationBar.setVisibilityAsync("visible");
    }
  };
}, []);
  useEffect(() => {
    NetInfo.fetch().then((state) => {
      if (!state.isConnected) {
        setIsOnline(false);
        Toast.show({
          type: "error",
          position: "top",
          text1: "No internet connection",
          text2: "Please check your network.",
        });
      } else {
        setIsOnline(true);
      }
    });

    return () => {
      Toast.hide();
    };
  }, []);

  // Fungsi untuk meminta izin
  const requestPermissions = async () => {
    if (Platform.OS === "android") {
      const readStorage = await check(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
      const writeStorage = await check(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);

      if (readStorage !== RESULTS.GRANTED) {
        await request(PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE);
      }
      if (writeStorage !== RESULTS.GRANTED) {
        await request(PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE);
      }
    } else if (Platform.OS === "ios") {
      const photoLibrary = await check(PERMISSIONS.IOS.PHOTO_LIBRARY);
      if (photoLibrary !== RESULTS.GRANTED) {
        await request(PERMISSIONS.IOS.PHOTO_LIBRARY);
      }
    }
  };

  useEffect(() => {
    requestPermissions();
  }, []);

  if (!isOnline) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No internet connection</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar hidden={true} style="dark" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Settings" component={Settings} />
        <Stack.Screen name="VideoScreen" component={VideoScreen} />
      </Stack.Navigator>
      <Toast />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#020f1f",
    padding: '5%', // Added padding for responsiveness
  },
  errorText: {
    fontSize: 24, // Increased font size for better visibility on larger screens
    color: "red",
  },
});
