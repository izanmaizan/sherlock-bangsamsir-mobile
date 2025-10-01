// app/(tabs)/notifikasi.tsx - UPDATED: Added comprehensive delete functions
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandColors } from "../../constants/Colors";
import { useAuth } from "../../contexts/AuthContext";
import apiService from "../../services/api";

interface Notification {
  id: number;
  judul: string;
  pesan: string;
  tipe: "info" | "success" | "warning" | "error" | "transaction" | "system";
  dibaca: boolean;
  created_at: string;
  priority?: "low" | "normal" | "high" | "urgent";
  action_url?: string;
}

interface NotificationStats {
  totalNotifications: number;
  unreadCount: number;
  todayCount: number;
  priorityCount: {
    urgent: number;
    high: number;
    normal: number;
    low: number;
  };
}

export default function NotifikasiScreen() {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"unread" | "all">("unread");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Refs untuk prevent multiple simultaneous calls
  const loadDataInProgress = useRef(false);
  const isInitialized = useRef(false);

  // Single consolidated fetch function untuk Next.js API
  const fetchNotifications = useCallback(
    async (skipIfLoading = true) => {
      // Prevent multiple simultaneous calls
      if (skipIfLoading && loadDataInProgress.current) {
        console.log(
          "⏸️ Notifications loading already in progress, skipping..."
        );
        return;
      }

      if (!user) {
        console.log("⏸️ No user found, skipping notifications fetch");
        return;
      }

      loadDataInProgress.current = true;

      try {
        console.log("📧 Starting notifications fetch from Next.js API...", {
          filter,
        });
        setError(null);

        const response = await apiService
          .getNotifications({
            limit: 50,
            unreadOnly: filter === "unread",
          })
          .catch((err) => {
            console.error("❌ Notifications API error:", err);
            return { success: false, error: err.message };
          });

        console.log("📊 Notifications API response:", response);

        if (response.success) {
          console.log(
            "✅ Notifications loaded from Next.js API:",
            response.notifications?.length || 0
          );

          setNotifications(response.notifications || []);
          setStats(
            response.stats || {
              totalNotifications: 0,
              unreadCount: 0,
              todayCount: 0,
              priorityCount: { urgent: 0, high: 0, normal: 0, low: 0 },
            }
          );
        } else {
          throw new Error(
            response.message || "Failed to fetch notifications from Next.js API"
          );
        }
      } catch (err: any) {
        console.error("❌ Error loading notifications:", err);
        setError(err.message || "Gagal memuat notifikasi");

        // Set empty fallback data instead of mock data
        setNotifications([]);
        setStats({
          totalNotifications: 0,
          unreadCount: 0,
          todayCount: 0,
          priorityCount: { urgent: 0, high: 0, normal: 0, low: 0 },
        });
      } finally {
        loadDataInProgress.current = false;
        setLoading(false);
        console.log("📊 Notifications fetch completed");
      }
    },
    [user, filter]
  );

  // Initialize data only once when user is available
  useEffect(() => {
    if (user && !isInitialized.current) {
      console.log("🚀 Initializing notifications for user:", user.username);
      isInitialized.current = true;
      setLoading(true);
      fetchNotifications(false);
    }
  }, [user, fetchNotifications]);

  // Refetch when filter changes
  useEffect(() => {
    if (user && isInitialized.current) {
      console.log("🔄 Filter changed, refetching notifications:", filter);
      setLoading(true);
      fetchNotifications(false);
    }
  }, [filter, fetchNotifications]);

  // Manual refresh handler
  const onRefresh = useCallback(async () => {
    if (refreshing || loadDataInProgress.current) {
      console.log("⏸️ Refresh already in progress");
      return;
    }

    setRefreshing(true);
    console.log("🔄 Manual refresh triggered");

    try {
      await fetchNotifications(false);

      // Emit event untuk update tab badge
      if (typeof global !== "undefined" && global.dispatchEvent) {
        global.dispatchEvent(new CustomEvent("notification-updated"));
      }
    } catch (err) {
      console.error("❌ Error during refresh:", err);
    } finally {
      setRefreshing(false);
      console.log("✅ Manual refresh completed");
    }
  }, [refreshing, fetchNotifications]);

  // Mark notification as read dengan Next.js API
  const markAsRead = async (id: number) => {
    if (actionLoading === id) return;

    try {
      setActionLoading(id);
      console.log(`📖 Marking notification ${id} as read via Next.js API...`);

      const response = await apiService.markNotificationAsRead(id);

      if (response.success) {
        console.log("✅ Notification marked as read");

        // Update local state
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === id ? { ...notif, dibaca: true } : notif
          )
        );

        // Update stats
        setStats((prev) =>
          prev
            ? {
                ...prev,
                unreadCount: Math.max(0, prev.unreadCount - 1),
              }
            : null
        );

        // Emit event untuk update tab badge
        if (typeof global !== "undefined" && global.dispatchEvent) {
          global.dispatchEvent(new CustomEvent("notification-read"));
        }

        if (!response.notification?.already_read) {
          Alert.alert("Berhasil", "Notifikasi ditandai sudah dibaca");
        }
      } else {
        throw new Error(response.message || "Failed to mark as read");
      }
    } catch (error: any) {
      console.error("❌ Error marking notification as read:", error);
      Alert.alert("Error", error.message || "Gagal menandai notifikasi");
    } finally {
      setActionLoading(null);
    }
  };

  // Mark all notifications as read dengan Next.js API
  const markAllAsRead = async () => {
    if (bulkActionLoading) return;

    try {
      setBulkActionLoading(true);
      console.log("📖 Marking all notifications as read via Next.js API...");

      const response = await apiService.markAllNotificationsAsRead();

      if (response.success) {
        console.log(`✅ Marked ${response.count || 0} notifications as read`);

        if (response.count > 0) {
          // Update local state
          setNotifications((prev) =>
            prev.map((notif) => ({ ...notif, dibaca: true }))
          );

          // Update stats
          setStats((prev) =>
            prev
              ? {
                  ...prev,
                  unreadCount: 0,
                }
              : null
          );

          // Emit event untuk update tab badge
          if (typeof global !== "undefined" && global.dispatchEvent) {
            global.dispatchEvent(new CustomEvent("all-notifications-read"));
          }

          Alert.alert(
            "Berhasil",
            `${response.count} notifikasi ditandai sudah dibaca`
          );
        } else {
          Alert.alert("Info", "Semua notifikasi sudah dibaca");
        }
      } else {
        throw new Error(response.message || "Failed to mark all as read");
      }
    } catch (error: any) {
      console.error("❌ Error marking all notifications as read:", error);
      Alert.alert("Error", error.message || "Gagal menandai semua notifikasi");
    } finally {
      setBulkActionLoading(false);
    }
  };

  // ✅ NEW: Delete single notification
  const deleteNotification = async (id: number) => {
    if (actionLoading === id) return;

    Alert.alert("Konfirmasi", "Hapus notifikasi ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          try {
            setActionLoading(id);
            console.log(`🗑️ Deleting notification ${id} via Next.js API...`);

            const response = await apiService.deleteNotification(id);

            if (response.success) {
              console.log("✅ Notification deleted");

              // Remove from local state
              const deletedNotification = notifications.find(
                (n) => n.id === id
              );
              setNotifications((prev) =>
                prev.filter((notif) => notif.id !== id)
              );

              // Update stats
              if (stats && deletedNotification) {
                setStats((prev) =>
                  prev
                    ? {
                        ...prev,
                        totalNotifications: Math.max(
                          0,
                          prev.totalNotifications - 1
                        ),
                        unreadCount: deletedNotification.dibaca
                          ? prev.unreadCount
                          : Math.max(0, prev.unreadCount - 1),
                      }
                    : null
                );
              }

              // Emit event untuk update tab badge jika unread
              if (
                !deletedNotification?.dibaca &&
                typeof global !== "undefined" &&
                global.dispatchEvent
              ) {
                global.dispatchEvent(new CustomEvent("notification-deleted"));
              }

              Alert.alert("Berhasil", "Notifikasi berhasil dihapus");
            } else {
              throw new Error(
                response.message || "Failed to delete notification"
              );
            }
          } catch (error: any) {
            console.error("❌ Error deleting notification:", error);
            Alert.alert("Error", error.message || "Gagal menghapus notifikasi");
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  };

  // ✅ NEW: Delete all read notifications
  const deleteReadNotifications = async () => {
    if (bulkActionLoading) return;

    const readCount = notifications.filter((n) => n.dibaca).length;

    if (readCount === 0) {
      Alert.alert(
        "Info",
        "Tidak ada notifikasi yang sudah dibaca untuk dihapus"
      );
      return;
    }

    Alert.alert(
      "Konfirmasi",
      `Hapus ${readCount} notifikasi yang sudah dibaca?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              setBulkActionLoading(true);
              console.log(
                "🗑️ Deleting all read notifications via Next.js API..."
              );

              const response = await apiService.deleteReadNotifications();

              if (response.success) {
                console.log(
                  `✅ Deleted ${response.count || 0} read notifications`
                );

                // Remove read notifications from local state
                setNotifications((prev) =>
                  prev.filter((notif) => !notif.dibaca)
                );

                // Update stats
                setStats((prev) =>
                  prev
                    ? {
                        ...prev,
                        totalNotifications: Math.max(
                          0,
                          prev.totalNotifications - readCount
                        ),
                      }
                    : null
                );

                Alert.alert(
                  "Berhasil",
                  `${
                    response.count || readCount
                  } notifikasi yang sudah dibaca berhasil dihapus`
                );
              } else {
                throw new Error(
                  response.message || "Failed to delete read notifications"
                );
              }
            } catch (error: any) {
              console.error("❌ Error deleting read notifications:", error);
              Alert.alert(
                "Error",
                error.message || "Gagal menghapus notifikasi yang sudah dibaca"
              );
            } finally {
              setBulkActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // ✅ NEW: Clear all notifications
  const clearAllNotifications = async () => {
    if (bulkActionLoading) return;

    const totalCount = notifications.length;

    if (totalCount === 0) {
      Alert.alert("Info", "Tidak ada notifikasi untuk dihapus");
      return;
    }

    Alert.alert(
      "Konfirmasi",
      `Hapus semua ${totalCount} notifikasi?\n\nTindakan ini tidak dapat dibatalkan.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus Semua",
          style: "destructive",
          onPress: async () => {
            try {
              setBulkActionLoading(true);
              console.log("🗑️ Clearing all notifications via Next.js API...");

              const response = await apiService.clearAllNotifications();

              if (response.success) {
                console.log(`✅ Cleared ${response.count || 0} notifications`);

                // Clear all notifications from local state
                setNotifications([]);

                // Reset stats
                setStats((prev) =>
                  prev
                    ? {
                        ...prev,
                        totalNotifications: 0,
                        unreadCount: 0,
                        todayCount: 0,
                        priorityCount: {
                          urgent: 0,
                          high: 0,
                          normal: 0,
                          low: 0,
                        },
                      }
                    : null
                );

                // Emit event untuk update tab badge
                if (typeof global !== "undefined" && global.dispatchEvent) {
                  global.dispatchEvent(
                    new CustomEvent("all-notifications-read")
                  );
                }

                Alert.alert(
                  "Berhasil",
                  `Semua ${
                    response.count || totalCount
                  } notifikasi berhasil dihapus`
                );
              } else {
                throw new Error(
                  response.message || "Failed to clear all notifications"
                );
              }
            } catch (error: any) {
              console.error("❌ Error clearing all notifications:", error);
              Alert.alert(
                "Error",
                error.message || "Gagal menghapus semua notifikasi"
              );
            } finally {
              setBulkActionLoading(false);
            }
          },
        },
      ]
    );
  };

  // ✅ NEW: Show bulk actions menu
  const showBulkActionsMenu = () => {
    const readCount = notifications.filter((n) => n.dibaca).length;
    const unreadCount = notifications.filter((n) => !n.dibaca).length;
    const totalCount = notifications.length;

    if (Platform.OS === "ios") {
      const options = ["Batal"];
      const destructiveButtonIndex = [];

      if (unreadCount > 0) {
        options.push(`Tandai Semua Dibaca (${unreadCount})`);
      }

      if (readCount > 0) {
        options.push(`Hapus Yang Sudah Dibaca (${readCount})`);
        destructiveButtonIndex.push(options.length - 1);
      }

      if (totalCount > 0) {
        options.push(`Hapus Semua (${totalCount})`);
        destructiveButtonIndex.push(options.length - 1);
      }

      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex,
          cancelButtonIndex: 0,
          title: "Kelola Notifikasi",
        },
        (buttonIndex) => {
          if (buttonIndex === 0) return; // Cancel

          let actionIndex = 0;

          if (unreadCount > 0) {
            actionIndex++;
            if (buttonIndex === actionIndex) {
              markAllAsRead();
              return;
            }
          }

          if (readCount > 0) {
            actionIndex++;
            if (buttonIndex === actionIndex) {
              deleteReadNotifications();
              return;
            }
          }

          if (totalCount > 0) {
            actionIndex++;
            if (buttonIndex === actionIndex) {
              clearAllNotifications();
              return;
            }
          }
        }
      );
    } else {
      // Android Alert with multiple actions
      Alert.alert("Kelola Notifikasi", "Pilih aksi yang ingin dilakukan:", [
        { text: "Batal", style: "cancel" },
        ...(unreadCount > 0
          ? [
              {
                text: `Tandai Semua Dibaca (${unreadCount})`,
                onPress: markAllAsRead,
              },
            ]
          : []),
        ...(readCount > 0
          ? [
              {
                text: `Hapus Yang Sudah Dibaca (${readCount})`,
                style: "destructive" as const,
                onPress: deleteReadNotifications,
              },
            ]
          : []),
        ...(totalCount > 0
          ? [
              {
                text: `Hapus Semua (${totalCount})`,
                style: "destructive" as const,
                onPress: clearAllNotifications,
              },
            ]
          : []),
      ]);
    }
  };

  const getNotificationIcon = (tipe: string, priority?: string) => {
    const iconProps = {
      size: 20,
      color:
        priority === "urgent"
          ? "#ef4444"
          : priority === "high"
          ? "#f97316"
          : BrandColors.primary,
    };

    switch (tipe) {
      case "transaction":
        return (
          <Ionicons name="wallet-outline" {...iconProps} color="#10b981" />
        );
      case "success":
        return (
          <Ionicons
            name="checkmark-circle-outline"
            {...iconProps}
            color="#10b981"
          />
        );
      case "warning":
        return (
          <Ionicons name="warning-outline" {...iconProps} color="#f59e0b" />
        );
      case "error":
        return (
          <Ionicons
            name="close-circle-outline"
            {...iconProps}
            color="#ef4444"
          />
        );
      case "system":
        return (
          <Ionicons name="settings-outline" {...iconProps} color="#6b7280" />
        );
      default:
        return (
          <Ionicons
            name="information-circle-outline"
            {...iconProps}
            color="#3b82f6"
          />
        );
    }
  };

  const getNotificationBg = (tipe: string, priority?: string) => {
    if (priority === "urgent") return "#fef2f2";
    if (priority === "high") return "#fff7ed";

    switch (tipe) {
      case "transaction":
        return "#f0fdf4";
      case "success":
        return "#f0fdf4";
      case "warning":
        return "#fffbeb";
      case "error":
        return "#fef2f2";
      case "system":
        return "#f9fafb";
      default:
        return "#eff6ff";
    }
  };

  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Baru saja";
    if (diffInMinutes < 60) return `${diffInMinutes} menit yang lalu`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} jam yang lalu`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} hari yang lalu`;

    return date.toLocaleDateString("id-ID");
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <View
      style={[
        styles.notificationItem,
        !item.dibaca && styles.unreadNotification,
        item.priority === "urgent" && styles.urgentNotification,
      ]}>
      <View style={styles.notificationContent}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: getNotificationBg(item.tipe, item.priority) },
          ]}>
          {getNotificationIcon(item.tipe, item.priority)}
        </View>

        <View style={styles.textContent}>
          <View style={styles.headerRow}>
            <Text
              style={[styles.title, !item.dibaca && styles.unreadTitle]}
              numberOfLines={2}>
              {item.judul}
            </Text>
            {!item.dibaca && <View style={styles.unreadDot} />}
          </View>

          {item.priority === "urgent" && (
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityText}>Urgent</Text>
            </View>
          )}

          {item.priority === "high" && (
            <View
              style={[styles.priorityBadge, { backgroundColor: "#fed7aa" }]}>
              <Text style={[styles.priorityText, { color: "#ea580c" }]}>
                Penting
              </Text>
            </View>
          )}

          <Text style={styles.message} numberOfLines={3}>
            {item.pesan}
          </Text>

          <View style={styles.actionRow}>
            <Text style={styles.timeText}>
              {getRelativeTime(item.created_at)}
            </Text>

            <View style={styles.actionButtons}>
              {!item.dibaca && (
                <TouchableOpacity
                  onPress={() => markAsRead(item.id)}
                  disabled={actionLoading === item.id}
                  style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>
                    {actionLoading === item.id ? "..." : "Tandai Dibaca"}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => deleteNotification(item.id)}
                disabled={actionLoading === item.id}
                style={[styles.actionButton, styles.deleteButton]}>
                <Text
                  style={[styles.actionButtonText, styles.deleteButtonText]}>
                  {actionLoading === item.id ? "..." : "Hapus"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name="notifications-outline"
          size={48}
          color={BrandColors.gray[400]}
        />
      </View>
      <Text style={styles.emptyTitle}>
        {filter === "unread" ? "Semua sudah dibaca" : "Belum ada notifikasi"}
      </Text>
      <Text style={styles.emptySubtitle}>
        {filter === "unread"
          ? "Semua notifikasi sudah ditandai sebagai dibaca"
          : "Notifikasi akan muncul di sini ketika ada aktivitas baru"}
      </Text>
      {error && (
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => fetchNotifications(false)}>
          <Text style={styles.retryButtonText}>Coba Lagi</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Memuat notifikasi...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const unreadCount = stats?.unreadCount || 0;
  const readCount = notifications.filter((n) => n.dibaca).length;
  const hasNotifications = notifications.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning-outline" size={20} color="#dc2626" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => fetchNotifications(false)}>
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Notifikasi</Text>
          <Text style={styles.headerSubtitle}>
            {unreadCount > 0
              ? `${unreadCount} notifikasi belum dibaca`
              : "Semua sudah dibaca"}
          </Text>
        </View>

        <View style={styles.headerActions}>
          {hasNotifications && (
            <TouchableOpacity
              style={styles.bulkActionButton}
              onPress={showBulkActionsMenu}
              disabled={bulkActionLoading}>
              <Ionicons
                name="ellipsis-vertical"
                size={20}
                color={BrandColors.white}
              />
            </TouchableOpacity>
          )}

          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.markAllButton}
              onPress={markAllAsRead}
              disabled={bulkActionLoading}>
              <Text style={styles.markAllButtonText}>
                {bulkActionLoading ? "..." : "Tandai Semua"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[
              styles.filterTab,
              filter === "unread" && styles.activeFilterTab,
            ]}
            onPress={() => setFilter("unread")}>
            <Text
              style={[
                styles.filterTabText,
                filter === "unread" && styles.activeFilterTabText,
              ]}>
              Belum Dibaca ({unreadCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterTab,
              filter === "all" && styles.activeFilterTab,
            ]}
            onPress={() => setFilter("all")}>
            <Text
              style={[
                styles.filterTabText,
                filter === "all" && styles.activeFilterTabText,
              ]}>
              Semua ({stats?.totalNotifications || 0})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        {hasNotifications && (
          <View style={styles.quickStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Total</Text>
              <Text style={styles.statValue}>
                {stats?.totalNotifications || 0}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Belum Dibaca</Text>
              <Text style={styles.statValue}>{unreadCount}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Sudah Dibaca</Text>
              <Text style={styles.statValue}>{readCount}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Notifications List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>
            Memuat notifikasi dari Next.js...
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderNotificationItem}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[BrandColors.primary]}
              tintColor={BrandColors.primary}
            />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.gray[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BrandColors.gray[50],
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: BrandColors.gray[600],
    textAlign: "center",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: "#dc2626",
    marginLeft: 8,
  },
  retryText: {
    fontSize: 14,
    color: "#2563eb",
    fontWeight: "600",
    marginLeft: 8,
  },
  header: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: BrandColors.white,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bulkActionButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  markAllButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  markAllButtonText: {
    color: BrandColors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  filterContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginTop: -15,
    position: "relative",
    zIndex: 10,
  },
  filterTabs: {
    backgroundColor: BrandColors.white,
    borderRadius: 15,
    padding: 4,
    flexDirection: "row",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  activeFilterTab: {
    backgroundColor: BrandColors.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: "600",
    color: BrandColors.gray[600],
  },
  activeFilterTabText: {
    color: BrandColors.white,
  },
  quickStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: BrandColors.white,
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 10,
    color: BrandColors.gray[500],
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: BrandColors.primary,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 120,
  },
  notificationItem: {
    backgroundColor: BrandColors.white,
    borderRadius: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BrandColors.gray[200],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadNotification: {
    borderColor: BrandColors.primary,
    backgroundColor: "#f0fdf4",
  },
  urgentNotification: {
    borderWidth: 2,
    borderColor: "#ef4444",
  },
  notificationContent: {
    flexDirection: "row",
    padding: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textContent: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: BrandColors.gray[900],
    flex: 1,
    marginRight: 8,
  },
  unreadTitle: {
    color: BrandColors.primary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BrandColors.primary,
    marginTop: 4,
  },
  priorityBadge: {
    backgroundColor: "#fecaca",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#dc2626",
  },
  message: {
    fontSize: 14,
    color: BrandColors.gray[600],
    lineHeight: 20,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeText: {
    fontSize: 12,
    color: BrandColors.gray[500],
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: BrandColors.gray[100],
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: BrandColors.primary,
  },
  deleteButton: {
    backgroundColor: "#fef2f2",
  },
  deleteButtonText: {
    color: "#dc2626",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    backgroundColor: BrandColors.gray[100],
    borderRadius: 40,
    padding: 20,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: BrandColors.gray[900],
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: BrandColors.gray[600],
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryButtonText: {
    color: BrandColors.white,
    fontSize: 14,
    fontWeight: "600",
  },
});
