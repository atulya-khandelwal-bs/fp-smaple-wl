import React from "react";
import { Phone, ChevronRight } from "lucide-react";
import { Message } from "../../common/types/chat";

interface FPScheduledCallBannerProps {
  scheduledCall: Message;
  onClick?: () => void;
}

export default function FPScheduledCallBanner({
  scheduledCall,
  onClick,
}: FPScheduledCallBannerProps): React.JSX.Element | null {
  // Extract scheduled time
  let scheduledTime: number | undefined;
  let scheduledDate: Date | null = null;

  // Debug logging
  console.log("FPScheduledCallBanner - scheduledCall:", scheduledCall);

  if (scheduledCall.system?.payload) {
    const payload = scheduledCall.system.payload as {
      time?: number | string;
      scheduledDate?: string;
    };

    if (payload.time !== undefined) {
      scheduledTime =
        typeof payload.time === "number"
          ? payload.time
          : typeof payload.time === "string"
          ? parseInt(payload.time, 10)
          : undefined;

      console.log(
        "FPScheduledCallBanner - scheduledTime from payload:",
        scheduledTime
      );
    } else if (payload.scheduledDate) {
      scheduledDate = new Date(payload.scheduledDate);
      console.log(
        "FPScheduledCallBanner - scheduledDate from payload:",
        scheduledDate
      );
    }
  }

  // If we have time but not date, convert it
  if (scheduledTime && !scheduledDate) {
    scheduledDate = new Date(scheduledTime * 1000);
    console.log(
      "FPScheduledCallBanner - scheduledDate from time:",
      scheduledDate
    );
  }

  // Try to parse from content if payload doesn't have it
  if (!scheduledDate && typeof scheduledCall.content === "string") {
    try {
      const contentObj = JSON.parse(scheduledCall.content) as {
        time?: number | string;
        type?: string;
      };
      if (contentObj.time !== undefined) {
        const time =
          typeof contentObj.time === "number"
            ? contentObj.time
            : parseInt(String(contentObj.time), 10);
        scheduledDate = new Date(time * 1000);
        console.log(
          "FPScheduledCallBanner - scheduledDate from content:",
          scheduledDate
        );
      }
    } catch (e) {
      // Content is not JSON, ignore
      console.log("FPScheduledCallBanner - Error parsing content:", e);
    }
  }

  console.log("FPScheduledCallBanner - Final scheduledDate:", scheduledDate);

  // Format the date and time for display
  const formatDateTime = (date: Date): string => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    // Check if it's today
    if (messageDate.getTime() === today.getTime()) {
      return `Today, ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })}`;
    }

    // Check if it's tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (messageDate.getTime() === tomorrow.getTime()) {
      return `Tomorrow, ${date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })}`;
    }

    // Otherwise, show date and time
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${date.getDate()} ${
      monthNames[date.getMonth()]
    }, ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })}`;
  };

  // Don't render if we don't have a valid date
  if (!scheduledDate || isNaN(scheduledDate.getTime())) {
    console.warn(
      "FPScheduledCallBanner - No valid scheduled date found, not rendering"
    );
    console.warn(
      "FPScheduledCallBanner - scheduledCall received:",
      scheduledCall
    );
    console.warn("FPScheduledCallBanner - scheduledTime:", scheduledTime);
    console.warn("FPScheduledCallBanner - scheduledDate:", scheduledDate);
    return null;
  }

  const dateTimeText = formatDateTime(scheduledDate);
  console.log(
    "FPScheduledCallBanner - Rendering banner with dateTimeText:",
    dateTimeText
  );
  console.log(
    "FPScheduledCallBanner - Banner should be visible with green background"
  );

  return (
    <div
      onClick={onClick}
      className="scheduled-call-banner"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.75rem 1rem",
        backgroundColor: "#10b981",
        borderRadius: "0 12px 12px 0",
        cursor: onClick ? "pointer" : "default",
        marginBottom: "0.5rem",
        transition: "opacity 0.2s",
        width: "100%",
        boxSizing: "border-box",
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.opacity = "0.9";
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.opacity = "1";
        }
      }}
    >
      {/* Phone Icon */}
      <Phone size={20} color="#FFFFFF" />

      {/* Text */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "0.125rem",
        }}
      >
        <span
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#FFFFFF",
          }}
        >
          Call scheduled
        </span>
        <span
          style={{
            fontSize: "12px",
            color: "#FFFFFF",
            opacity: 0.9,
          }}
        >
          {dateTimeText}
        </span>
      </div>

      {/* Arrow Icon */}
      {onClick && <ChevronRight size={20} color="#FFFFFF" />}
    </div>
  );
}
