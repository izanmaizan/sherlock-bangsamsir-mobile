// app/edukasi.tsx - FIXED: Stop API loop berulang
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandColors } from "../constants/Colors";
import apiService from "../services/api";

interface Article {
  id: number;
  judul: string;
  slug: string;
  konten_preview: string;
  gambar?: string;
  kategori: string;
  tags: string[];
  created_at: string;
  author?: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  count: number;
}

export default function EdukasiScreen() {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const loadDataInProgress = useRef(false);
  const isInitialized = useRef(false);
  const lastFetchParams = useRef<string>("");

  const categories: Category[] = [
    {
      id: "all",
      name: "Semua",
      icon: "newspaper-outline",
      color: BrandColors.gray[600],
      count: 0,
    },
    {
      id: "Tips",
      name: "Tips",
      icon: "bulb-outline",
      color: "#f59e0b",
      count: 0,
    },
    {
      id: "Tutorial",
      name: "Tutorial",
      icon: "school-outline",
      color: "#3b82f6",
      count: 0,
    },
    {
      id: "Infografis",
      name: "Infografis",
      icon: "bar-chart-outline",
      color: "#8b5cf6",
      count: 0,
    },
    {
      id: "Berita",
      name: "Berita",
      icon: "newspaper-outline",
      color: BrandColors.primary,
      count: 0,
    },
  ];

  const fetchArticles = useCallback(
    async (skipIfLoading = true) => {
      const paramsKey = `${selectedCategory}-${searchQuery}`;

      if (
        skipIfLoading &&
        (loadDataInProgress.current || lastFetchParams.current === paramsKey)
      ) {
        console.log(
          "⏸️ Articles loading already in progress or same params, skipping..."
        );
        return;
      }

      loadDataInProgress.current = true;
      lastFetchParams.current = paramsKey;

      try {
        console.log("📰 Fetching articles with params:", {
          selectedCategory,
          searchQuery,
        });

        const params: any = {};
        if (selectedCategory !== "all") params.kategori = selectedCategory;
        if (searchQuery.trim()) params.search = searchQuery.trim();
        params.limit = 20;

        const response = await apiService.getArtikels(params);

        if (response.success) {
          console.log(
            "✅ Articles fetched successfully:",
            response.articles?.length || 0
          );
          const articlesData = response.articles || response.data || [];
          setArticles(articlesData);
        } else {
          console.error("❌ Failed to fetch articles:", response.message);
          throw new Error(response.message || "Gagal memuat artikel");
        }
      } catch (error: any) {
        console.error("🚨 Error fetching articles:", error);

        setArticles([]);

        if (!skipIfLoading) {
          let errorMessage = "Gagal memuat artikel";
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
        console.log("🏁 Articles fetch completed");
      }
    },
    [selectedCategory, searchQuery]
  );

  useEffect(() => {
    if (!isInitialized.current) {
      console.log("🚀 Initializing edukasi screen");
      isInitialized.current = true;
      fetchArticles(false);
    }
  }, []);

  useEffect(() => {
    if (isInitialized.current) {
      console.log("🔄 Filter changed, fetching new data");
      const timeoutId = setTimeout(() => {
        fetchArticles(false);
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (isInitialized.current && searchQuery !== "") {
      console.log("🔍 Search query changed, debouncing...");
      const timeoutId = setTimeout(() => {
        fetchArticles(false);
      }, 500);

      return () => clearTimeout(timeoutId);
    } else if (isInitialized.current && searchQuery === "") {
      fetchArticles(false);
    }
  }, [searchQuery]);

  const onRefresh = useCallback(async () => {
    if (refreshing || loadDataInProgress.current) {
      console.log("⏸️ Refresh already in progress");
      return;
    }

    setRefreshing(true);
    console.log("🔄 Manual refresh triggered");

    try {
      lastFetchParams.current = "";
      await fetchArticles(false);
    } catch (err) {
      console.error("❌ Error during refresh:", err);
    } finally {
      setRefreshing(false);
      console.log("✅ Manual refresh completed");
    }
  }, [fetchArticles]);

  const updatedCategories = categories.map((cat) => ({
    ...cat,
    count:
      cat.id === "all"
        ? articles.length
        : articles.filter((article) => article.kategori === cat.id).length,
  }));

  const filteredArticles = articles.filter((article) => {
    const matchesCategory =
      selectedCategory === "all" || article.kategori === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      article.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.konten_preview.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  function ThumbnailImage({
    source,
    style,
  }: {
    source: { uri: string | undefined };
    style: any;
  }) {
    const [imageError, setImageError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Tambahkan base URL jika URI relatif
    const imageUri = source.uri?.startsWith("http")
      ? source.uri
      : `http://103.84.208.182:8016${source.uri}`;

    if (imageError || !source.uri) {
      return (
        <View style={[style, styles.thumbnailPlaceholder]}>
          <Ionicons
            name="image-outline"
            size={24}
            color={BrandColors.gray[400]}
          />
        </View>
      );
    }

    return (
      <>
        <Image
          source={{ uri: imageUri }} // Gunakan imageUri yang sudah ditambahkan base URL
          style={style}
          onError={() => {
            console.log("🚨 Thumbnail failed to load:", imageUri);
            setImageError(true);
            setIsLoading(false);
          }}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          resizeMode="cover"
        />
        {isLoading && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(255, 255, 255, 0.8)",
            }}>
            <ActivityIndicator size="small" color={BrandColors.primary} />
          </View>
        )}
      </>
    );
  }

  const getCategoryBadgeClass = (kategori: string) => {
    switch (kategori) {
      case "Tips":
        return { backgroundColor: "#fef3c7", color: "#92400e" };
      case "Tutorial":
        return { backgroundColor: "#dbeafe", color: "#1e40af" };
      case "Infografis":
        return { backgroundColor: "#e9d5ff", color: "#7c3aed" };
      case "Berita":
        return { backgroundColor: "#d1fae5", color: "#065f46" };
      default:
        return {
          backgroundColor: BrandColors.gray[100],
          color: BrandColors.gray[800],
        };
    }
  };

  const getCategoryIcon = (kategori: string) => {
    switch (kategori) {
      case "Tips":
        return "bulb-outline";
      case "Tutorial":
        return "school-outline";
      case "Infografis":
        return "bar-chart-outline";
      case "Berita":
        return "newspaper-outline";
      default:
        return "document-text-outline";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const handleArticlePress = (article: Article) => {
    router.push(`/artikel/${article.slug}`);
  };

  if (loading && articles.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner} />
          <Text style={styles.loadingText}>Memuat artikel...</Text>
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
              <Text style={styles.headerTitle}>Edukasi & Kampanye</Text>
              <Text style={styles.headerSubtitle}>
                Tips dan panduan untuk kehidupan yang lebih hijau
              </Text>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Ionicons
                name="search-outline"
                size={20}
                color={BrandColors.gray[400]}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari artikel..."
                placeholderTextColor={BrandColors.gray[400]}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Filter Controls */}
          <View style={styles.filterContainer}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>
                {filteredArticles.length} Artikel
              </Text>
              <TouchableOpacity
                style={styles.filterToggle}
                onPress={() => setShowFilters(!showFilters)}>
                <Ionicons
                  name={showFilters ? "close" : "options-outline"}
                  size={20}
                  color={
                    showFilters ? BrandColors.primary : BrandColors.gray[600]
                  }
                />
              </TouchableOpacity>
            </View>

            {showFilters && (
              <View style={styles.categoryFilter}>
                {updatedCategories.map((category) => {
                  const iconName = category.icon as any;
                  return (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryButton,
                        selectedCategory === category.id &&
                          styles.categoryButtonActive,
                      ]}
                      onPress={() => setSelectedCategory(category.id)}>
                      <Ionicons
                        name={iconName}
                        size={16}
                        color={
                          selectedCategory === category.id
                            ? BrandColors.white
                            : category.color
                        }
                      />
                      <Text
                        style={[
                          styles.categoryText,
                          selectedCategory === category.id &&
                            styles.categoryTextActive,
                        ]}>
                        {category.name} ({category.count})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Articles List */}
          {filteredArticles.length > 0 ? (
            <View style={styles.articlesList}>
              {filteredArticles.map((article) => {
                const badgeStyle = getCategoryBadgeClass(article.kategori);
                const categoryIcon = getCategoryIcon(article.kategori);

                return (
                  <TouchableOpacity
                    key={article.id}
                    style={styles.articleCard}
                    onPress={() => handleArticlePress(article)}>
                    <View style={styles.articleRow}>
                      <View style={styles.thumbnailContainer}>
                        {article.gambar ? (
                          <View style={styles.thumbnailContainer}>
                            <ThumbnailImage
                              source={{ uri: article.gambar }}
                              style={styles.thumbnail}
                            />
                          </View>
                        ) : (
                          <View
                            style={[
                              styles.thumbnailContainer,
                              styles.thumbnailPlaceholder,
                            ]}>
                            <Ionicons
                              name="image-outline"
                              size={24}
                              color={BrandColors.gray[400]}
                            />
                          </View>
                        )}
                      </View>

                      {/* Content */}
                      <View style={styles.articleContent}>
                        <View style={styles.articleMeta}>
                          <View style={[styles.categoryBadge, badgeStyle]}>
                            <Text
                              style={[
                                styles.categoryBadgeText,
                                { color: badgeStyle.color },
                              ]}>
                              {article.kategori}
                            </Text>
                          </View>
                          <Ionicons
                            name="chevron-forward"
                            size={16}
                            color={BrandColors.gray[400]}
                          />
                        </View>

                        <Text style={styles.articleTitle} numberOfLines={2}>
                          {article.judul}
                        </Text>

                        <Text style={styles.articlePreview} numberOfLines={2}>
                          {article.konten_preview}
                        </Text>

                        <View style={styles.articleFooter}>
                          <Text style={styles.articleDate}>
                            {formatDate(article.created_at)}
                          </Text>
                          {article.author && (
                            <Text style={styles.articleAuthor}>
                              • {article.author}
                            </Text>
                          )}
                        </View>

                        {/* Tags */}
                        {article.tags && article.tags.length > 0 && (
                          <View style={styles.tagsContainer}>
                            {article.tags.slice(0, 3).map((tag, index) => (
                              <View key={index} style={styles.tag}>
                                <Text style={styles.tagText}>#{tag}</Text>
                              </View>
                            ))}
                            {article.tags.length > 3 && (
                              <Text style={styles.moreTagsText}>
                                +{article.tags.length - 3}
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={48}
                  color={BrandColors.gray[400]}
                />
              </View>
              <Text style={styles.emptyTitle}>Tidak Ada Artikel</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery || selectedCategory !== "all"
                  ? "Tidak ada artikel yang sesuai dengan pencarian atau filter Anda."
                  : "Belum ada artikel yang tersedia."}
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
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: BrandColors.gray[900],
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
    marginTop: -15,
    position: "relative",
    zIndex: 10,
  },
  filterContainer: {
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
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: BrandColors.gray[900],
  },
  filterToggle: {
    padding: 4,
  },
  categoryFilter: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: BrandColors.gray[100],
    gap: 6,
  },
  categoryButtonActive: {
    backgroundColor: BrandColors.primary,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "600",
    color: BrandColors.gray[700],
  },
  categoryTextActive: {
    color: BrandColors.white,
  },
  articlesList: {
    gap: 16,
  },
  articleCard: {
    backgroundColor: BrandColors.white,
    borderRadius: 15,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  articleRow: {
    flexDirection: "row",
    gap: 12,
  },
  thumbnailContainer: {
    width: 80,
    height: 80,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  thumbnailPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  articleContent: {
    flex: 1,
  },
  articleMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: BrandColors.gray[900],
    marginBottom: 8,
    lineHeight: 22,
  },
  articlePreview: {
    fontSize: 14,
    color: BrandColors.gray[600],
    marginBottom: 8,
    lineHeight: 20,
  },
  articleFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  articleDate: {
    fontSize: 12,
    color: BrandColors.gray[500],
  },
  articleAuthor: {
    fontSize: 12,
    color: BrandColors.gray[500],
    marginLeft: 4,
  },
  tagsContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    backgroundColor: BrandColors.gray[100],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 10,
    color: BrandColors.gray[600],
  },
  moreTagsText: {
    fontSize: 10,
    color: BrandColors.gray[500],
    fontStyle: "italic",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    backgroundColor: BrandColors.white,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyIcon: {
    backgroundColor: BrandColors.gray[100],
    borderRadius: 50,
    padding: 20,
    marginBottom: 20,
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
    marginBottom: 20,
    paddingHorizontal: 40,
  },
  resetButton: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  resetButtonText: {
    color: BrandColors.white,
    fontSize: 14,
    fontWeight: "600",
  },
});
