import React from "react";

interface FPGeneralNotificationViewProps {
  title?: string;
  description?: string;
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

export default function FPGeneralNotificationView({
  title,
  description,
  redirection_details,
}: FPGeneralNotificationViewProps): React.JSX.Element {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0",
        width: "100%",
      }}
    >
      {/* Title */}
      {title && (
        <div
          style={{
            fontSize: "14px",
            fontWeight: 500,
            lineHeight: "1.4em",
            color: "#374151",
            marginBottom: description ? "8px" : "0",
            textAlign: "left",
          }}
        >
          {title}
        </div>
      )}

      {/* Description */}
      {description && (
        <div
          style={{
            fontSize: "14px",
            fontWeight: 400,
            lineHeight: "1.4em",
            color: "#374151",
            marginBottom:
              redirection_details && redirection_details.length > 0
                ? "12px"
                : "0",
            textAlign: "left",
          }}
        >
          {description}
        </div>
      )}

      {/* Action Buttons */}
      {redirection_details && redirection_details.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginTop: "12px",
          }}
        >
          {redirection_details.map((detail, index) => {
            const buttonText =
              detail.cta_details?.text_color ||
              detail.cta_details?.text ||
              `Button ${index + 1}`;
            return (
              <button
                key={index}
                onClick={() => {
                  console.log("Button clicked:", detail);
                  // Handle button click - navigate to redirect_url
                  if (detail.redirect_url) {
                    // Check if it's a full URL or a route
                    if (
                      detail.redirect_url.startsWith("http://") ||
                      detail.redirect_url.startsWith("https://")
                    ) {
                      window.open(
                        detail.redirect_url,
                        "_blank",
                        "noopener,noreferrer"
                      );
                    } else {
                      // Handle internal route navigation
                      console.log("Internal route:", detail.redirect_url);
                      // You can add router navigation here if using React Router
                      // For now, we'll treat it as a URL
                      window.location.href = detail.redirect_url;
                    }
                  }
                }}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  background: "#109310",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "100px",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.background = "#0d7a0d";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.background = "#109310";
                }}
              >
                {buttonText}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
