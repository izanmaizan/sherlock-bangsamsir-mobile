// hooks/useTabunganSampah.ts
import { useCallback, useEffect, useState } from "react";
import apiService from "../services/api";

interface TabunganTransaction {
  id: number;
  tanggal: string;
  total_nilai: number;
  total_berat: number;
  jenis_sampah: string;
  poin_earned: number;
  admin: string;
  keterangan: string;
  created_at: string;
  breakdown: Record<string, number>;
  details: {
    jenis: string;
    berat: number;
    nilai: number;
    harga_per_kg: number;
  }[];
}

interface TabunganStats {
  totalTransaksi: number;
  totalBerat: number;
  totalNilai: number;
  totalPoin: number;
  breakdown: Record<string, any>;
}

interface JenisSampah {
  id: number;
  nama_jenis: string;
  harga_per_kg: number;
  urutan: number;
}

interface TabunganFilter {
  month?: string;
  year?: string;
  date?: string;
  periode?: string;
  wasteType?: string;
}

interface UseTabunganSampahResult {
  transactions: TabunganTransaction[];
  stats: TabunganStats | null;
  jenisSampah: JenisSampah[];
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
  filter: TabunganFilter;
  setFilter: (filter: TabunganFilter) => void;
}

export function useTabunganSampah(
  initialFilter: TabunganFilter = {}
): UseTabunganSampahResult {
  const [transactions, setTransactions] = useState<TabunganTransaction[]>([]);
  const [stats, setStats] = useState<TabunganStats | null>(null);
  const [jenisSampah, setJenisSampah] = useState<JenisSampah[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TabunganFilter>(initialFilter);
  const [hasMore] = useState(false); // For future pagination implementation

  const fetchTabunganData = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        console.log("📊 Fetching tabungan data with filter:", filter);
        const response = await apiService.getTabunganHistory(filter);

        if (response.success) {
          setTransactions(response.riwayat || []);
          setStats(response.stats || null);
          setJenisSampah(response.jenis_sampah || []);

          console.log("✅ Tabungan data loaded:", {
            transactions: response.riwayat?.length || 0,
            stats: response.stats,
          });
        } else {
          throw new Error(response.message || "Failed to fetch tabungan data");
        }
      } catch (err: any) {
        console.error("❌ Error fetching tabungan data:", err);
        setError(err.message || "Gagal memuat data tabungan");

        // Set mock data on error for development
        setTransactions([
          {
            id: 1,
            tanggal: "2025-01-20",
            total_nilai: 25000,
            total_berat: 12.5,
            jenis_sampah: "Botol Plastik, Kardus",
            poin_earned: 25,
            admin: "Administrator",
            keterangan: "Transaksi reguler",
            created_at: "2025-01-20T10:30:00.000Z",
            breakdown: {
              botol_plastik: 5.5,
              kardus: 7.0,
              kertas: 0,
              besi: 0,
              botol_infus: 0,
              lain_lain: 0,
            },
            details: [
              {
                jenis: "Botol Plastik",
                berat: 5.5,
                nilai: 11000,
                harga_per_kg: 2000,
              },
              {
                jenis: "Kardus",
                berat: 7.0,
                nilai: 14000,
                harga_per_kg: 2000,
              },
            ],
          },
          {
            id: 2,
            tanggal: "2025-01-19",
            total_nilai: 18000,
            total_berat: 9.0,
            jenis_sampah: "Kertas, Besi",
            poin_earned: 18,
            admin: "Administrator",
            keterangan: "Sampah kantor",
            created_at: "2025-01-19T14:15:00.000Z",
            breakdown: {
              botol_plastik: 0,
              kardus: 0,
              kertas: 3.0,
              besi: 6.0,
              botol_infus: 0,
              lain_lain: 0,
            },
            details: [
              {
                jenis: "Kertas",
                berat: 3.0,
                nilai: 3000,
                harga_per_kg: 1000,
              },
              {
                jenis: "Besi",
                berat: 6.0,
                nilai: 15000,
                harga_per_kg: 2500,
              },
            ],
          },
        ]);

        setStats({
          totalTransaksi: 17,
          totalBerat: 528.4,
          totalNilai: 590300,
          totalPoin: 590,
          breakdown: {},
        });

        setJenisSampah([
          { id: 1, nama_jenis: "Botol Plastik", harga_per_kg: 2000, urutan: 1 },
          { id: 2, nama_jenis: "Kardus", harga_per_kg: 1500, urutan: 2 },
          { id: 3, nama_jenis: "Kertas", harga_per_kg: 1000, urutan: 3 },
          { id: 4, nama_jenis: "Besi", harga_per_kg: 2500, urutan: 4 },
        ]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filter]
  );

  // Initial load
  useEffect(() => {
    fetchTabunganData();
  }, [fetchTabunganData]);

  const refresh = useCallback(async () => {
    await fetchTabunganData(true);
  }, [fetchTabunganData]);

  const loadMore = useCallback(async () => {
    // Placeholder for pagination implementation
    console.log("📄 Load more requested (not implemented yet)");
  }, []);

  const updateFilter = useCallback((newFilter: TabunganFilter) => {
    setFilter(newFilter);
  }, []);

  return {
    transactions,
    stats,
    jenisSampah,
    loading,
    error,
    refreshing,
    refresh,
    loadMore,
    hasMore,
    filter,
    setFilter: updateFilter,
  };
}
