// app/edit-profil.tsx - Edit Profile Screen with API Integration
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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

interface FormData {
  nama_lengkap: string;
  pegawai: number;
  nip: string;
  unit_kerja: string;
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export default function EditProfilScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    nama_lengkap: "",
    pegawai: 0,
    nip: "",
    unit_kerja: "",
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFormData({
        nama_lengkap: user.nama_lengkap || "",
        pegawai: user.pegawai || 0,
        nip: user.nip || "",
        unit_kerja: user.unit_kerja || "",
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    }
  }, [user]);

  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handlePegawaiChange = (newValue: number) => {
    setFormData((prev) => ({
      ...prev,
      pegawai: newValue,
      nip: newValue === 0 ? "" : prev.nip,
      unit_kerja: newValue === 0 ? "" : prev.unit_kerja,
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FormData> = {};

    if (!formData.nama_lengkap.trim()) {
      newErrors.nama_lengkap = "Nama lengkap harus diisi";
    } else if (formData.nama_lengkap.trim().length < 3) {
      newErrors.nama_lengkap = "Nama lengkap minimal 3 karakter";
    }

    if (formData.current_password && !formData.new_password) {
      newErrors.new_password = "Password baru harus diisi";
    }

    if (formData.new_password) {
      if (!formData.current_password) {
        newErrors.current_password = "Password lama harus diisi";
      }
      if (formData.new_password.length < 6) {
        newErrors.new_password = "Password baru minimal 6 karakter";
      }
      if (formData.new_password !== formData.confirm_password) {
        newErrors.confirm_password = "Konfirmasi password tidak sesuai";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert("Error", "Silakan perbaiki kesalahan pada form");
      return;
    }

    setLoading(true);

    try {
      console.log("📝 Updating profile...");

      const response = await apiService.updateProfile({
        nama_lengkap: formData.nama_lengkap.trim(),
        pegawai: formData.pegawai,
        nip:
          formData.pegawai === 1 ? formData.nip.trim() || undefined : undefined,
        unit_kerja:
          formData.pegawai === 1
            ? formData.unit_kerja.trim() || undefined
            : undefined,
        current_password: formData.current_password || undefined,
        new_password: formData.new_password || undefined,
      });

      if (response.success) {
        console.log("✅ Profile updated successfully");

        // Update user context with new data
        if (response.user) {
          updateUser(response.user);
        }

        Alert.alert("Berhasil", "Profil berhasil diperbarui", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        throw new Error(response.message || "Failed to update profile");
      }
    } catch (error: any) {
      console.error("❌ Profile update error:", error);
      Alert.alert("Error", error.message || "Gagal memperbarui profil");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
          <Text style={styles.loadingText}>Memuat data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={BrandColors.white} />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Edit Profil</Text>
            <Text style={styles.headerSubtitle}>Perbarui informasi Anda</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Basic Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Informasi Dasar</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nama Lengkap *</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    errors.nama_lengkap && styles.inputError,
                  ]}
                  value={formData.nama_lengkap}
                  onChangeText={(text) =>
                    handleInputChange("nama_lengkap", text)
                  }
                  placeholder="Masukkan nama lengkap"
                />
                {errors.nama_lengkap && (
                  <Text style={styles.errorText}>{errors.nama_lengkap}</Text>
                )}
              </View>

              <View style={styles.usernameInfo}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={BrandColors.primary}
                />
                <View style={styles.usernameContent}>
                  <Text style={styles.usernameLabel}>
                    Username: {user.username}
                  </Text>
                  <Text style={styles.usernameNote}>
                    Username tidak dapat diubah
                  </Text>
                </View>
              </View>
            </View>

            {/* Employee Status */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Status Kepegawaian</Text>

              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    formData.pegawai === 0 && styles.radioSelected,
                  ]}
                  onPress={() => handlePegawaiChange(0)}>
                  <View style={styles.radioButton}>
                    {formData.pegawai === 0 && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                  <View style={styles.radioContent}>
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color={BrandColors.gray[600]}
                    />
                    <View style={styles.radioText}>
                      <Text style={styles.radioTitle}>Masyarakat Umum</Text>
                      <Text style={styles.radioSubtitle}>
                        Pengunjung, keluarga pasien, masyarakat
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.radioOption,
                    formData.pegawai === 1 && styles.radioSelected,
                  ]}
                  onPress={() => handlePegawaiChange(1)}>
                  <View style={styles.radioButton}>
                    {formData.pegawai === 1 && (
                      <View style={styles.radioButtonInner} />
                    )}
                  </View>
                  <View style={styles.radioContent}>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={20}
                      color={BrandColors.primary}
                    />
                    <View style={styles.radioText}>
                      <Text style={styles.radioTitle}>
                        Pegawai/Tenaga Medis
                      </Text>
                      <Text style={styles.radioSubtitle}>
                        Pegawai RSUD M Natsir
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Employee Details */}
              {formData.pegawai === 1 && (
                <View style={styles.employeeDetails}>
                  <View style={styles.employeeInfo}>
                    <Ionicons
                      name="information-circle-outline"
                      size={20}
                      color={BrandColors.primary}
                    />
                    <Text style={styles.employeeInfoText}>
                      Lengkapi data kepegawaian untuk akses penuh sebagai
                      pegawai RSUD.
                    </Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      NIP (Nomor Induk Pegawai)
                    </Text>
                    <View style={styles.inputWithIcon}>
                      <Ionicons
                        name="id-card-outline"
                        size={20}
                        color={BrandColors.gray[400]}
                      />
                      <TextInput
                        style={[
                          styles.textInput,
                          styles.textInputWithIcon,
                          errors.nip && styles.inputError,
                        ]}
                        value={formData.nip}
                        onChangeText={(text) => handleInputChange("nip", text)}
                        placeholder="Masukkan NIP Anda"
                      />
                    </View>
                    {errors.nip && (
                      <Text style={styles.errorText}>{errors.nip}</Text>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Unit Kerja</Text>
                    <View style={styles.inputWithIcon}>
                      <Ionicons
                        name="business-outline"
                        size={20}
                        color={BrandColors.gray[400]}
                      />
                      <TextInput
                        style={[styles.textInput, styles.textInputWithIcon]}
                        value={formData.unit_kerja}
                        onChangeText={(text) =>
                          handleInputChange("unit_kerja", text)
                        }
                        placeholder="Masukkan unit kerja Anda"
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Change Password */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Keamanan Akun</Text>
              <Text style={styles.sectionSubtitle}>
                Kosongkan field password jika tidak ingin mengubah password
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password Saat Ini</Text>
                <View style={styles.inputWithIcon}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={BrandColors.gray[400]}
                  />
                  <TextInput
                    style={[
                      styles.textInput,
                      styles.textInputWithIcon,
                      errors.current_password && styles.inputError,
                    ]}
                    value={formData.current_password}
                    onChangeText={(text) =>
                      handleInputChange("current_password", text)
                    }
                    placeholder="Masukkan password saat ini"
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? "eye" : "eye-off"}
                      size={20}
                      color={BrandColors.gray[500]}
                    />
                  </TouchableOpacity>
                </View>
                {errors.current_password && (
                  <Text style={styles.errorText}>
                    {errors.current_password}
                  </Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password Baru</Text>
                <View style={styles.inputWithIcon}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={BrandColors.gray[400]}
                  />
                  <TextInput
                    style={[
                      styles.textInput,
                      styles.textInputWithIcon,
                      errors.new_password && styles.inputError,
                    ]}
                    value={formData.new_password}
                    onChangeText={(text) =>
                      handleInputChange("new_password", text)
                    }
                    placeholder="Masukkan password baru"
                    secureTextEntry={!showNewPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowNewPassword(!showNewPassword)}>
                    <Ionicons
                      name={showNewPassword ? "eye" : "eye-off"}
                      size={20}
                      color={BrandColors.gray[500]}
                    />
                  </TouchableOpacity>
                </View>
                {errors.new_password && (
                  <Text style={styles.errorText}>{errors.new_password}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Konfirmasi Password Baru</Text>
                <View style={styles.inputWithIcon}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={BrandColors.gray[400]}
                  />
                  <TextInput
                    style={[
                      styles.textInput,
                      styles.textInputWithIcon,
                      errors.confirm_password && styles.inputError,
                    ]}
                    value={formData.confirm_password}
                    onChangeText={(text) =>
                      handleInputChange("confirm_password", text)
                    }
                    placeholder="Ulangi password baru"
                    secureTextEntry={true}
                  />
                </View>
                {errors.confirm_password && (
                  <Text style={styles.errorText}>
                    {errors.confirm_password}
                  </Text>
                )}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSubmit}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator size="small" color={BrandColors.white} />
                ) : (
                  <Ionicons
                    name="checkmark-outline"
                    size={20}
                    color={BrandColors.white}
                  />
                )}
                <Text style={styles.saveButtonText}>
                  {loading ? "Menyimpan..." : "Simpan Perubahan"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => router.back()}
                disabled={loading}>
                <Ionicons
                  name="close-outline"
                  size={20}
                  color={BrandColors.gray[600]}
                />
                <Text style={styles.cancelButtonText}>Batal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.gray[50],
  },
  keyboardAvoid: {
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
  header: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  backButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    padding: 10,
    borderRadius: 12,
    marginRight: 15,
    marginTop: 4,
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  section: {
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
  sectionSubtitle: {
    fontSize: 12,
    color: BrandColors.gray[600],
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: BrandColors.gray[700],
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: BrandColors.gray[300],
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: BrandColors.gray[900],
    backgroundColor: BrandColors.white,
  },
  textInputWithIcon: {
    paddingLeft: 45,
    paddingRight: 45,
  },
  inputWithIcon: {
    position: "relative",
    justifyContent: "center",
  },
  inputError: {
    borderColor: "#ef4444",
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    marginTop: 4,
  },
  eyeButton: {
    position: "absolute",
    right: 15,
    padding: 5,
  },
  usernameInfo: {
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dcfce7",
  },
  usernameContent: {
    marginLeft: 12,
  },
  usernameLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: BrandColors.primary,
    marginBottom: 2,
  },
  usernameNote: {
    fontSize: 12,
    color: "#059669",
  },
  radioGroup: {
    gap: 12,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: BrandColors.gray[300],
    borderRadius: 12,
    padding: 15,
  },
  radioSelected: {
    borderColor: BrandColors.primary,
    backgroundColor: "#f0fdf4",
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: BrandColors.gray[400],
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BrandColors.primary,
  },
  radioContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  radioText: {
    marginLeft: 12,
  },
  radioTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: BrandColors.gray[900],
    marginBottom: 2,
  },
  radioSubtitle: {
    fontSize: 12,
    color: BrandColors.gray[600],
  },
  employeeDetails: {
    marginTop: 15,
    paddingLeft: 15,
    borderLeftWidth: 3,
    borderLeftColor: BrandColors.primary,
  },
  employeeInfo: {
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#dcfce7",
  },
  employeeInfoText: {
    fontSize: 12,
    color: "#059669",
    marginLeft: 10,
    flex: 1,
  },
  actionButtons: {
    gap: 12,
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: BrandColors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: BrandColors.white,
  },
  cancelButton: {
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.gray[300],
    borderRadius: 12,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: BrandColors.gray[600],
  },
});
