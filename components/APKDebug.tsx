// components/APKDebug.tsx - Enhanced Debug Component
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BrandColors } from "../constants/Colors";
import apiService from "../services/api";

interface APKDebugProps {
  onClose: () => void;
}

interface TestResult {
  test: string;
  success: boolean;
  details: any;
  timestamp: Date;
}

export function APKDebug({ onClose }: APKDebugProps) {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const logResult = useCallback(
    (test: string, success: boolean, details: any) => {
      const result: TestResult = {
        test,
        success,
        details,
        timestamp: new Date(),
      };

      setResults((prev) => [...prev, result]);
      console.log(`[APK Debug] ${test}:`, { success, details });
    },
    []
  );

  const runComprehensiveDiagnostics = useCallback(async () => {
    setTesting(true);
    setResults([]);

    try {
      console.log("🔍 === COMPREHENSIVE APK DIAGNOSTICS START ===");

      // Test 1: Environment Detection
      logResult("Environment Detection", true, {
        EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
        API_TIMEOUT: process.env.API_TIMEOUT,
        NODE_ENV: process.env.NODE_ENV,
        DEV_MODE: __DEV__,
        PLATFORM: Platform.OS,
        ENV_COUNT: Object.keys(process.env).length,
        HAS_ENV_URL: !!process.env.EXPO_PUBLIC_API_BASE_URL,
      });

      // Test 2: API Service Configuration
      await apiService.debugConnection();
      logResult("API Service Config", true, {
        baseURL: apiService["baseURL"],
        isProduction: apiService["isProduction"],
        timeout: process.env.API_TIMEOUT || "15000",
      });

      // Test 3: Basic Connectivity Test
      try {
        const connectivityResult = await apiService.testConnectivity();
        logResult("Basic Connectivity", connectivityResult, {
          reachable: connectivityResult,
          baseURL: apiService["baseURL"],
          method: "HEAD request",
        });
      } catch (error) {
        logResult("Basic Connectivity", false, {
          error: error.message,
          baseURL: apiService["baseURL"],
        });
      }

      // Test 4: Server Health Check
      try {
        const healthCheck = await apiService.healthCheck();
        logResult("Server Health Check", healthCheck, {
          result: healthCheck,
          endpoint: "/api/health",
        });
      } catch (error) {
        logResult("Server Health Check", false, {
          error: error.message,
          endpoint: "/api/health",
        });
      }

      // Test 5: Direct URL Tests
      const testUrls = [
        {
          url:
            process.env.EXPO_PUBLIC_API_BASE_URL ||
            "http://103.84.208.182:8016",
          name: "Environment URL",
        },
        {
          url: "http://103.84.208.182:8016",
          name: "Hardcoded IP",
        },
        {
          url: "https://httpbin.org/get",
          name: "External HTTPS",
        },
        {
          url: "http://httpbin.org/get",
          name: "External HTTP",
        },
      ];

      for (const testUrl of testUrls) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          const response = await fetch(testUrl.url, {
            method: "HEAD",
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          logResult(`URL Test: ${testUrl.name}`, response.ok, {
            url: testUrl.url,
            status: response.status,
            statusText: response.statusText,
            type: response.type,
          });
        } catch (error) {
          logResult(`URL Test: ${testUrl.name}`, false, {
            url: testUrl.url,
            error: error.message,
            name: error.name,
          });
        }
      }

      // Test 6: Login Endpoint Test
      try {
        const loginUrl = `${
          process.env.EXPO_PUBLIC_API_BASE_URL || "http://103.84.208.182:8016"
        }/api/auth/login`;

        const response = await fetch(loginUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: "test",
            password: "test",
          }),
        });

        const responseText = await response.text();

        logResult("Login Endpoint Test", response.status !== 404, {
          url: loginUrl,
          status: response.status,
          statusText: response.statusText,
          responseLength: responseText.length,
          responsePreview: responseText.substring(0, 100),
          isJSON: responseText.startsWith("{"),
        });
      } catch (error) {
        logResult("Login Endpoint Test", false, {
          error: error.message,
          name: error.name,
        });
      }

      // Test 7: Network Information
      logResult("Network Information", true, {
        userAgent: navigator.userAgent || "Not available",
        onLine: navigator.onLine,
        connection: (navigator as any).connection || "Not available",
        platform: Platform.OS,
        deviceModel: Platform.select({
          android: "Android Device",
          ios: "iOS Device",
          default: "Unknown",
        }),
      });

      // Test 8: Storage Test
      try {
        await apiService.saveToken("test-token");
        const retrievedToken = await apiService.getToken();
        await apiService.removeToken();

        logResult("Storage Test", retrievedToken === "test-token", {
          canSave: true,
          canRetrieve: retrievedToken === "test-token",
          canRemove: true,
        });
      } catch (error) {
        logResult("Storage Test", false, {
          error: error.message,
        });
      }

      console.log("🔍 === COMPREHENSIVE APK DIAGNOSTICS END ===");
    } catch (error: any) {
      logResult("Diagnostics Error", false, {
        error: error.message,
        stack: error.stack,
      });
    } finally {
      setTesting(false);
    }
  }, [logResult]);

  const testActualLogin = useCallback(async () => {
    try {
      setTesting(true);
      console.log("🔑 Testing actual login flow...");

      const response = await apiService.login("test_user", "test_password");

      logResult("Actual Login Test", response.success, {
        message: response.message,
        success: response.success,
        hasToken: !!response.token,
        hasUser: !!response.user,
      });

      Alert.alert(
        "Login Test Result",
        `Success: ${response.success}\nMessage: ${response.message}`,
        [{ text: "OK" }]
      );
    } catch (error: any) {
      logResult("Actual Login Test", false, {
        error: error.message,
        name: error.name,
        status: error.status,
      });

      Alert.alert("Login Test Failed", error.message, [{ text: "OK" }]);
    } finally {
      setTesting(false);
    }
  }, [logResult]);

  const exportFullResults = useCallback(() => {
    const exportData = {
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      devMode: __DEV__,
      environment: {
        EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
        API_TIMEOUT: process.env.API_TIMEOUT,
        NODE_ENV: process.env.NODE_ENV,
        ENV_VARS_COUNT: Object.keys(process.env).length,
      },
      systemInfo: {
        userAgent: navigator.userAgent || "Not available",
        onLine: navigator.onLine,
        platform: Platform.OS,
      },
      apiService: {
        baseURL: apiService["baseURL"],
        isProduction: apiService["isProduction"],
      },
      results: results.map((r) => ({
        ...r,
        timestamp: r.timestamp.toISOString(),
      })),
    };

    const jsonString = JSON.stringify(exportData, null, 2);

    console.log("=== FULL APK DEBUG EXPORT START ===");
    console.log(jsonString);
    console.log("=== FULL APK DEBUG EXPORT END ===");

    Alert.alert(
      "Full Debug Results Exported",
      `${results.length} test results exported to console.\n\nCopy the logs from the console and share them for debugging.`,
      [{ text: "OK" }]
    );
  }, [results]);

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>APK Comprehensive Debug</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={BrandColors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.primaryButton,
            testing && styles.disabledButton,
          ]}
          onPress={runComprehensiveDiagnostics}
          disabled={testing}>
          {testing ? (
            <ActivityIndicator size="small" color={BrandColors.white} />
          ) : (
            <Ionicons name="medical" size={16} color={BrandColors.white} />
          )}
          <Text style={styles.buttonText}>
            {testing ? "Running..." : "Full Diagnostics"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.secondaryButton,
            testing && styles.disabledButton,
          ]}
          onPress={testActualLogin}
          disabled={testing}>
          <Ionicons name="key" size={16} color={BrandColors.primary} />
          <Text style={styles.secondaryButtonText}>Test Login</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.info}>
        <Text style={styles.infoTitle}>Configuration Status:</Text>
        <Text style={styles.infoText}>
          API URL: {process.env.EXPO_PUBLIC_API_BASE_URL || "❌ NOT SET"}
        </Text>
        <Text style={styles.infoText}>
          DEV Mode: {__DEV__ ? "✅ YES" : "❌ NO (Production)"}
        </Text>
        <Text style={styles.infoText}>Platform: {Platform.OS}</Text>
        <Text style={styles.infoText}>
          Network: {navigator.onLine ? "✅ Online" : "❌ Offline"}
        </Text>
      </View>

      <ScrollView style={styles.results}>
        {results.length === 0 && !testing && (
          <Text style={styles.emptyText}>
            Tap "Full Diagnostics" to start comprehensive testing
          </Text>
        )}

        {results.map((result, index) => (
          <View
            key={index}
            style={[
              styles.resultItem,
              result.success ? styles.successItem : styles.errorItem,
            ]}>
            <View style={styles.resultHeader}>
              <Ionicons
                name={result.success ? "checkmark-circle" : "close-circle"}
                size={16}
                color={result.success ? "#10b981" : "#ef4444"}
              />
              <Text style={styles.testName}>{result.test}</Text>
              <Text style={styles.timestamp}>
                {result.timestamp.toLocaleTimeString()}
              </Text>
            </View>

            <View style={styles.resultDetails}>
              <Text style={styles.detailsText}>
                {typeof result.details === "string"
                  ? result.details
                  : JSON.stringify(result.details, null, 2)}
              </Text>
            </View>
          </View>
        ))}

        {results.length > 0 && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={exportFullResults}>
              <Ionicons name="download" size={16} color={BrandColors.white} />
              <Text style={styles.buttonText}>Export Full Results</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.clearButton} onPress={clearResults}>
              <Ionicons name="trash" size={16} color="#ef4444" />
              <Text style={styles.clearButtonText}>Clear Results</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: BrandColors.primary,
    padding: 16,
    paddingTop: 50,
  },
  title: {
    color: BrandColors.white,
    fontSize: 18,
    fontWeight: "600",
  },
  closeButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  controls: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    flex: 1,
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: BrandColors.primary,
  },
  secondaryButton: {
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.primary,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: BrandColors.white,
    fontWeight: "600",
    fontSize: 14,
  },
  secondaryButtonText: {
    color: BrandColors.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  info: {
    backgroundColor: "#2a2a2a",
    margin: 16,
    padding: 12,
    borderRadius: 8,
  },
  infoTitle: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    marginBottom: 8,
  },
  infoText: {
    color: "#ccc",
    fontSize: 12,
    marginBottom: 4,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  results: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyText: {
    color: "#888",
    textAlign: "center",
    fontStyle: "italic",
    marginTop: 40,
  },
  resultItem: {
    backgroundColor: "#2a2a2a",
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    marginBottom: 8,
  },
  successItem: {
    borderLeftColor: "#10b981",
  },
  errorItem: {
    borderLeftColor: "#ef4444",
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  testName: {
    color: "#fff",
    fontWeight: "600",
    flex: 1,
    fontSize: 13,
  },
  timestamp: {
    color: "#888",
    fontSize: 10,
  },
  resultDetails: {
    backgroundColor: "#1a1a1a",
    borderRadius: 4,
    padding: 8,
  },
  detailsText: {
    color: "#00ff00",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 10,
    lineHeight: 14,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    margin: 16,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BrandColors.secondary,
    padding: 12,
    borderRadius: 8,
    flex: 1,
    gap: 8,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2a2a2a",
    borderWidth: 1,
    borderColor: "#ef4444",
    padding: 12,
    borderRadius: 8,
    flex: 1,
    gap: 8,
  },
  clearButtonText: {
    color: "#ef4444",
    fontWeight: "600",
    fontSize: 14,
  },
});
