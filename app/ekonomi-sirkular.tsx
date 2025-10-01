// app/ekonomi-sirkular.tsx - FIXED: Stop API loop berulang
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
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
import apiService from "../services/api";

interface Video {
  id: number;
  judul: string;
  deskripsi?: string;
  tipe_video: "youtube";
  video_url: string;
  thumbnail?: string;
  kategori?: string;
  tags?: string[];
  durasi?: string;
  views: number;
  created_at: string;
  creator?: {
    nama_lengkap: string;
  };
  popular?: boolean;
}

interface Category {
  id: string;
  name: string;
  count: number;
}

// Extract YouTube video ID for thumbnails
function extractYouTubeVideoId(url: string): string | null {
  const regex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

export default function EkonomiSirkularScreen() {
  const router = useRouter();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<"urutan" | "popular" | "latest">(
    "urutan"
  );

  // CRITICAL: Refs untuk prevent multiple simultaneous calls
  const loadDataInProgress = useRef(false);
  const isInitialized = useRef(false);
  const lastFetchParams = useRef<string>("");

  const categories: Category[] = [
    { id: "all", name: "Semua", count: 0 },
    { id: "Tips", name: "Tips", count: 0 },
    { id: "Tutorial", name: "Tutorial", count: 0 },
    { id: "Edukasi", name: "Edukasi", count: 0 },
    { id: "Workshop", name: "Workshop", count: 0 },
    { id: "Dokumenter", name: "Dokumenter", count: 0 },
  ];

  // FIXED: Single consolidated fetch function dengan debouncing
  const fetchVideos = useCallback(
    async (skipIfLoading = true) => {
      // Create params key for deduplication
      const paramsKey = `${selectedCategory}-${searchQuery}-${sortBy}`;

      // Prevent multiple simultaneous calls with same params
      if (
        skipIfLoading &&
        (loadDataInProgress.current || lastFetchParams.current === paramsKey)
      ) {
        console.log(
          "⏸️ Video loading already in progress or same params, skipping..."
        );
        return;
      }

      loadDataInProgress.current = true;
      lastFetchParams.current = paramsKey;

      try {
        console.log("🎥 Fetching videos with params:", {
          selectedCategory,
          searchQuery,
          sortBy,
        });

        // Prepare query parameters
        const params: any = {};
        if (selectedCategory !== "all") params.kategori = selectedCategory;
        if (searchQuery.trim()) params.search = searchQuery.trim();
        params.sortBy = sortBy;
        params.limit = 20;

        const response = await apiService.getVideos(params);

        if (response.success) {
          console.log(
            "✅ Videos fetched successfully:",
            response.videos?.length || 0
          );
          const videosData = response.videos || response.data || [];
          setVideos(videosData);
        } else {
          console.error("❌ Failed to fetch videos:", response.message);
          throw new Error(response.message || "Gagal memuat data video");
        }
      } catch (error: any) {
        console.error("🚨 Error fetching videos:", error);

        // Set fallback empty data instead of showing alert repeatedly
        setVideos([]);

        // Only show alert on manual actions, not automatic loads
        if (!skipIfLoading) {
          let errorMessage = "Gagal memuat data video";
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
        console.log("🏁 Video fetch completed");
      }
    },
    [selectedCategory, searchQuery, sortBy]
  );

  // FIXED: Initialize data only once
  useEffect(() => {
    if (!isInitialized.current) {
      console.log("🚀 Initializing ekonomi sirkular screen");
      isInitialized.current = true;
      fetchVideos(false); // Don't skip on initialization
    }
  }, []); // Empty dependency array

  // FIXED: Handle filter changes without causing loops
  useEffect(() => {
    if (isInitialized.current) {
      console.log("🔄 Filter changed, fetching new data");
      const timeoutId = setTimeout(() => {
        fetchVideos(false);
      }, 300); // Debounce filter changes

      return () => clearTimeout(timeoutId);
    }
  }, [selectedCategory, sortBy]); // Only depend on filter values

  // FIXED: Handle search with debouncing
  useEffect(() => {
    if (isInitialized.current && searchQuery !== "") {
      console.log("🔍 Search query changed, debouncing...");
      const timeoutId = setTimeout(() => {
        fetchVideos(false);
      }, 500); // Debounce search

      return () => clearTimeout(timeoutId);
    } else if (isInitialized.current && searchQuery === "") {
      // Immediate search when cleared
      fetchVideos(false);
    }
  }, [searchQuery]);

  // FIXED: Manual refresh handler
  const onRefresh = useCallback(async () => {
    if (refreshing || loadDataInProgress.current) {
      console.log("⏸️ Refresh already in progress");
      return;
    }

    setRefreshing(true);
    console.log("🔄 Manual refresh triggered");

    try {
      // Reset params key to force fresh fetch
      lastFetchParams.current = "";
      await fetchVideos(false);
    } catch (err) {
      console.error("❌ Error during refresh:", err);
    } finally {
      setRefreshing(false);
      console.log("✅ Manual refresh completed");
    }
  }, [fetchVideos]);

  // Filter videos locally (additional to API filtering)
  const filteredVideos = videos.filter((video) => {
    const matchesCategory =
      selectedCategory === "all" || video.kategori === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      video.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.deskripsi?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.tags?.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      );

    return matchesCategory && matchesSearch;
  });

  const popularVideos = videos
    .filter((video) => video.popular || video.views > 100)
    .slice(0, 3);

  // Get video thumbnail
  const getVideoThumbnail = (video: Video): string => {
    if (video.thumbnail) {
      return video.thumbnail;
    }

    if (video.video_url) {
      const videoId = extractYouTubeVideoId(video.video_url);
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    }

    return "/placeholder-video.png";
  };

  // Get category color
  const getCategoryColor = (kategori?: string) => {
    switch (kategori) {
      case "Tips":
        return { bg: "#fef3c7", text: "#92400e" };
      case "Tutorial":
        return { bg: "#dbeafe", text: "#1e40af" };
      case "Workshop":
        return { bg: "#e9d5ff", text: "#7c3aed" };
      case "Edukasi":
        return { bg: "#d1fae5", text: "#065f46" };
      case "Dokumenter":
        return { bg: "#e0e7ff", text: "#3730a3" };
      default:
        return { bg: "#f3f4f6", text: "#374151" };
    }
  };

  // Format views count
  const formatViews = (views: number) => {
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return views.toString();
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Handle video press
  const handleVideoPress = (videoId: number) => {
    router.push(`/ekonomi-sirkular/${videoId}`);
  };

  if (loading && videos.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner} />
          <Text style={styles.loadingText}>Memuat video...</Text>
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

            {/* Header Title */}
            <View style={styles.headerTitle}>
              <Text style={styles.headerTitleText}>
                🌱 Video Ekonomi Sirkular
              </Text>
              <Text style={styles.headerSubtitle}>
                Edukasi pengelolaan sampah di RSUD Mohammad Natsir Solok
              </Text>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons
                name="search"
                size={20}
                color={BrandColors.gray[400]}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari video..."
                placeholderTextColor={BrandColors.gray[400]}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>
        </LinearGradient>

        {/* Filters */}
        <View style={styles.filtersSection}>
          <View style={styles.filtersHeader}>
            <Text style={styles.filtersTitle}>
              {filteredVideos.length} Video
            </Text>
            <TouchableOpacity
              style={[
                styles.filterToggle,
                showFilters && styles.filterToggleActive,
              ]}
              onPress={() => setShowFilters(!showFilters)}>
              <Ionicons
                name={showFilters ? "close" : "options"}
                size={16}
                color={
                  showFilters ? BrandColors.primary : BrandColors.gray[600]
                }
              />
            </TouchableOpacity>
          </View>

          {showFilters && (
            <View style={styles.filtersContent}>
              {/* Sort By */}
              <View style={styles.sortContainer}>
                <Text style={styles.sortLabel}>Urutkan:</Text>
                <View style={styles.sortButtons}>
                  {[
                    { value: "urutan", label: "Urutan" },
                    { value: "popular", label: "Populer" },
                    { value: "latest", label: "Terbaru" },
                  ].map((sort) => (
                    <TouchableOpacity
                      key={sort.value}
                      style={[
                        styles.sortButton,
                        sortBy === sort.value && styles.sortButtonActive,
                      ]}
                      onPress={() => setSortBy(sort.value as any)}>
                      <Text
                        style={[
                          styles.sortButtonText,
                          sortBy === sort.value && styles.sortButtonTextActive,
                        ]}>
                        {sort.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Categories */}
              <View style={styles.categoriesGrid}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryButton,
                      selectedCategory === category.id &&
                        styles.categoryButtonActive,
                    ]}
                    onPress={() => setSelectedCategory(category.id)}>
                    <Text
                      style={[
                        styles.categoryButtonText,
                        selectedCategory === category.id &&
                          styles.categoryButtonTextActive,
                      ]}>
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Popular Videos Section */}
        {selectedCategory === "all" && popularVideos.length > 0 && (
          <View style={styles.popularSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flame" size={20} color="#ef4444" />
              <Text style={styles.sectionTitle}>Video Populer</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.popularScroll}>
              {popularVideos.map((video, index) => (
                <TouchableOpacity
                  key={video.id}
                  style={styles.popularCard}
                  onPress={() => handleVideoPress(video.id)}>
                  <View style={styles.popularThumbnail}>
                    <Image
                      source={{ uri: getVideoThumbnail(video) }}
                      style={styles.thumbnailImage}
                    />
                    <View style={styles.playOverlay}>
                      <Ionicons
                        name="play"
                        size={20}
                        color={BrandColors.white}
                      />
                    </View>
                    <View style={styles.durationBadge}>
                      <Text style={styles.durationText}>
                        {video.durasi || "Video"}
                      </Text>
                    </View>
                    <View style={styles.popularBadge}>
                      <Ionicons
                        name="flame"
                        size={12}
                        color={BrandColors.white}
                      />
                      <Text style={styles.popularBadgeText}>#{index + 1}</Text>
                    </View>
                  </View>

                  <View style={styles.popularContent}>
                    <View
                      style={[
                        styles.categoryBadge,
                        {
                          backgroundColor: getCategoryColor(video.kategori).bg,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.categoryBadgeText,
                          { color: getCategoryColor(video.kategori).text },
                        ]}>
                        {video.kategori}
                      </Text>
                    </View>
                    <Text style={styles.popularTitle} numberOfLines={2}>
                      {video.judul}
                    </Text>
                    <View style={styles.videoStats}>
                      <Ionicons
                        name="eye"
                        size={12}
                        color={BrandColors.gray[500]}
                      />
                      <Text style={styles.statsText}>
                        {formatViews(video.views)}
                      </Text>
                      <Text style={styles.statsDivider}>•</Text>
                      <Text style={styles.statsText}>
                        {formatDate(video.created_at)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* All Videos Section */}
        <View style={styles.videosSection}>
          <Text style={styles.sectionTitle}>
            {selectedCategory === "all"
              ? "Semua Video"
              : `Video ${selectedCategory}`}
          </Text>

          {filteredVideos.length > 0 ? (
            <View style={styles.videosGrid}>
              {filteredVideos.map((video) => (
                <TouchableOpacity
                  key={video.id}
                  style={styles.videoCard}
                  onPress={() => handleVideoPress(video.id)}>
                  <View style={styles.videoThumbnail}>
                    <Image
                      source={{ uri: getVideoThumbnail(video) }}
                      style={styles.thumbnailImage}
                    />
                    <View style={styles.playOverlay}>
                      <Ionicons
                        name="play"
                        size={16}
                        color={BrandColors.white}
                      />
                    </View>
                    <View style={styles.durationBadge}>
                      <Text style={styles.durationText}>
                        {video.durasi || "Video"}
                      </Text>
                    </View>
                    {video.popular && (
                      <View style={styles.hotBadge}>
                        <Ionicons
                          name="flame"
                          size={10}
                          color={BrandColors.white}
                        />
                        <Text style={styles.hotBadgeText}>Hot</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.videoContent}>
                    <View style={styles.videoBadges}>
                      <View
                        style={[
                          styles.categoryBadge,
                          {
                            backgroundColor: getCategoryColor(video.kategori)
                              .bg,
                          },
                        ]}>
                        <Text
                          style={[
                            styles.categoryBadgeText,
                            { color: getCategoryColor(video.kategori).text },
                          ]}>
                          {video.kategori}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.videoTitle} numberOfLines={2}>
                      {video.judul}
                    </Text>

                    <Text style={styles.videoDescription} numberOfLines={2}>
                      {video.deskripsi}
                    </Text>

                    <View style={styles.videoStats}>
                      <Ionicons
                        name="eye"
                        size={12}
                        color={BrandColors.gray[500]}
                      />
                      <Text style={styles.statsText}>
                        {formatViews(video.views)}
                      </Text>
                      <Text style={styles.statsDivider}>•</Text>
                      <Text style={styles.statsText}>
                        {formatDate(video.created_at)}
                      </Text>
                    </View>

                    {video.creator && (
                      <View style={styles.creatorInfo}>
                        <Text style={styles.creatorText}>
                          {video.creator.nama_lengkap}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name="videocam-outline"
                size={64}
                color={BrandColors.gray[300]}
              />
              <Text style={styles.emptyTitle}>Tidak Ada Video</Text>
              <Text style={styles.emptyDescription}>
                {searchQuery || selectedCategory !== "all"
                  ? "Tidak ada video yang sesuai dengan pencarian atau filter Anda."
                  : "Belum ada video yang tersedia."}
              </Text>
              {(searchQuery || selectedCategory !== "all") && (
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                    setShowFilters(false);
                  }}>
                  <Text style={styles.resetButtonText}>Reset Pencarian</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Keep existing styles (same as original)
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
    paddingBottom: 20,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    padding: 8,
    marginBottom: 20,
  },
  headerTitle: {
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitleText: {
    fontSize: 24,
    fontWeight: "700",
    color: BrandColors.white,
    textAlign: "center",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginHorizontal: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: BrandColors.gray[900],
  },
  filtersSection: {
    backgroundColor: BrandColors.white,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.gray[200],
  },
  filtersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: BrandColors.gray[900],
  },
  filterToggle: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: BrandColors.gray[100],
  },
  filterToggleActive: {
    backgroundColor: BrandColors.primary + "20",
  },
  filtersContent: {
    gap: 12,
  },
  sortContainer: {
    marginBottom: 8,
  },
  sortLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: BrandColors.gray[700],
    marginBottom: 8,
  },
  sortButtons: {
    flexDirection: "row",
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: BrandColors.gray[100],
    borderWidth: 1,
    borderColor: BrandColors.gray[200],
  },
  sortButtonActive: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: BrandColors.gray[700],
  },
  sortButtonTextActive: {
    color: BrandColors.white,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: BrandColors.gray[100],
    borderWidth: 1,
    borderColor: BrandColors.gray[200],
  },
  categoryButtonActive: {
    backgroundColor: BrandColors.primary,
    borderColor: BrandColors.primary,
  },
  categoryButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: BrandColors.gray[700],
  },
  categoryButtonTextActive: {
    color: BrandColors.white,
  },
  popularSection: {
    paddingVertical: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: BrandColors.gray[900],
    marginLeft: 8,
  },
  popularScroll: {
    paddingLeft: 20,
  },
  popularCard: {
    width: 200,
    marginRight: 15,
    backgroundColor: BrandColors.white,
    borderRadius: 15,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  popularThumbnail: {
    position: "relative",
    height: 120,
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
    backgroundColor: BrandColors.gray[200],
  },
  playOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -15 }, { translateY: -15 }],
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  durationBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationText: {
    fontSize: 10,
    color: BrandColors.white,
    fontWeight: "600",
  },
  popularBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#ef4444",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  popularBadgeText: {
    fontSize: 10,
    color: BrandColors.white,
    fontWeight: "600",
    marginLeft: 4,
  },
  popularContent: {
    padding: 12,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  popularTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: BrandColors.gray[900],
    marginBottom: 8,
    lineHeight: 18,
  },
  videoStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  statsText: {
    fontSize: 10,
    color: BrandColors.gray[500],
    marginLeft: 4,
  },
  statsDivider: {
    fontSize: 10,
    color: BrandColors.gray[500],
    marginHorizontal: 6,
  },
  videosSection: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  videosGrid: {
    marginTop: 15,
  },
  videoCard: {
    backgroundColor: BrandColors.white,
    borderRadius: 15,
    overflow: "hidden",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  videoThumbnail: {
    position: "relative",
    height: 160,
  },
  hotBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
  },
  hotBadgeText: {
    fontSize: 8,
    color: BrandColors.white,
    fontWeight: "600",
    marginLeft: 2,
  },
  videoContent: {
    padding: 15,
  },
  videoBadges: {
    flexDirection: "row",
    marginBottom: 8,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: BrandColors.gray[900],
    marginBottom: 8,
    lineHeight: 20,
  },
  videoDescription: {
    fontSize: 13,
    color: BrandColors.gray[600],
    marginBottom: 10,
    lineHeight: 18,
  },
  creatorInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BrandColors.gray[100],
  },
  creatorText: {
    fontSize: 12,
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
  emptyDescription: {
    fontSize: 14,
    color: BrandColors.gray[600],
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  resetButton: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  resetButtonText: {
    color: BrandColors.white,
    fontSize: 14,
    fontWeight: "600",
  },
});
