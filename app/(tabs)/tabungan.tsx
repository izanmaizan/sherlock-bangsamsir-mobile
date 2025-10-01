// app/(tabs)/tabungan.tsx - UPDATED: Added background image to header
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

interface Transaction {
  id: number;
  tanggal: string;
  total_nilai: number;
  total_berat: number;
  jenis_sampah: string;
  poin_earned: number;
  admin: string;
  keterangan: string;
  created_at: string;
  breakdown: Record<string, number>;
  details: {
    jenis: string;
    berat: number;
    nilai: number;
    harga_per_kg: number;
  }[];
}

interface TabunganStats {
  totalTransaksi: number;
  totalBerat: number;
  totalNilai: number;
  totalPoin: number;
  breakdown: Record<string, any>;
}

interface MutasiSaldo {
  id: number;
  jenis: string;
  jumlah: number;
  saldo_awal: number;
  saldo_akhir: number;
  keterangan: string;
  created_at: string;
}

interface MutasiStats {
  totalMasuk: number;
  totalKeluar: number;
  transaksiMasuk: number;
  transaksiKeluar: number;
}

export default function TabunganScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [mutasiSaldo, setMutasiSaldo] = useState<MutasiSaldo[]>([]);
  const [tabunganStats, setTabunganStats] = useState<TabunganStats | null>(
    null
  );
  const [mutasiStats, setMutasiStats] = useState<MutasiStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"transaksi" | "mutasi">(
    "transaksi"
  );
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [saldoVisible, setSaldoVisible] = useState(true);

  // CRITICAL: Refs untuk prevent multiple simultaneous calls
  const loadDataInProgress = useRef(false);
  const isInitialized = useRef(false);

  // FIXED: Single consolidated fetch function dengan debouncing
  const fetchTabunganData = useCallback(
    async (skipIfLoading = true) => {
      // Prevent multiple simultaneous calls
      if (skipIfLoading && loadDataInProgress.current) {
        console.log("⏸️ Tabungan loading already in progress, skipping...");
        return;
      }

      if (!user) {
        console.log("⏸️ No user found, skipping tabungan fetch");
        return;
      }

      loadDataInProgress.current = true;

      try {
        console.log("📊 Fetching tabungan data...");

        // Prepare params for API calls
        const params: any = {};
        if (selectedPeriod !== "all") {
          params.periode = selectedPeriod;
        }

        // Fetch all data in parallel - ONLY ONCE
        const [tabunganResponse, mutasiResponse] = await Promise.all([
          apiService.getTabunganHistory(params).catch((err) => {
            console.error("❌ Tabungan history error:", err);
            return { success: false, error: err.message };
          }),
          apiService.getMutasiSaldo(params).catch((err) => {
            console.error("❌ Mutasi saldo error:", err);
            return { success: false, error: err.message };
          }),
        ]);

        // Process tabungan history
        if (tabunganResponse.success) {
          const transactionsData =
            tabunganResponse.riwayat || tabunganResponse.transactions || [];
          const statsData = tabunganResponse.stats || null;

          setTransactions(transactionsData);
          setTabunganStats(statsData);
          console.log(
            "✅ Tabungan data loaded:",
            transactionsData.length,
            "transactions"
          );
        } else {
          // Use fallback data for transactions
          setTransactions([]);
          setTabunganStats({
            totalTransaksi: 0,
            totalBerat: 0,
            totalNilai: 0,
            totalPoin: 0,
            breakdown: {},
          });
          console.log("⚠️ Using empty tabungan data due to API error");
        }

        // Process mutasi saldo
        if (mutasiResponse.success) {
          const mutasiData = mutasiResponse.mutasi || mutasiResponse.data || [];
          const mutasiStatsData = mutasiResponse.stats || null;

          setMutasiSaldo(mutasiData);
          setMutasiStats(mutasiStatsData);
          console.log(
            "✅ Mutasi saldo data loaded:",
            mutasiData.length,
            "records"
          );
        } else {
          // Use fallback data for mutasi
          setMutasiSaldo([]);
          setMutasiStats({
            totalMasuk: 0,
            totalKeluar: 0,
            transaksiMasuk: 0,
            transaksiKeluar: 0,
          });
          console.log("⚠️ Using empty mutasi data due to API error");
        }
      } catch (err: any) {
        console.error("❌ Error loading tabungan data:", err);

        // Set fallback data
        setTransactions([]);
        setMutasiSaldo([]);
        setTabunganStats({
          totalTransaksi: 0,
          totalBerat: 0,
          totalNilai: 0,
          totalPoin: 0,
          breakdown: {},
        });
        setMutasiStats({
          totalMasuk: 0,
          totalKeluar: 0,
          transaksiMasuk: 0,
          transaksiKeluar: 0,
        });

        // Only show alert on manual actions, not automatic loads
        if (!skipIfLoading) {
          let errorMessage = "Gagal memuat data tabungan";
          if (err?.message?.includes("timeout")) {
            errorMessage = "Koneksi timeout, periksa jaringan Anda";
          } else if (err?.message?.includes("Network")) {
            errorMessage = "Tidak dapat terhubung ke server";
          }
          Alert.alert("Error", errorMessage);
        }
      } finally {
        loadDataInProgress.current = false;
        setLoading(false);
        console.log("🏁 Tabungan fetch completed");
      }
    },
    [user, selectedPeriod]
  );

  // FIXED: Initialize data only once when user is available
  useEffect(() => {
    if (user && !isInitialized.current) {
      console.log("🚀 Initializing tabungan screen for user:", user.username);
      isInitialized.current = true;
      fetchTabunganData(false); // Don't skip on initialization
    }
  }, [user]); // Only depend on user

  // FIXED: Handle period changes without causing loops
  useEffect(() => {
    if (isInitialized.current && user) {
      console.log("🔄 Period changed, fetching new data");
      const timeoutId = setTimeout(() => {
        fetchTabunganData(false);
      }, 300); // Debounce period changes

      return () => clearTimeout(timeoutId);
    }
  }, [selectedPeriod]); // Only depend on period

  // FIXED: Manual refresh handler
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

      // Then fetch tabungan data
      await fetchTabunganData(false);
    } catch (err) {
      console.error("❌ Error during refresh:", err);
    } finally {
      setRefreshing(false);
      console.log("✅ Manual refresh completed");
    }
  }, [refreshing, fetchTabunganData, refreshUser]);

  // Utility functions
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 10) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 19) return "Selamat Sore";
    return "Selamat Malam";
  };

  // Period options
  const periodOptions = [
    { value: "all", label: "Semua" },
    { value: "today", label: "Hari Ini" },
    { value: "week", label: "Minggu Ini" },
    { value: "month", label: "Bulan Ini" },
  ];

  if (loading && transactions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Memuat data tabungan...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
              {/* Greeting Section */}
              <View style={styles.greetingSection}>
                <Text style={styles.greetingText}>
                  {getGreeting()}, {user?.nama_lengkap?.split(" ")[0]}! 📊
                </Text>
                <Text style={styles.hospitalText}>
                  Kelola tabungan sampah Anda di RSUD M Natsir
                </Text>
              </View>

              {/* Balance Section */}
              <View style={styles.balanceSection}>
                <Text style={styles.balanceLabel}>Total Saldo</Text>
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceAmount}>
                    {saldoVisible
                      ? formatCurrency(user?.saldo || 0)
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
                {/* <Text style={styles.balanceSubtext}>
                  Poin: {user?.poin || 0} | Level: {user?.level || 1}
                </Text> */}
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>

        {/* Period Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Periode:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}>
            {periodOptions.map((period) => (
              <TouchableOpacity
                key={period.value}
                style={[
                  styles.periodButton,
                  selectedPeriod === period.value && styles.periodButtonActive,
                ]}
                onPress={() => setSelectedPeriod(period.value)}>
                <Text
                  style={[
                    styles.periodButtonText,
                    selectedPeriod === period.value &&
                      styles.periodButtonTextActive,
                  ]}>
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabSection}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "transaksi" && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab("transaksi")}>
            <Ionicons
              name="receipt-outline"
              size={20}
              color={
                activeTab === "transaksi"
                  ? BrandColors.white
                  : BrandColors.gray[600]
              }
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "transaksi" && styles.tabButtonTextActive,
              ]}>
              Transaksi Sampah
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === "mutasi" && styles.tabButtonActive,
            ]}
            onPress={() => setActiveTab("mutasi")}>
            <Ionicons
              name="swap-horizontal-outline"
              size={20}
              color={
                activeTab === "mutasi"
                  ? BrandColors.white
                  : BrandColors.gray[600]
              }
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === "mutasi" && styles.tabButtonTextActive,
              ]}>
              Mutasi Saldo
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content Based on Active Tab */}
        {activeTab === "transaksi" ? (
          <View style={styles.transactionsList}>
            {transactions.length > 0 ? (
              transactions.map((transaction) => (
                <View key={transaction.id} style={styles.transactionCard}>
                  <View style={styles.transactionHeader}>
                    <Text style={styles.transactionDate}>
                      {formatDate(transaction.tanggal)}
                    </Text>
                    <View style={styles.transactionAmount}>
                      <Text style={styles.amountValue}>
                        +{formatCurrency(transaction.total_nilai)}
                      </Text>
                      <Text style={styles.amountWeight}>
                        {formatNumber(transaction.total_berat)} kg
                      </Text>
                    </View>
                  </View>

                  <View style={styles.transactionDetails}>
                    <View style={styles.transactionInfo}>
                      <Ionicons
                        name="cube-outline"
                        size={16}
                        color={BrandColors.gray[500]}
                      />
                      <Text style={styles.transactionType}>
                        {transaction.jenis_sampah}
                      </Text>
                    </View>

                    <View style={styles.transactionInfo}>
                      <Ionicons
                        name="person-outline"
                        size={16}
                        color={BrandColors.gray[500]}
                      />
                      <Text style={styles.transactionAdmin}>
                        Oleh: {transaction.admin}
                      </Text>
                    </View>

                    {/* {transaction.poin_earned > 0 && (
                      <View style={styles.transactionInfo}>
                        <Ionicons
                          name="star-outline"
                          size={16}
                          color={BrandColors.accent}
                        />
                        <Text style={styles.transactionPoints}>
                          +{transaction.poin_earned} poin
                        </Text>
                      </View>
                    )} */}
                  </View>

                  {transaction.keterangan && (
                    <View style={styles.transactionNote}>
                      <Text style={styles.noteText}>
                        💬 {transaction.keterangan}
                      </Text>
                    </View>
                  )}

                  {/* Transaction Details */}
                  {transaction.details && transaction.details.length > 0 && (
                    <View style={styles.transactionBreakdown}>
                      <Text style={styles.breakdownTitle}>Detail:</Text>
                      {transaction.details.map((detail, index) => (
                        <View key={index} style={styles.breakdownItem}>
                          <Text style={styles.breakdownText}>
                            {detail.jenis}: {formatNumber(detail.berat)} kg ×{" "}
                            {formatCurrency(detail.harga_per_kg)}/kg ={" "}
                            {formatCurrency(detail.nilai)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons
                  name="receipt-outline"
                  size={64}
                  color={BrandColors.gray[300]}
                />
                <Text style={styles.emptyTitle}>Belum Ada Transaksi</Text>
                <Text style={styles.emptySubtitle}>
                  Transaksi setor sampah Anda akan muncul di sini
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.mutasiList}>
            {/* Mutasi Stats */}
            {mutasiStats && (
              <View style={styles.mutasiStatsCard}>
                <View style={styles.mutasiStatsRow}>
                  <View style={styles.mutasiStatItem}>
                    <Text style={styles.mutasiStatValue}>
                      +{formatCurrency(mutasiStats.totalMasuk)}
                    </Text>
                    <Text style={styles.mutasiStatLabel}>
                      Dana Masuk ({mutasiStats.transaksiMasuk}x)
                    </Text>
                  </View>
                  <View style={styles.mutasiStatItem}>
                    <Text
                      style={[styles.mutasiStatValue, { color: "#ef4444" }]}>
                      -{formatCurrency(mutasiStats.totalKeluar)}
                    </Text>
                    <Text style={styles.mutasiStatLabel}>
                      Dana Keluar ({mutasiStats.transaksiKeluar}x)
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {mutasiSaldo.length > 0 ? (
              mutasiSaldo.map((mutasi) => (
                <View key={mutasi.id} style={styles.mutasiCard}>
                  <View style={styles.mutasiHeader}>
                    <View style={styles.mutasiInfo}>
                      <View
                        style={[
                          styles.mutasiIcon,
                          {
                            backgroundColor:
                              mutasi.jumlah > 0 ? "#dcfce7" : "#fef2f2",
                          },
                        ]}>
                        <Ionicons
                          name={mutasi.jumlah > 0 ? "arrow-down" : "arrow-up"}
                          size={16}
                          color={mutasi.jumlah > 0 ? "#16a34a" : "#dc2626"}
                        />
                      </View>
                      <View style={styles.mutasiDetails}>
                        <Text style={styles.mutasiType}>
                          {mutasi.jenis === "setor_sampah"
                            ? "Setor Sampah"
                            : mutasi.jenis === "tarik_tunai"
                            ? "Penarikan Dana"
                            : mutasi.jenis}
                        </Text>
                        <Text style={styles.mutasiDate}>
                          {formatDate(mutasi.created_at)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.mutasiAmount}>
                      <Text
                        style={[
                          styles.mutasiValue,
                          {
                            color: mutasi.jumlah > 0 ? "#16a34a" : "#dc2626",
                          },
                        ]}>
                        {mutasi.jumlah > 0 ? "+" : ""}
                        {formatCurrency(mutasi.jumlah)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.mutasiSaldoInfo}>
                    <Text style={styles.mutasiKeterangan}>
                      {mutasi.keterangan}
                    </Text>
                    <Text style={styles.mutasiSaldoText}>
                      Saldo: {formatCurrency(mutasi.saldo_awal)} →{" "}
                      {formatCurrency(mutasi.saldo_akhir)}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons
                  name="swap-horizontal-outline"
                  size={64}
                  color={BrandColors.gray[300]}
                />
                <Text style={styles.emptyTitle}>Belum Ada Mutasi Saldo</Text>
                <Text style={styles.emptySubtitle}>
                  Riwayat perubahan saldo akan muncul di sini
                </Text>
              </View>
            )}
          </View>
        )}
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
  // NEW: Background image styles
  headerImageBackground: {
    overflow: "hidden",
  },
  headerBackgroundImage: {
    // No rounded corners for tabungan header
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
  greetingText: {
    fontSize: 18,
    fontWeight: "700",
    color: BrandColors.white,
    marginBottom: 4,
  },
  hospitalText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
  },
  balanceSection: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 15,
    padding: 20,
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
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "700",
    color: BrandColors.white,
  },
  eyeButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 8,
    borderRadius: 8,
  },
  balanceSubtext: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  filterSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: BrandColors.white,
    marginTop: 8,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: BrandColors.gray[700],
    marginBottom: 12,
  },
  filterScroll: {
    flexGrow: 0,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: BrandColors.gray[100],
    marginRight: 8,
  },
  periodButtonActive: {
    backgroundColor: BrandColors.primary,
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: BrandColors.gray[700],
  },
  periodButtonTextActive: {
    color: BrandColors.white,
  },
  tabSection: {
    flexDirection: "row",
    backgroundColor: BrandColors.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: BrandColors.gray[100],
    gap: 8,
  },
  tabButtonActive: {
    backgroundColor: BrandColors.primary,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: BrandColors.gray[600],
  },
  tabButtonTextActive: {
    color: BrandColors.white,
  },
  transactionsList: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "android" ? 120 : 100,
  },
  transactionCard: {
    backgroundColor: BrandColors.white,
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  transactionDate: {
    fontSize: 12,
    color: BrandColors.gray[500],
  },
  transactionAmount: {
    alignItems: "flex-end",
  },
  amountValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#16a34a",
  },
  amountWeight: {
    fontSize: 12,
    color: BrandColors.gray[500],
  },
  transactionDetails: {
    gap: 6,
    marginBottom: 8,
  },
  transactionInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  transactionType: {
    fontSize: 14,
    color: BrandColors.gray[700],
  },
  transactionAdmin: {
    fontSize: 12,
    color: BrandColors.gray[500],
  },
  transactionPoints: {
    fontSize: 12,
    color: BrandColors.accent,
    fontWeight: "500",
  },
  transactionNote: {
    backgroundColor: BrandColors.gray[50],
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 12,
    color: BrandColors.gray[600],
    fontStyle: "italic",
  },
  transactionBreakdown: {
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#dcfce7",
  },
  breakdownTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#16a34a",
    marginBottom: 6,
  },
  breakdownItem: {
    marginBottom: 2,
  },
  breakdownText: {
    fontSize: 11,
    color: "#059669",
  },
  mutasiList: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "android" ? 120 : 100,
  },
  mutasiStatsCard: {
    backgroundColor: BrandColors.white,
    borderRadius: 15,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mutasiStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  mutasiStatItem: {
    flex: 1,
    alignItems: "center",
  },
  mutasiStatValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#16a34a",
    marginBottom: 4,
  },
  mutasiStatLabel: {
    fontSize: 12,
    color: BrandColors.gray[600],
    textAlign: "center",
  },
  mutasiCard: {
    backgroundColor: BrandColors.white,
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  mutasiHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  mutasiInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  mutasiIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  mutasiDetails: {
    flex: 1,
  },
  mutasiType: {
    fontSize: 14,
    fontWeight: "600",
    color: BrandColors.gray[900],
    marginBottom: 2,
  },
  mutasiDate: {
    fontSize: 12,
    color: BrandColors.gray[500],
  },
  mutasiAmount: {
    alignItems: "flex-end",
  },
  mutasiValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  mutasiSaldoInfo: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: BrandColors.gray[100],
  },
  mutasiKeterangan: {
    fontSize: 13,
    color: BrandColors.gray[700],
    marginBottom: 4,
  },
  mutasiSaldoText: {
    fontSize: 11,
    color: BrandColors.gray[500],
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: BrandColors.gray[900],
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: BrandColors.gray[600],
    textAlign: "center",
    lineHeight: 20,
  },
});
