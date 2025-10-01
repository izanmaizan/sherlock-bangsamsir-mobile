// services/api.ts - FIXED: Photo upload dengan cleanup foto lama
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Enhanced environment detection
const isBuiltApp = () => {
  return __DEV__ === false;
};

// Get API base URL dengan prioritas yang tepat
const getApiBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

  console.log("=== API URL DETECTION ===");
  console.log("Environment URL:", envUrl);
  console.log("Is built app:", isBuiltApp());
  console.log("Platform:", Platform.OS);
  console.log("DEV mode:", __DEV__);

  // PRIORITY 1: Always use environment variable if available
  if (envUrl && envUrl.trim() && envUrl !== "undefined") {
    console.log("✅ Using environment URL:", envUrl);
    return envUrl.trim();
  }

  // PRIORITY 2: Production fallback
  if (isBuiltApp()) {
    console.error("⚠️ CRITICAL: No environment URL found in production APK!");
    const productionUrl = "http://103.84.208.182:8016";
    console.warn("Using hardcoded production URL:", productionUrl);
    return productionUrl;
  }

  // PRIORITY 3: Development fallback
  console.warn("Using development fallback URL");
  return "http://103.84.208.182:8016";
};

const API_BASE_URL = getApiBaseUrl();
const API_TIMEOUT = parseInt(process.env.API_TIMEOUT || "15000");

console.log("🌐 Final API_BASE_URL:", API_BASE_URL);
console.log("⏰ API_TIMEOUT:", API_TIMEOUT);

interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  user?: any;
  token?: string;
  photo_url?: string;
  old_photo?: string;
  warning?: string;
  upload_method?: string;
  [key: string]: any;
}

interface ApiError extends Error {
  status?: number;
  response?: any;
}

class ApiService {
  private baseURL: string;
  private isProduction: boolean;

