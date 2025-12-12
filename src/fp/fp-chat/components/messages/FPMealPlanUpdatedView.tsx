import ForkKnifeIcon from "../../assets/ForkKnife.svg";
import { Message } from "../../../common/types/chat";
import React from "react";

interface FPMealPlanUpdatedViewProps {
  msg: Message;
}

export default function FPMealPlanUpdatedView({
  msg,
}: FPMealPlanUpdatedViewProps): React.JSX.Element {
  const iconsDetails = msg.system?.payload?.icons_details as
    | { left_icon?: string; right_icon?: string }
    | undefined;
  const title =
    msg.system?.payload?.title || msg.content || "Meal Plan Updated";

  // Extract redirection_details
  const redirectionDetails = msg.system?.payload?.redirection_details as
    | Array<{
        cta_details?: {
          text?: string;
          text_color?: string;
          bg_color?: string;
        };
        redirect_url?: string;
        action_id?: string;
      }>
    | undefined;

  // Get first redirect URL if available
  const redirectUrl = redirectionDetails?.[0]?.redirect_url;

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
        alignItems: "center",
        width: "100%",
        position: "relative",
        margin: "0.5rem 0",
      }}
    >
      {/* Left line */}
      <div
        style={{
          flex: 1,
          height: "1px",
          background: "#E5E7EB",
        }}
      />
      {/* Message bubble with icons */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          margin: "0 12px",
          background: "#f3f4f6",
          color: "#111827",
          borderRadius: "9999px",
          padding: "0.4rem 0.75rem",
          width: "fit-content",
          boxShadow: "inset 0 0 0 1px #e5e7eb",
          position: "relative",
          zIndex: 1,
          cursor: redirectUrl ? "pointer" : "default",
        }}
        onClick={redirectUrl ? handleClick : undefined}
      >
        {/* Left Icon */}
        {iconsDetails?.left_icon ? (
          <img
            src={iconsDetails.left_icon}
            alt="Left icon"
            style={{
              width: "16px",
              height: "16px",
              flexShrink: 0,
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <img
            src={ForkKnifeIcon}
            alt="Fork and knife"
            style={{
              width: "16px",
              height: "16px",
              flexShrink: 0,
            }}
          />
        )}

        {/* Title/Content */}
        <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{title}</span>

        {/* Right Icon */}
        {iconsDetails?.right_icon ? (
          <img
            src={iconsDetails.right_icon}
            alt="Right icon"
            style={{
              width: "16px",
              height: "16px",
              flexShrink: 0,
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span aria-hidden style={{ marginLeft: 4, color: "#9ca3af" }}>
            ›
          </span>
        )}
      </div>
      {/* Right line */}
      <div
        style={{
          flex: 1,
          height: "1px",
          background: "#E5E7EB",
        }}
      />
    </div>
  );
}
