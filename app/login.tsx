// app/login.tsx
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

export default function LoginScreen() {
  const router = useRouter();
  const { login, user, loading: authLoading } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{
    username?: string;
    password?: string;
  }>({});

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      router.replace("/(tabs)");
    }
  }, [user, authLoading, router]);

  const validateForm = () => {
    const newErrors: { username?: string; password?: string } = {};

    if (!username.trim()) {
      newErrors.username = "Username harus diisi";
    } else if (username.length < 3) {
      newErrors.username = "Username minimal 3 karakter";
    }

    if (!password) {
      newErrors.password = "Password harus diisi";
    } else if (password.length < 6) {
      newErrors.password = "Password minimal 6 karakter";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      console.log("🔑 Attempting login...");
      const result = await login(username.trim(), password);

      if (result.success) {
        console.log("✅ Login successful");
        // Navigation will be handled by the useEffect above
        Alert.alert("Login Berhasil", "Selamat datang di SHERLOCK BANGSAMSIR!");
      } else {
        console.log("❌ Login failed:", result.message);
        Alert.alert("Login Gagal", result.message);
      }
    } catch (error: any) {
      console.error("🚨 Login error:", error);
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

              {/* Tagline */}
              {/* <View style={styles.taglineContainer}>
                <Text style={styles.tagline}>
                  Dari Sampah Menjadi Berkah,{"\n"}
                  Menuju Smart Green Hospital
                </Text>
              </View> */}

              {/* Hospital Badge */}
              {/* <View style={styles.hospitalBadge}>
                <Ionicons name="business" size={16} color={BrandColors.white} />
                <Text style={styles.hospitalText}>
                  RSUD Mohammad Natsir Solok
                </Text>
              </View> */}
            </View>

            {/* Login Form */}
            <View style={styles.formContainer}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Masuk ke Sistem</Text>
                {/* <Text style={styles.formSubtitle}>
                  Silakan masukkan data Anda
                </Text> */}
              </View>

              <View style={styles.form}>
                {/* Username Field */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Username</Text>
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
                      placeholder="Masukkan username"
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

                {/* Password Field */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      errors.password && styles.inputError,
                    ]}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={
                        errors.password ? "#dc2626" : BrandColors.gray[400]
                      }
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.textInput, styles.passwordInput]}
                      placeholder="Masukkan password"
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
                      autoComplete="current-password"
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

                {/* Login Button */}
                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    (isLoading || !username || !password) &&
                      styles.loginButtonDisabled,
                  ]}
                  onPress={handleLogin}
                  disabled={isLoading || !username || !password}>
                  <LinearGradient
                    colors={[BrandColors.primary, BrandColors.secondary]}
                    style={styles.loginButtonGradient}>
                    {isLoading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator
                          size="small"
                          color={BrandColors.white}
                        />
                        <Text style={styles.loginButtonText}>Memproses...</Text>
                      </View>
                    ) : (
                      <View style={styles.buttonContent}>
                        <Ionicons
                          name="shield-checkmark-outline"
                          size={20}
                          color={BrandColors.white}
                        />
                        <Text style={styles.loginButtonText}>
                          Masuk ke Sistem
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

                {/* Register Link */}
                <View style={styles.registerContainer}>
                  <Text style={styles.registerText}>Belum punya akun? </Text>
                  <TouchableOpacity
                    onPress={() => router.push("/register")}
                    disabled={isLoading}>
                    <Text
                      style={[
                        styles.registerLink,
                        isLoading && styles.linkDisabled,
                      ]}>
                      Daftar sekarang
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
  header: {
    alignItems: "center",
    paddingTop: 20,
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
    width: 80,
    height: 80,
    borderRadius: 40,
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
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: BrandColors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  logoImage: {
    width: 48,
    height: 48,
    tintColor: BrandColors.white,
  },
  brandTextContainer: {
    alignItems: "center",
  },
  brandText: {
    textAlign: "center",
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 28,
  },
  brandTextPrimary: {
    color: "#065f46",
  },
  brandTextSecondary: {
    color: "#34d399",
  },
  taglineContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  tagline: {
    color: BrandColors.white,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 20,
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
  formHeader: {
    marginBottom: 25,
    alignItems: "center",
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: BrandColors.gray[900],
    marginBottom: 5,
  },
  formSubtitle: {
    fontSize: 14,
    color: BrandColors.gray[600],
  },
  form: {
    gap: 20,
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
  loginButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 10,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loginButtonText: {
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
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  registerText: {
    fontSize: 14,
    color: BrandColors.gray[600],
  },
  registerLink: {
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
