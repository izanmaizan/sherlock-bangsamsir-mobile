// app/artikel/[slug].tsx - Updated with fixed image display
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandColors } from "../../constants/Colors";
import apiService from "../../services/api";

const { width: screenWidth } = Dimensions.get("window");

interface Article {
  id: number;
  judul: string;
  slug: string;
  konten: string;
  gambar?: string;
  kategori: string;
  tags: string[];
  created_at: string;
  author?: string;
}

// Image component with error handling
function ArticleImage({
  source,
  style,
  alt,
}: {
  source: { uri: string };
  style: any;
  alt: string;
}) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (imageError || !source.uri) {
    return (
      <View style={[style, styles.imagePlaceholder]}>
        <Ionicons
          name="image-outline"
          size={48}
          color={BrandColors.gray[400]}
        />
        <Text style={styles.imagePlaceholderText}>
          Gambar tidak dapat dimuat
        </Text>
      </View>
    );
  }

  return (
    <View style={style}>
      <Image
        source={source}
        style={[style, { backgroundColor: BrandColors.gray[100] }]}
        onError={() => {
          console.log("Image failed to load:", source.uri);
          setImageError(true);
          setIsLoading(false);
        }}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        resizeMode="cover"
      />
      {isLoading && (
        <View style={styles.imageLoadingOverlay}>
          <View style={styles.loadingSpinner} />
        </View>
      )}
    </View>
  );
}

