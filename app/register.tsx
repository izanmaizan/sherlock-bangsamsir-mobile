// app/register.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

export default function RegisterScreen() {
  const router = useRouter();
  const { register, user, loading: authLoading } = useAuth();

  const [username, setUsername] = useState("");
  const [namaLengkap, setNamaLengkap] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    username?: string;
    namaLengkap?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      router.replace("/(tabs)");
    }
  }, [user, authLoading, router]);

  const validateForm = () => {
    const newErrors: {
      username?: string;
      namaLengkap?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!username.trim()) {
      newErrors.username = "Username harus diisi";
    } else if (username.length < 3) {
      newErrors.username = "Username minimal 3 karakter";
    }

    if (!namaLengkap.trim()) {
      newErrors.namaLengkap = "Nama lengkap harus diisi";
    }

    if (!password) {
      newErrors.password = "Password harus diisi";
    } else if (password.length < 6) {
      newErrors.password = "Password minimal 6 karakter";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Konfirmasi password harus diisi";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Konfirmasi password tidak cocok";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      console.log("📝 Attempting registration...");
      const result = await register({
        username: username.trim(),
        password,
        nama_lengkap: namaLengkap.trim(),
      });

      if (result.success) {
        console.log("✅ Registration successful");
        Alert.alert(
          "Registrasi Berhasil",
          "Akun Anda telah dibuat. Silakan login.",
          [
            {
              text: "OK",
              onPress: () => router.replace("/login"),
            },
          ]
        );
      } else {
        console.log("❌ Registration failed:", result.message);
        Alert.alert("Registrasi Gagal", result.message);
      }
    } catch (error: any) {
      console.error("🚨 Registration error:", error);
      Alert.alert("Error", "Terjadi kesalahan yang tidak terduga");
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading screen while checking auth status
  if (authLoading) {
    return (
      <LinearGradient
        colors={[BrandColors.primary, BrandColors.secondary]}
        style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <View style={styles.logoInnerCircle}>
                  <Image
                    source={require("../assets/images/icon.png")}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </View>
            <ActivityIndicator
              size="large"
              color={BrandColors.white}
              style={styles.loadingSpinner}
            />
            <Text style={styles.loadingText}>Memeriksa autentikasi...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <LinearGradient
        colors={[BrandColors.primary, BrandColors.secondary]}
        style={styles.backgroundGradient}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              disabled={isLoading}>
              <Ionicons name="arrow-back" size={24} color={BrandColors.white} />
              <Text style={styles.backText}>Kembali</Text>
            </TouchableOpacity>

            {/* Header with Logo */}
            <View style={styles.header}>
              <View style={styles.logoSection}>
                <View style={styles.logoContainer}>
                  <View style={styles.logoCircle}>
                    <View style={styles.logoInnerCircle}>
                      <Image
                        source={require("../assets/images/icon.png")}
                        style={styles.logoImage}
                        resizeMode="contain"
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.brandTextContainer}>
                  <Text style={styles.brandText}>
                    <Text style={styles.brandTextPrimary}>SHERLOCK</Text>
                    {"\n"}
                    <Text style={styles.brandTextSecondary}>BANGSAMSIR</Text>
                  </Text>
                </View>
              </View>
            </View>

            {/* Register Form */}
            <View style={styles.formContainer}>
              <View style={styles.form}>
                {/* Username Field */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Username *</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      errors.username && styles.inputError,
                    ]}>
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color={
                        errors.username ? "#dc2626" : BrandColors.gray[400]
                      }
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      placeholder="Username unik"
                      placeholderTextColor={BrandColors.gray[400]}
                      value={username}
                      onChangeText={(text) => {
                        setUsername(text);
                        if (errors.username) {
                          setErrors((prev) => ({
                            ...prev,
                            username: undefined,
                          }));
                        }
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="username"
                      editable={!isLoading}
                    />
                  </View>
                  {errors.username && (
                    <Text style={styles.errorText}>{errors.username}</Text>
                  )}
                </View>

                {/* Nama Lengkap Field */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Nama Lengkap *</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      errors.namaLengkap && styles.inputError,
                    ]}>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Nama lengkap Anda"
                      placeholderTextColor={BrandColors.gray[400]}
                      value={namaLengkap}
                      onChangeText={(text) => {
                        setNamaLengkap(text);
                        if (errors.namaLengkap) {
                          setErrors((prev) => ({
                            ...prev,
                            namaLengkap: undefined,
                          }));
                        }
                      }}
                      autoCapitalize="words"
                      autoCorrect={false}
                      autoComplete="name"
                      editable={!isLoading}
                    />
                  </View>
                  {errors.namaLengkap && (
                    <Text style={styles.errorText}>{errors.namaLengkap}</Text>
                  )}
                </View>

                {/* Password Field */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Password *</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      errors.password && styles.inputError,
                    ]}>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={20}
                      color={
                        errors.password ? "#dc2626" : BrandColors.gray[400]
                      }
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.textInput, styles.passwordInput]}
                      placeholder="Minimal 6 karakter"
                      placeholderTextColor={BrandColors.gray[400]}
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        if (errors.password) {
                          setErrors((prev) => ({
                            ...prev,
                            password: undefined,
                          }));
                        }
                      }}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="new-password"
                      editable={!isLoading}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowPassword(!showPassword)}
                      disabled={isLoading}>
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={20}
                        color={BrandColors.gray[400]}
                      />
                    </TouchableOpacity>
                  </View>
                  {errors.password && (
                    <Text style={styles.errorText}>{errors.password}</Text>
                  )}
                </View>

                {/* Confirm Password Field */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Konfirmasi Password *</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      errors.confirmPassword && styles.inputError,
                    ]}>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={20}
                      color={
                        errors.confirmPassword
                          ? "#dc2626"
                          : BrandColors.gray[400]
                      }
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.textInput, styles.passwordInput]}
                      placeholder="Ulangi password"
                      placeholderTextColor={BrandColors.gray[400]}
                      value={confirmPassword}
                      onChangeText={(text) => {
                        setConfirmPassword(text);
                        if (errors.confirmPassword) {
                          setErrors((prev) => ({
                            ...prev,
                            confirmPassword: undefined,
                          }));
                        }
                      }}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="new-password"
                      editable={!isLoading}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      disabled={isLoading}>
                      <Ionicons
                        name={
                          showConfirmPassword
                            ? "eye-off-outline"
                            : "eye-outline"
                        }
                        size={20}
                        color={BrandColors.gray[400]}
                      />
                    </TouchableOpacity>
                  </View>
                  {errors.confirmPassword && (
                    <Text style={styles.errorText}>
                      {errors.confirmPassword}
                    </Text>
                  )}
                </View>

                {/* Register Button */}
                <TouchableOpacity
                  style={[
                    styles.registerButton,
                    (isLoading ||
                      !username ||
                      !namaLengkap ||
                      !password ||
                      !confirmPassword) &&
                      styles.registerButtonDisabled,
                  ]}
                  onPress={handleRegister}
                  disabled={
                    isLoading ||
                    !username ||
                    !namaLengkap ||
                    !password ||
                    !confirmPassword
                  }>
                  <LinearGradient
                    colors={[BrandColors.primary, BrandColors.secondary]}
                    style={styles.registerButtonGradient}>
                    {isLoading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator
                          size="small"
                          color={BrandColors.white}
                        />
                        <Text style={styles.registerButtonText}>
                          Mendaftar...
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.buttonContent}>
                        <Ionicons
                          name="person-add-outline"
                          size={20}
                          color={BrandColors.white}
                        />
                        <Text style={styles.registerButtonText}>
                          Daftar Sekarang
                        </Text>
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>Atau</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Login Link */}
                <View style={styles.loginContainer}>
                  <Text style={styles.loginText}>Sudah punya akun? </Text>
                  <TouchableOpacity
                    onPress={() => router.push("/login")}
                    disabled={isLoading}>
                    <Text
                      style={[
                        styles.loginLink,
                        isLoading && styles.linkDisabled,
                      ]}>
                      Login sekarang
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Footer */}
            {/* <View style={styles.footer}>
              <Text style={styles.footerText}>
                © 2025 Maizan Insani Akbar from SIMRS
              </Text>
            </View> */}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  loadingSpinner: {
    marginLeft: 12,
  },
  loadingText: {
    color: BrandColors.white,
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 10,
    marginBottom: 20,
  },
  backText: {
    color: BrandColors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  header: {
    alignItems: "center",
    paddingBottom: 30,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  logoContainer: {
    marginBottom: 15,
  },
  logoCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: BrandColors.white,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  logoInnerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BrandColors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  logoImage: {
    width: 42,
    height: 42,
    tintColor: BrandColors.white,
  },
  brandTextContainer: {
    alignItems: "center",
  },
  brandText: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 24,
  },
  brandTextPrimary: {
    color: "#065f46",
  },
  brandTextSecondary: {
    color: "#34d399",
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: BrandColors.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "600",
    color: BrandColors.white,
    textAlign: "center",
    lineHeight: 18,
  },
  hospitalBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  hospitalText: {
    color: BrandColors.white,
    fontSize: 12,
    fontWeight: "700",
  },
  formContainer: {
    backgroundColor: BrandColors.white,
    borderRadius: 25,
    padding: 25,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  form: {
    gap: 18,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: BrandColors.gray[800],
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderColor: BrandColors.gray[200],
    borderRadius: 12,
    backgroundColor: BrandColors.white,
  },
  inputError: {
    borderColor: "#dc2626",
  },
  inputIcon: {
    marginLeft: 12,
  },
  textInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    color: BrandColors.gray[900],
  },
  passwordInput: {
    paddingRight: 0,
  },
  eyeButton: {
    padding: 12,
  },
  errorText: {
    fontSize: 12,
    color: "#dc2626",
    fontWeight: "500",
  },
  registerButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 10,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  registerButtonText: {
    color: BrandColors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: BrandColors.gray[300],
  },
  dividerText: {
    paddingHorizontal: 15,
    fontSize: 14,
    color: BrandColors.gray[500],
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginText: {
    fontSize: 14,
    color: BrandColors.gray[600],
  },
  loginLink: {
    fontSize: 14,
    color: BrandColors.primary,
    fontWeight: "600",
  },
  linkDisabled: {
    opacity: 0.5,
  },
  footer: {
    alignItems: "center",
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
  },
});
