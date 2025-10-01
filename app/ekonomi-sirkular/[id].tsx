// app/ekonomi-sirkular/[id].tsx - UPDATED: Added embedded YouTube player
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { BrandColors } from "../../constants/Colors";
import apiService from "../../services/api";

const { width: screenWidth } = Dimensions.get("window");

interface Video {
  id: number;
  judul: string;
  deskripsi: string;
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
    username: string;
  };
}

// Extract YouTube video ID for embed
function extractYouTubeVideoId(url: string): string | null {
  const regex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// YouTube Video Player Component
function YouTubePlayer({
  video,
  onError,
}: {
  video: Video;
  onError?: () => void;
}) {
  const [showWebView, setShowWebView] = useState(false);
  const [webViewError, setWebViewError] = useState(false);
  const videoId = extractYouTubeVideoId(video.video_url);

  if (!videoId) {
    return (
      <View style={styles.playerContainer}>
        <View style={styles.errorContainer}>
          <Ionicons
            name="play-circle-outline"
            size={48}
            color={BrandColors.gray[400]}
          />
          <Text style={styles.errorText}>Video tidak dapat dimuat</Text>
          <TouchableOpacity
            style={styles.openExternalButton}
            onPress={() => {
              Alert.alert(
                "Buka Video",
                "Video akan dibuka di aplikasi YouTube atau browser",
                [
                  { text: "Batal", style: "cancel" },
                  {
                    text: "Buka",
                    onPress: () => {
                      const { Linking } = require("expo-linking");
                      Linking.openURL(video.video_url).catch(() => {
                        Alert.alert("Error", "Tidak dapat membuka video");
                      });
                    },
                  },
                ]
              );
            }}>
            <Text style={styles.openExternalText}>Buka di YouTube</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (webViewError || !showWebView) {
    return (
      <TouchableOpacity
        style={styles.playerContainer}
        onPress={() => {
          if (webViewError) {
            // If webview failed, open external
            Alert.alert(
              "Buka Video",
              "Player internal gagal dimuat. Video akan dibuka di aplikasi YouTube atau browser",
              [
                { text: "Batal", style: "cancel" },
                {
                  text: "Buka",
                  onPress: () => {
                    const { Linking } = require("expo-linking");
                    Linking.openURL(video.video_url).catch(() => {
                      Alert.alert("Error", "Tidak dapat membuka video");
                    });
                  },
                },
              ]
            );
          } else {
            setShowWebView(true);
          }
        }}>
        <Image
          source={{
            uri:
              video.thumbnail ||
              `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          }}
          style={styles.thumbnailImage}
        />
        <View style={styles.playOverlay}>
          <View style={styles.playButton}>
            <Ionicons name="play" size={32} color={BrandColors.white} />
          </View>
        </View>
        {video.durasi && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{video.durasi}</Text>
          </View>
        )}
        {!webViewError && (
          <View style={styles.tapToPlayHint}>
            <Text style={styles.tapToPlayText}>Ketuk untuk memutar video</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&showinfo=0&modestbranding=1&fs=1`;

  return (
    <View style={styles.playerContainer}>
      <WebView
        source={{ uri: embedUrl }}
        style={styles.webView}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingSpinner} />
            <Text style={styles.loadingText}>Memuat video...</Text>
          </View>
        )}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.log("WebView error: ", nativeEvent);
          setWebViewError(true);
          onError?.();
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.log("WebView HTTP error: ", nativeEvent);
          setWebViewError(true);
          onError?.();
        }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="compatibility"
      />
    </View>
  );
}

export default function VideoDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [video, setVideo] = useState<Video | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const videoId = id as string;

  // CRITICAL: Refs untuk prevent multiple simultaneous calls
  const loadDataInProgress = useRef(false);
  const isInitialized = useRef(false);
  const currentVideoId = useRef<string>("");

  // FIXED: Single consolidated fetch function dengan debouncing
  const fetchVideoDetails = useCallback(
    async (skipIfLoading = true) => {
      // Prevent multiple simultaneous calls for same video
      if (
        skipIfLoading &&
        (loadDataInProgress.current || currentVideoId.current === videoId)
      ) {
        console.log(
          "⏸️ Video detail loading already in progress or same video, skipping..."
        );
        return;
      }

      if (!videoId) {
        console.log("⏸️ No video ID provided");
        setLoading(false);
        return;
      }

      loadDataInProgress.current = true;
      currentVideoId.current = videoId;

      try {
        console.log(`🎥 Fetching video details for ID: ${videoId}`);

        const response = await apiService.getVideoById(videoId);

        if (response.success) {
          console.log("✅ Video details fetched successfully");

          // Handle different response structures
          const videoData = response.video || response.data;
          const relatedData = response.relatedVideos || response.related || [];

          if (videoData) {
            setVideo(videoData);
            setRelatedVideos(relatedData);
          } else {
            console.warn("⚠️ Video data not found in response");
            setVideo(null);
          }
        } else {
          console.error("❌ Failed to fetch video details:", response.message);
          throw new Error(response.message || "Gagal memuat detail video");
        }
      } catch (error: any) {
        console.error("🚨 Error fetching video details:", error);

        // Set video to null instead of showing alert repeatedly
        setVideo(null);

        // Only show alert on manual actions, not automatic loads
        if (!skipIfLoading) {
          let errorMessage = "Gagal memuat detail video";
          if (error?.message?.includes("timeout")) {
            errorMessage = "Koneksi timeout, periksa jaringan Anda";
          } else if (error?.message?.includes("Network")) {
            errorMessage = "Tidak dapat terhubung ke server";
          } else if (error?.status === 404) {
            errorMessage = "Video tidak ditemukan";
          }
          Alert.alert("Error", errorMessage);
        }
      } finally {
        loadDataInProgress.current = false;
        setLoading(false);
        setRefreshing(false);
        console.log("🏁 Video detail fetch completed");
      }
    },
    [videoId]
  );

  // FIXED: Initialize data only once when videoId changes
  useEffect(() => {
    if (
      videoId &&
      (!isInitialized.current || currentVideoId.current !== videoId)
    ) {
      console.log("🚀 Initializing video detail screen for:", videoId);
      isInitialized.current = true;
      setLoading(true);
      setVideo(null); // Clear previous video
      setRelatedVideos([]); // Clear related videos
      fetchVideoDetails(false); // Don't skip on initialization
    }
  }, [videoId, fetchVideoDetails]);

  // FIXED: Manual refresh handler
  const onRefresh = useCallback(() => {
    if (refreshing || loadDataInProgress.current) {
      console.log("⏸️ Refresh already in progress");
      return;
    }

    setRefreshing(true);
    console.log("🔄 Manual refresh triggered");

    // Reset current video ID to force fresh fetch
    currentVideoId.current = "";
    fetchVideoDetails(false);
  }, [fetchVideoDetails]);

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
      case "Infografis":
        return { bg: "#e0e7ff", text: "#3730a3" };
      default:
        return { bg: "#f3f4f6", text: "#374151" };
    }
  };

  // Format views
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
      month: "long",
      year: "numeric",
    });
  };

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

  // Handle share
  const handleShare = async () => {
    if (!video) return;

    try {
      await Share.share({
        message: `Tonton video menarik: ${video.judul}\n\n${video.video_url}`,
        title: video.judul,
        url: video.video_url,
      });
    } catch (error) {
      console.log("Error sharing video:", error);
      Alert.alert("Error", "Gagal membagikan video");
    }
  };

  // Handle related video press
  const handleRelatedVideoPress = (videoId: number) => {
    router.push(`/ekonomi-sirkular/${videoId}`);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner} />
          <Text style={styles.loadingText}>Memuat video...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!video) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons
            name="videocam-off"
            size={64}
            color={BrandColors.gray[400]}
          />
          <Text style={styles.errorTitle}>Video Tidak Ditemukan</Text>
          <Text style={styles.errorDescription}>
            Video yang Anda cari tidak dapat ditemukan.
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
        {/* Header */}
        <LinearGradient
          colors={[BrandColors.primary, BrandColors.secondary]}
          style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => router.back()}>
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color={BrandColors.white}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleShare}>
                <Ionicons
                  name="share-outline"
                  size={24}
                  color={BrandColors.white}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.headerInfo}>
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: getCategoryColor(video.kategori).bg },
                ]}>
                <Text
                  style={[
                    styles.categoryBadgeText,
                    { color: getCategoryColor(video.kategori).text },
                  ]}>
                  {video.kategori}
                </Text>
              </View>

              <Text style={styles.videoTitle} numberOfLines={2}>
                {video.judul}
              </Text>

              <View style={styles.videoMeta}>
                <Text style={styles.videoMetaText}>
                  {formatViews(video.views)} views •{" "}
                  {formatDate(video.created_at)}
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Video Player Section */}
        <View style={styles.videoSection}>
          <YouTubePlayer
            video={video}
            onError={() => {
              Alert.alert(
                "Error",
                "Gagal memuat video player. Anda dapat membuka video di aplikasi YouTube.",
                [{ text: "OK", style: "default" }]
              );
            }}
          />
        </View>

        {/* Video Details */}
        <View style={styles.detailsSection}>
          <View style={styles.videoInfo}>
            <View style={styles.infoHeader}>
              <Ionicons
                name="calendar-outline"
                size={16}
                color={BrandColors.gray[500]}
              />
              <Text style={styles.infoText}>
                {formatDate(video.created_at)}
              </Text>

              <Ionicons
                name="time-outline"
                size={16}
                color={BrandColors.gray[500]}
                style={{ marginLeft: 16 }}
              />
              <Text style={styles.infoText}>{video.durasi || "Video"}</Text>

              <Ionicons
                name="eye-outline"
                size={16}
                color={BrandColors.gray[500]}
                style={{ marginLeft: 16 }}
              />
              <Text style={styles.infoText}>{formatViews(video.views)}</Text>
            </View>

            <Text style={styles.videoDescription}>{video.deskripsi}</Text>

            {video.creator && (
              <View style={styles.creatorInfo}>
                <Ionicons
                  name="person-circle-outline"
                  size={24}
                  color={BrandColors.primary}
                />
                <View style={styles.creatorText}>
                  <Text style={styles.creatorName}>Dibuat oleh</Text>
                  <Text style={styles.creatorNameValue}>
                    {video.creator.nama_lengkap}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Tags */}
          {video.tags && video.tags.length > 0 && (
            <View style={styles.tagsSection}>
              <View style={styles.tagsHeader}>
                <Ionicons
                  name="pricetag-outline"
                  size={18}
                  color={BrandColors.primary}
                />
                <Text style={styles.tagsTitle}>Tags</Text>
              </View>
              <View style={styles.tagsContainer}>
                {video.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Related Videos */}
        {relatedVideos.length > 0 && (
          <View style={styles.relatedSection}>
            <Text style={styles.relatedTitle}>Video Terkait</Text>

            <View style={styles.relatedVideos}>
              {relatedVideos.map((relatedVideo) => (
                <TouchableOpacity
                  key={relatedVideo.id}
                  style={styles.relatedVideoCard}
                  onPress={() => handleRelatedVideoPress(relatedVideo.id)}>
                  <View style={styles.relatedThumbnail}>
                    <Image
                      source={{ uri: getVideoThumbnail(relatedVideo) }}
                      style={styles.relatedThumbnailImage}
                    />
                    <View style={styles.relatedPlayOverlay}>
                      <Ionicons
                        name="play"
                        size={12}
                        color={BrandColors.white}
                      />
                    </View>
                    <View style={styles.relatedDurationBadge}>
                      <Text style={styles.relatedDurationText}>
                        {relatedVideo.durasi || "Video"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.relatedContent}>
                    <View
                      style={[
                        styles.relatedCategoryBadge,
                        {
                          backgroundColor: getCategoryColor(
                            relatedVideo.kategori
                          ).bg,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.relatedCategoryText,
                          {
                            color: getCategoryColor(relatedVideo.kategori).text,
                          },
                        ]}>
                        {relatedVideo.kategori}
                      </Text>
                    </View>

                    <Text style={styles.relatedVideoTitle} numberOfLines={2}>
                      {relatedVideo.judul}
                    </Text>

                    <View style={styles.relatedVideoMeta}>
                      <Ionicons
                        name="eye"
                        size={12}
                        color={BrandColors.gray[500]}
                      />
                      <Text style={styles.relatedMetaText}>
                        {formatViews(relatedVideo.views)}
                      </Text>
                      <Text style={styles.relatedMetaDivider}>•</Text>
                      <Text style={styles.relatedMetaText}>
                        {formatDate(relatedVideo.created_at)}
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={BrandColors.gray[400]}
                      style={styles.relatedArrow}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => router.push("/ekonomi-sirkular")}>
              <Text style={styles.viewAllButtonText}>Lihat Semua Video</Text>
            </TouchableOpacity>
          </View>
        )}
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
    marginTop: 16,
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 16,
    color: BrandColors.gray[600],
    textAlign: "center",
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    color: BrandColors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    paddingBottom: 20,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    padding: 8,
  },
  headerInfo: {
    alignItems: "center",
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  videoTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: BrandColors.white,
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 26,
  },
  videoMeta: {
    alignItems: "center",
  },
  videoMetaText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
  },
  videoSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 20,
  },
  playerContainer: {
    position: "relative",
    aspectRatio: 16 / 9,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: BrandColors.gray[200],
  },
  webView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  playOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  durationBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  durationText: {
    fontSize: 12,
    color: BrandColors.white,
    fontWeight: "600",
  },
  tapToPlayHint: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tapToPlayText: {
    fontSize: 12,
    color: BrandColors.white,
    fontWeight: "600",
  },
  openExternalButton: {
    backgroundColor: "#ff0000",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 12,
  },
  openExternalText: {
    color: BrandColors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 16,
    color: BrandColors.gray[600],
    textAlign: "center",
    marginTop: 12,
  },
  detailsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  videoInfo: {
    backgroundColor: BrandColors.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  infoText: {
    fontSize: 12,
    color: BrandColors.gray[600],
    marginLeft: 4,
  },
  videoDescription: {
    fontSize: 15,
    color: BrandColors.gray[700],
    lineHeight: 22,
    marginBottom: 15,
  },
  creatorInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: BrandColors.gray[200],
  },
  creatorText: {
    marginLeft: 12,
  },
  creatorName: {
    fontSize: 12,
    color: BrandColors.gray[600],
  },
  creatorNameValue: {
    fontSize: 14,
    fontWeight: "600",
    color: BrandColors.gray[900],
  },
  tagsSection: {
    backgroundColor: BrandColors.white,
    borderRadius: 15,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tagsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  tagsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: BrandColors.gray[900],
    marginLeft: 8,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    backgroundColor: BrandColors.gray[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BrandColors.gray[200],
  },
  tagText: {
    fontSize: 13,
    color: BrandColors.gray[700],
    fontWeight: "500",
  },
  relatedSection: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  relatedTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: BrandColors.gray[900],
    marginBottom: 15,
  },
  relatedVideos: {
    gap: 12,
  },
  relatedVideoCard: {
    flexDirection: "row",
    backgroundColor: BrandColors.white,
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  relatedThumbnail: {
    position: "relative",
    width: 100,
    height: 60,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: BrandColors.gray[200],
    marginRight: 12,
  },
  relatedThumbnailImage: {
    width: "100%",
    height: "100%",
  },
  relatedPlayOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -8 }, { translateY: -8 }],
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  relatedDurationBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  relatedDurationText: {
    fontSize: 8,
    color: BrandColors.white,
    fontWeight: "600",
  },
  relatedContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  relatedCategoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  relatedCategoryText: {
    fontSize: 10,
    fontWeight: "600",
  },
  relatedVideoTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: BrandColors.gray[900],
    lineHeight: 17,
    marginBottom: 6,
  },
  relatedVideoMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  relatedMetaText: {
    fontSize: 10,
    color: BrandColors.gray[500],
    marginLeft: 3,
  },
  relatedMetaDivider: {
    fontSize: 10,
    color: BrandColors.gray[500],
    marginHorizontal: 6,
  },
  relatedArrow: {
    position: "absolute",
    right: 0,
    top: "50%",
    transform: [{ translateY: -8 }],
  },
  viewAllButton: {
    backgroundColor: BrandColors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  viewAllButtonText: {
    color: BrandColors.white,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
