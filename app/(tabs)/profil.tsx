// app/(tabs)/profil.tsx - FIXED: Improved photo handling dan display
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

interface ProfileData {
  id: number;
  nama_lengkap: string;
  username: string;
  role: string;
  pegawai: number;
  nip?: string;
  unit_kerja?: string;
  foto_profil?: string;
  poin: number;
  level: number;
  exp: number;
  saldo: number;
  created_at: string;
  updated_at?: string;
}

interface UserStats {
  totalTransactions: number;
  totalWaste: number;
  memberSince: string;
}

export default function ProfilScreen() {
  const router = useRouter();

  let user = null;
  let logout = null;
  let updateUser = null;

  try {
    const authContext = useAuth();
    user = authContext?.user || null;
    logout = authContext?.logout || null;
    updateUser = authContext?.updateUser || null;
  } catch (error) {
    console.error("Error accessing auth context:", error);
  }

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

  // Refs untuk prevent multiple simultaneous calls
  const loadDataInProgress = useRef(false);
  const isInitialized = useRef(false);

  // Single consolidated fetch function
  const fetchProfileData = useCallback(
    async (skipIfLoading = true) => {
      if (skipIfLoading && loadDataInProgress.current) {
        console.log("Profile data loading already in progress, skipping...");
        return;
      }

      if (!user) {
        console.log("No user found, skipping profile fetch");
        return;
      }

      loadDataInProgress.current = true;

      try {
        console.log("Starting profile data fetch from Next.js API...");
        setError(null);
        setImageLoadError(false); // Reset image error

        const profileResponse = await apiService.getProfile().catch((err) => {
          console.error("Profile API error:", err);
          return { success: false, error: err.message };
        });

        if (profileResponse.success && profileResponse.user) {
          setProfileData(profileResponse.user);
          console.log(
            "Profile data loaded from Next.js API:",
            profileResponse.user.username
          );
          console.log("Photo URL:", profileResponse.user.foto_profil);

          if (updateUser && typeof updateUser === "function") {
            updateUser(profileResponse.user);
          }

          // Mock user stats
          setUserStats({
            totalTransactions: 15,
            totalWaste: 45.2,
            memberSince: new Date(
              profileResponse.user.created_at
            ).toLocaleDateString("id-ID", {
              year: "numeric",
              month: "long",
            }),
          });
        } else {
          throw new Error(
            profileResponse.message ||
              "Failed to fetch profile data from Next.js API"
          );
        }
      } catch (err: any) {
        console.error("Error loading profile data:", err);
        setError(err.message || "Gagal memuat data profil");

        if (user) {
          setProfileData({
            id: user.id,
            nama_lengkap: user.nama_lengkap,
            username: user.username,
            role: user.role,
            pegawai: user.pegawai,
            nip: user.nip,
            unit_kerja: user.unit_kerja,
            foto_profil: user.foto_profil,
            poin: user.poin,
            level: user.level,
            exp: user.exp,
            saldo: user.saldo,
            created_at: user.created_at,
            updated_at: user.updated_at,
          });

          setUserStats({
            totalTransactions: 0,
            totalWaste: 0,
            memberSince: new Date(user.created_at).toLocaleDateString("id-ID", {
              year: "numeric",
              month: "long",
            }),
          });
        }
      } finally {
        loadDataInProgress.current = false;
        setLoading(false);
        console.log("Profile fetch completed");
      }
    },
    [user, updateUser]
  );

  // Initialize data
  useEffect(() => {
    if (user && !isInitialized.current) {
      console.log("Initializing profile data for user:", user.username);
      isInitialized.current = true;
      setLoading(true);

      setTimeout(() => {
        fetchProfileData(false);
      }, 100);
    }
  }, [user, fetchProfileData]);

  // Manual refresh handler
  const onRefresh = useCallback(async () => {
    if (refreshing || loadDataInProgress.current) {
      console.log("Refresh already in progress");
      return;
    }

    setRefreshing(true);
    console.log("Manual refresh triggered");

    try {
      await fetchProfileData(false);
    } catch (err) {
      console.error("Error during refresh:", err);
    } finally {
      setRefreshing(false);
      console.log("Manual refresh completed");
    }
  }, [refreshing, fetchProfileData]);

  // IMPROVED: Photo upload dengan better handling dan cleanup
  const handlePhotoUpload = async () => {
    try {
      console.log("Starting photo upload process...");

      // Request media library permissions
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Izin Diperlukan",
          "Aplikasi memerlukan izin akses galeri untuk memilih foto."
        );
        return;
      }

      // Launch image picker dengan MediaType yang benar
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // FIXED: Gunakan MediaTypeOptions bukan MediaType
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        const photo = result.assets[0];

        console.log("Image selected:", {
          uri: photo.uri,
          type: photo.type,
          fileName: photo.fileName,
          fileSize: photo.fileSize,
        });

        // Validate file size (5MB limit)
        if (photo.fileSize && photo.fileSize > 5 * 1024 * 1024) {
          Alert.alert(
            "File Terlalu Besar",
            "Ukuran foto maksimal 5MB. Silakan pilih foto lain."
          );
          return;
        }

        setPhotoLoading(true);

        try {
          console.log("Uploading photo with cleanup strategy...");

          const response = await apiService.uploadProfilePhoto(photo);

          if (response.success) {
            console.log(
              "Photo uploaded successfully:",
              response.upload_method || "unknown"
            );

            const newPhotoUrl = response.photo_url;
            const oldPhotoUrl = response.old_photo;

            // FIXED: Update profile data dan reset image error
            setProfileData((prev) =>
              prev ? { ...prev, foto_profil: newPhotoUrl } : null
            );
            setImageLoadError(false); // Reset error state for new image

            if (updateUser && typeof updateUser === "function") {
              updateUser({ foto_profil: newPhotoUrl });
            }

            let successMessage = "Foto profil berhasil diperbarui";

            // Show upload method untuk debugging
            if (response.upload_method) {
              successMessage += ` (${response.upload_method})`;
            }

            // Show cleanup status
            if (response.cleaned_up && oldPhotoUrl) {
              successMessage += "\nFoto lama berhasil dihapus";
            }

            // Show any warnings but don't treat as error
            if (
              response.warning &&
              !response.warning.includes("Mock") &&
              !response.warning.includes("Simulated")
            ) {
              successMessage += `\n\nCatatan: ${response.warning}`;
            }

            // FIXED: Jangan tampilkan mock response sebagai sukses
            if (
              response.upload_method &&
              response.upload_method.includes("mock")
            ) {
              Alert.alert(
                "Upload Gagal",
                "Semua metode upload gagal. Periksa koneksi internet dan format file.\n\n" +
                  "Format yang didukung: JPG, PNG, WebP\n" +
                  "Ukuran maksimal: 5MB"
              );
              return;
            }

            Alert.alert("Berhasil", successMessage);

            // Force refresh profile data to ensure sync
            setTimeout(() => {
              fetchProfileData(false);
            }, 1000);
          } else {
            throw new Error(response.message || "Upload failed");
          }
        } catch (error: any) {
          console.error("Photo upload error:", error);

          let errorMessage = "Gagal mengupload foto";

          if (error.message.includes("timeout")) {
            errorMessage =
              "Upload timeout - coba lagi dengan koneksi yang lebih stabil";
          } else if (error.message.includes("Network request failed")) {
            errorMessage =
              "Gagal terhubung ke server - periksa koneksi internet";
          } else if (error.message.includes("File too large")) {
            errorMessage = "File terlalu besar - maksimal 5MB";
          } else if (error.message.includes("Format file harus")) {
            errorMessage =
              "Format file tidak didukung - gunakan JPG, PNG, atau WebP";
          } else if (error.message.includes("Invalid file type")) {
            errorMessage =
              "Format file tidak didukung - gunakan JPG, PNG, atau WebP";
          }

          Alert.alert(
            "Upload Gagal",
            `${errorMessage}\n\nDetail: ${error.message}`
          );
        } finally {
          setPhotoLoading(false);
        }
      }
    } catch (error: any) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Gagal membuka galeri foto");
      setPhotoLoading(false);
    }
  };

  // IMPROVED: Photo deletion dengan cleanup
  const handlePhotoDelete = async () => {
    Alert.alert(
      "Hapus Foto Profil",
      "Apakah Anda yakin ingin menghapus foto profil?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              setPhotoLoading(true);
              console.log("Deleting profile photo...");

              const response = await apiService.deleteProfilePhoto();

              if (response.success) {
                console.log("Photo deleted successfully");

                // FIXED: Reset photo dan image error state
                setProfileData((prev) =>
                  prev ? { ...prev, foto_profil: undefined } : null
                );
                setImageLoadError(false);

                if (updateUser && typeof updateUser === "function") {
                  updateUser({ foto_profil: null });
                }

                let successMessage = "Foto profil berhasil dihapus";
                if (response.deleted_photo) {
                  successMessage += "\nFile foto berhasil dihapus dari server";
                }
                if (response.warning) {
                  successMessage += `\n\nCatatan: ${response.warning}`;
                }

                Alert.alert("Berhasil", successMessage);

                // Force refresh profile data
                setTimeout(() => {
                  fetchProfileData(false);
                }, 1000);
              } else {
                throw new Error(response.message || "Delete failed");
              }
            } catch (error: any) {
              console.error("Photo delete error:", error);
              Alert.alert("Error", `Gagal menghapus foto: ${error.message}`);
            } finally {
              setPhotoLoading(false);
            }
          },
        },
      ]
    );
  };

  // Handle logout
  const handleLogout = () => {
    if (loggingOut) {
      return;
    }

    if (!logout || typeof logout !== "function") {
      Alert.alert(
        "Error",
        "Logout function not available. Please restart the app.",
        [{ text: "OK", onPress: () => router.replace("/login") }]
      );
      return;
    }

    Alert.alert(
      "Konfirmasi Logout",
      "Apakah Anda yakin ingin keluar dari aplikasi?",
      [
        {
          text: "Batal",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              setLoggingOut(true);
              console.log("Starting logout process...");

              await logout();

              console.log("Logout successful");
              router.replace("/login");

              setTimeout(() => {
                Alert.alert(
                  "Logout Berhasil",
                  "Anda telah keluar dari sistem. Terima kasih!",
                  [{ text: "OK" }]
                );
              }, 100);
            } catch (error: any) {
              console.error("Logout error:", error);
              Alert.alert(
                "Error",
                "Terjadi kesalahan saat logout. Silakan coba lagi."
              );
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const menuItems = [
    {
      id: "edit-profil",
      title: "Edit Profil",
      icon: "person-outline",
      description: "Ubah informasi profil Anda",
      onPress: () => router.push("/edit-profil"),
    },
  ];

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  }, []);

  const getInitials = useCallback((name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  // FIXED: Better photo URL handling
  const getFullPhotoUrl = useCallback((photoUrl: string | undefined) => {
    if (!photoUrl) return null;

    // If already a complete URL, return as is
    if (photoUrl.startsWith("http://") || photoUrl.startsWith("https://")) {
      return photoUrl;
    }

    // If relative path, construct full URL
    const baseUrl = apiService.baseURL || API_BASE_URL;
    const cleanBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    const cleanPhotoUrl = photoUrl.startsWith("/") ? photoUrl : `/${photoUrl}`;

    return `${cleanBaseUrl}${cleanPhotoUrl}`;
  }, []);

  // Use profileData or fallback to user
  const displayData = profileData || user;

  if (!user && !displayData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Memuat profil...</Text>
          <Text style={styles.errorText}>
            Auth context not available. Please restart the app.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.replace("/login")}>
            <Text style={styles.retryButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!displayData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Memuat profil...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const fullPhotoUrl = getFullPhotoUrl(displayData.foto_profil);

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
            <TouchableOpacity onPress={() => fetchProfileData(false)}>
              <Text style={styles.retryText}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Profil Saya</Text>
            <Text style={styles.headerSubtitle}>Informasi akun Anda</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.logoutButton,
              loggingOut && styles.logoutButtonDisabled,
            ]}
            onPress={handleLogout}
            disabled={loggingOut}>
            {loggingOut ? (
              <ActivityIndicator size={20} color={BrandColors.white} />
            ) : (
              <Ionicons
                name="log-out-outline"
                size={24}
                color={BrandColors.white}
              />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Profile Card */}
          <View style={styles.profileCard}>
            {/* Avatar Section - FIXED with better error handling */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarContainer}>
                <TouchableOpacity
                  onPress={handlePhotoUpload}
                  disabled={photoLoading}
                  style={styles.avatarTouchable}>
                  {photoLoading && (
                    <View style={styles.photoLoadingOverlay}>
                      <ActivityIndicator color={BrandColors.white} />
                    </View>
                  )}

                  {fullPhotoUrl && !imageLoadError ? (
                    <Image
                      source={{ uri: fullPhotoUrl }}
                      style={styles.avatar}
                      onError={(e) => {
                        console.warn("Failed to load profile image:", {
                          uri: fullPhotoUrl,
                          error: e.nativeEvent.error,
                        });
                        setImageLoadError(true);
                      }}
                      onLoad={() => {
                        console.log(
                          "Profile image loaded successfully:",
                          fullPhotoUrl
                        );
                        setImageLoadError(false);
                      }}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {getInitials(displayData.nama_lengkap)}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Photo Actions */}
                <View style={styles.photoActions}>
                  <TouchableOpacity
                    onPress={handlePhotoUpload}
                    disabled={photoLoading}
                    style={styles.photoActionButton}>
                    <Ionicons
                      name="camera-outline"
                      size={12}
                      color={BrandColors.primary}
                    />
                  </TouchableOpacity>

                  {fullPhotoUrl && !imageLoadError && (
                    <TouchableOpacity
                      onPress={handlePhotoDelete}
                      disabled={photoLoading}
                      style={[
                        styles.photoActionButton,
                        styles.deletePhotoButton,
                      ]}>
                      <Ionicons
                        name="trash-outline"
                        size={12}
                        color="#dc2626"
                      />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Status Badge */}
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      displayData.pegawai === 1 ? "#dbeafe" : "#fed7aa",
                  },
                ]}>
                <Ionicons
                  name={
                    displayData.pegawai === 1 ? "shield-checkmark" : "person"
                  }
                  size={12}
                  color={displayData.pegawai === 1 ? "#2563eb" : "#ea580c"}
                />
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: displayData.pegawai === 1 ? "#2563eb" : "#ea580c",
                    },
                  ]}>
                  {displayData.pegawai === 1
                    ? "Pegawai/Tenaga Medis"
                    : "Masyarakat Umum"}
                </Text>
              </View>
            </View>

            {/* User Info */}
            <View style={styles.userInfo}>
              <Text style={styles.fullName}>{displayData.nama_lengkap}</Text>
              <Text style={styles.username}>@{displayData.username}</Text>
              {displayData.nip && (
                <Text style={styles.nip}>NIP: {displayData.nip}</Text>
              )}
              {displayData.unit_kerja && (
                <Text style={styles.unitKerja}>{displayData.unit_kerja}</Text>
              )}
            </View>

            {/* Balance Info */}
            <View style={styles.balanceSection}>
              <Text style={styles.balanceLabel}>Saldo Aktif</Text>
              <Text style={styles.balanceAmount}>
                {formatCurrency(displayData.saldo || 0)}
              </Text>
            </View>
          </View>

          {/* Stats Cards */}
          {userStats && (
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Ionicons
                    name="wallet-outline"
                    size={20}
                    color={BrandColors.primary}
                  />
                </View>
                <Text style={styles.statValue}>
                  {userStats.totalTransactions}
                </Text>
                <Text style={styles.statLabel}>Transaksi</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Ionicons
                    name="leaf-outline"
                    size={20}
                    color={BrandColors.secondary}
                  />
                </View>
                <Text style={styles.statValue}>{userStats.totalWaste} kg</Text>
                <Text style={styles.statLabel}>Sampah Disetor</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statIcon}>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={BrandColors.accent}
                  />
                </View>
                <Text style={styles.statValue}>{userStats.memberSince}</Text>
                <Text style={styles.statLabel}>Bergabung</Text>
              </View>
            </View>
          )}

          {/* Loading indicator for data */}
          {loading && (
            <View style={styles.loadingIndicator}>
              <ActivityIndicator size="small" color={BrandColors.primary} />
              <Text style={styles.loadingIndicatorText}>Memuat data...</Text>
            </View>
          )}

          {/* Account Status */}
          <View style={styles.accountStatusCard}>
            <Text style={styles.sectionTitle}>Status Akun</Text>

            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <View style={styles.statusInfo}>
                  <Text style={styles.statusTitle}>Status Akun</Text>
                  <Text style={styles.statusValue}>Aktif</Text>
                </View>
              </View>
            </View>

            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <Ionicons
                  name="person-circle-outline"
                  size={20}
                  color={BrandColors.primary}
                />
                <View style={styles.statusInfo}>
                  <Text style={styles.statusTitle}>Tipe Pengguna</Text>
                  <Text style={styles.statusValue}>{displayData.role}</Text>
                </View>
              </View>
            </View>

            <View style={styles.statusRow}>
              <View style={styles.statusItem}>
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={BrandColors.gray[500]}
                />
                <View style={styles.statusInfo}>
                  <Text style={styles.statusTitle}>Tanggal Bergabung</Text>
                  <Text style={styles.statusValue}>
                    {formatDate(displayData.created_at)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Menu List */}
          <View style={styles.menuContainer}>
            <Text style={styles.sectionTitle}>Menu Profil</Text>

            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={item.onPress}
                disabled={loggingOut}>
                <View style={styles.menuIcon}>
                  <Ionicons
                    name={item.icon as any}
                    size={24}
                    color={BrandColors.primary}
                  />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuDescription}>{item.description}</Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={BrandColors.gray[400]}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Logout Section */}
          <View style={styles.logoutSection}>
            <TouchableOpacity
              style={[
                styles.logoutCard,
                loggingOut && styles.logoutCardDisabled,
              ]}
              onPress={handleLogout}
              disabled={loggingOut}>
              <View style={styles.logoutIcon}>
                {loggingOut ? (
                  <ActivityIndicator size={24} color="#dc2626" />
                ) : (
                  <Ionicons name="log-out-outline" size={24} color="#dc2626" />
                )}
              </View>
              <View style={styles.logoutContent}>
                <Text style={styles.logoutTitle}>
                  {loggingOut ? "Sedang Keluar..." : "Keluar dari Akun"}
                </Text>
                <Text style={styles.logoutDescription}>
                  {loggingOut
                    ? "Mohon tunggu sebentar..."
                    : "Keluar dari sistem SHERLOCK BANGSAMSIR"}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={loggingOut ? BrandColors.gray[300] : "#dc2626"}
              />
            </TouchableOpacity>
          </View>

          {/* App Info */}
          <View style={styles.appInfo}>
            <Text style={styles.appInfoText}>SHERLOCK BANGSAMSIR v1.0.0</Text>
            <Text style={styles.appInfoSubtext}>
              © 2025 Maizan Insani Akbar from SIMRS RSUD Mohammad Natsir
            </Text>
            <Text style={styles.appInfoSubtext}>
              Bank Sampah Digital Smart Green Hospital
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles remain the same as before
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
    padding: 20,
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
  retryButton: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 10,
  },
  retryButtonText: {
    color: BrandColors.white,
    fontSize: 14,
    fontWeight: "600",
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
  header: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
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
  logoutButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  logoutButtonDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  profileCard: {
    backgroundColor: BrandColors.white,
    borderRadius: 20,
    padding: 25,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 15,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 10,
  },
  avatarTouchable: {
    position: "relative",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: BrandColors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "700",
    color: BrandColors.white,
  },
  photoLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  photoActions: {
    position: "absolute",
    bottom: -5,
    right: -5,
    flexDirection: "row",
    gap: 5,
  },
  photoActionButton: {
    backgroundColor: BrandColors.white,
    borderRadius: 12,
    padding: 6,
    borderWidth: 2,
    borderColor: BrandColors.gray[200],
  },
  deletePhotoButton: {
    borderColor: "#fca5a5",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  userInfo: {
    alignItems: "center",
    marginBottom: 20,
  },
  fullName: {
    fontSize: 20,
    fontWeight: "700",
    color: BrandColors.gray[900],
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    color: BrandColors.gray[600],
    marginBottom: 2,
  },
  nip: {
    fontSize: 12,
    color: BrandColors.gray[500],
    marginBottom: 2,
  },
  unitKerja: {
    fontSize: 12,
    color: BrandColors.gray[500],
  },
  balanceSection: {
    alignItems: "center",
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: BrandColors.gray[200],
    width: "100%",
  },
  balanceLabel: {
    fontSize: 14,
    color: BrandColors.gray[600],
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: BrandColors.primary,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: BrandColors.white,
    borderRadius: 15,
    padding: 15,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    backgroundColor: BrandColors.gray[100],
    padding: 8,
    borderRadius: 10,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
    color: BrandColors.gray[900],
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: BrandColors.gray[600],
    textAlign: "center",
  },
  accountStatusCard: {
    backgroundColor: BrandColors.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: BrandColors.gray[900],
    marginBottom: 15,
  },
  statusRow: {
    marginBottom: 12,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusInfo: {
    marginLeft: 12,
  },
  statusTitle: {
    fontSize: 12,
    color: BrandColors.gray[600],
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: "500",
    color: BrandColors.gray[900],
  },
  menuContainer: {
    backgroundColor: BrandColors.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.gray[100],
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BrandColors.gray[100],
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: BrandColors.gray[900],
    marginBottom: 2,
  },
  menuDescription: {
    fontSize: 12,
    color: BrandColors.gray[600],
  },
  logoutSection: {
    marginBottom: 20,
  },
  logoutCard: {
    backgroundColor: BrandColors.white,
    borderRadius: 15,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  logoutCardDisabled: {
    opacity: 0.6,
    borderColor: BrandColors.gray[300],
  },
  logoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fef2f2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  logoutContent: {
    flex: 1,
  },
  logoutTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#dc2626",
    marginBottom: 2,
  },
  logoutDescription: {
    fontSize: 12,
    color: "#ef4444",
  },
  appInfo: {
    alignItems: "center",
    paddingVertical: 20,
  },
  appInfoText: {
    fontSize: 12,
    fontWeight: "600",
    color: BrandColors.gray[600],
    marginBottom: 4,
  },
  appInfoSubtext: {
    fontSize: 10,
    color: BrandColors.gray[500],
    textAlign: "center",
    marginBottom: 2,
  },
});
