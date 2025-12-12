import { Video, Phone, ChevronDown } from "lucide-react";
import { Contact } from "../../common/types/chat";
import React, { useState, useRef, useEffect } from "react";

interface FPChatHeaderProps {
  selectedContact: Contact | null;
  activeTab: "Chat" | "Info" | "Description";
  onTabChange: (tab: "Chat" | "Info" | "Description") => void;
  onBackToConversations?: (() => void) | null;
  onInitiateCall?: ((callType: "video" | "audio") => void) | null;
}

export default function FPChatHeader({
  selectedContact,
  activeTab,
  onTabChange,
  onBackToConversations,
  onInitiateCall,
}: FPChatHeaderProps): React.JSX.Element {
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  const handleVideoCall = (): void => {
    if (onInitiateCall) {
      onInitiateCall("video");
    }
    setShowDropdown(false);
  };

  const handleVoiceCall = (): void => {
    if (onInitiateCall) {
      onInitiateCall("audio");
    }
    setShowDropdown(false);
  };

  const toggleDropdown = (): void => {
    setShowDropdown((prev) => !prev);
  };

  return (
    <>
      {/* Header */}
      <div className="chat-header">
        {onBackToConversations && (
          <button
            className="back-btn"
            onClick={onBackToConversations}
            title="Back to conversations"
            style={{
              background: "none",
              border: "none",
              color: "var(--text)",
              cursor: "pointer",
              padding: "0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginRight: "0.5rem",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div className="contact-info" style={{ flex: 1 }}>
          <h2>{selectedContact?.name || "Select a Contact"}</h2>
          <p>{selectedContact?.lastSeen || ""}</p>
        </div>
        {selectedContact && onInitiateCall && (
          <div
            ref={dropdownRef}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <button
              onClick={toggleDropdown}
              title="Start call"
              style={{
                background: "none",
                border: "none",
                color: "var(--text)",
                cursor: "pointer",
                padding: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.05)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <Video size={24} />
              <ChevronDown size={16} style={{ marginLeft: "4px" }} />
            </button>

            {showDropdown && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: "0.5rem",
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  boxShadow:
                    "0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -1px rgba(0, 0, 0, 0.06)",
                  minWidth: "160px",
                  zIndex: 1000,
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={handleVideoCall}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    color: "#111827",
                    fontSize: "0.875rem",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#F3F4F6";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <Video size={20} style={{ color: "#2563eb" }} />
                  <span>Video Call</span>
                </button>
                <button
                  onClick={handleVoiceCall}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    color: "#111827",
                    fontSize: "0.875rem",
                    borderTop: "1px solid #E5E7EB",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#F3F4F6";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <Phone size={20} style={{ color: "#2563eb" }} />
                  <span>Voice Call</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="nav-tabs">
        <button
          className={`tab ${activeTab === "Chat" ? "active" : ""}`}
          onClick={() => onTabChange("Chat")}
        >
          Chat
        </button>
        <button
          className={`tab ${activeTab === "Info" ? "active" : ""}`}
          onClick={() => onTabChange("Info")}
        >
          Info
        </button>
        <button
          className={`tab ${activeTab === "Description" ? "active" : ""}`}
          onClick={() => onTabChange("Description")}
        >
          Description
        </button>
      </div>
    </>
  );
}
