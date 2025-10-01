// app/_layout.tsx - Fixed version without problematic imports
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Platform, useColorScheme } from "react-native";
import "react-native-reanimated";

import { AuthProvider } from "../contexts/AuthContext";

export const unstable_settings = {
  anchor: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Hide splash screen after layout is ready
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: Platform.OS === "ios" ? "slide_from_right" : "fade",
          }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
              gestureEnabled: false, // Prevent swipe back on authenticated screens
            }}
          />
          <Stack.Screen
            name="withdrawal"
            options={{
              presentation: "modal",
              title: "Withdrawal",
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen
            name="ekonomi-sirkular"
            options={{
              presentation: "modal",
              title: "Ekonomi Sirkular",
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen
            name="edukasi"
            options={{
              presentation: "modal",
              title: "Edukasi",
              animation: "slide_from_bottom",
            }}
          />
        </Stack>
        <StatusBar
          style={colorScheme === "dark" ? "light" : "dark"}
          backgroundColor="transparent"
          translucent={true}
        />
      </ThemeProvider>
    </AuthProvider>
  );
}
