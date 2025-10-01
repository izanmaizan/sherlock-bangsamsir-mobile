// app/(tabs)/_layout.tsx - FIXED: Sesuaikan dengan Next.js API
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandColors } from "../../constants/Colors";
import apiService from "../../services/api";

// Hook untuk notification badge - FIXED untuk Next.js API
function useNotificationBadge() {
  const [notificationCount, setNotificationCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const cacheRef = useRef<{ count: number; timestamp: number } | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const intervalRef = useRef<NodeJS.Timeout>();

  const fetchNotificationCount = useCallback(async () => {
    // Cache for 10 seconds
    const now = Date.now();
    if (cacheRef.current && now - cacheRef.current.timestamp < 10000) {
      setNotificationCount(cacheRef.current.count);
      return;
    }

    try {
      setLoading(true);

      console.log("🔔 Fetching notification count from Next.js API...");

      // ✅ FIXED: Gunakan endpoint Next.js yang benar dengan parameter yang tepat
      const response = await apiService.getNotifications({
        limit: 1,
        unreadOnly: true,
      });

      console.log("📊 Notification API response:", response);

      if (response.success && response.stats) {
        const unreadCount = response.stats.unreadCount || 0;
        console.log("✅ Unread notification count:", unreadCount);

        setNotificationCount(unreadCount);
        cacheRef.current = { count: unreadCount, timestamp: now };
      } else {
        console.warn("⚠️ Notification API response not successful:", response);
        setNotificationCount(0);
      }
    } catch (error: any) {
      console.error("❌ Failed to fetch notification count:", {
        message: error?.message || "Unknown error",
        status: error?.status || "No status",
        name: error?.name || "No name",
      });

      // Fallback ke 0 jika gagal
      setNotificationCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch dan setup interval
  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Debounced initial fetch
    timeoutRef.current = setTimeout(fetchNotificationCount, 100);

    // Set up interval untuk refresh setiap 30 detik
    intervalRef.current = setInterval(fetchNotificationCount, 30000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchNotificationCount]);

  // Listen untuk events dari notification screen
  useEffect(() => {
    const handleNotificationRead = () => {
      console.log("🔔 Notification marked as read, refreshing badge...");
      fetchNotificationCount();
    };

    const handleAllNotificationsRead = () => {
      console.log("🔔 All notifications marked as read, clearing badge...");
      setNotificationCount(0);
      cacheRef.current = { count: 0, timestamp: Date.now() };
    };

    // Listen untuk custom events dari notification screen
    if (typeof global !== "undefined" && global.addEventListener) {
      global.addEventListener("notification-read", handleNotificationRead);
      global.addEventListener(
        "all-notifications-read",
        handleAllNotificationsRead
      );

      return () => {
        global.removeEventListener("notification-read", handleNotificationRead);
        global.removeEventListener(
          "all-notifications-read",
          handleAllNotificationsRead
        );
      };
    }
  }, [fetchNotificationCount]);

  return {
    notificationCount,
    loading,
    refreshCount: fetchNotificationCount,
  };
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { notificationCount, loading } = useNotificationBadge();

  console.log(
    "📊 Tab Layout - Notification count:",
    notificationCount,
    "Loading:",
    loading
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: BrandColors.primary,
        tabBarInactiveTintColor: BrandColors.gray[500],
        tabBarStyle: {
          backgroundColor: BrandColors.white,
          borderTopWidth: 1,
          borderTopColor: BrandColors.gray[200],
          paddingBottom: Platform.OS === "android" ? insets.bottom + 5 : 5,
          paddingTop: 5,
          height: Platform.OS === "android" ? 65 + insets.bottom : 65,
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
          marginTop: 2,
        },
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="tabungan"
        options={{
          title: "Tabungan",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "wallet" : "wallet-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notifikasi"
        options={{
          title: "Notifikasi",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "notifications" : "notifications-outline"}
              size={24}
              color={color}
            />
          ),
          // ✅ FIXED: Dynamic badge berdasarkan notifikasi yang belum dibaca dari Next.js API
          tabBarBadge:
            notificationCount > 0
              ? notificationCount > 99
                ? "99+"
                : notificationCount
              : undefined,
          tabBarBadgeStyle: {
            backgroundColor: "#ef4444",
            color: "white",
            fontSize: 10,
            fontWeight: "600",
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            marginTop: -2,
            marginLeft: 2,
          },
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