export default function ArtikelDetailScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const articleSlug = slug as string;

  // Refs untuk prevent multiple simultaneous calls
  const loadDataInProgress = useRef(false);
  const isInitialized = useRef(false);
  const currentSlug = useRef<string>("");

  // Fetch article details from API
  const fetchArticleDetails = useCallback(
    async (skipIfLoading = true) => {
      // Prevent multiple simultaneous calls for same article
      if (
        skipIfLoading &&
        (loadDataInProgress.current || currentSlug.current === articleSlug)
      ) {
        console.log(
          "⏸️ Article detail loading already in progress or same article, skipping..."
        );
        return;
      }

      if (!articleSlug) {
        console.log("⏸️ No article slug provided");
        setLoading(false);
        return;
      }

      loadDataInProgress.current = true;
      currentSlug.current = articleSlug;

      try {
        console.log(`📰 Fetching article details for slug: ${articleSlug}`);
        const response = await apiService.getArtikelBySlug(articleSlug);

        if (response.success) {
          console.log("✅ Article details fetched successfully");

          // Handle different response structures
          const articleData = response.article || response.data;
          const relatedData =
            response.relatedArticles || response.related || [];

          if (articleData) {
            setArticle(articleData);
            setRelatedArticles(relatedData);
          } else {
            console.warn("⚠️ Article data not found in response");
            setArticle(null);
          }
        } else {
          console.error(
            "❌ Failed to fetch article details:",
            response.message
          );
          throw new Error(response.message || "Gagal memuat detail artikel");
        }
      } catch (error: any) {
        console.error("🚨 Error fetching article details:", error);

        // Set article to null instead of showing alert repeatedly
        setArticle(null);

        // Only show alert on manual actions, not automatic loads
        if (!skipIfLoading) {
          let errorMessage = "Gagal memuat detail artikel";
          if (error?.message?.includes("timeout")) {
            errorMessage = "Koneksi timeout, periksa jaringan Anda";
          } else if (error?.message?.includes("Network")) {
            errorMessage = "Tidak dapat terhubung ke server";
          } else if (error?.status === 404) {
            errorMessage = "Artikel tidak ditemukan";
          }

          Alert.alert("Error", errorMessage);
        }
      } finally {
        loadDataInProgress.current = false;
        setLoading(false);
        setRefreshing(false);
        console.log("🏁 Article detail fetch completed");
      }
    },
    [articleSlug]
  );

  // Initialize data only once when slug changes
  useEffect(() => {
    if (
      articleSlug &&
      (!isInitialized.current || currentSlug.current !== articleSlug)
    ) {
      console.log("🚀 Initializing article detail screen for:", articleSlug);
      isInitialized.current = true;
      setLoading(true);
      setArticle(null); // Clear previous article
      setRelatedArticles([]); // Clear related articles
      fetchArticleDetails(false); // Don't skip on initialization
    }
  }, [articleSlug, fetchArticleDetails]);

  // Manual refresh handler
  const onRefresh = useCallback(() => {
    if (refreshing || loadDataInProgress.current) {
      console.log("⏸️ Refresh already in progress");
      return;
    }

    setRefreshing(true);
    console.log("🔄 Manual refresh triggered");

    // Reset current slug to force fresh fetch
    currentSlug.current = "";
    fetchArticleDetails(false);
  }, [fetchArticleDetails]);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Get category color
  const getCategoryColor = (kategori: string) => {
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

  // Get category icon
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

  // Handle share
  const handleShare = async () => {
    if (!article) return;

    try {
      await Share.share({
        message: `Baca artikel menarik: ${article.judul}`,
        title: article.judul,
      });
    } catch (error) {
      console.log("Error sharing article:", error);
      Alert.alert("Error", "Gagal membagikan artikel");
    }
  };

  // Clean HTML content for display
  const cleanHtmlContent = (htmlContent: string): string => {
    return htmlContent
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<p[^>]*>/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n\n+/g, "\n\n")
      .trim();
  };

  // Process image URL to ensure it's valid
  const processImageUrl = (imageUrl?: string): string | null => {
    if (!imageUrl) return null;

    // If it's already a full URL, return as is
    if (imageUrl.startsWith("http")) {
      return imageUrl;
    }

    // If it starts with /, assume it's from the same domain
    if (imageUrl.startsWith("/")) {
      // You might need to replace this with your actual domain
      return `http://103.84.208.182:8016${imageUrl}`;
    }

    // Otherwise, assume relative path from API
    return `http://103.84.208.182:8016/storage/${imageUrl}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner} />
          <Text style={styles.loadingText}>Memuat artikel...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!article) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons
            name="document-outline"
            size={64}
            color={BrandColors.gray[400]}
          />
          <Text style={styles.errorTitle}>Artikel Tidak Ditemukan</Text>
          <Text style={styles.errorSubtitle}>
            Artikel yang Anda cari tidak dapat ditemukan.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Kembali</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const processedImageUrl = processImageUrl(article.gambar);

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
            {/* Navigation and Share */}
            <View style={styles.headerNav}>
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => router.back()}>
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color={BrandColors.white}
                />
              </TouchableOpacity>

              <TouchableOpacity style={styles.navButton} onPress={handleShare}>
                <Ionicons
                  name="share-outline"
                  size={24}
                  color={BrandColors.white}
                />
              </TouchableOpacity>
            </View>

            {/* Article Meta */}
            <View style={styles.articleMeta}>
              <View
                style={[
                  styles.categoryBadge,
                  getCategoryColor(article.kategori),
                ]}>
                <Text
                  style={[
                    styles.categoryText,
                    { color: getCategoryColor(article.kategori).color },
                  ]}>
                  {article.kategori}
                </Text>
              </View>

              <Text style={styles.articleTitle} numberOfLines={3}>
                {article.judul}
              </Text>

              <Text style={styles.articleMetaText}>
                {formatDate(article.created_at)}
                {article.author && ` • Oleh ${article.author}`}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Featured Image */}
          {processedImageUrl && (
            <View style={styles.imageContainer}>
              <ArticleImage
                source={{ uri: processedImageUrl }}
                style={styles.featuredImage}
                alt={article.judul}
              />
            </View>
          )}

          {/* Article Content */}
          <View style={styles.articleContent}>
            <View style={styles.htmlContent}>
              <Text style={styles.contentText}>
                {cleanHtmlContent(article.konten)}
              </Text>
            </View>
          </View>

          {/* Tags */}
          {article.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              <View style={styles.tagsHeader}>
                <Ionicons
                  name="pricetag-outline"
                  size={20}
                  color={BrandColors.gray[600]}
                />
                <Text style={styles.tagsTitle}>Tags</Text>
              </View>
              <View style={styles.tagsList}>
                {article.tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Related Articles */}
          {relatedArticles.length > 0 && (
            <View style={styles.relatedContainer}>
              <Text style={styles.relatedTitle}>Artikel Terkait</Text>
              <View style={styles.relatedList}>
                {relatedArticles.map((relatedArticle) => {
                  const categoryColor = getCategoryColor(
                    relatedArticle.kategori
                  );
                  const categoryIcon = getCategoryIcon(relatedArticle.kategori);
                  const relatedImageUrl = processImageUrl(
                    relatedArticle.gambar
                  );

                  return (
                    <TouchableOpacity
                      key={relatedArticle.id}
                      style={styles.relatedItem}
                      onPress={() =>
                        router.push(`/artikel/${relatedArticle.slug}`)
                      }>
                      <View style={styles.relatedItemContent}>
                        {/* Related article thumbnail */}
                        <View style={styles.relatedThumbnailContainer}>
                          {relatedImageUrl ? (
                            <ArticleImage
                              source={{ uri: relatedImageUrl }}
                              style={styles.relatedThumbnail}
                              alt={relatedArticle.judul}
                            />
                          ) : (
                            <View
                              style={[
                                styles.relatedThumbnailPlaceholder,
                                categoryColor,
                              ]}>
                              <Ionicons
                                name={categoryIcon as any}
                                size={20}
                                color={categoryColor.color}
                              />
                            </View>
                          )}
                        </View>

                        <View style={styles.relatedItemText}>
                          <View
                            style={[
                              styles.relatedCategoryBadge,
                              categoryColor,
                            ]}>
                            <Text
                              style={[
                                styles.relatedCategoryText,
                                { color: categoryColor.color },
                              ]}>
                              {relatedArticle.kategori}
                            </Text>
                          </View>
                          <Text
                            style={styles.relatedItemTitle}
                            numberOfLines={2}>
                            {relatedArticle.judul}
                          </Text>
                          <Text style={styles.relatedItemDate}>
                            {formatDate(relatedArticle.created_at)}
                            {relatedArticle.author &&
                              ` • ${relatedArticle.author}`}
                          </Text>
                        </View>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={BrandColors.gray[400]}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={styles.seeAllButton}
                onPress={() => router.push("/edukasi")}>
                <Text style={styles.seeAllButtonText}>Lihat Semua Artikel</Text>
              </TouchableOpacity>
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
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: BrandColors.gray[900],
    marginTop: 20,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    color: BrandColors.gray[600],
    textAlign: "center",
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: BrandColors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  headerGradient: {
    paddingBottom: 30,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  headerNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  navButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    padding: 8,
  },
  articleMeta: {
    alignItems: "center",
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "600",
  },
  articleTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: BrandColors.white,
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 28,
  },
  articleMetaText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
    marginTop: -15,
    position: "relative",
    zIndex: 10,
  },
  imageContainer: {
    backgroundColor: BrandColors.white,
    borderRadius: 15,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  featuredImage: {
    width: "100%",
    height: 200,
  },
  imagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BrandColors.gray[100],
    padding: 20,
  },
  imagePlaceholderText: {
    fontSize: 12,
    color: BrandColors.gray[500],
    marginTop: 8,
    textAlign: "center",
  },
  imageLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  articleContent: {
    backgroundColor: BrandColors.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  htmlContent: {
    marginBottom: 16,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    color: BrandColors.gray[800],
  },
  tagsContainer: {
    backgroundColor: BrandColors.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tagsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  tagsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: BrandColors.gray[900],
  },
  tagsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    backgroundColor: BrandColors.gray[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 14,
    color: BrandColors.gray[700],
  },
  relatedContainer: {
    backgroundColor: BrandColors.white,
    borderRadius: 15,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  relatedTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: BrandColors.gray[900],
    marginBottom: 16,
  },
  relatedList: {
    gap: 12,
    marginBottom: 16,
  },
  relatedItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: BrandColors.gray[50],
    borderRadius: 12,
    gap: 12,
  },
  relatedItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  relatedThumbnailContainer: {
    width: 60,
    height: 60,
  },
  relatedThumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  relatedThumbnailPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  relatedItemText: {
    flex: 1,
  },
  relatedCategoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  relatedCategoryText: {
    fontSize: 10,
    fontWeight: "600",
  },
  relatedItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: BrandColors.gray[900],
    marginBottom: 4,
    lineHeight: 18,
  },
  relatedItemDate: {
    fontSize: 12,
    color: BrandColors.gray[500],
  },
  seeAllButton: {
    backgroundColor: BrandColors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  seeAllButtonText: {
    color: BrandColors.white,
    fontSize: 16,
    fontWeight: "600",
  },
});
