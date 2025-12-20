import { RefObject } from "react";
import FPMessageBubble from "./FPMessageBubble";
import FPSystemMessage from "./FPSystemMessage";
import { Message, Contact } from "../../common/types/chat";
import React from "react";

interface FPChatTabProps {
  peerId: string;
  currentConversationMessages: Message[];
  selectedContact: Contact | null;
  userId: string;
  formatDateLabel: (date: Date) => string;
  formatCurrency: (amount: number) => string;
  openImageViewer: (url: string, alt?: string) => void;
  currentlyPlayingAudioRef: RefObject<HTMLAudioElement | null>;
  onPlayVideo?: (
    videoUrl: string,
    callType?: "video_call" | "voice_call"
  ) => void;
}

export default function FPChatTab({
  peerId,
  currentConversationMessages,
  selectedContact,
  userId,
  formatDateLabel,
  formatCurrency,
  openImageViewer,
  currentlyPlayingAudioRef,
  onPlayVideo,
}: FPChatTabProps): React.JSX.Element {
  return (
    <div className="messages-container">
      {!peerId || currentConversationMessages.length === 0 ? (
        <div className="empty-chat">
          <p>No messages yet. Start the conversation!</p>
        </div>
      ) : (
        // Render messages with day separators like WhatsApp
        (() => {
          const items: React.JSX.Element[] = [];
          let lastDayKey: string | null = null;

          currentConversationMessages.forEach((msg, index) => {
            const createdAt = msg.createdAt
              ? new Date(msg.createdAt)
              : new Date();
            const dayKey = `${createdAt.getFullYear()}-${createdAt.getMonth()}-${createdAt.getDate()}`;
            if (dayKey !== lastDayKey) {
              lastDayKey = dayKey;
              items.push(
                <div
                  key={`day-${dayKey}-${index}`}
                  className="day-separator"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    margin: "0.75rem 0",
                    color: "#6b7280",
                    fontSize: "0.75rem",
                  }}
                >
                  <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
                  <span>{formatDateLabel(createdAt)}</span>
                  <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
                </div>
              );
            }

            if (msg.messageType === "system" && msg.system) {
              items.push(<FPSystemMessage key={msg.id} msg={msg} />);
            } else {
              items.push(
                <FPMessageBubble
                  key={msg.id}
                  msg={msg}
                  selectedContact={selectedContact}
                  userId={userId}
                  openImageViewer={openImageViewer}
                  currentlyPlayingAudioRef={currentlyPlayingAudioRef}
                  formatCurrency={formatCurrency}
                  onPlayVideo={onPlayVideo}
                />
              );
            }
          });
          return items;
        })()
      )}
    </div>
  );
}
