import { useState, useEffect, useRef, useCallback } from "react";
import type { Connection } from "agora-chat";
import axios from "axios";
import config from "../../common/config.ts";

export interface Summary {
  id: number;
  summary: string;
  createdAt: string; // ISO date string
  timestamp: number; // Parsed timestamp for easier use
}

interface UseChatSummaryOptions {
  chatClient: Connection | null; // Kept for API compatibility but not used
  peerId: string | null;
  userId: string;
  enabled?: boolean;
  pollInterval?: number; // Polling interval in milliseconds (default: 600000 = 10 minutes)
}

export function useChatSummary({
  chatClient: _chatClient, // Unused but kept for API compatibility
  peerId,
  userId,
  enabled = true,
  pollInterval = 600000, // 10 minutes default (10 * 60 * 1000)
}: UseChatSummaryOptions): {
  summaries: Summary[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const summariesRef = useRef<Summary[]>([]);
  const seenIdsRef = useRef<Set<number>>(new Set());

  // Keep summariesRef in sync with summaries state
  useEffect(() => {
    summariesRef.current = summaries;
  }, [summaries]);

  // Fetch latest summary from API
  const fetchLatestSummary = useCallback(async (): Promise<void> => {
    console.log("[Chat Summary] fetchLatestSummary called:", {
      peerId,
      userId,
      enabled,
      willFetch: !!(peerId && enabled),
    });

    if (!peerId || !enabled) {
      console.log(
        "[Chat Summary] Skipping fetch - missing peerId or disabled:",
        {
          peerId,
          enabled,
        }
      );
      setSummaries([]);
      return;
    }

    // Don't set loading on subsequent polls to avoid UI flicker
    if (summariesRef.current.length === 0) {
      setIsLoading(true);
      console.log(
        "[Chat Summary] Setting isLoading to true (no summaries yet)"
      );
    }
    setError(null);

    // Use config API endpoint for summary
    const summaryUrl = config.api.latestSummary;
    const params = {
      peerId: peerId,
      userId: userId,
    };

    try {
      console.log("[Chat Summary] Fetching summary from API:", {
        url: summaryUrl,
        params: params,
        timestamp: new Date().toISOString(),
      });

      const response = await axios.get(summaryUrl, {
        params: params,
      });

      const data = response.data;

      console.log("[Chat Summary] API Response received:", {
        status: response.status,
        data: data,
        timestamp: new Date().toISOString(),
      });

      console.log("[Chat Summary] Response data structure:", {
        hasData: !!data,
        dataKeys: data ? Object.keys(data) : [],
        hasSummary: !!(data && data.summary),
        summaryType: data?.summary ? typeof data.summary : "N/A",
        summaryLength: data?.summary ? String(data.summary).length : 0,
        fullData: data,
      });

      if (data && data.summary) {
        const createdAt = new Date(data.createdAt);
        const summaryData: Summary = {
          id: data.id,
          summary: data.summary,
          createdAt: data.createdAt,
          timestamp: createdAt.getTime(),
        };

        console.log("[Chat Summary] Summary data processed:", {
          id: summaryData.id,
          summaryLength: summaryData.summary.length,
          summaryPreview: summaryData.summary.substring(0, 100) + "...",
          createdAt: summaryData.createdAt,
          timestamp: summaryData.timestamp,
        });

        // Add summary to array if it's new (by ID)
        setSummaries((prevSummaries) => {
          // Check if this summary ID already exists
          const exists = prevSummaries.some((s) => s.id === summaryData.id);
          if (exists) {
            console.log(
              "[Chat Summary] Summary already exists, skipping:",
              summaryData.id
            );
            return prevSummaries;
          }

          // Add new summary and sort by timestamp (newest first)
          const newSummaries = [summaryData, ...prevSummaries].sort(
            (a, b) => b.timestamp - a.timestamp
          );
          summariesRef.current = newSummaries;
          seenIdsRef.current.add(summaryData.id);
          console.log(
            "[Chat Summary] Summary added to list. Total summaries:",
            newSummaries.length
          );
          return newSummaries;
        });

        setIsLoading(false);
        console.log("[Chat Summary] Summary added, isLoading set to false");
      } else {
        console.log("[Chat Summary] No summary data in response:", {
          data: data,
          hasData: !!data,
          hasSummary: !!(data && data.summary),
          dataType: typeof data,
          dataKeys: data ? Object.keys(data) : [],
        });
        setIsLoading(false);
      }
    } catch (err: any) {
      // Don't show error for 404 or empty responses
      if (err?.response?.status === 404) {
        console.log("[Chat Summary] No summary found (404):", {
          url: summaryUrl,
          params: params,
        });
        setIsLoading(false);
      } else {
        console.error("[Chat Summary] Error fetching summary:", {
          error: err,
          message: err?.message,
          response: err?.response?.data,
          status: err?.response?.status,
          url: summaryUrl,
          params: params,
        });
        setError(err?.message || "Failed to fetch summary");
        setIsLoading(false);
      }
    } finally {
      // Ensure loading is always set to false
      setIsLoading(false);
      console.log("[Chat Summary] Finally block: isLoading set to false", {
        isMounted: isMountedRef.current,
      });
    }
  }, [peerId, userId, enabled]);

  // Set up polling
  useEffect(() => {
    if (!peerId || !enabled) {
      console.log("[Chat Summary] Polling disabled:", { peerId, enabled });
      return;
    }

    console.log("[Chat Summary] Starting summary polling:", {
      peerId,
      userId,
      pollInterval: `${pollInterval / 1000} seconds (${
        pollInterval / 60000
      } minutes)`,
    });

    // Fetch immediately
    fetchLatestSummary();

    // Set up interval for polling
    intervalRef.current = setInterval(() => {
      console.log("[Chat Summary] Polling interval triggered");
      fetchLatestSummary();
    }, pollInterval);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [peerId, enabled, pollInterval, userId, fetchLatestSummary]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    summaries,
    isLoading,
    error,
    refetch: fetchLatestSummary,
  };
}
