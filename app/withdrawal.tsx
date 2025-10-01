// app/withdrawal.tsx - FIXED: Stop API loop berulang
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandColors } from "../constants/Colors";
import { useAuth } from "../contexts/AuthContext";
import apiService from "../services/api";

interface WithdrawalRequest {
  id: number;
  amount: number;
  method: "cash" | "bank_transfer";
  bank_account?: string;
  bank_name?: string;
  account_holder?: string;
  status: "pending" | "approved" | "completed" | "rejected";
  notes?: string;
  admin_notes?: string;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
}

export default function WithdrawalScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saldoVisible, setSaldoVisible] = useState(true);

  // CRITICAL: Refs untuk prevent multiple simultaneous calls
  const loadDataInProgress = useRef(false);
  const isInitialized = useRef(false);

  const [formData, setFormData] = useState({
    amount: "",
    method: "cash" as "cash" | "bank_transfer",
    bank_account: "",
    bank_name: "Bank Nagari",
    account_holder: "",
    notes: "",
  });

  // FIXED: Single consolidated fetch function
  const fetchWithdrawals = useCallback(async (skipIfLoading = true) => {
    // Prevent multiple simultaneous calls
    if (skipIfLoading && loadDataInProgress.current) {
      console.log("⏸️ Withdrawal loading already in progress, skipping...");
      return;
    }

    loadDataInProgress.current = true;

    try {
      console.log("💳 Fetching withdrawal data...");

      const response = await apiService.getWithdrawals();

      if (response.success) {
        console.log(
          "✅ Withdrawal data fetched successfully:",
          response.withdrawals?.length || 0
        );
        const withdrawalsData = response.withdrawals || response.data || [];
        setWithdrawals(withdrawalsData);
      } else {
        console.error("❌ Failed to fetch withdrawal data:", response.message);
        throw new Error(response.message || "Gagal memuat data penarikan");
      }
    } catch (error: any) {
      console.error("🚨 Error fetching withdrawal data:", error);

      // Set fallback empty data instead of showing alert repeatedly
      setWithdrawals([]);

      // Only show alert on manual actions, not automatic loads
      if (!skipIfLoading) {
        let errorMessage = "Gagal memuat data penarikan";
        if (error?.message?.includes("timeout")) {
          errorMessage = "Koneksi timeout, periksa jaringan Anda";
        } else if (error?.message?.includes("Network")) {
          errorMessage = "Tidak dapat terhubung ke server";
        }
        Alert.alert("Error", errorMessage);
      }
    } finally {
      loadDataInProgress.current = false;
      setLoading(false);
      console.log("🏁 Withdrawal fetch completed");
    }
  }, []);

  // FIXED: Initialize data only once
  useEffect(() => {
    if (!isInitialized.current) {
      console.log("🚀 Initializing withdrawal screen");
      isInitialized.current = true;
      fetchWithdrawals(false); // Don't skip on initialization
    }
  }, []); // Empty dependency array

  // FIXED: Manual refresh handler
  const onRefresh = useCallback(async () => {
    if (refreshing || loadDataInProgress.current) {
      console.log("⏸️ Refresh already in progress");
      return;
    }

    setRefreshing(true);
    console.log("🔄 Manual refresh triggered");

    try {
      await fetchWithdrawals(false);
    } catch (err) {
      console.error("❌ Error during refresh:", err);
    } finally {
      setRefreshing(false);
      console.log("✅ Manual refresh completed");
    }
  }, [fetchWithdrawals]);

  // Submit withdrawal request
  const handleSubmit = async () => {
    const amount = parseFloat(formData.amount);

    // Validation
    if (amount < 10000) {
      Alert.alert("Error", "Minimal penarikan Rp 10.000");
      return;
    }

    if (amount > (user?.saldo || 0)) {
      Alert.alert("Error", "Saldo tidak mencukupi");
      return;
    }

    if (formData.method === "bank_transfer") {
      if (!formData.bank_account || !formData.account_holder) {
        Alert.alert("Error", "Lengkapi informasi rekening bank");
        return;
      }
    }

    try {
      setSubmitting(true);
      console.log("💳 Submitting withdrawal request...");

      const withdrawalData = {
        amount,
        method: formData.method,
        bank_account:
          formData.method === "bank_transfer"
            ? formData.bank_account
            : undefined,
        bank_name:
          formData.method === "bank_transfer" ? formData.bank_name : undefined,
        account_holder:
          formData.method === "bank_transfer"
            ? formData.account_holder
            : undefined,
        notes: formData.notes || undefined,
      };

      const response = await apiService.createWithdrawal(withdrawalData);

      if (response.success) {
        console.log("✅ Withdrawal request submitted successfully");
        Alert.alert("Berhasil", "Permintaan penarikan berhasil dikirim");

        // Reset form
        setShowForm(false);
        setFormData({
          amount: "",
          method: "cash",
          bank_account: "",
          bank_name: "Bank Nagari",
          account_holder: "",
          notes: "",
        });

        // Refresh data
        fetchWithdrawals(false);
        if (refreshUser) {
          refreshUser(); // Update user saldo
        }
      } else {
        console.log("❌ Withdrawal request failed:", response.message);
        Alert.alert(
          "Error",
          response.message || "Gagal mengirim permintaan penarikan"
        );
      }
    } catch (error: any) {
      console.error("🚨 Error submitting withdrawal:", error);

      let errorMessage = "Gagal mengirim permintaan penarikan";
      if (error?.message?.includes("timeout")) {
        errorMessage = "Koneksi timeout, periksa jaringan Anda";
      } else if (error?.message?.includes("Network")) {
        errorMessage = "Tidak dapat terhubung ke server";
      } else if (error?.status === 400) {
        errorMessage = "Data yang dimasukkan tidak valid";
      } else if (error?.response?.message) {
        errorMessage = error.response.message;
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Format date time
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 10) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 19) return "Selamat Sore";
    return "Selamat Malam";
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return { color: "#f59e0b", text: "Menunggu", icon: "time-outline" };
      case "approved":
        return {
          color: "#3b82f6",
          text: "Disetujui",
          icon: "checkmark-circle-outline",
        };
      case "completed":
        return {
          color: "#10b981",
          text: "Selesai",
          icon: "checkmark-circle-outline",
        };
      case "rejected":
        return {
          color: "#ef4444",
          text: "Ditolak",
          icon: "close-circle-outline",
        };
      default:
        return {
          color: "#6b7280",
          text: "Unknown",
          icon: "help-circle-outline",
        };
    }
  };

  if (loading && withdrawals.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner} />
          <Text style={styles.loadingText}>Memuat data penarikan...</Text>
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
        {/* Header with Hospital Background */}
        <LinearGradient
          colors={[BrandColors.primary, BrandColors.secondary]}
          style={styles.headerGradient}>
          <View style={styles.headerContent}>
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={BrandColors.white} />
            </TouchableOpacity>

            {/* Header Info */}
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>💰 Penarikan Dana</Text>
              <Text style={styles.headerSubtitle}>
                {getGreeting()}, {user?.nama_lengkap?.split(" ")[0]}! Kelola
                penarikan saldo Anda
              </Text>
            </View>

            {/* Balance Section */}
            <View style={styles.balanceSection}>
              <Text style={styles.balanceLabel}>Saldo Tersedia</Text>
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
              <Text style={styles.minAmount}>Minimal penarikan: Rp 10.000</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Action Button */}
          {!showForm && (
            <View style={styles.actionCard}>
              <TouchableOpacity
                style={styles.newWithdrawalButton}
                onPress={() => setShowForm(true)}>
                <Ionicons
                  name="card-outline"
                  size={20}
                  color={BrandColors.white}
                />
                <Text style={styles.newWithdrawalText}>
                  Ajukan Penarikan Baru
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Withdrawal Form */}
          {showForm && (
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Form Penarikan Dana</Text>
                <TouchableOpacity
                  onPress={() => setShowForm(false)}
                  style={styles.closeButton}>
                  <Ionicons
                    name="close"
                    size={20}
                    color={BrandColors.gray[400]}
                  />
                </TouchableOpacity>
              </View>

              {/* Amount Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Jumlah Penarikan *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Minimal Rp 10.000"
                  value={formData.amount}
                  onChangeText={(text) =>
                    setFormData({ ...formData, amount: text })
                  }
                  keyboardType="numeric"
                />
                <Text style={styles.inputHint}>
                  Maksimal: {formatCurrency(user?.saldo || 0)}
                </Text>
              </View>

              {/* Method Selection */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Metode Penarikan *</Text>
                <View style={styles.methodGrid}>
                  <TouchableOpacity
                    style={[
                      styles.methodButton,
                      formData.method === "cash" && styles.methodButtonActive,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, method: "cash" })
                    }>
                    <Ionicons
                      name="cash-outline"
                      size={24}
                      color={
                        formData.method === "cash"
                          ? BrandColors.primary
                          : BrandColors.gray[400]
                      }
                    />
                    <Text
                      style={[
                        styles.methodText,
                        formData.method === "cash" && styles.methodTextActive,
                      ]}>
                      Ambil di Tempat
                    </Text>
                    <Text style={styles.methodSubtext}>
                      Datang langsung ke lokasi
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.methodButton,
                      formData.method === "bank_transfer" &&
                        styles.methodButtonActive,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, method: "bank_transfer" })
                    }>
                    <Ionicons
                      name="business-outline"
                      size={24}
                      color={
                        formData.method === "bank_transfer"
                          ? BrandColors.primary
                          : BrandColors.gray[400]
                      }
                    />
                    <Text
                      style={[
                        styles.methodText,
                        formData.method === "bank_transfer" &&
                          styles.methodTextActive,
                      ]}>
                      Transfer Bank
                    </Text>
                    <Text style={styles.methodSubtext}>
                      Transfer ke rekening
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Bank Details (if bank transfer) */}
              {formData.method === "bank_transfer" && (
                <View style={styles.bankDetailsContainer}>
                  <Text style={styles.bankDetailsTitle}>
                    Informasi Rekening Bank
                  </Text>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Nama Bank *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Bank Nagari"
                      value={formData.bank_name}
                      onChangeText={(text) =>
                        setFormData({ ...formData, bank_name: text })
                      }
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Nomor Rekening *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Masukkan nomor rekening"
                      value={formData.bank_account}
                      onChangeText={(text) =>
                        setFormData({ ...formData, bank_account: text })
                      }
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>
                      Nama Pemilik Rekening *
                    </Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Nama sesuai buku tabungan"
                      value={formData.account_holder}
                      onChangeText={(text) =>
                        setFormData({ ...formData, account_holder: text })
                      }
                    />
                  </View>
                </View>
              )}

              {/* Notes */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Catatan (Opsional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Tambahkan catatan jika diperlukan"
                  value={formData.notes}
                  onChangeText={(text) =>
                    setFormData({ ...formData, notes: text })
                  }
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Form Actions */}
              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowForm(false)}>
                  <Text style={styles.cancelButtonText}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    submitting && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={submitting}>
                  <Text style={styles.submitButtonText}>
                    {submitting ? "Mengirim..." : "Kirim Permintaan"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Withdrawal History */}
          <View style={styles.historyCard}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Riwayat Penarikan</Text>
              <Text style={styles.historyCount}>
                {withdrawals.length} permintaan
              </Text>
            </View>

            {withdrawals.length > 0 ? (
              <View style={styles.historyList}>
                {withdrawals.map((withdrawal) => {
                  const status = getStatusBadge(withdrawal.status);
                  return (
                    <View key={withdrawal.id} style={styles.historyItem}>
                      <View style={styles.historyItemHeader}>
                        <Text style={styles.historyAmount}>
                          {formatCurrency(withdrawal.amount)}
                        </Text>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: `${status.color}20` },
                          ]}>
                          <Ionicons
                            name={status.icon as any}
                            size={12}
                            color={status.color}
                          />
                          <Text
                            style={[
                              styles.statusText,
                              { color: status.color },
                            ]}>
                            {status.text}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.historyMethod}>
                        <Ionicons
                          name={
                            withdrawal.method === "cash"
                              ? "cash-outline"
                              : "business-outline"
                          }
                          size={16}
                          color={BrandColors.gray[600]}
                        />
                        <Text style={styles.historyMethodText}>
                          {withdrawal.method === "cash"
                            ? "Ambil di Tempat"
                            : "Transfer Bank"}
                        </Text>
                      </View>

                      {withdrawal.method === "bank_transfer" && (
                        <View style={styles.bankInfo}>
                          <Text style={styles.bankInfoText}>
                            {withdrawal.bank_name}
                          </Text>
                          <Text style={styles.bankInfoText}>
                            {withdrawal.bank_account}
                          </Text>
                          <Text style={styles.bankInfoText}>
                            a.n. {withdrawal.account_holder}
                          </Text>
                        </View>
                      )}

                      <View style={styles.historyDates}>
                        <Text style={styles.historyDate}>
                          📅 Diajukan: {formatDateTime(withdrawal.created_at)}
                        </Text>
                        {withdrawal.processed_at && (
                          <Text style={styles.historyDate}>
                            ✅ Diproses:{" "}
                            {formatDateTime(withdrawal.processed_at)}
                          </Text>
                        )}
                        {withdrawal.processed_by && (
                          <Text style={styles.historyDate}>
                            👤 Oleh: {withdrawal.processed_by}
                          </Text>
                        )}
                      </View>

                      {withdrawal.notes && (
                        <View style={styles.notesContainer}>
                          <Text style={styles.notesTitle}>Catatan Anda:</Text>
                          <Text style={styles.notesText}>
                            {withdrawal.notes}
                          </Text>
                        </View>
                      )}

                      {withdrawal.admin_notes && (
                        <View style={styles.adminNotesContainer}>
                          <Text style={styles.adminNotesTitle}>
                            Catatan Admin:
                          </Text>
                          <Text style={styles.adminNotesText}>
                            {withdrawal.admin_notes}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>💳</Text>
                <Text style={styles.emptyTitle}>
                  Belum Ada Riwayat Penarikan
                </Text>
                <Text style={styles.emptySubtitle}>
                  Anda belum pernah mengajukan permintaan penarikan dana.
                </Text>
                {!showForm && (
                  <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={() => setShowForm(true)}>
                    <Text style={styles.emptyButtonText}>
                      Ajukan Penarikan Pertama
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Keep existing styles (same as original with some key ones included)
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
  },
  loadingSpinner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: BrandColors.gray[200],
    borderTopColor: BrandColors.primary,
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: BrandColors.gray[600],
  },
  headerGradient: {
    paddingBottom: 30,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  backButton: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    padding: 8,
    marginBottom: 20,
  },
  headerInfo: {
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: BrandColors.white,
    marginBottom: 8,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    paddingHorizontal: 20,
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
    fontSize: 28,
    fontWeight: "700",
    color: BrandColors.white,
  },
  eyeButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 8,
    borderRadius: 8,
  },
  minAmount: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
    marginTop: -15,
    position: "relative",
    zIndex: 10,
  },
  actionCard: {
    backgroundColor: BrandColors.white,
    borderRadius: 15,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  newWithdrawalButton: {
    backgroundColor: BrandColors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  newWithdrawalText: {
    color: BrandColors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  formCard: {
    backgroundColor: BrandColors.white,
    borderRadius: 15,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  formHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: BrandColors.gray[900],
  },
  closeButton: {
    padding: 4,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: BrandColors.gray[700],
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 2,
    borderColor: BrandColors.gray[200],
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: BrandColors.gray[900],
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  inputHint: {
    fontSize: 12,
    color: BrandColors.primary,
    marginTop: 4,
  },
  methodGrid: {
    flexDirection: "row",
    gap: 12,
  },
  methodButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: BrandColors.gray[200],
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  methodButtonActive: {
    borderColor: BrandColors.primary,
    backgroundColor: `${BrandColors.primary}10`,
  },
  methodText: {
    fontSize: 14,
    fontWeight: "600",
    color: BrandColors.gray[700],
    marginVertical: 8,
    textAlign: "center",
  },
  methodTextActive: {
    color: BrandColors.primary,
  },
  methodSubtext: {
    fontSize: 12,
    color: BrandColors.gray[500],
    textAlign: "center",
  },
  bankDetailsContainer: {
    backgroundColor: `${BrandColors.primary}10`,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: `${BrandColors.primary}30`,
    marginBottom: 16,
  },
  bankDetailsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: BrandColors.primary,
    marginBottom: 16,
  },
  formActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: BrandColors.gray[100],
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    color: BrandColors.gray[700],
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    flex: 1,
    backgroundColor: BrandColors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: BrandColors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  historyCard: {
    backgroundColor: BrandColors.white,
    borderRadius: 15,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: BrandColors.gray[900],
  },
  historyCount: {
    fontSize: 14,
    fontWeight: "600",
    color: BrandColors.primary,
  },
  historyList: {
    gap: 16,
  },
  historyItem: {
    borderWidth: 1,
    borderColor: BrandColors.gray[100],
    borderRadius: 12,
    padding: 16,
  },
  historyItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  historyAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: BrandColors.gray[900],
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  historyMethod: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  historyMethodText: {
    fontSize: 14,
    color: BrandColors.gray[600],
  },
  bankInfo: {
    backgroundColor: BrandColors.gray[50],
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  bankInfoText: {
    fontSize: 12,
    color: BrandColors.gray[600],
    marginBottom: 2,
  },
  historyDates: {
    marginBottom: 12,
  },
  historyDate: {
    fontSize: 12,
    color: BrandColors.gray[500],
    marginBottom: 2,
  },
  notesContainer: {
    backgroundColor: "#dbeafe",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#93c5fd",
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1e40af",
    marginBottom: 4,
  },
  notesText: {
    fontSize: 12,
    color: "#1d4ed8",
  },
  adminNotesContainer: {
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#fcd34d",
  },
  adminNotesTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400e",
    marginBottom: 4,
  },
  adminNotesText: {
    fontSize: 12,
    color: "#b45309",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: BrandColors.gray[900],
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: BrandColors.gray[500],
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  emptyButton: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: BrandColors.white,
    fontSize: 16,
    fontWeight: "600",
  },
});
