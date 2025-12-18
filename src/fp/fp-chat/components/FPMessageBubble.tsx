import { RefObject, useState, useRef } from "react";
import FPImageMessageView from "./messages/FPImageMessageView";
import FPAudioMessageView from "./messages/FPAudioMessageView";
import FPFileMessageView from "./messages/FPFileMessageView";
import FPProductMessageView from "./messages/FPProductMessageView";
import FPCallMessageView from "./messages/FPCallMessageView";
import FPTextMessageView from "./messages/FPTextMessageView";
import FPGeneralNotificationView from "./messages/FPGeneralNotificationView";
import FPCallScheduledView from "./messages/FPCallScheduledView";
import { Message, Contact } from "../../common/types/chat";
import React from "react";
import { Edit2 } from "lucide-react";

interface FPMessageBubbleProps {
  msg: Message;
  selectedContact: Contact | null;
  userId: string;
  openImageViewer: (url: string, alt?: string) => void;
  currentlyPlayingAudioRef: RefObject<HTMLAudioElement | null>;
  formatCurrency: (amount: number) => string;
  onEdit?: (messageId: string, content: string) => void;
  onPlayVideo?: (videoUrl: string) => void;
}

export default function FPMessageBubble({
  msg,
  selectedContact,
  userId,
  openImageViewer,
  currentlyPlayingAudioRef,
  formatCurrency,
  onEdit,
  onPlayVideo,
}: FPMessageBubbleProps): React.JSX.Element {
  const renderMessageContent = (): React.JSX.Element => {
    if (msg.messageType === "image" && (msg.imageData || msg.imageUrl)) {
      return (
        <FPImageMessageView
          imageUrl={msg.imageData || msg.imageUrl || ""}
          fileName={msg.fileName}
          openImageViewer={openImageViewer}
        />
      );
    }

    if (msg.messageType === "audio" && msg.audioUrl) {
      return (
        <FPAudioMessageView
          audioUrl={msg.audioUrl}
          audioTranscription={msg.audioTranscription}
          currentlyPlayingAudioRef={currentlyPlayingAudioRef}
        />
      );
    }

    if (msg.messageType === "file" && (msg.fileUrl || msg.fileName)) {
      return (
        <FPFileMessageView
          fileUrl={msg.fileUrl}
          fileName={msg.fileName}
          fileMime={msg.fileMime}
          fileSizeBytes={msg.fileSizeBytes}
          fileSize={msg.fileSize}
        />
      );
    }

    if (msg.messageType === "documents" && msg.system) {
      const payload = msg.system.payload as {
        title?: string;
        description?: string;
        icons_details?: {
          left_icon?: string;
          right_icon?: string;
        };
        documents_details?: {
          document_url?: string;
          document_size?: number;
          document_type?: string;
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
      };

      // Use fileUrl/fileName from message if available, otherwise extract from system payload
      const documentUrl =
        msg.fileUrl || payload.documents_details?.document_url;
      const documentName = msg.fileName || payload.title;
      const documentMime =
        msg.fileMime || payload.documents_details?.document_type;
      const documentSize =
        msg.fileSizeBytes || payload.documents_details?.document_size;

      return (
        <FPFileMessageView
          fileUrl={documentUrl}
          fileName={documentName}
          fileMime={documentMime}
          fileSizeBytes={documentSize}
          fileSize={
            documentSize ? `${Math.round(documentSize / 1024)} KB` : undefined
          }
          icons_details={payload.icons_details}
          redirection_details={payload.redirection_details}
        />
      );
    }

    if (msg.messageType === "products" && Array.isArray(msg.products)) {
      return (
        <FPProductMessageView
          products={msg.products}
          formatCurrency={formatCurrency}
        />
      );
    }

    // Handle both old "call" format and new "video_call"/"voice_call" format
    if (
      msg.messageType === "call" ||
      msg.messageType === "video_call" ||
      msg.messageType === "voice_call"
    ) {
      // Convert old "call" format to new format
      let callType: "video_call" | "voice_call";
      let title: string | undefined;
      let description: string | undefined;
      let icons_details:
        | { left_icon?: string; right_icon?: string }
        | undefined;
      let call_details: { call_url?: string } | undefined;

      if (msg.messageType === "call") {
        // Old format: convert to new format
        const oldCallType = msg.callType as "video" | "audio" | undefined;
        callType = oldCallType === "audio" ? "voice_call" : "video_call";
        title = oldCallType === "video" ? "Video call" : "Voice call";
        if (msg.callDurationSeconds != null) {
          const minutes = Math.floor(msg.callDurationSeconds / 60);
          const seconds = msg.callDurationSeconds % 60;
          description = `${minutes}:${String(seconds).padStart(2, "0")}`;
        }
      } else {
        // New format: extract from system payload
        callType = msg.messageType as "video_call" | "voice_call";
        if (msg.system) {
          const payload = msg.system.payload as {
            title?: string;
            description?: string;
            icons_details?: {
              left_icon?: string;
              right_icon?: string;
            };
            call_details?: {
              call_url?: string;
            };
          };
          title = payload.title;
          description = payload.description;
          icons_details = payload.icons_details;
          call_details = payload.call_details;
        }
      }

      return (
        <FPCallMessageView
          callType={callType}
          title={title}
          description={description}
          icons_details={icons_details}
          call_details={call_details}
          onPlayVideo={onPlayVideo}
        />
      );
    }

    if (
      (msg.messageType === "video_call" || msg.messageType === "voice_call") &&
      msg.system
    ) {
      const payload = msg.system.payload as {
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
      };

      return (
        <FPCallMessageView
          callType={msg.messageType as "video_call" | "voice_call"}
          title={payload.title}
          description={payload.description}
          icons_details={payload.icons_details}
          call_details={payload.call_details}
          redirection_details={payload.redirection_details}
          onPlayVideo={onPlayVideo}
        />
      );
    }

    if (
      msg.messageType === "call_scheduled" ||
      msg.messageType === "scheduled_call_canceled"
    ) {
      return <FPCallScheduledView msg={msg} />;
    }

    if (msg.messageType === "general_notification" && msg.system) {
      const payload = msg.system.payload as {
        title?: string;
        description?: string;
        redirection_details?:
          | Array<{
              cta_details?: {
                text?: string;
                text_color?: string;
                bg_color?: string;
              };
              redirect_url?: string;
              action_id?: string;
            }>
          | string;
      };

      // Parse redirection_details if it's a string
      let redirectionDetails: Array<{
        cta_details?: {
          text?: string;
          text_color?: string;
          bg_color?: string;
        };
        redirect_url?: string;
        action_id?: string;
      }> = [];

      if (payload.redirection_details) {
        if (typeof payload.redirection_details === "string") {
          try {
            redirectionDetails = JSON.parse(payload.redirection_details);
          } catch (e) {
            console.error("Failed to parse redirection_details:", e);
            redirectionDetails = [];
          }
        } else if (Array.isArray(payload.redirection_details)) {
          redirectionDetails = payload.redirection_details;
        }
      }

      return (
        <FPGeneralNotificationView
          title={payload.title}
          description={payload.description}
          redirection_details={redirectionDetails}
        />
      );
    }

    // Fallback: try to parse JSON content for media
    try {
      if (
        typeof msg.content === "string" &&
        msg.content.trim().startsWith("{")
      ) {
        const obj = JSON.parse(msg.content) as {
          type?: string;
          url?: string;
          fileName?: string;
          mimeType?: string;
          size?: number;
          callType?: string;
          duration?: number;
          time?: number | string;
        };
        if (obj && typeof obj === "object" && obj.type) {
          const t = String(obj.type).toLowerCase();
          if (t === "image" && obj.url) {
            return (
              <FPImageMessageView
                imageUrl={obj.url}
                fileName={obj.fileName}
                openImageViewer={openImageViewer}
              />
            );
          }
          if (t === "file" && obj.url) {
            return (
              <FPFileMessageView
                fileUrl={obj.url}
                fileName={obj.fileName}
                fileMime={obj.mimeType}
                fileSizeBytes={obj.size}
              />
            );
          }
          if (t === "call_scheduled" || t === "scheduled_call_canceled") {
            // Create a message object with the parsed data for FPCallScheduledView
            const callScheduledMsg: Message = {
              ...msg,
              messageType: t,
              system: {
                kind: t,
                payload: {
                  time:
                    typeof obj.time === "number"
                      ? obj.time
                      : typeof obj.time === "string"
                      ? parseInt(obj.time, 10)
                      : undefined,
                },
              },
            };
            return <FPCallScheduledView msg={callScheduledMsg} />;
          }
          if (t === "call") {
            // Convert old "call" format to new format
            const oldCallType = obj.callType as "video" | "audio" | undefined;
            const callType =
              oldCallType === "audio" ? "voice_call" : "video_call";
            const title = oldCallType === "video" ? "Video call" : "Voice call";
            let description: string | undefined;
            if (obj.duration != null) {
              const minutes = Math.floor(obj.duration / 60);
              const seconds = obj.duration % 60;
              description = `${minutes}:${String(seconds).padStart(2, "0")}`;
            }
            return (
              <FPCallMessageView
                callType={callType}
                title={title}
                description={description}
              />
            );
          }
        }
      }
    } catch {
      // Ignore parse errors
    }

    // Default: render as text
    return <FPTextMessageView content={msg.content} />;
  };

  // Check if message is within 10-minute edit window
  const isWithinEditWindow = (): boolean => {
    if (!msg.createdAt) {
      return false; // Can't determine age, don't allow editing
    }
    const messageTime =
      msg.createdAt instanceof Date
        ? msg.createdAt.getTime()
        : new Date(msg.createdAt).getTime();
    const currentTime = Date.now();
    const tenMinutesInMs = 10 * 60 * 1000; // 10 minutes in milliseconds
    return currentTime - messageTime <= tenMinutesInMs;
  };

  // Check if this is an editable text message (outgoing and text type)
  const isEditableTextMessage =
    !msg.isIncoming &&
    (msg.messageType === "text" || !msg.messageType) &&
    typeof msg.content === "string" &&
    onEdit &&
    isWithinEditWindow();

  // Get the content string for editing
  const getContentString = (): string => {
    if (typeof msg.content === "string") {
      return msg.content;
    }
    if (typeof msg.content === "object" && msg.content !== null) {
      return (
        (msg.content as { body?: string }).body || JSON.stringify(msg.content)
      );
    }
    return String(msg.content || "");
  };

  // State for showing edit button on hover/tap
  const [showEditButton, setShowEditButton] = useState(false);
  const messageBubbleRef = useRef<HTMLDivElement | null>(null);
  const isTouchDeviceRef = useRef<boolean>(false);

  // Detect if device supports touch
  React.useEffect(() => {
    isTouchDeviceRef.current =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      // @ts-expect-error - msMaxTouchPoints is IE-specific
      navigator.msMaxTouchPoints > 0;
  }, []);

  // Hide edit button when clicking outside (for mobile)
  React.useEffect(() => {
    if (!showEditButton || !isTouchDeviceRef.current) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent): void => {
      if (
        messageBubbleRef.current &&
        !messageBubbleRef.current.contains(event.target as Node)
      ) {
        setShowEditButton(false);
      }
    };

    // Use both mouse and touch events
    document.addEventListener("click", handleClickOutside, true);
    document.addEventListener("touchend", handleClickOutside, true);

    return () => {
      document.removeEventListener("click", handleClickOutside, true);
      document.removeEventListener("touchend", handleClickOutside, true);
    };
  }, [showEditButton]);

  // Handle tap/click for mobile - toggle edit button on tap
  const handleClick = (e: React.MouseEvent): void => {
    if (!isEditableTextMessage) return;
    // Only toggle on tap for touch devices, not on desktop click
    // Don't toggle if clicking on the edit button itself
    const target = e.target as HTMLElement;
    if (target.closest(".message-edit-button")) {
      return; // Don't toggle when clicking the edit button
    }
    if (isTouchDeviceRef.current) {
      e.stopPropagation();
      setShowEditButton((prev) => !prev); // Toggle on tap
    }
  };

  // Handle touch for mobile - toggle edit button on tap
  const handleTouchEnd = (e: React.TouchEvent): void => {
    if (!isEditableTextMessage) return;
    // Don't toggle if tapping on the edit button itself
    const target = e.target as HTMLElement;
    if (target.closest(".message-edit-button")) {
      return; // Don't toggle when tapping the edit button
    }
    e.stopPropagation();
    setShowEditButton((prev) => !prev); // Toggle on tap
  };

  // Handle hover for desktop
  const handleMouseEnter = (): void => {
    if (isEditableTextMessage && !isTouchDeviceRef.current) {
      setShowEditButton(true);
    }
  };

  const handleMouseLeave = (): void => {
    if (!isTouchDeviceRef.current) {
      setShowEditButton(false);
    }
  };

  return (
    <div
      className={`message-wrapper ${msg.isIncoming ? "incoming" : "outgoing"}`}
    >
      {/* Avatar before message for incoming */}
      {msg.isIncoming && (
        <div className="message-avatar">
          <img src={msg.avatar || ""} alt={msg.sender} />
        </div>
      )}
      <div className="message-content">
        {msg.label && !msg.isIncoming && (
          <div className="message-label">{msg.label}</div>
        )}
        <div
          className="message-bubble"
          ref={messageBubbleRef}
          style={{
            position: "relative",
            cursor:
              isEditableTextMessage && isTouchDeviceRef.current
                ? "pointer"
                : "default",
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          onTouchEnd={handleTouchEnd}
        >
          <div className="message-sender-name">
            {msg.isIncoming
              ? selectedContact?.name || msg.sender
              : msg.sender || userId}
          </div>
          {renderMessageContent()}
          {/* Edit button for outgoing text messages - shown on hover/long-press */}
          {isEditableTextMessage && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onEdit?.(msg.id, getContentString());
                // Hide button after clicking
                setShowEditButton(false);
              }}
              onTouchStart={(e) => {
                // Prevent the message bubble's touch handler from firing when touching the button
                e.stopPropagation();
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                e.preventDefault();
                // Trigger edit when button is tapped
                onEdit?.(msg.id, getContentString());
                // Hide button after clicking
                setShowEditButton(false);
              }}
              className="message-edit-button"
              title="Edit message"
              style={{
                position: "absolute",
                top: "4px",
                right: "4px",
                background: "rgba(0, 0, 0, 0.05)",
                border: "none",
                borderRadius: "4px",
                padding: "4px",
                cursor: "pointer",
                display: showEditButton ? "flex" : "none",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0.7,
                transition: "opacity 0.2s, background 0.2s",
                zIndex: 10,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.opacity = "1";
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(0, 0, 0, 0.1)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.opacity = "0.7";
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(0, 0, 0, 0.05)";
              }}
            >
              <Edit2 size={14} color="#666" />
            </button>
          )}
        </div>
        <div className="message-time">
          {msg.timestamp}
          {msg.isEdited && (
            <span
              style={{ marginLeft: "4px", fontSize: "0.75em", opacity: 0.7 }}
            >
              (edited)
            </span>
          )}
        </div>
      </div>
      {/* Avatar after message for outgoing */}
      {!msg.isIncoming && (
        <div className="message-avatar">
          <img src={msg.avatar || ""} alt={msg.sender} />
        </div>
      )}
    </div>
  );
}