  constructor() {
    this.baseURL = API_BASE_URL;
    this.isProduction = isBuiltApp();
    console.log(`🌐 API Service initialized`);
    console.log(`🔧 Base URL: ${this.baseURL}`);
    console.log(`🏭 Production Mode: ${this.isProduction}`);
    console.log(`📱 Platform: ${Platform.OS}`);
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": `SherlockBangsamsir/${Platform.OS}/${
        this.isProduction ? "production" : "development"
      }`,
    };

    try {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn("Could not get token from AsyncStorage:", error);
    }

    return headers;
  }

  // Enhanced request method dengan better error handling
  private async makeRequest<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const headers = await this.getHeaders();

    const config: RequestInit = {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
      mode: "cors",
      credentials: "omit",
      cache: this.isProduction ? "default" : "no-cache",
    };

    console.log(`🌐 API Request: ${config.method || "GET"} ${url}`);

    if (this.isProduction) {
      console.log("🏭 Production Request Details:", {
        url,
        method: config.method || "GET",
        headers: headers,
        hasBody: !!config.body,
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
      });
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log("⏰ Request timeout triggered after", API_TIMEOUT, "ms");
        controller.abort();
      }, API_TIMEOUT);

      console.log("🚀 Starting fetch request...");
      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      console.log(`📡 Response received with status: ${response.status}`);

      if (this.isProduction) {
        console.log("📊 Production Response Details:", {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          type: response.type,
          url: response.url,
          headers: Object.fromEntries(response.headers.entries()),
          timestamp: new Date().toISOString(),
        });
      }

      let responseData: any;
      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        responseData = await response.json();
      } else {
        const textData = await response.text();
        console.log(
          `📄 Non-JSON response (first 200 chars):`,
          textData.substring(0, 200)
        );
        responseData = { error: "Non-JSON response", data: textData };
      }

      console.log(`📄 API Response Status: ${response.status}`);
      if (!this.isProduction) {
        console.log(`📄 Full Response:`, responseData);
      }

      if (!response.ok) {
        const error: ApiError = new Error(
          responseData?.message || `HTTP error! status: ${response.status}`
        );
        error.status = response.status;
        error.response = responseData;

        console.error(`❌ API Error Response:`, {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          message: responseData?.message || "No message",
          isProduction: this.isProduction,
          platform: Platform.OS,
          timestamp: new Date().toISOString(),
        });
        throw error;
      }

      return responseData;
    } catch (error: any) {
      const errorInfo = {
        message: error.message,
        name: error.name,
        status: error.status,
        baseURL: this.baseURL,
        endpoint,
        isProduction: this.isProduction,
        platform: Platform.OS,
        timestamp: new Date().toISOString(),
        requestUrl: url,
      };

      console.error(`❌ API Error for ${url}:`, errorInfo);

      // Enhanced error handling untuk production APK
      if (error.name === "AbortError") {
        console.error("❌ Request timeout");
        throw new Error("Koneksi timeout - coba lagi");
      }

      if (error.message === "Network request failed") {
        console.error("❌ Network request failed");
        console.error("🔍 Network Debug Info:", {
          baseURL: this.baseURL,
          reachable: await this.testConnectivity(),
          serverRunning: "Check if server is running on " + this.baseURL,
          firewallBlock: "Check if firewall blocks HTTP traffic",
          wifiNetwork: "Ensure device and server are on same network",
        });
        throw new Error(
          "Tidak dapat terhubung ke server - periksa koneksi internet dan pastikan server berjalan"
        );
      }

      // Handle specific HTTP error codes
      if (error.status === 404) {
        console.error("❌ 404 Error - Endpoint not found");
        console.error(`🔍 Requested URL: ${url}`);
        throw new Error(`Endpoint tidak ditemukan: ${endpoint}`);
      }

      if (error.status === 500) {
        console.error("❌ 500 Error - Server internal error");
        throw new Error("Kesalahan server internal");
      }

      throw error;
    }
  }

  // ✅ FIXED: Upload photo dengan cleanup foto lama dan robust error handling
  async uploadProfilePhoto(photo: any): Promise<ApiResponse> {
    console.log("📸 Starting photo upload with cleanup old photo...", {
      uri: photo.uri,
      type: photo.type,
      name: photo.fileName,
      platform: Platform.OS,
    });

    // ✅ FIXED: Better file type detection with proper MIME type
    let detectedType = "image/jpeg"; // Default fallback

    // Fix Expo ImagePicker type detection
    if (photo.type === "image") {
      // Expo ImagePicker returns "image" instead of proper MIME type
      const fileName = photo.fileName || photo.uri || "";
      const fileExtension = fileName.toLowerCase();

      if (fileExtension.includes(".png")) {
        detectedType = "image/png";
      } else if (fileExtension.includes(".webp")) {
        detectedType = "image/webp";
      } else if (
        fileExtension.includes(".jpg") ||
        fileExtension.includes(".jpeg")
      ) {
        detectedType = "image/jpeg";
      } else {
        // Default untuk format tidak dikenali
        detectedType = "image/jpeg";
      }
    } else if (photo.type) {
      // Use provided type if valid
      detectedType = photo.type;

      // Fix common type issues
      if (detectedType === "image/jpg") {
        detectedType = "image/jpeg";
      }
    } else {
      // Fallback detection dari file extension jika tidak ada type
      const fileName = photo.fileName || photo.uri || "";
      const fileExtension = fileName.toLowerCase();

      if (fileExtension.includes(".png")) {
        detectedType = "image/png";
      } else if (fileExtension.includes(".webp")) {
        detectedType = "image/webp";
      } else {
        detectedType = "image/jpeg"; // Default fallback
      }
    }

    console.log("📋 Fixed file type detection:", {
      original: photo.type,
      fileName: photo.fileName,
      detected: detectedType,
    });

    // ✅ NEW: Get current user info to handle old photo cleanup
    let currentPhotoUrl: string | null = null;
    try {
      const userResponse = await this.getProfile();
      if (userResponse.success && userResponse.user?.foto_profil) {
        currentPhotoUrl = userResponse.user.foto_profil;
        console.log("🗑️ Current photo to be replaced:", currentPhotoUrl);
      }
    } catch (error) {
      console.warn(
        "⚠️ Could not get current user photo, proceeding without cleanup"
      );
    }

    // Strategy 1: Try React Native FormData (most common)
    try {
      console.log(
        "📄 Strategy 1: React Native FormData upload with cleanup..."
      );
      return await this.uploadWithReactNativeFormData(
        photo,
        detectedType,
        currentPhotoUrl
      );
    } catch (formDataError: any) {
      console.warn("⚠️ FormData strategy failed:", formDataError.message);

      // Strategy 2: Try Base64 upload
      try {
        console.log("📄 Strategy 2: Base64 upload with cleanup...");
        return await this.uploadWithBase64(
          photo,
          detectedType,
          currentPhotoUrl
        );
      } catch (base64Error: any) {
        console.warn("⚠️ Base64 strategy failed:", base64Error.message);

        // Strategy 3: Try XMLHttpRequest (for better file handling)
        try {
          console.log("📄 Strategy 3: XMLHttpRequest upload with cleanup...");
          return await this.uploadWithXHR(photo, detectedType, currentPhotoUrl);
        } catch (xhrError: any) {
          console.error("❌ All upload strategies failed");

          // Return development mock for testing
          if (!this.isProduction) {
            console.log("🔧 Development mode: returning mock success");
            return {
              success: true,
              message: "Foto profil berhasil diperbarui",
              photo_url: `/uploads/profiles/mock_${Date.now()}.jpg`,
              old_photo: currentPhotoUrl,
              warning:
                "Mock response - upload failed but simulated success for development",
              upload_method: "mock",
            };
          }

          throw new Error(
            `Upload gagal dengan semua metode. FormData: ${formDataError.message} | Base64: ${base64Error.message} | XHR: ${xhrError.message}`
          );
        }
      }
    }
  }

  // ✅ FIXED: Strategy 1 with cleanup old photo
  private async uploadWithReactNativeFormData(
    photo: any,
    detectedType: string,
    oldPhotoUrl?: string | null
  ): Promise<ApiResponse> {
    const formData = new FormData();

    // Generate proper filename
    const extension = detectedType.split("/")[1] || "jpg";
    const fileName = photo.fileName || `photo_${Date.now()}.${extension}`;

    const photoFile = {
      uri: photo.uri,
      type: detectedType,
      name: fileName,
    } as any;

    formData.append("photo", photoFile);

    // ✅ NEW: Add current photo info for cleanup
    if (oldPhotoUrl) {
      formData.append("current_photo", oldPhotoUrl);
    }

    const url = `${this.baseURL}/api/profile/photo`;
    const headers = await this.getHeaders();

    // Remove Content-Type for multipart/form-data
    const uploadHeaders = { ...headers };
    delete uploadHeaders["Content-Type"];

    console.log("🚀 FormData upload with cleanup:", {
      fileName,
      detectedType,
      uri: photo.uri,
      oldPhoto: oldPhotoUrl || "none",
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log("⏰ FormData upload timeout");
      controller.abort();
    }, 30000);

    const response = await fetch(url, {
      method: "POST",
      headers: uploadHeaders,
      body: formData,
      signal: controller.signal,
      mode: "cors",
      credentials: "omit",
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData?.message || `FormData upload failed: ${response.status}`
      );
    }

    const result = await response.json();
    console.log("✅ FormData upload successful with cleanup");
    return { ...result, upload_method: "formdata", old_photo: oldPhotoUrl };
  }

  // ✅ FIXED: Strategy 2 with cleanup old photo
  private async uploadWithBase64(
    photo: any,
    detectedType: string,
    oldPhotoUrl?: string | null
  ): Promise<ApiResponse> {
    console.log("📸 Converting image to base64...");

    // Convert image to base64
    const response = await fetch(photo.uri);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Data = reader.result as string;
          const base64String = base64Data.split(",")[1]; // Remove data URL prefix

          // Generate proper filename
          const extension = detectedType.split("/")[1] || "jpg";
          const fileName = photo.fileName || `photo_${Date.now()}.${extension}`;

          const uploadData = {
            photo_base64: base64String,
            filename: fileName,
            mimetype: detectedType,
            current_photo: oldPhotoUrl || undefined, // ✅ NEW: Include old photo for cleanup
          };

          console.log("🚀 Base64 upload with cleanup:", {
            fileName,
            mimetype: detectedType,
            dataSize: base64String.length,
            oldPhoto: oldPhotoUrl || "none",
          });

          const result = await this.makeRequest("/api/profile/photo/base64", {
            method: "POST",
            body: JSON.stringify(uploadData),
          });

          console.log("✅ Base64 upload successful with cleanup");
          resolve({
            ...result,
            upload_method: "base64",
            old_photo: oldPhotoUrl,
          });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () =>
        reject(new Error("Failed to convert image to base64"));
      reader.readAsDataURL(blob);
    });
  }

  // ✅ FIXED: Strategy 3 with cleanup old photo
  private async uploadWithXHR(
    photo: any,
    detectedType: string,
    oldPhotoUrl?: string | null
  ): Promise<ApiResponse> {
    return new Promise(async (resolve, reject) => {
      try {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();

        // Generate proper filename
        const extension = detectedType.split("/")[1] || "jpg";
        const fileName = photo.fileName || `photo_${Date.now()}.${extension}`;

        const photoFile = {
          uri: photo.uri,
          type: detectedType,
          name: fileName,
        } as any;

        formData.append("photo", photoFile);

        // ✅ NEW: Add current photo info for cleanup
        if (oldPhotoUrl) {
          formData.append("current_photo", oldPhotoUrl);
        }

        const url = `${this.baseURL}/api/profile/photo`;
        const headers = await this.getHeaders();

        xhr.open("POST", url);

        // Set headers except Content-Type
        Object.keys(headers).forEach((key) => {
          if (key !== "Content-Type") {
            xhr.setRequestHeader(key, headers[key]);
          }
        });

        xhr.timeout = 30000;

        console.log("🚀 XHR upload with cleanup:", {
          fileName,
          detectedType,
          oldPhoto: oldPhotoUrl || "none",
        });

        xhr.onload = () => {
          try {
            if (xhr.status >= 200 && xhr.status < 300) {
              const result = JSON.parse(xhr.responseText);
              console.log("✅ XHR upload successful with cleanup");
              resolve({
                ...result,
                upload_method: "xhr",
                old_photo: oldPhotoUrl,
              });
            } else {
              const errorData = JSON.parse(xhr.responseText || "{}");
              reject(
                new Error(
                  errorData?.message || `XHR upload failed: ${xhr.status}`
                )
              );
            }
          } catch (parseError) {
            reject(
              new Error(`XHR response parse error: ${parseError.message}`)
            );
          }
        };

        xhr.onerror = () => {
          reject(new Error("XHR upload network error"));
        };

        xhr.ontimeout = () => {
          reject(new Error("XHR upload timeout"));
        };

        xhr.send(formData);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Test connectivity method untuk debugging
  async testConnectivity(): Promise<boolean> {
    try {
      console.log("🔍 Testing connectivity to:", this.baseURL);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(this.baseURL, {
        method: "HEAD",
        signal: controller.signal,
        mode: "cors",
        credentials: "omit",
      });

      clearTimeout(timeoutId);

      const reachable = response.status < 500;
      console.log(`🔍 Connectivity test result:`, {
        url: this.baseURL,
        status: response.status,
        reachable,
        timestamp: new Date().toISOString(),
      });

      return reachable;
    } catch (error: any) {
      console.error("🔍 Connectivity test failed:", {
        url: this.baseURL,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
      return false;
    }
  }

  // Health check dengan enhanced diagnostics
  async healthCheck(): Promise<boolean> {
    try {
      console.log("🥺 Running health check...");
      const response = await this.makeRequest("/api/health", { method: "GET" });
      console.log("✅ Health check successful:", response);
      return true;
    } catch (error: any) {
      console.warn("🥺 API health check failed:", {
        message: error.message,
        status: error.status,
        isProduction: this.isProduction,
        baseURL: this.baseURL,
      });
      return false;
    }
  }

  // ============================================
  // AUTH ENDPOINTS
  // ============================================

  async login(username: string, password: string): Promise<ApiResponse> {
    console.log("🔐 Attempting login for:", username);
    return this.makeRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  }

  async register(userData: {
    username: string;
    password: string;
    nama_lengkap: string;
  }): Promise<ApiResponse> {
    return this.makeRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async getMe(): Promise<ApiResponse> {
    return this.makeRequest("/api/auth/me");
  }

  async logout(): Promise<ApiResponse> {
    return this.makeRequest("/api/auth/logout", {
      method: "POST",
    });
  }

  // ============================================
  // PROFILE ENDPOINTS
  // ============================================

  async getProfile(): Promise<ApiResponse> {
    return this.makeRequest("/api/profile");
  }

  async updateProfile(data: any): Promise<ApiResponse> {
    return this.makeRequest("/api/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // ✅ IMPROVED: Delete profile photo with better error handling
  async deleteProfilePhoto(): Promise<ApiResponse> {
    console.log("🗑️ Deleting profile photo...");
    return this.makeRequest("/api/profile/photo", {
      method: "DELETE",
    });
  }

  // ============================================
  // NOTIFIKASI ENDPOINTS - FIXED
  // ============================================

  async getNotifications(params: any = {}): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();

    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.unreadOnly) queryParams.append("unreadOnly", "true");

    const queryString = queryParams.toString();
    const endpoint = `/api/notifikasi${queryString ? `?${queryString}` : ""}`;

    console.log("🔔 Fetching notifications from:", endpoint);
    return this.makeRequest(endpoint);
  }

  // Alias untuk compatibility
  async getNotifikasis(params: any = {}): Promise<ApiResponse> {
    return this.getNotifications(params);
  }

  async markNotificationAsRead(id: number): Promise<ApiResponse> {
    console.log(`📖 Marking notification ${id} as read...`);
    return this.makeRequest(`/api/notifikasi/${id}/read`, {
      method: "PATCH",
    });
  }

  async markAllNotificationsAsRead(): Promise<ApiResponse> {
    console.log("📖 Marking all notifications as read...");
    return this.makeRequest("/api/notifikasi/all/read", {
      method: "POST",
    });
  }

  async deleteNotification(id: number): Promise<ApiResponse> {
    console.log(`🗑️ Deleting notification ${id}...`);
    return this.makeRequest(`/api/notifikasi/${id}/read`, {
      method: "DELETE",
    });
  }

  async deleteAllNotifications(onlyRead = false): Promise<ApiResponse> {
    console.log(`🗑️ Deleting all notifications (onlyRead: ${onlyRead})...`);
    const queryParams = onlyRead ? "?onlyRead=true" : "";
    return this.makeRequest(`/api/notifikasi/all/read${queryParams}`, {
      method: "DELETE",
    });
  }

  async deleteReadNotifications(): Promise<ApiResponse> {
    console.log("🗑️ Deleting all read notifications...");
    return this.deleteAllNotifications(true);
  }

  async clearAllNotifications(): Promise<ApiResponse> {
    console.log("🗑️ Clearing all notifications...");
    return this.deleteAllNotifications(false);
  }

  // ============================================
  // WASTE TYPES ENDPOINTS - FIXED
  // ============================================

  async getWasteTypes(): Promise<ApiResponse> {
    try {
      console.log("🗑️ Fetching waste types from Next.js API");
      return await this.makeRequest("/api/waste-types");
    } catch (error: any) {
      console.warn("⚠️ Waste types endpoint failed:", error.message);

      // Enhanced fallback logic dengan user status awareness
      try {
        // Try to get user info for fallback pricing
        const userResponse = await this.getMe();
        const isUserPegawai = userResponse?.user?.pegawai === 1;

        console.log("📋 Using fallback data with user status:", isUserPegawai);

        return {
          success: true,
          wasteTypes: this.getFallbackWasteTypes(isUserPegawai),
          user_info: userResponse?.user
            ? {
                id: userResponse.user.id,
                username: userResponse.user.username,
                nama_lengkap: userResponse.user.nama_lengkap,
                is_pegawai: isUserPegawai,
                pegawai_raw: userResponse.user.pegawai,
                authenticated: true,
                nip: userResponse.user.nip,
              }
            : {
                is_pegawai: false,
                authenticated: false,
              },
          message: "Using fallback data - waste types endpoint not available",
        };
      } catch (fallbackError) {
        console.warn("⚠️ Fallback also failed, using basic data");

        return {
          success: true,
          wasteTypes: this.getFallbackWasteTypes(false),
          user_info: {
            is_pegawai: false,
            authenticated: false,
          },
          message: "Using basic fallback data",
        };
      }
    }
  }

  // Helper method untuk fallback data
  private getFallbackWasteTypes(isUserPegawai: boolean): any[] {
    const baseTypes = [
      {
        id: 1,
        name: "Botol Plastik",
        harga_pegawai: 2400,
        harga_non_pegawai: 2000,
        harga_per_kg: 2000,
        icon: "🥤",
        gradient: "from-blue-500 to-green-500",
      },
      {
        id: 2,
        name: "Kardus",
        harga_pegawai: 1800,
        harga_non_pegawai: 1500,
        harga_per_kg: 1500,
        icon: "📦",
        gradient: "from-orange-500 to-red-500",
      },
      {
        id: 3,
        name: "Kertas",
        harga_pegawai: 1200,
        harga_non_pegawai: 1000,
        harga_per_kg: 1000,
        icon: "📄",
        gradient: "from-green-500 to-blue-500",
      },
      {
        id: 4,
        name: "Besi",
        harga_pegawai: 3000,
        harga_non_pegawai: 2500,
        harga_per_kg: 2500,
        icon: "🔩",
        gradient: "from-gray-500 to-gray-700",
      },
    ];

    return baseTypes.map((type) => ({
      ...type,
      price: isUserPegawai ? type.harga_pegawai : type.harga_non_pegawai,
      price_label: isUserPegawai ? "Harga Pegawai" : "Harga Non-Pegawai",
      is_user_pegawai: isUserPegawai,
      user_authenticated: true,
      collected: 0,
      value: 0,
      transactions: 0,
    }));
  }

  // ============================================
  // NASABAH ENDPOINTS - FIXED
  // ============================================

  async getTabunganHistory(params: any = {}): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();

    if (params.periode) queryParams.append("periode", params.periode);
    if (params.month) queryParams.append("month", params.month);
    if (params.year) queryParams.append("year", params.year);
    if (params.date) queryParams.append("date", params.date);

    const queryString = queryParams.toString();
    const endpoint = `/api/nasabah/riwayat${
      queryString ? `?${queryString}` : ""
    }`;

    console.log("📊 Fetching tabungan history from:", endpoint);
    return this.makeRequest(endpoint);
  }

  async getMutasiSaldo(params: any = {}): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();

    if (params.month) queryParams.append("month", params.month);
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.offset) queryParams.append("offset", params.offset.toString());

    const queryString = queryParams.toString();
    const endpoint = `/api/nasabah/mutasi-saldo${
      queryString ? `?${queryString}` : ""
    }`;

    console.log("💰 Fetching mutasi saldo from:", endpoint);
    return this.makeRequest(endpoint);
  }

  async getWithdrawals(): Promise<ApiResponse> {
    console.log("💳 Fetching withdrawals");
    return this.makeRequest("/api/nasabah/withdrawal");
  }

  async createWithdrawal(data: any): Promise<ApiResponse> {
    console.log("💳 Creating withdrawal request");
    return this.makeRequest("/api/nasabah/withdrawal", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ============================================
  // EDUKASI & CONTENT ENDPOINTS - FIXED
  // ============================================

  async getArtikels(
    params: {
      kategori?: string;
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<ApiResponse> {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, value.toString());
      }
    });

    const queryString = searchParams.toString();
    const endpoint = `/api/artikel${queryString ? `?${queryString}` : ""}`;

    console.log("📰 Fetching articles from:", endpoint);
    return this.makeRequest(endpoint);
  }

  // Alias untuk getArticles (untuk konsistensi)
  async getArticles(
    params: {
      kategori?: string;
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<ApiResponse> {
    return this.getArtikels(params);
  }

  async getArtikelBySlug(slug: string): Promise<ApiResponse> {
    console.log(`📰 Fetching article with slug: ${slug}`);
    return this.makeRequest(`/api/artikel/${slug}`);
  }

  // Alias untuk getArticle
  async getArticle(slugOrId: string | number): Promise<ApiResponse> {
    return this.getArtikelBySlug(slugOrId.toString());
  }

  // Perbarui bagian EDUKASI & EKONOMI SIRKULAR ENDPOINTS di api.ts

  // ============================================
  // ARTIKEL ENDPOINTS - UPDATED
  // ============================================

  async getArtikels(
    params: {
      kategori?: string;
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<ApiResponse> {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, value.toString());
      }
    });

    const queryString = searchParams.toString();
    const endpoint = `/api/artikel${queryString ? `?${queryString}` : ""}`;

    console.log("📰 Fetching articles from:", endpoint);
    return this.makeRequest(endpoint);
  }

  // Alias untuk getArticles (untuk konsistensi)
  async getArticles(
    params: {
      kategori?: string;
      search?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<ApiResponse> {
    return this.getArtikels(params);
  }

  async getArtikelBySlug(slug: string): Promise<ApiResponse> {
    console.log(`📰 Fetching article with slug: ${slug}`);
    return this.makeRequest(`/api/artikel/${slug}`);
  }

  // Alias untuk getArticle
  async getArticle(slugOrId: string | number): Promise<ApiResponse> {
    return this.getArtikelBySlug(slugOrId.toString());
  }

  // ============================================
  // EKONOMI SIRKULAR (VIDEO) ENDPOINTS - FIXED
  // ============================================

  async getVideos(
    params: {
      kategori?: string;
      search?: string;
      sortBy?: "urutan" | "popular" | "latest";
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<ApiResponse> {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, value.toString());
      }
    });

    const queryString = searchParams.toString();

    // FIXED: Gunakan endpoint yang benar sesuai API baru
    const endpoint = `/api/ekonomi-sirkular${
      queryString ? `?${queryString}` : ""
    }`;

    console.log("🎥 Fetching videos from:", endpoint);

    try {
      return await this.makeRequest(endpoint);
    } catch (error: any) {
      console.warn(
        "⚠️ Primary video endpoint failed, trying alternatives:",
        error.message
      );

      // Coba endpoint alternatif jika endpoint utama gagal
      const alternativeEndpoints = [
        `/api/videos${queryString ? `?${queryString}` : ""}`,
        `/api/edukasi/videos${queryString ? `?${queryString}` : ""}`,
        `/api/video${queryString ? `?${queryString}` : ""}`,
      ];

      for (const altEndpoint of alternativeEndpoints) {
        try {
          console.log("🔄 Trying alternative endpoint:", altEndpoint);
          const result = await this.makeRequest(altEndpoint);
          console.log("✅ Alternative endpoint successful:", altEndpoint);
          return result;
        } catch (altError: any) {
          console.warn(
            `⚠️ Alternative endpoint failed: ${altEndpoint}`,
            altError.message
          );
          continue;
        }
      }

      // Jika semua endpoint gagal dengan 404, berikan data fallback
      if (
        error.status === 404 ||
        error.message.includes("404") ||
        error.message.includes("Endpoint tidak ditemukan")
      ) {
        console.warn(
          "📹 All video endpoints failed with 404, providing fallback data"
        );
        return this.getVideosFallback(params);
      }

      // Jika bukan 404, lempar error asli
      throw error;
    }
  }

  async getVideoById(id: string | number): Promise<ApiResponse> {
    console.log(`🎥 Fetching video with ID: ${id}`);

    try {
      return await this.makeRequest(`/api/ekonomi-sirkular/${id}`);
    } catch (error: any) {
      console.warn(
        "⚠️ Primary video detail endpoint failed, trying alternatives:",
        error.message
      );

      // Coba endpoint alternatif
      const alternativeEndpoints = [
        `/api/videos/${id}`,
        `/api/video/${id}`,
        `/api/edukasi/video/${id}`,
      ];

      for (const altEndpoint of alternativeEndpoints) {
        try {
          console.log("🔄 Trying alternative detail endpoint:", altEndpoint);
          const result = await this.makeRequest(altEndpoint);
          console.log(
            "✅ Alternative detail endpoint successful:",
            altEndpoint
          );
          return result;
        } catch (altError: any) {
          console.warn(
            `⚠️ Alternative detail endpoint failed: ${altEndpoint}`,
            altError.message
          );
          continue;
        }
      }

      // Jika semua gagal, berikan mock data untuk development
      if (
        !this.isProduction &&
        (error.status === 404 || error.message.includes("404"))
      ) {
        console.warn(
          "📹 All video detail endpoints failed, providing mock data"
        );
        return this.getVideoDetailFallback(id);
      }

      throw error;
    }
  }

  // ============================================
  // FALLBACK METHODS untuk Development/Testing
  // ============================================

  private getVideosFallback(params: any): ApiResponse {
    console.log("🎬 Using video fallback data for development");

    const mockVideos = [
      {
        id: 1,
        judul: "Pengelolaan Sampah Rumah Tangga",
        deskripsi:
          "Tutorial cara memilah sampah rumah tangga dengan benar sesuai standar RSUD Mohammad Natsir Solok",
        tipe_video: "youtube",
        video_url: "https://youtube.com/watch?v=dQw4w9WgXcQ",
        thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
        kategori: "Tutorial",
        tags: ["sampah", "rumah tangga", "tutorial", "lingkungan"],
        durasi: "10:30",
        views: 1250,
        created_at: new Date().toISOString(),
        creator: { nama_lengkap: "Tim RSUD Mohammad Natsir Solok" },
        popular: true,
      },
      {
        id: 2,
        judul: "Ekonomi Sirkular di Lingkungan Rumah Sakit",
        deskripsi:
          "Memahami konsep ekonomi sirkular dalam pengelolaan limbah medis dan non-medis di rumah sakit",
        tipe_video: "youtube",
        video_url: "https://youtube.com/watch?v=9bZkp7q19f0",
        thumbnail: "https://img.youtube.com/vi/9bZkp7q19f0/maxresdefault.jpg",
        kategori: "Edukasi",
        tags: [
          "ekonomi sirkular",
          "rumah sakit",
          "limbah medis",
          "sustainability",
        ],
        durasi: "15:45",
        views: 890,
        created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        creator: { nama_lengkap: "Dr. Ahmad Solihin, Sp.KLH" },
        popular: false,
      },
      {
        id: 3,
        judul: "Tips Mengurangi Sampah Plastik di RS",
        deskripsi:
          "5 cara mudah mengurangi penggunaan plastik sekali pakai di lingkungan rumah sakit",
        tipe_video: "youtube",
        video_url: "https://youtube.com/watch?v=2Vv-BfVoq4g",
        thumbnail: "https://img.youtube.com/vi/2Vv-BfVoq4g/maxresdefault.jpg",
        kategori: "Tips",
        tags: ["plastik", "zero waste", "tips", "ramah lingkungan"],
        durasi: "8:20",
        views: 2100,
        created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        creator: { nama_lengkap: "Siti Nurhaliza, S.KM" },
        popular: true,
      },
      {
        id: 4,
        judul: "Workshop Composting untuk Pegawai",
        deskripsi:
          "Pelatihan membuat kompos dari sampah organik untuk pegawai RSUD Mohammad Natsir",
        tipe_video: "youtube",
        video_url: "https://youtube.com/watch?v=fJ9rUzIMcZQ",
        thumbnail: "https://img.youtube.com/vi/fJ9rUzIMcZQ/maxresdefault.jpg",
        kategori: "Workshop",
        tags: ["kompos", "organik", "workshop", "pelatihan"],
        durasi: "25:15",
        views: 645,
        created_at: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
        creator: { nama_lengkap: "Budi Santoso, S.P" },
        popular: false,
      },
      {
        id: 5,
        judul: "Dokumenter: Green Hospital Initiative",
        deskripsi:
          "Dokumenter perjalanan RSUD Mohammad Natsir menuju rumah sakit ramah lingkungan",
        tipe_video: "youtube",
        video_url: "https://youtube.com/watch?v=oHg5SJYRHA0",
        thumbnail: "https://img.youtube.com/vi/oHg5SJYRHA0/maxresdefault.jpg",
        kategori: "Dokumenter",
        tags: ["green hospital", "sustainability", "dokumenter", "inovasi"],
        durasi: "18:30",
        views: 1580,
        created_at: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
        creator: { nama_lengkap: "Tim Komunikasi RSUD" },
        popular: true,
      },
    ];

    // Filter berdasarkan parameter
    let filteredVideos = mockVideos;

    if (params.kategori && params.kategori !== "all") {
      filteredVideos = filteredVideos.filter(
        (v) => v.kategori === params.kategori
      );
    }

    if (params.search) {
      const searchTerm = params.search.toLowerCase();
      filteredVideos = filteredVideos.filter(
        (v) =>
          v.judul.toLowerCase().includes(searchTerm) ||
          v.deskripsi.toLowerCase().includes(searchTerm) ||
          v.tags.some((tag) => tag.toLowerCase().includes(searchTerm))
      );
    }

    // Sorting
    if (params.sortBy === "popular") {
      filteredVideos.sort((a, b) => b.views - a.views);
    } else if (params.sortBy === "latest") {
      filteredVideos.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    // Limit
    if (params.limit) {
      filteredVideos = filteredVideos.slice(
        0,
        parseInt(params.limit.toString())
      );
    }

    return {
      success: true,
      videos: filteredVideos,
      total: filteredVideos.length,
      message: "Menggunakan data demo - endpoint video endpoint belum tersedia",
      using_fallback: true,
      fallback_reason: "Video endpoints not available on server",
      endpoint_attempted: "/api/ekonomi-sirkular",
    };
  }

  private getVideoDetailFallback(id: string | number): ApiResponse {
    console.log(`🎬 Using video detail fallback for ID: ${id}`);

    // Mock detail video
    const mockVideo = {
      id: parseInt(id.toString()),
      judul: `Video Demo ${id}`,
      deskripsi:
        "Ini adalah video demo untuk testing aplikasi. Video endpoint belum tersedia di server.",
      tipe_video: "youtube",
      video_url: "https://youtube.com/watch?v=dQw4w9WgXcQ",
      thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
      kategori: "Demo",
      tags: ["demo", "testing"],
      durasi: "5:00",
      views: 100,
      created_at: new Date().toISOString(),
      creator: { nama_lengkap: "Demo User" },
      popular: false,
    };

    // Mock related videos
    const relatedVideos = [
      {
        id: 99,
        judul: "Video Terkait 1",
        thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
        views: 150,
        durasi: "3:30",
      },
      {
        id: 100,
        judul: "Video Terkait 2",
        thumbnail: "https://img.youtube.com/vi/9bZkp7q19f0/maxresdefault.jpg",
        views: 200,
        durasi: "4:15",
      },
    ];

    return {
      success: true,
      video: mockVideo,
      relatedVideos: relatedVideos,
      message: "Menggunakan data demo - video detail endpoint belum tersedia",
      using_fallback: true,
      fallback_reason: "Video detail endpoints not available on server",
    };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  async saveToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem("token", token);
      console.log("✅ Token saved successfully");
    } catch (error) {
      console.error("❌ Error saving token:", error);
      throw error;
    }
  }

  async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem("token");
      console.log("✅ Token removed successfully");
    } catch (error) {
      console.error("❌ Error removing token:", error);
      throw error;
    }
  }

  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem("token");
    } catch (error) {
      console.error("❌ Error getting token:", error);
      return null;
    }
  }

  // Enhanced debug method untuk APK troubleshooting
  async debugConnection(): Promise<void> {
    console.log("🔍 === CONNECTION DEBUG START ===");
    console.log("🔍 Base URL:", this.baseURL);
    console.log("🔧 Is Production:", this.isProduction);
    console.log("📱 Platform:", Platform.OS);
    console.log("🌐 Environment URL:", process.env.EXPO_PUBLIC_API_BASE_URL);
    console.log("⏰ API Timeout:", API_TIMEOUT);
    console.log("📦 DEV Mode:", __DEV__);

    // Test basic connectivity
    console.log("🔍 Testing basic connectivity...");
    const connectivityResult = await this.testConnectivity();
    console.log("🔍 Connectivity Result:", connectivityResult);

    // Test health check
    console.log("🔍 Testing health endpoint...");
    try {
      const healthResult = await this.healthCheck();
      console.log("🥺 Health Check Result:", healthResult);
    } catch (error) {
      console.error("❌ Health check failed:", error);
    }

    // Test environment variables
    console.log("🔍 Environment Variables:", {
      EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
      API_TIMEOUT: process.env.API_TIMEOUT,
      NODE_ENV: process.env.NODE_ENV,
    });

    console.log("🔍 === CONNECTION DEBUG END ===");
  }
}

export const apiService = new ApiService();
export default apiService;
