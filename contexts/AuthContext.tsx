// contexts/AuthContext.tsx - FIXED untuk Next.js API integration
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import apiService from "../services/api";

export interface User {
  id: number;
  username: string;
  nama_lengkap: string;
  role: "admin" | "nasabah";
  unit_kerja?: string;
  kategori_id: number;
  pegawai: number; // ✅ FIXED: Tambahkan field pegawai
  unit_kerja_id?: number;
  nip?: string;
  foto_profil?: string;
  poin: number;
  level: number;
  exp: number;
  saldo: number;
  created_at: string;
  updated_at?: string;
}

interface AuthContextType {
  user: User | null;
  login: (
    username: string,
    password: string
  ) => Promise<{ success: boolean; message: string }>;
  register: (userData: {
    username: string;
    password: string;
    nama_lengkap: string;
  }) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  loading: boolean;
  updateUser: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Refs untuk prevent multiple simultaneous calls
  const refreshInProgress = useRef(false);
  const initInProgress = useRef(false);

  // ✅ FIXED: Check authentication status dengan Next.js API
  const checkAuthStatus = useCallback(async () => {
    if (initInProgress.current) return;
    initInProgress.current = true;

    try {
      setLoading(true);
      console.log("🔍 Checking authentication status with Next.js API...");

      const token = await apiService.getToken();
      if (!token) {
        console.log("🔍 No token found, user not authenticated");
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      console.log("🎫 Token found, verifying with Next.js server...");

      // ✅ FIXED: Gunakan Next.js API endpoint untuk auth check
      const response = await apiService.getMe();

      if (response.success && response.user) {
        console.log(
          "✅ User authenticated via Next.js API:",
          response.user.username
        );
        console.log("👤 User pegawai status:", response.user.pegawai);

        setUser(response.user);
        setIsAuthenticated(true);
      } else {
        console.log("❌ Token invalid, clearing auth state");
        await apiService.removeToken();
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error: any) {
      console.error("🚨 Auth check error with Next.js API:", error);

      // Handle different types of errors
      if (error?.status === 401) {
        // Token is invalid/expired
        console.log("🚨 Token expired or invalid");
        await apiService.removeToken();
        setUser(null);
        setIsAuthenticated(false);
      } else if (
        error?.message?.includes("timeout") ||
        error?.message?.includes("Network") ||
        error?.message?.includes("fetch")
      ) {
        // Network error - keep user logged in but log warning
        console.log("🌐 Network error during auth check, keeping user state");
        // Don't change user state on network errors
      } else {
        // Other errors - log out for safety
        console.log("🚨 Unknown auth error, logging out for safety");
        await apiService.removeToken();
        setUser(null);
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
      initInProgress.current = false;
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // ✅ FIXED: Login dengan Next.js API
  const login = async (username: string, password: string) => {
    try {
      setLoading(true);
      console.log("🔐 Attempting login via Next.js API for:", username);

      const response = await apiService.login(username, password);

      if (response.success && response.token && response.user) {
        console.log(
          "✅ Login successful via Next.js API for:",
          response.user.username
        );
        console.log("👤 User pegawai status:", response.user.pegawai);

        // Save token
        await apiService.saveToken(response.token);

        // Set user state
        setUser(response.user);
        setIsAuthenticated(true);

        return {
          success: true,
          message: response.message || "Login berhasil",
        };
      } else {
        console.log("❌ Login failed via Next.js API:", response.message);
        return {
          success: false,
          message: response.message || "Login gagal",
        };
      }
    } catch (error: any) {
      console.error("🚨 Login error with Next.js API:", error);

      let errorMessage = "Terjadi kesalahan saat login";

      if (error?.message?.includes("timeout")) {
        errorMessage = "Koneksi timeout, periksa jaringan Anda";
      } else if (error?.message?.includes("Network")) {
        errorMessage = "Tidak dapat terhubung ke server Next.js";
      } else if (error?.status === 401) {
        errorMessage = "Username atau password salah";
      } else if (error?.status === 429) {
        errorMessage = "Terlalu banyak percobaan login, coba lagi nanti";
      } else if (error?.response?.message) {
        errorMessage = error.response.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        message: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Register dengan Next.js API
  const register = async (userData: {
    username: string;
    password: string;
    nama_lengkap: string;
  }) => {
    try {
      setLoading(true);
      console.log(
        "🔐 Attempting registration via Next.js API for:",
        userData.username
      );

      const response = await apiService.register(userData);

      if (response.success) {
        console.log(
          "✅ Registration successful via Next.js API for:",
          userData.username
        );
        return {
          success: true,
          message: response.message || "Registrasi berhasil",
        };
      } else {
        console.log(
          "❌ Registration failed via Next.js API:",
          response.message
        );
        return {
          success: false,
          message: response.message || "Registrasi gagal",
        };
      }
    } catch (error: any) {
      console.error("🚨 Registration error with Next.js API:", error);

      let errorMessage = "Terjadi kesalahan saat registrasi";

      if (error?.message?.includes("timeout")) {
        errorMessage = "Koneksi timeout, periksa jaringan Anda";
      } else if (error?.message?.includes("Network")) {
        errorMessage = "Tidak dapat terhubung ke server Next.js";
      } else if (error?.status === 409) {
        errorMessage = "Username sudah digunakan";
      } else if (error?.status === 400) {
        errorMessage = "Data yang dimasukkan tidak valid";
      } else if (error?.response?.message) {
        errorMessage = error.response.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        message: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Logout dengan Next.js API
  const logout = async () => {
    try {
      setLoading(true);
      console.log("🚪 Logging out user via Next.js API...");

      // Try to call logout endpoint (optional, might fail if network is down)
      try {
        await apiService.logout();
        console.log("✅ Logout API call successful");
      } catch (error) {
        console.warn(
          "⚠️ Logout API call failed (continuing with local logout):",
          error
        );
      }

      // Remove token from storage
      await apiService.removeToken();

      // Clear user state
      setUser(null);
      setIsAuthenticated(false);

      console.log("✅ Logout successful");
    } catch (error) {
      console.error("🚨 Logout error:", error);
      // Even if there's an error, clear the state
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = useCallback((userData: Partial<User>) => {
    setUser((current) => (current ? { ...current, ...userData } : null));
  }, []);

  // ✅ FIXED: Refresh user dengan Next.js API
  const refreshUser = useCallback(async () => {
    if (!isAuthenticated || refreshInProgress.current) return;
    refreshInProgress.current = true;

    try {
      console.log("🔄 Refreshing user data via Next.js API...");
      const response = await apiService.getMe();

      if (response.success && response.user) {
        console.log("✅ User data refreshed via Next.js API");
        console.log("👤 Updated user pegawai status:", response.user.pegawai);
        setUser(response.user);
      } else {
        console.log("❌ Failed to refresh user data via Next.js API");
        // If refresh fails, user might need to login again
        await logout();
      }
    } catch (error: any) {
      console.error("🚨 Refresh user error with Next.js API:", error);

      if (error?.status === 401) {
        // Token expired, logout user
        console.log("🚨 Token expired during refresh");
        await logout();
      } else {
        // On other errors, keep current user state but log the error
        console.log("⚠️ Network error during refresh, keeping user logged in");
      }
    } finally {
      refreshInProgress.current = false;
    }
  }, [isAuthenticated, logout]);

  const value = {
    user,
    login,
    register,
    logout,
    loading,
    updateUser,
    refreshUser,
    isAuthenticated,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// ✅ FIXED: Custom hook untuk authenticated API calls dengan Next.js
export function useAuthenticatedApi() {
  const { logout } = useAuth();

  const makeRequest = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      try {
        const token = await apiService.getToken();
        if (!token) {
          throw new Error("No authentication token found");
        }

        // ✅ FIXED: Gunakan apiService yang sudah dikonfigurasi untuk Next.js
        const response = await apiService.makeRequest(endpoint, {
          ...options,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            ...options.headers,
          },
        });

        return response;
      } catch (error: any) {
        console.error("🚨 Authenticated API call error:", error);

        if (error?.status === 401) {
          console.log("🚨 Authentication expired, logging out...");
          await logout();
          throw new Error("Authentication expired");
        }

        throw error;
      }
    },
    [logout]
  );

  return { makeRequest };
}
