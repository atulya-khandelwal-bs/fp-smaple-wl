import React from "react";
import { Video, Phone } from "lucide-react";

interface FPCallMessageViewProps {
  callType: "video_call" | "voice_call";
  title?: string;
  description?: string;
  icons_details?: {
    left_icon?: string;
    right_icon?: string;
  };
  call_details?: {
    call_url?: string;
  };
  redirection_details?: Array<{
    cta_details?: {
      text?: string;
      text_color?: string;
      bg_color?: string;
    };
    redirect_url?: string;
    action_id?: string;
  }>;
}

export default function FPCallMessageView({
  callType,
  title,
  description,
  icons_details,
  redirection_details,
}: FPCallMessageViewProps): React.JSX.Element {
  const isVideoCall = callType === "video_call";
  const displayTitle = title || (isVideoCall ? "Video call" : "Voice call");
  const displayDescription = description || "";

  // Get first redirect URL if available
  const redirectUrl = redirection_details?.[0]?.redirect_url;

  const handleClick = (): void => {
    if (redirectUrl) {
      if (
        redirectUrl.startsWith("http://") ||
        redirectUrl.startsWith("https://")
      ) {
        window.open(redirectUrl, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = redirectUrl;
      }
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        width: "100%",
        cursor: redirectUrl ? "pointer" : "default",
      }}
      onClick={redirectUrl ? handleClick : undefined}
    >
      {/* Title and Icon Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        {/* Left Icon */}
        {icons_details?.left_icon ? (
          <img
            src={icons_details.left_icon}
            alt="Call icon"
            style={{
              width: "18px",
              height: "18px",
              flexShrink: 0,
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div style={{ flexShrink: 0 }}>
            {isVideoCall ? (
              <Video
                size={18}
                style={{
                  color: "#2563eb",
                }}
              />
            ) : (
              <Phone
                size={18}
                style={{
                  color: "#2563eb",
                }}
              />
            )}
          </div>
        )}

        {/* Title */}
        <span
          style={{
            fontWeight: 600,
            color: "var(--text)",
            fontSize: "14px",
          }}
        >
          {displayTitle}
        </span>
      </div>

      {/* Description (Duration) */}
      {displayDescription && (
        <div
          style={{
            fontSize: "12px",
            color: "#6b7280",
            marginLeft: "26px", // Align with title after icon
          }}
        >
          {displayDescription}
        </div>
      )}

      {/* Right Icon (if provided) */}
      {icons_details?.right_icon && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "4px",
          }}
        >
          <img
            src={icons_details.right_icon}
            alt="Right icon"
            style={{
              width: "18px",
              height: "18px",
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      )}
    </div>
  );
}
