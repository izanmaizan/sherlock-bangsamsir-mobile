// app/index.tsx - Enhanced Debug dengan Network Diagnostics Lengkap
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandColors } from "../constants/Colors";
import { useAuth } from "../contexts/AuthContext";
import apiService from "../services/api";

// Enhanced Network Debug Component untuk 5x tap
function NetworkDebugPanel({ onClose }: { onClose: () => void }) {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [systemInfo, setSystemInfo] = useState<any>({});

  const logResult = (
    test: string,
    success: boolean,
    details: any,
    severity: "info" | "warning" | "error" = "info"
  ) => {
    const result = {
      test,
      success,
      details,
      severity,
      timestamp: new Date(),
    };
    setResults((prev) => [...prev, result]);
    console.log(`[Network Debug] ${test}:`, { success, details, severity });
  };

  const gatherSystemInfo = async () => {
    const info = {
      platform: Platform.OS,
      platformVersion: Platform.Version,
      isEmulator:
        Platform.OS === "android" ? false : Platform.isPad === undefined,
      devMode: __DEV__,
      timestamp: new Date().toISOString(),
      userAgent:
        typeof navigator !== "undefined"
          ? navigator.userAgent
          : "Not available",
      onLine: typeof navigator !== "undefined" ? navigator.onLine : "Unknown",
      connection:
        typeof navigator !== "undefined" && (navigator as any).connection
          ? (navigator as any).connection
          : "Not available",
    };
    setSystemInfo(info);
    return info;
  };

  const testBasicConnectivity = async () => {
    const testUrls = [
      {
        name: "Google DNS",
        url: "https://dns.google/resolve?name=google.com&type=A",
        timeout: 5000,
      },
      { name: "HTTPBin HTTPS", url: "https://httpbin.org/get", timeout: 8000 },
      { name: "HTTPBin HTTP", url: "http://httpbin.org/get", timeout: 8000 },
    ];

    for (const test of testUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), test.timeout);

        const startTime = Date.now();
        const response = await fetch(test.url, {
          method: "HEAD",
          signal: controller.signal,
        });
        const endTime = Date.now();

        clearTimeout(timeoutId);

        logResult(
          `Basic Internet: ${test.name}`,
          response.ok,
          {
            url: test.url,
            status: response.status,
            responseTime: `${endTime - startTime}ms`,
            type: response.type,
          },
          response.ok ? "info" : "warning"
        );
      } catch (error: any) {
        logResult(
          `Basic Internet: ${test.name}`,
          false,
          {
            url: test.url,
            error: error.message,
            name: error.name,
          },
          "error"
        );
      }
    }
  };

  const testServerConnectivity = async () => {
    const baseURL =
      process.env.EXPO_PUBLIC_API_BASE_URL || "http://103.84.208.182:8016";

    // Test 1: Basic server reachability
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const startTime = Date.now();
      const response = await fetch(baseURL, {
        method: "HEAD",
        signal: controller.signal,
      });
      const endTime = Date.now();

      clearTimeout(timeoutId);

      logResult(
        "Server Reachability",
        response.status < 500,
        {
          url: baseURL,
          status: response.status,
          statusText: response.statusText,
          responseTime: `${endTime - startTime}ms`,
          headers: Object.fromEntries(response.headers.entries()),
        },
        response.status < 500 ? "info" : "error"
      );
    } catch (error: any) {
      logResult(
        "Server Reachability",
        false,
        {
          url: baseURL,
          error: error.message,
          name: error.name,
          possibleCauses: [
            "Server tidak berjalan",
            "IP address salah",
            "Firewall memblokir koneksi",
            "Device tidak di network yang sama",
            "Port 3001 tidak accessible",
          ],
        },
        "error"
      );
    }

    // Test 2: Health endpoint
    try {
      const healthUrl = `${baseURL}/api/health`;
      const response = await fetch(healthUrl, {
        method: "GET",
        timeout: 8000,
      });

      const responseText = await response.text();

      logResult(
        "Server Health Endpoint",
        response.ok,
        {
          url: healthUrl,
          status: response.status,
          responseLength: responseText.length,
          responsePreview: responseText.substring(0, 100),
          isJSON: responseText.startsWith("{"),
        },
        response.ok ? "info" : "warning"
      );
    } catch (error: any) {
      logResult(
        "Server Health Endpoint",
        false,
        {
          error: error.message,
          possibleSolutions: [
            "Pastikan Next.js server berjalan",
            "Check endpoint /api/health exists",
            "Verify CORS configuration",
          ],
        },
        "error"
      );
    }

    // Test 3: Login endpoint
    try {
      const loginUrl = `${baseURL}/api/auth/login`;
      const response = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: "test", password: "test" }),
      });

      const responseText = await response.text();

      logResult(
        "Login Endpoint Test",
        response.status !== 404 && response.status < 500,
        {
          url: loginUrl,
          status: response.status,
          statusText: response.statusText,
          responseLength: responseText.length,
          responsePreview: responseText.substring(0, 150),
          expectedBehavior:
            "Should return 401 Unauthorized for invalid credentials",
        },
        response.status === 401
          ? "info"
          : response.status === 404
          ? "error"
          : "warning"
      );
    } catch (error: any) {
      logResult(
        "Login Endpoint Test",
        false,
        {
          error: error.message,
          troubleshooting: [
            "Check if API routes are configured correctly",
            "Verify Next.js API folder structure",
            "Check for TypeScript compilation errors",
          ],
        },
        "error"
      );
    }
  };

  const testEnvironmentConfig = () => {
    const envVars = {
      EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
      API_TIMEOUT: process.env.API_TIMEOUT,
      NODE_ENV: process.env.NODE_ENV,
    };

    const issues = [];
    if (!envVars.EXPO_PUBLIC_API_BASE_URL) {
      issues.push("EXPO_PUBLIC_API_BASE_URL tidak di-set");
    }
    if (!envVars.EXPO_PUBLIC_API_BASE_URL?.startsWith("http")) {
      issues.push("API URL harus dimulai dengan http:// atau https://");
    }

    logResult(
      "Environment Configuration",
      issues.length === 0,
      {
        environment: envVars,
        totalEnvVars: Object.keys(process.env).length,
        issues: issues,
        recommendations:
          issues.length > 0
            ? [
                "Buat file .env di root project",
                "Set EXPO_PUBLIC_API_BASE_URL=http://103.84.208.182:8016",
                "Rebuild APK setelah update .env",
              ]
            : ["Configuration looks good"],
      },
      issues.length > 0 ? "error" : "info"
    );
  };

  const testAPIService = async () => {
    try {
      // Test API service configuration
      await apiService.debugConnection();

      logResult(
        "API Service Configuration",
        true,
        {
          baseURL: apiService["baseURL"],
          isProduction: apiService["isProduction"],
          timeout: process.env.API_TIMEOUT || "15000",
        },
        "info"
      );

      // Test connectivity through API service
      const connectivityResult = await apiService.testConnectivity();
      logResult(
        "API Service Connectivity",
        connectivityResult,
        {
          result: connectivityResult,
          method: "API Service testConnectivity()",
        },
        connectivityResult ? "info" : "error"
      );
    } catch (error: any) {
      logResult(
        "API Service Test",
        false,
        {
          error: error.message,
          stack: error.stack?.split("\n").slice(0, 3),
        },
        "error"
      );
    }
  };

  const runComprehensiveDiagnostic = async () => {
    setTesting(true);
    setResults([]);

    try {
      // Step 1: Gather system information
      await gatherSystemInfo();
      logResult("System Information", true, systemInfo, "info");

      // Step 2: Test environment configuration
      testEnvironmentConfig();

      // Step 3: Test basic internet connectivity
      await testBasicConnectivity();

      // Step 4: Test server connectivity
      await testServerConnectivity();

      // Step 5: Test API service
      await testAPIService();

      // Step 6: Network analysis
      const failedTests = results.filter((r) => !r.success);
      const criticalErrors = results.filter((r) => r.severity === "error");

      logResult(
        "Diagnostic Summary",
        criticalErrors.length === 0,
        {
          totalTests: results.length,
          failed: failedTests.length,
          critical: criticalErrors.length,
          warnings: results.filter((r) => r.severity === "warning").length,
          mainIssues: criticalErrors.map((e) => e.test),
          recommendations:
            criticalErrors.length > 0
              ? generateRecommendations(criticalErrors)
              : ["All tests passed! Connection should work."],
        },
        criticalErrors.length > 0 ? "error" : "info"
      );
    } catch (error: any) {
      logResult(
        "Diagnostic Error",
        false,
        {
          error: error.message,
          stack: error.stack,
        },
        "error"
      );
    } finally {
      setTesting(false);
    }
  };

  const generateRecommendations = (errors: any[]) => {
    const recommendations = [];

    if (errors.some((e) => e.test.includes("Server Reachability"))) {
      recommendations.push(
        "🔧 Server tidak dapat dijangkau:",
        "  • Pastikan Next.js server berjalan di port 3001",
        "  • Cek IP address server dengan: ipconfig (Windows) atau ifconfig (Mac/Linux)",
        "  • Pastikan device dan server di WiFi yang sama",
        "  • Disable firewall untuk testing"
      );
    }

    if (errors.some((e) => e.test.includes("Environment"))) {
      recommendations.push(
        "⚙️ Environment Configuration:",
        "  • Buat file .env di root project React Native",
        "  • Tambahkan: EXPO_PUBLIC_API_BASE_URL=http://IP_SERVER:3001",
        "  • Build ulang APK dengan: eas build --platform android --profile preview"
      );
    }

    if (errors.some((e) => e.test.includes("Basic Internet"))) {
      recommendations.push(
        "🌐 Masalah Internet:",
        "  • Check koneksi WiFi device",
        "  • Try mobile data untuk testing",
        "  • Restart device network interface"
      );
    }

    return recommendations;
  };

  const exportDetailedResults = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      systemInfo,
      diagnostics: {
        totalTests: results.length,
        passed: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        critical: results.filter((r) => r.severity === "error").length,
        warnings: results.filter((r) => r.severity === "warning").length,
      },
      results: results.map((r) => ({
        ...r,
        timestamp: r.timestamp.toISOString(),
      })),
      troubleshootingGuide: generateRecommendations(
        results.filter((r) => !r.success && r.severity === "error")
      ),
    };

    const jsonString = JSON.stringify(exportData, null, 2);

    console.log("=== NETWORK DIAGNOSTIC EXPORT START ===");
    console.log(jsonString);
    console.log("=== NETWORK DIAGNOSTIC EXPORT END ===");

    Alert.alert(
      "Network Diagnostics Exported",
      `Diagnostic results exported to console.\n\n${
        results.filter((r) => !r.success).length
      } issues found out of ${results.length} tests.`,
      [{ text: "OK" }]
    );
  };

  return (
    <View style={styles.debugPanel}>
      <View style={styles.debugHeader}>
        <Text style={styles.debugTitle}>Network Diagnostics</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Connection Status:</Text>
        <Text style={styles.infoText}>
          API URL: {process.env.EXPO_PUBLIC_API_BASE_URL || "❌ NOT CONFIGURED"}
        </Text>
        <Text style={styles.infoText}>
          Platform: {Platform.OS} {Platform.Version}
        </Text>
        <Text style={styles.infoText}>
          Network:{" "}
          {typeof navigator !== "undefined" && navigator.onLine
            ? "✅ Online"
            : "❓ Unknown"}
        </Text>
        <Text style={styles.infoText}>
          Environment: {__DEV__ ? "Development" : "Production"}
        </Text>
      </View>

      <View style={styles.debugButtons}>
        <TouchableOpacity
          style={[
            styles.debugButton,
            styles.primaryButton,
            testing && styles.debugButtonDisabled,
          ]}
          onPress={runComprehensiveDiagnostic}
          disabled={testing}>
          {testing ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.debugButtonText}>Testing...</Text>
            </>
          ) : (
            <>
              <Ionicons name="wifi" size={16} color="#fff" />
              <Text style={styles.debugButtonText}>Run Network Test</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.debugButton, styles.secondaryButton]}
          onPress={() =>
            Alert.alert(
              "APK Debug",
              "Tap logo 7 times for comprehensive APK debugging"
            )
          }>
          <Ionicons name="bug" size={16} color="#0066cc" />
          <Text style={styles.secondaryButtonText}>APK Debug (7x tap)</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.debugOutput}>
        {results.length === 0 && !testing && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              Tap "Run Network Test" to diagnose connection issues
            </Text>
            <Text style={styles.emptySubtext}>
              This will test internet connectivity, server reachability, and
              configuration
            </Text>
          </View>
        )}

        {results.map((result, index) => (
          <View
            key={index}
            style={[
              styles.resultItem,
              result.success
                ? styles.successItem
                : result.severity === "error"
                ? styles.errorItem
                : styles.warningItem,
            ]}>
            <View style={styles.resultHeader}>
              <Ionicons
                name={
                  result.success
                    ? "checkmark-circle"
                    : result.severity === "error"
                    ? "close-circle"
                    : "warning"
                }
                size={16}
                color={
                  result.success
                    ? "#10b981"
                    : result.severity === "error"
                    ? "#ef4444"
                    : "#f59e0b"
                }
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
              onPress={exportDetailedResults}>
              <Ionicons name="document-text" size={16} color="#fff" />
              <Text style={styles.debugButtonText}>Export Results</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setResults([])}>
              <Ionicons name="refresh" size={16} color="#ef4444" />
              <Text style={styles.clearButtonText}>Clear</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Enhanced APK Debug Component untuk 7x tap
// Enhanced APK Debug Component - COMPREHENSIVE VERSION
function APKDebugPanel({ onClose }: { onClose: () => void }) {
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const logInfo = (message: string) => {
    console.log(message);
    setDebugInfo((prev) => prev + message + "\n");
  };

  const logResult = (test: string, success: boolean, details: any) => {
    const result = {
      test,
      success,
      details,
      timestamp: new Date(),
    };

    setResults((prev) => [...prev, result]);
    console.log(`[APK Debug] ${test}:`, { success, details });
  };

  // COMPREHENSIVE DIAGNOSTICS
  const runComprehensiveDiagnostics = async () => {
    setTesting(true);
    setDebugInfo("");
    setResults([]);

    try {
      logInfo("=== COMPREHENSIVE APK NETWORK DIAGNOSTICS START ===");
      logInfo(`Timestamp: ${new Date().toISOString()}`);
      logInfo(`Platform: ${Platform.OS}`);
      logInfo(`DEV Mode: ${__DEV__}`);

      // === TEST 1: ENVIRONMENT & CONFIG ===
      logInfo("\n1. ENVIRONMENT & CONFIGURATION:");

      const envConfig = {
        EXPO_PUBLIC_API_BASE_URL:
          process.env.EXPO_PUBLIC_API_BASE_URL || "NOT_SET",
        API_TIMEOUT: process.env.API_TIMEOUT || "NOT_SET",
        NODE_ENV: process.env.NODE_ENV || "NOT_SET",
        PLATFORM: Platform.OS,
        DEV_MODE: __DEV__,
        IS_PRODUCTION_BUILD: !__DEV__,
        TOTAL_ENV_VARS: Object.keys(process.env).length,
      };

      logResult(
        "Environment Configuration",
        !!process.env.EXPO_PUBLIC_API_BASE_URL,
        envConfig
      );
      logInfo(`API URL: ${envConfig.EXPO_PUBLIC_API_BASE_URL}`);
      logInfo(`Environment variables count: ${envConfig.TOTAL_ENV_VARS}`);

      // === TEST 2: NETWORK INTERFACE INFO ===
      logInfo("\n2. DEVICE NETWORK STATUS:");

      const networkInfo = {
        online: navigator.onLine,
        userAgent: navigator.userAgent || "Not available",
        connection: (navigator as any).connection || "Not available",
        language: navigator.language || "Not available",
        platform: Platform.OS,
        hostname: window.location?.hostname || "Not available",
        protocol: window.location?.protocol || "Not available",
      };

      logResult("Network Interface Status", navigator.onLine, networkInfo);
      logInfo(`Device online status: ${networkInfo.online}`);

      // === TEST 3: API SERVICE CONFIGURATION ===
      logInfo("\n3. API SERVICE CONFIGURATION:");

      await apiService.debugConnection();

      const apiConfig = {
        baseURL: apiService["baseURL"] || "NOT_SET",
        isProduction: apiService["isProduction"] || false,
        timeout: process.env.API_TIMEOUT || "15000",
        hasBaseURL: !!apiService["baseURL"],
      };

      logResult("API Service Configuration", !!apiConfig.baseURL, apiConfig);
      logInfo(`API Base URL: ${apiConfig.baseURL}`);

      // === TEST 4: BASIC CONNECTIVITY TESTS ===
      logInfo("\n4. BASIC CONNECTIVITY TESTS:");

      // Test external connectivity first
      const externalTests = [
        { url: "https://httpbin.org/get", name: "External HTTPS" },
        { url: "http://httpbin.org/get", name: "External HTTP" },
        { url: "https://google.com", name: "Google HTTPS" },
      ];

      for (const test of externalTests) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);

          const response = await fetch(test.url, {
            method: "HEAD",
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          logResult(`External: ${test.name}`, response.ok, {
            url: test.url,
            status: response.status,
            statusText: response.statusText,
            type: response.type,
            headers: Object.fromEntries(response.headers.entries()),
          });

          logInfo(`${test.name}: ${response.status} ${response.statusText}`);
        } catch (error: any) {
          logResult(`External: ${test.name}`, false, {
            url: test.url,
            error: error.message,
            name: error.name,
            code: error.code || "No code",
          });
          logInfo(`${test.name}: ERROR - ${error.message}`);
        }
      }

      // === TEST 5: TARGET SERVER CONNECTIVITY ===
      logInfo("\n5. TARGET SERVER CONNECTIVITY TESTS:");

      const serverIP =
        process.env.EXPO_PUBLIC_API_BASE_URL || "http://103.84.208.182:8016";
      const serverTests = [
        { url: serverIP, method: "HEAD", name: "Server Root HEAD" },
        { url: serverIP, method: "GET", name: "Server Root GET" },
        {
          url: `${serverIP}/api/health`,
          method: "GET",
          name: "Health Endpoint",
        },
        {
          url: `${serverIP}/api/auth/login`,
          method: "POST",
          name: "Login Endpoint",
        },
      ];

      for (const test of serverTests) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          const fetchConfig: RequestInit = {
            method: test.method,
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          };

          if (test.method === "POST") {
            fetchConfig.body = JSON.stringify({
              username: "test",
              password: "test",
            });
          }

          const response = await fetch(test.url, fetchConfig);
          clearTimeout(timeoutId);

          const responseText = await response.text();

          const testResult = {
            url: test.url,
            method: test.method,
            status: response.status,
            statusText: response.statusText,
            ok: response.ok,
            type: response.type,
            responseLength: responseText.length,
            responsePreview: responseText.substring(0, 200),
            headers: Object.fromEntries(response.headers.entries()),
            isJSON: responseText.trim().startsWith("{"),
          };

          logResult(`Server: ${test.name}`, response.status < 500, testResult);
          logInfo(
            `${test.name}: ${response.status} - ${responseText.length} bytes`
          );
        } catch (error: any) {
          const errorDetail = {
            url: test.url,
            method: test.method,
            error: error.message,
            name: error.name,
            code: error.code || "No code",
            cause: error.cause?.message || "No cause",
            stack: error.stack?.substring(0, 200) || "No stack",
          };

          logResult(`Server: ${test.name}`, false, errorDetail);
          logInfo(`${test.name}: ERROR - ${error.name}: ${error.message}`);

          // Special handling for specific errors
          if (error.name === "TypeError" && error.message.includes("Network")) {
            logInfo(`  → CRITICAL: Network request failed. Possible causes:`);
            logInfo(`     - Server not running on ${serverIP}`);
            logInfo(`     - Device not on same WiFi network`);
            logInfo(`     - Firewall blocking connection`);
            logInfo(`     - HTTP not allowed (need HTTPS)`);
          } else if (error.name === "AbortError") {
            logInfo(`  → TIMEOUT: Request took longer than 10 seconds`);
            logInfo(`     - Server might be slow or unreachable`);
          }
        }
      }

      // === TEST 6: DNS AND IP RESOLUTION ===
      logInfo("\n6. IP ADDRESS & DNS TESTS:");

      const ipTests = [
        "192.168.20.222:3001",
        "103.84.208.182:8016",
        "localhost:3001",
        "127.0.0.1:3001",
        "10.0.2.2:3001", // Android emulator
      ];

      for (const ip of ipTests) {
        try {
          const testUrl = `http://${ip}`;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(testUrl, {
            method: "HEAD",
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          logResult(`IP Test: ${ip}`, response.ok, {
            ip: ip,
            status: response.status,
            reachable: response.ok,
          });

          logInfo(
            `IP ${ip}: ${response.status} ${
              response.ok ? "REACHABLE" : "ERROR"
            }`
          );
        } catch (error: any) {
          logResult(`IP Test: ${ip}`, false, {
            ip: ip,
            error: error.message,
            name: error.name,
          });
          logInfo(`IP ${ip}: ${error.name} - ${error.message}`);
        }
      }

      // === TEST 7: HTTP VS HTTPS COMPARISON ===
      logInfo("\n7. PROTOCOL COMPARISON:");

      const protocols = ["http", "https"];
      const testHost = "103.84.208.182:8016";

      for (const protocol of protocols) {
        try {
          const testUrl = `${protocol}://${testHost}`;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(testUrl, {
            method: "HEAD",
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          logResult(`Protocol: ${protocol.toUpperCase()}`, response.ok, {
            protocol: protocol,
            url: testUrl,
            status: response.status,
            works: response.ok,
          });

          logInfo(
            `${protocol.toUpperCase()}: ${response.status} ${
              response.ok ? "WORKS" : "FAILED"
            }`
          );
        } catch (error: any) {
          logResult(`Protocol: ${protocol.toUpperCase()}`, false, {
            protocol: protocol,
            error: error.message,
            name: error.name,
          });
          logInfo(
            `${protocol.toUpperCase()}: ${error.name} - ${error.message}`
          );
        }
      }

      // === TEST 8: API SERVICE METHODS ===
      logInfo("\n8. API SERVICE INTEGRATION TESTS:");

      try {
        const connectivityResult = await apiService.testConnectivity();
        logResult("API Service Connectivity", connectivityResult, {
          reachable: connectivityResult,
          method: "testConnectivity",
        });
        logInfo(
          `API Service connectivity test: ${
            connectivityResult ? "PASS" : "FAIL"
          }`
        );
      } catch (error: any) {
        logResult("API Service Connectivity", false, {
          error: error.message,
          name: error.name,
        });
        logInfo(`API Service connectivity error: ${error.message}`);
      }

      try {
        const healthResult = await apiService.healthCheck();
        logResult("API Health Check", healthResult, {
          healthy: healthResult,
          endpoint: "/api/health",
        });
        logInfo(`Health check: ${healthResult ? "HEALTHY" : "UNHEALTHY"}`);
      } catch (error: any) {
        logResult("API Health Check", false, {
          error: error.message,
          name: error.name,
        });
        logInfo(`Health check error: ${error.message}`);
      }

      // === TEST 9: STORAGE & PERSISTENCE ===
      logInfo("\n9. DEVICE STORAGE TESTS:");

      try {
        const testToken = "test-connectivity-token-" + Date.now();
        await apiService.saveToken(testToken);
        const retrievedToken = await apiService.getToken();
        await apiService.removeToken();

        const storageWorks = retrievedToken === testToken;

        logResult("Device Storage", storageWorks, {
          canSave: true,
          canRetrieve: storageWorks,
          canRemove: true,
          testToken: testToken.substring(0, 20) + "...",
        });

        logInfo(`Storage test: ${storageWorks ? "WORKING" : "FAILED"}`);
      } catch (error: any) {
        logResult("Device Storage", false, {
          error: error.message,
          name: error.name,
        });
        logInfo(`Storage error: ${error.message}`);
      }

      // === TEST 10: DETAILED ERROR ANALYSIS ===
      logInfo("\n10. ERROR PATTERN ANALYSIS:");

      const failedTests = results.filter((r) => !r.success);
      const networkErrors = failedTests.filter(
        (r) =>
          r.details?.error?.includes("Network") ||
          r.details?.name === "TypeError"
      );
      const timeoutErrors = failedTests.filter(
        (r) =>
          r.details?.name === "AbortError" ||
          r.details?.error?.includes("timeout")
      );

      const errorAnalysis = {
        totalTests: results.length,
        failedTests: failedTests.length,
        networkErrors: networkErrors.length,
        timeoutErrors: timeoutErrors.length,
        successRate:
          (
            ((results.length - failedTests.length) / results.length) *
            100
          ).toFixed(1) + "%",
        commonErrors: failedTests
          .map((t) => t.details?.name || "Unknown")
          .reduce((acc, err) => {
            acc[err] = (acc[err] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
      };

      logResult("Error Analysis", failedTests.length === 0, errorAnalysis);

      // === FINAL DIAGNOSIS ===
      logInfo("\n=== FINAL DIAGNOSIS ===");

      if (networkErrors.length > 0) {
        logInfo("CRITICAL ISSUE: Network connectivity problems detected");
        logInfo(
          "RECOMMENDATION: Check server status and network configuration"
        );
      } else if (timeoutErrors.length > 0) {
        logInfo("WARNING: Timeout issues detected");
        logInfo("RECOMMENDATION: Check server performance or increase timeout");
      } else if (failedTests.length === 0) {
        logInfo("SUCCESS: All connectivity tests passed!");
      } else {
        logInfo("MIXED RESULTS: Some tests failed, see details above");
      }

      logInfo("\n=== COMPREHENSIVE DIAGNOSTICS END ===");
    } catch (error: any) {
      logInfo(`\nCRITICAL ERROR: ${error.message}`);
      logResult("Diagnostics Critical Error", false, {
        error: error.message,
        stack: error.stack,
      });
    } finally {
      setTesting(false);
    }
  };

  const testActualLogin = async () => {
    try {
      setTesting(true);
      logInfo("\n=== ACTUAL LOGIN FLOW TEST ===");

      const response = await apiService.login("test_user", "test_password");

      logResult("Login Flow Test", response.success, {
        success: response.success,
        message: response.message,
        hasToken: !!response.token,
        hasUser: !!response.user,
        responseType: typeof response,
      });

      logInfo(`Login result: ${response.success ? "SUCCESS" : "FAILED"}`);
      logInfo(`Message: ${response.message}`);

      Alert.alert(
        "Login Test Complete",
        `Result: ${response.success ? "SUCCESS" : "FAILED"}\nMessage: ${
          response.message
        }\n\nCheck debug output for detailed analysis.`,
        [{ text: "OK" }]
      );
    } catch (error: any) {
      logResult("Login Flow Test", false, {
        error: error.message,
        name: error.name,
        status: error.status,
        code: error.code,
      });

      logInfo(`Login error: ${error.name} - ${error.message}`);

      Alert.alert(
        "Login Test Failed",
        `Error: ${error.name}\nMessage: ${error.message}\nStatus: ${
          error.status || "Unknown"
        }\n\nCheck debug output for analysis.`,
        [{ text: "OK" }]
      );
    } finally {
      setTesting(false);
    }
  };

  const exportFullResults = () => {
    const exportData = {
      metadata: {
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
        devMode: __DEV__,
        totalTests: results.length,
        successfulTests: results.filter((r) => r.success).length,
        failedTests: results.filter((r) => !r.success).length,
      },
      environment: {
        EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
        API_TIMEOUT: process.env.API_TIMEOUT,
        NODE_ENV: process.env.NODE_ENV,
        totalEnvVars: Object.keys(process.env).length,
      },
      deviceInfo: {
        userAgent: navigator.userAgent || "Not available",
        online: navigator.onLine,
        platform: Platform.OS,
        connection: (navigator as any).connection || "Not available",
      },
      apiService: {
        baseURL: apiService["baseURL"],
        isProduction: apiService["isProduction"],
      },
      testResults: results.map((r) => ({
        ...r,
        timestamp: r.timestamp.toISOString(),
      })),
      debugLog: debugInfo,
      troubleshootingTips: [
        "1. Ensure server is running on the configured IP and port",
        "2. Check device and server are on the same WiFi network",
        "3. Verify firewall is not blocking the connection",
        "4. Try using HTTPS with ngrok if HTTP fails",
        "5. Check Android network security config allows cleartext",
        "6. Restart server and clear app cache if issues persist",
      ],
    };

    const jsonString = JSON.stringify(exportData, null, 2);

    console.log("=== COMPREHENSIVE DEBUG EXPORT START ===");
    console.log(jsonString);
    console.log("=== COMPREHENSIVE DEBUG EXPORT END ===");

    Alert.alert(
      "Complete Debug Export",
      `${
        results.length
      } comprehensive test results exported to console.\n\nCopy the full log output for detailed troubleshooting.\n\nSuccess Rate: ${(
        (results.filter((r) => r.success).length / results.length) *
        100
      ).toFixed(1)}%`,
      [{ text: "OK" }]
    );
  };

  const clearAllResults = () => {
    setResults([]);
    setDebugInfo("");
  };

  return (
    <View style={styles.debugPanel}>
      <View style={styles.debugHeader}>
        <Text style={styles.debugTitle}>APK Network Diagnostics</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Configuration Status:</Text>
        <Text style={styles.infoText}>
          API URL: {process.env.EXPO_PUBLIC_API_BASE_URL || "❌ NOT CONFIGURED"}
        </Text>
        <Text style={styles.infoText}>
          Mode: {__DEV__ ? "Development" : "Production Build"}
        </Text>
        <Text style={styles.infoText}>Platform: {Platform.OS}</Text>
        <Text style={styles.infoText}>
          Network: {navigator.onLine ? "Online" : "Offline"}
        </Text>
        {results.length > 0 && (
          <Text style={styles.infoText}>
            Tests: {results.filter((r) => r.success).length}/{results.length}{" "}
            passed
          </Text>
        )}
      </View>

      <View style={styles.debugButtons}>
        <TouchableOpacity
          style={[
            styles.debugButton,
            styles.primaryButton,
            testing && styles.debugButtonDisabled,
          ]}
          onPress={runComprehensiveDiagnostics}
          disabled={testing}>
          {testing ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.debugButtonText}>Testing...</Text>
            </>
          ) : (
            <>
              <Ionicons name="medical" size={16} color="#fff" />
              <Text style={styles.debugButtonText}>Full Diagnostics</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.debugButton,
            styles.secondaryButton,
            testing && styles.debugButtonDisabled,
          ]}
          onPress={testActualLogin}
          disabled={testing}>
          <Ionicons name="key" size={16} color="#0066cc" />
          <Text style={styles.secondaryButtonText}>Test Login</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.debugOutput}>
        {results.length === 0 && !testing && (
          <Text style={styles.emptyText}>
            Tap "Full Diagnostics" for comprehensive network analysis
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

        {debugInfo && (
          <View style={styles.logSection}>
            <Text style={styles.logTitle}>Debug Log:</Text>
            <Text style={styles.debugOutputText}>{debugInfo}</Text>
          </View>
        )}

        {(results.length > 0 || debugInfo) && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={exportFullResults}>
              <Ionicons name="download" size={16} color="#fff" />
              <Text style={styles.debugButtonText}>
                Export Complete Results
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.clearButton}
              onPress={clearAllResults}>
              <Ionicons name="trash" size={16} color="#ef4444" />
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const [showNetworkDebug, setShowNetworkDebug] = useState(false);
  const [showAPKDebug, setShowAPKDebug] = useState(false);
  const [tapCount, setTapCount] = useState(0);

  // Secret tap to show debug (5 taps for Network Debug, 7 taps for APK Debug)
  const handleLogoTap = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);

    if (newCount === 5) {
      setShowNetworkDebug(true);
      setTapCount(0);
    } else if (newCount === 7) {
      setShowAPKDebug(true);
      setTapCount(0);
    }

    // Reset count after 3 seconds
    setTimeout(() => {
      setTapCount(0);
    }, 3000);
  };

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated && user) {
        console.log("User authenticated, redirecting to dashboard");
        router.replace("/(tabs)");
      }
    }
  }, [user, loading, isAuthenticated, router]);

  // Show Network Debug panel if enabled (5x tap)
  if (showNetworkDebug) {
    return (
      <SafeAreaView style={styles.container}>
        <NetworkDebugPanel onClose={() => setShowNetworkDebug(false)} />
      </SafeAreaView>
    );
  }

  // Show APK Debug panel if enabled (7x tap)
  if (showAPKDebug) {
    return (
      <SafeAreaView style={styles.container}>
        <APKDebugPanel onClose={() => setShowAPKDebug(false)} />
      </SafeAreaView>
    );
  }

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <LinearGradient
        colors={[BrandColors.primary, BrandColors.secondary]}
        style={styles.container}>
        <SafeAreaView style={styles.content}>
          <View style={styles.loadingContainer}>
            <View style={styles.logoSection}>
              <View style={styles.logoContainer}>
                <TouchableOpacity onPress={handleLogoTap}>
                  <View style={styles.logoCircle}>
                    <View style={styles.logoInnerCircle}>
                      <Image
                        source={require("../assets/images/icon.png")}
                        style={styles.logoImage}
                        resizeMode="contain"
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.brandTextContainer}>
                <Text style={styles.brandText}>
                  <Text style={styles.brandTextPrimary}>SHERLOCK</Text>
                  {"\n"}
                  <Text style={styles.brandTextSecondary}>BANGSAMSIR</Text>
                </Text>
              </View>
            </View>

            <ActivityIndicator
              size="large"
              color={BrandColors.white}
              style={styles.loadingSpinner}
            />
            <Text style={styles.loadingText}>Memuat aplikasi...</Text>
            {tapCount > 0 && (
              <Text style={styles.tapCountText}>
                Tap logo{" "}
                {tapCount < 5
                  ? 5 - tapCount + " more times for network debug"
                  : tapCount < 7
                  ? 7 - tapCount + " more times for APK debug"
                  : ""}
              </Text>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  // Show welcome screen for unauthenticated users
  return (
    <LinearGradient
      colors={[BrandColors.primary, BrandColors.secondary]}
      style={styles.container}>
      <SafeAreaView style={styles.content}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <TouchableOpacity onPress={handleLogoTap}>
              <View style={styles.logoCircle}>
                <View style={styles.logoInnerCircle}>
                  <Image
                    source={require("../assets/images/icon.png")}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </TouchableOpacity>
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
        <View style={styles.hospitalBadge}>
          <Text style={styles.hospitalText}>RSUD Mohammad Natsir Solok</Text>
        </View>

        {/* Quote */}
        <View style={styles.quoteContainer}>
          <Text style={styles.quote}>"Sampah Kini Berkah Menanti"</Text>
        </View>

        {/* Debug Hint */}
        {tapCount > 0 && (
          <View style={styles.debugHint}>
            <Text style={styles.debugHintText}>
              {tapCount < 5
                ? `Network Debug: ${tapCount}/5 taps`
                : tapCount < 7
                ? `APK Debug: ${tapCount}/7 taps`
                : "Debug mode ready"}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push("/login")}>
            <Text style={styles.loginButtonText}>Masuk</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => router.push("/register")}>
            <Text style={styles.registerButtonText}>Daftar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  loadingSpinner: {
    marginTop: 30,
    marginBottom: 15,
  },
  loadingText: {
    color: BrandColors.white,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  tapCountText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
    marginTop: 10,
    textAlign: "center",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: BrandColors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  logoImage: {
    width: 60,
    height: 60,
    tintColor: BrandColors.white,
  },
  brandTextContainer: {
    alignItems: "center",
  },
  brandText: {
    textAlign: "center",
    fontSize: 36,
    fontWeight: "900",
    lineHeight: 40,
  },
  brandTextPrimary: {
    color: "#065f46",
  },
  brandTextSecondary: {
    color: "#34d399",
  },
  taglineContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  tagline: {
    color: BrandColors.white,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 24,
  },
  hospitalBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  hospitalText: {
    color: BrandColors.white,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  quoteContainer: {
    backgroundColor: "rgba(251, 191, 36, 0.2)",
    borderRadius: 20,
    paddingHorizontal: 25,
    paddingVertical: 15,
    marginBottom: 50,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
  },
  quote: {
    color: "#fef3c7",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    fontStyle: "italic",
  },
  debugHint: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    marginBottom: 20,
  },
  debugHintText: {
    color: BrandColors.white,
    fontSize: 12,
    textAlign: "center",
  },
  buttonContainer: {
    width: "100%",
    gap: 15,
  },
  loginButton: {
    backgroundColor: BrandColors.white,
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonText: {
    color: BrandColors.primary,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  registerButton: {
    backgroundColor: "transparent",
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: BrandColors.white,
  },
  registerButtonText: {
    color: BrandColors.white,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  // Enhanced Debug Panel Styles
  debugPanel: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  debugHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: BrandColors.primary,
    padding: 16,
    paddingTop: 50,
  },
  debugTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  closeButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCard: {
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
  debugButtons: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  debugButton: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: BrandColors.primary,
  },
  secondaryButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: BrandColors.primary,
  },
  debugButtonDisabled: {
    opacity: 0.5,
  },
  debugButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  secondaryButtonText: {
    color: BrandColors.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  debugOutput: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    color: "#888",
    textAlign: "center",
    fontSize: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: "#666",
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
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
  warningItem: {
    borderLeftColor: "#f59e0b",
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
  debugOutputText: {
    color: "#00ff00",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 12,
    lineHeight: 16,
    marginTop: 10,
    backgroundColor: "#2a2a2a",
    padding: 12,
    borderRadius: 8,
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
  logSection: {
    backgroundColor: "#333",
    borderRadius: 4,
    padding: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  logTitle: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    marginBottom: 20,
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
