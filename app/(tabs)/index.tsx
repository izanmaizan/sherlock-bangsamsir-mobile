// app/(tabs)/index.tsx - UPDATED: Added background image to header
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandColors } from "../../constants/Colors";
import { useAuth } from "../../contexts/AuthContext";
import apiService from "../../services/api";

interface WasteType {
  id: number;
  name: string;
  price: number;
  price_label: string;
  harga_pegawai: number;
  harga_non_pegawai: number;
  harga_per_kg: number;
  is_user_pegawai: boolean;
  user_authenticated: boolean;
  collected: number;
  value: number;
  transactions: number;
  icon: string;
  gradient: string;
}

interface UserInfo {
  id?: number;
  username?: string;
  nama_lengkap?: string;
  is_pegawai: boolean;
  pegawai_raw?: any;
  authenticated: boolean;
  nip?: string;
}

interface TabunganStats {
  totalTransaksi: number;
  totalBerat: number;
  totalNilai: number;
  totalPoin: number;
  breakdown: any;
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user, logout, loading: authLoading, refreshUser } = useAuth();

  // State for API data
  const [wasteTypes, setWasteTypes] = useState<WasteType[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [tabunganStats, setTabunganStats] = useState<TabunganStats | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [saldoVisible, setSaldoVisible] = useState(true);
  const [pricesVisible, setPricesVisible] = useState(true);

  // CRITICAL: Refs untuk prevent multiple simultaneous calls
  const loadDataInProgress = useRef(false);
  const isInitialized = useRef(false);

  // FIXED: Single consolidated fetch function dengan debouncing
  const fetchAllData = useCallback(
    async (skipIfLoading = true) => {
      // Prevent multiple simultaneous calls
      if (skipIfLoading && loadDataInProgress.current) {
        console.log("⏸️ Data loading already in progress, skipping...");
        return;
      }

      if (!user) {
        console.log("⏸️ No user found, skipping data fetch");
        return;
      }

      loadDataInProgress.current = true;

      try {
        console.log("🔄 Starting consolidated data fetch...");
        setError(null);

        // Fetch all data in parallel - ONLY ONCE
        const [wasteTypesResponse, tabunganStatsResponse] = await Promise.all([
          apiService.getWasteTypes().catch((err) => {
            console.error("❌ Waste types error:", err);
            return { success: false, error: err.message };
          }),
          apiService.getTabunganHistory().catch((err) => {
            console.error("❌ Tabungan stats error:", err);
            return { success: false, error: err.message };
          }),
        ]);

        // Process waste types
        if (wasteTypesResponse.success && wasteTypesResponse.wasteTypes) {
          setWasteTypes(wasteTypesResponse.wasteTypes);
          setUserInfo(wasteTypesResponse.user_info);
          console.log(
            "✅ Waste types loaded:",
            wasteTypesResponse.wasteTypes.length
          );
        } else {
          throw new Error("Failed to fetch waste types");
        }

        // Process tabungan stats
        if (tabunganStatsResponse.success && tabunganStatsResponse.stats) {
          setTabunganStats(tabunganStatsResponse.stats);
          console.log("✅ Tabungan stats loaded");
        } else {
          // Use mock data if failed
          setTabunganStats({
            totalTransaksi: 0,
            totalBerat: 0,
            totalNilai: 0,
            totalPoin: 0,
            breakdown: {},
          });
          console.log("⚠️ Using empty stats due to API error");
        }
      } catch (err: any) {
        console.error("❌ Error loading dashboard data:", err);
        setError(err.message || "Gagal memuat data");

        // Set fallback data
        setWasteTypes([
          {
            id: 1,
            name: "Botol Plastik",
            price: user?.pegawai === 1 ? 2400 : 2000,
            price_label:
              user?.pegawai === 1 ? "Harga Pegawai" : "Harga Non-Pegawai",
            harga_pegawai: 2400,
            harga_non_pegawai: 2000,
            harga_per_kg: 2000,
            is_user_pegawai: user?.pegawai === 1,
            user_authenticated: true,
            collected: 0,
            value: 0,
            transactions: 0,
            icon: "🥤",
            gradient: "from-orange-500 to-red-500",
          },
        ]);

        setTabunganStats({
          totalTransaksi: 0,
          totalBerat: 0,
          totalNilai: 0,
          totalPoin: 0,
          breakdown: {},
        });
      } finally {
        loadDataInProgress.current = false;
        setLoading(false);
        console.log("🏁 Data fetch completed");
      }
    },
    [user?.pegawai]
  );

  // FIXED: Initialize data only once when user is available
  useEffect(() => {
    if (user && !authLoading && !isInitialized.current) {
      console.log("🚀 Initializing dashboard data for user:", user.username);
      isInitialized.current = true;
      setLoading(true);
      fetchAllData(false); // Don't skip on initialization
    }
  }, [user, authLoading, fetchAllData]);

  // FIXED: Manual refresh handler dengan proper state management
  const onRefresh = useCallback(async () => {
    if (refreshing || loadDataInProgress.current) {
      console.log("⏸️ Refresh already in progress");
      return;
    }

    setRefreshing(true);
    console.log("🔄 Manual refresh triggered");

    try {
      // Refresh user data first (without triggering loops)
      if (refreshUser) {
        await refreshUser();
      }

      // Then fetch dashboard data
      await fetchAllData(false);
    } catch (err) {
      console.error("❌ Error during refresh:", err);
    } finally {
      setRefreshing(false);
      console.log("✅ Manual refresh completed");
    }
  }, [refreshing, fetchAllData, refreshUser]);

  const handleLogout = () => {
    Alert.alert("Logout", "Apakah Anda yakin ingin keluar?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: logout,
      },
    ]);
  };

  const handleMenuPress = (menuId: string) => {
    switch (menuId) {
      case "ekonomi-sirkular":
        router.push("/ekonomi-sirkular");
        break;
      case "withdraw":
        router.push("/withdrawal");
        break;
      case "tabungan-sampah":
        router.push("/tabungan");
        break;
      case "edukasi":
        router.push("/edukasi");
        break;
      default:
        Alert.alert("Info", `Menu ${menuId} belum tersedia`);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString("id-ID", { maximumFractionDigits: 1 });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 10) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 19) return "Selamat Sore";
    return "Selamat Malam";
  };

  // Loading state
  if (authLoading || !user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Memuat dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const menuItems = [
    {
      id: "withdraw",
      title: "Withdraw",
      icon: "card-outline",
      description: "Tarik saldo tabungan Anda",
      color: BrandColors.primary,
    },
    {
      id: "tabungan-sampah",
      title: "Tabungan Sampah",
      icon: "wallet-outline",
      description: "Kelola saldo tabungan Anda",
      color: BrandColors.secondary,
    },
    {
      id: "edukasi",
      title: "Edukasi & Kampanye",
      icon: "book-outline",
      description: "Pelajari tips pengelolaan sampah",
      color: BrandColors.accent,
    },
    {
      id: "ekonomi-sirkular",
      title: "Ekonomi Sirkular",
      icon: "refresh-circle-outline",
      description: "Video edukasi ekonomi sirkular",
      color: BrandColors.info,
    },
  ];

  const totalBerat = tabunganStats?.totalBerat || 0;
  const totalTransaksi = tabunganStats?.totalTransaksi || 0;
  const isPegawai = userInfo?.is_pegawai ?? user?.pegawai === 1;
  const statusLabel = isPegawai ? "Pegawai" : "Non-Pegawai";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[BrandColors.primary]}
            tintColor={BrandColors.primary}
          />
        }>
        {/* Error Banner */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={20} color="#dc2626" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => fetchAllData(false)}>
              <Text style={styles.retryText}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Header with Background Image and Balance */}
        <ImageBackground
          source={require("../../assets/rs.png")}
          style={styles.headerImageBackground}
          imageStyle={styles.headerBackgroundImage}>
          {/* Gradient Overlay */}
          <LinearGradient
            colors={["rgba(16, 185, 129, 0.85)", "rgba(5, 150, 105, 0.85)"]}
            style={styles.headerGradientOverlay}>
            <View style={styles.headerContent}>
              {/* Greeting and Status */}
              <View style={styles.greetingSection}>
                <View style={styles.greetingRow}>
                  <View>
                    <Text style={styles.greetingText}>
                      {getGreeting()}, {user.nama_lengkap.split(" ")[0]}! 👋
                    </Text>
                    <Text style={styles.hospitalText}>
                      Bank sampah digital RS Mohammad Natsir
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.statusBadge}
                    onPress={handleLogout}>
                    <Ionicons
                      name={isPegawai ? "person" : "people"}
                      size={12}
                      color={BrandColors.white}
                    />
                    <Text style={styles.statusText}>{statusLabel}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Balance Section */}
              <View style={styles.balanceSection}>
                <Text style={styles.balanceLabel}>Saldo Tabungan</Text>
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceAmount}>
                    {saldoVisible
                      ? formatCurrency(user.saldo || 0)
                      : "Rp •••••••"}
                  </Text>
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setSaldoVisible(!saldoVisible)}>
                    <Ionicons
                      name={saldoVisible ? "eye" : "eye-off"}
                      size={20}
                      color={BrandColors.white}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>

        {/* Statistics Card */}
        <View style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <View style={styles.statIcon}>
                <Text style={styles.statEmoji}>📊</Text>
              </View>
              <Text style={styles.statLabel}>Total Sampah</Text>
              <Text style={styles.statValue}>
                {formatNumber(totalBerat)} kg
              </Text>
              <Text style={styles.statSubtext}>Sampah Disetor</Text>
            </View>

            <View style={styles.statsDivider} />

            <View style={styles.statItem}>
              <View style={styles.statIcon}>
                <Text style={styles.statEmoji}>📄</Text>
              </View>
              <Text style={styles.statLabel}>Total Transaksi</Text>
              <Text style={styles.statValue}>{totalTransaksi}</Text>
              <Text style={styles.statSubtext}>Transaksi Selesai</Text>
            </View>
          </View>
        </View>

        {/* Loading indicator for data */}
        {loading && (
          <View style={styles.loadingIndicator}>
            <ActivityIndicator size="small" color={BrandColors.primary} />
            <Text style={styles.loadingIndicatorText}>Memuat data...</Text>
          </View>
        )}

        {/* Waste Prices Card - Only show if data loaded */}
        {wasteTypes.length > 0 && (
          <View
            style={[
              styles.pricesCard,
              isPegawai
                ? styles.pricesCardPegawai
                : styles.pricesCardNonPegawai,
            ]}>
            <TouchableOpacity
              style={styles.pricesHeader}
              onPress={() => setPricesVisible(!pricesVisible)}>
              <View style={styles.pricesTitle}>
                <Text style={styles.pricesEmoji}>💰</Text>
                <Text
                  style={[
                    styles.pricesTitleText,
                    isPegawai ? styles.titlePegawai : styles.titleNonPegawai,
                  ]}>
                  Harga Sampah Anda
                </Text>
              </View>
              <View style={styles.pricesHeaderRight}>
                <View
                  style={[
                    styles.userTypeBadge,
                    isPegawai ? styles.badgePegawai : styles.badgeNonPegawai,
                  ]}>
                  <Ionicons
                    name={isPegawai ? "person" : "people"}
                    size={12}
                    color={isPegawai ? "#2563eb" : "#ea580c"}
                  />
                  <Text
                    style={[
                      styles.userTypeText,
                      isPegawai ? styles.textPegawai : styles.textNonPegawai,
                    ]}>
                    {statusLabel}
                  </Text>
                </View>
                <View style={styles.toggleButton}>
                  <Ionicons
                    name={pricesVisible ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={isPegawai ? "#2563eb" : "#ea580c"}
                  />
                </View>
              </View>
            </TouchableOpacity>

            {pricesVisible && (
              <>
                <View style={styles.pricesGrid}>
                  {wasteTypes.slice(0, 4).map((wasteType) => {
                    const hasSpecialPrice =
                      wasteType.harga_pegawai !== wasteType.harga_non_pegawai;
                    const userPrice = wasteType.price;
                    const basePrice = wasteType.harga_per_kg;

                    return (
                      <View key={wasteType.id} style={styles.priceItem}>
                        <View style={styles.priceInfo}>
                          <Text
                            style={[
                              styles.wasteName,
                              isPegawai
                                ? styles.textPegawai
                                : styles.textNonPegawai,
                            ]}>
                            {wasteType.name}
                          </Text>
                          <View style={styles.priceValue}>
                            <Text
                              style={[
                                styles.priceAmount,
                                isPegawai
                                  ? styles.textPegawai
                                  : styles.textNonPegawai,
                              ]}>
                              {formatCurrency(userPrice)}/kg
                            </Text>
                            {hasSpecialPrice && userPrice !== basePrice && (
                              <Text style={styles.originalPrice}>
                                {formatCurrency(basePrice)}
                              </Text>
                            )}
                          </View>
                        </View>

                        {hasSpecialPrice && userPrice !== basePrice && (
                          <View
                            style={[
                              styles.specialPriceBadge,
                              isPegawai
                                ? styles.badgePegawai
                                : styles.badgeNonPegawai,
                            ]}>
                            <Text style={styles.specialPriceText}>✨</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>

                <View style={styles.pricesFooter}>
                  <Text style={styles.pricesFooterText}>
                    {isPegawai
                      ? "🎉 Harga khusus untuk pegawai RSUD M Natsir"
                      : "💡 Harga untuk nasabah umum"}
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* Menu Grid */}
        <View style={styles.menuGrid}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => handleMenuPress(item.id)}>
              <View style={[styles.menuIcon, { backgroundColor: item.color }]}>
                <Ionicons
                  name={item.icon as any}
                  size={28}
                  color={BrandColors.white}
                />
              </View>
              <Text style={styles.menuTitle}>{item.title}</Text>
              <Text style={styles.menuDescription}>{item.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.gray[50],
  },
  scrollView: {
    flex: 1,
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
  loadingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  loadingIndicatorText: {
    marginLeft: 8,
    fontSize: 14,
    color: BrandColors.gray[600],
  },
  // NEW: Background image styles
  headerImageBackground: {
    overflow: "hidden",
  },
  headerBackgroundImage: {
    // No rounded corners
  },
  headerGradientOverlay: {
    paddingBottom: 30,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  greetingSection: {
    marginBottom: 20,
  },
  greetingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  greetingText: {
    fontSize: 16,
    fontWeight: "600",
    color: BrandColors.white,
    marginBottom: 4,
  },
  hospitalText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: BrandColors.white,
  },
  balanceSection: {
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 8,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: "700",
    color: BrandColors.white,
  },
  eyeButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 8,
    borderRadius: 8,
  },
  statsCard: {
    backgroundColor: BrandColors.white,
    marginHorizontal: 20,
    marginTop: -15,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  statsGrid: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statIcon: {
    marginBottom: 8,
  },
  statEmoji: {
    fontSize: 16,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: BrandColors.primary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: BrandColors.gray[900],
    marginBottom: 2,
  },
  statSubtext: {
    fontSize: 10,
    color: BrandColors.gray[600],
  },
  statsDivider: {
    width: 1,
    height: 40,
    backgroundColor: BrandColors.gray[200],
    marginHorizontal: 20,
  },
  pricesCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  pricesCardPegawai: {
    backgroundColor: "#eff6ff",
    borderColor: "#dbeafe",
  },
  pricesCardNonPegawai: {
    backgroundColor: "#fff7ed",
    borderColor: "#fed7aa",
  },
  pricesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingVertical: 5,
  },
  pricesTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pricesEmoji: {
    fontSize: 16,
  },
  pricesTitleText: {
    fontSize: 14,
    fontWeight: "700",
  },
  titlePegawai: {
    color: "#2563eb",
  },
  titleNonPegawai: {
    color: "#ea580c",
  },
  pricesHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  userTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  badgePegawai: {
    backgroundColor: "#dbeafe",
  },
  badgeNonPegawai: {
    backgroundColor: "#fed7aa",
  },
  userTypeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  textPegawai: {
    color: "#2563eb",
  },
  textNonPegawai: {
    color: "#ea580c",
  },
  toggleButton: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  pricesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  priceItem: {
    width: "48%",
    backgroundColor: BrandColors.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: BrandColors.gray[100],
    position: "relative",
  },
  priceInfo: {
    alignItems: "center",
  },
  wasteName: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  priceValue: {
    alignItems: "center",
  },
  priceAmount: {
    fontSize: 12,
    fontWeight: "700",
  },
  originalPrice: {
    fontSize: 10,
    color: BrandColors.gray[400],
    textDecorationLine: "line-through",
    marginTop: 2,
  },
  specialPriceBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  specialPriceText: {
    fontSize: 8,
  },
  pricesFooter: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: BrandColors.gray[200],
  },
  pricesFooterText: {
    fontSize: 12,
    color: BrandColors.gray[600],
    textAlign: "center",
  },
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === "android" ? 120 : 100,
    justifyContent: "space-between",
  },
  menuItem: {
    width: "47%",
    backgroundColor: BrandColors.white,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  menuIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: BrandColors.gray[900],
    textAlign: "center",
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 10,
    color: BrandColors.gray[600],
    textAlign: "center",
    lineHeight: 14,
  },
});
