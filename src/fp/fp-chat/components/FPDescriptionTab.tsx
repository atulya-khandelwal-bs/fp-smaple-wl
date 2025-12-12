import { Contact } from "../../common/types/chat";
import React from "react";
import type { Connection } from "agora-chat";
import { useChatSummary } from "../hooks/useChatSummary";

interface FPDescriptionTabProps {
  selectedContact: Contact | null;
  chatClient: Connection | null;
  peerId: string | null;
  userId: string;
}

export default function FPDescriptionTab({
  selectedContact,
  chatClient,
  peerId,
  userId,
}: FPDescriptionTabProps): React.JSX.Element {
  const { summaries, isLoading, error } = useChatSummary({
    chatClient,
    peerId,
    userId,
    enabled: !!peerId && !!chatClient,
    pollInterval: 10000, // Poll every 10 minutes (10 * 60 * 1000)
  });

  // Debug logging
  React.useEffect(() => {
    console.log("[FPDescriptionTab] Component state:", {
      peerId,
      userId,
      chatClient: chatClient ? "connected" : "null",
      enabled: !!peerId && !!chatClient,
      summariesCount: summaries.length,
      summaries: summaries,
      isLoading,
      error,
      timestamp: new Date().toISOString(),
    });

    // Log when showing "No summary available yet"
    if (!isLoading && !error && summaries.length === 0) {
      console.log(
        "[FPDescriptionTab] Showing 'No summary available yet' because:",
        {
          isLoading,
          error,
          summariesCount: summaries.length,
          peerId,
          userId,
          enabled: !!peerId && !!chatClient,
        }
      );
    }

    // Log when summaries are successfully received
    if (summaries.length > 0) {
      console.log("[FPDescriptionTab] Successfully displaying summaries:", {
        summariesCount: summaries.length,
        summaryIds: summaries.map((s) => s.id),
        latestSummaryPreview: summaries[0]?.summary?.substring(0, 100) + "...",
      });
    }
  }, [peerId, userId, chatClient, summaries, isLoading, error]);

  // Format date for display (e.g., "Today, 10 Nov 2025 06:19 pm")
  const formatDateTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday =
      date.toDateString() ===
      new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString();

    let dateStr = "";
    if (isToday) {
      dateStr = "Today";
    } else if (isYesterday) {
      dateStr = "Yesterday";
    } else {
      dateStr = date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }

    const timeStr = date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    return `${dateStr}, ${timeStr}`;
  };

  // Process summary text: remove prefix, extract bullet points, and merge 2-3 into paragraphs
  const processSummary = (summaryText: string): string[] => {
    if (!summaryText) return [];

    // Remove the prefix line if it exists (case insensitive, handles variations)
    let processed = summaryText
      .replace(
        /^Here's a summary of the chat in clear bullet points:\s*\n*\s*/gi,
        ""
      )
      .replace(/^Here's a summary:\s*\n*\s*/gi, "")
      .replace(/^Summary:\s*\n*\s*/gi, "")
      .trim();

    if (!processed) return [];

    const bulletPoints: string[] = [];

    // Split by bullet points (•, \u2022, \u25CF) or lines starting with bullet
    // Handle both "• text" and "•text" formats
    const lines = processed.split(/\n/);

    for (const line of lines) {
      // Remove bullet point and trim
      const cleaned = line
        .replace(/^[•\u2022\u25CF\-\*]\s*/, "") // Remove bullet and optional space
        .trim();

      if (cleaned) {
        bulletPoints.push(cleaned);
      }
    }

    // If no bullet points were found, try splitting by double newlines
    if (bulletPoints.length === 0) {
      const doubleNewlineSplit = processed.split(/\n\s*\n/);
      if (doubleNewlineSplit.length > 1) {
        for (const para of doubleNewlineSplit) {
          const trimmed = para.trim();
          if (trimmed) {
            bulletPoints.push(trimmed);
          }
        }
      } else {
        return [processed];
      }
    }

    // Merge 2-3 bullet points into one paragraph
    const paragraphs: string[] = [];
    for (let i = 0; i < bulletPoints.length; i += 3) {
      // Take 2-3 items at a time
      const group = bulletPoints.slice(i, i + 3);
      // Join with a space to create a paragraph
      paragraphs.push(group.join(" "));
    }

    return paragraphs.length > 0 ? paragraphs : [processed];
  };

  return (
    <div className="tab-content">
      <div className="description-content">
        {isLoading && summaries.length === 0 ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "#6b7280",
            }}
          >
            Loading summary...
          </div>
        ) : error ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "#ef4444",
            }}
          >
            Error: {error}
          </div>
        ) : summaries.length === 0 ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "#6b7280",
            }}
          >
            No summary available yet.
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
              padding: "1rem 0",
            }}
          >
            {summaries.map((summary) => (
              <div
                key={summary.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  marginBottom: "1.5rem",
                }}
              >
                {/* Date and horizontal line */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                    marginBottom: "0.5rem",
                  }}
                >
                  {/* Date on the left */}
                  <div
                    style={{
                      fontSize: "0.875rem",
                      color: "#6b7280",
                      fontWeight: 500,
                      flexShrink: 0,
                    }}
                  >
                    {formatDateTime(summary.timestamp)}
                  </div>
                  {/* Horizontal line on the right */}
                  <div
                    style={{
                      flex: 1,
                      height: "1px",
                      background: "#E5E7EB",
                      marginLeft: "12px",
                    }}
                  />
                </div>

                {/* Profile photo and name in the same line */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  {/* Avatar */}
                  <img
                    src={
                      selectedContact?.avatar ||
                      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face"
                    }
                    alt={selectedContact?.name || "User"}
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />

                  {/* Name */}
                  <div
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "#111827",
                    }}
                  >
                    {selectedContact?.name || "User"}
                  </div>
                </div>

                {/* Summary text below - displayed as separate paragraphs */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  {processSummary(summary.summary).map((paragraph, index) => (
                    <div
                      key={index}
                      style={{
                        fontSize: "0.875rem",
                        lineHeight: "1.5",
                        color: "#374151",
                        textAlign: "left",
                        paddingBottom:
                          index < processSummary(summary.summary).length - 1
                            ? "0.5rem"
                            : "0",
                      }}
                    >
                      {paragraph}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
