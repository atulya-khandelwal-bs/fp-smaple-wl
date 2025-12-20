import { useState } from "react";
import config from "../../common/config.ts";
import { Contact } from "../../common/types/chat";
import React from "react";

interface FPConversationListProps {
  conversations?: Contact[];
  selectedConversation: Contact | null;
  onSelectConversation: (conversation: Contact) => void | Promise<void>;
  userId: string;
  onAddConversation: (conversation: Contact) => void;
}

export default function FPConversationList({
  conversations = [],
  selectedConversation,
  onSelectConversation,
  userId,
  onAddConversation,
}: FPConversationListProps): React.JSX.Element {
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newContactId, setNewContactId] = useState<string>("");
  const [newContactName, setNewContactName] = useState<string>("");

  const handleAddConversation = (): void => {
    if (newContactId.trim() && newContactName.trim()) {
      onAddConversation({
        id: newContactId,
        name: newContactName,
        lastSeen: "Just now",
        lastMessage: "",
        timestamp: new Date(),
      });
      setNewContactId("");
      setNewContactName("");
      setShowAddForm(false);
    }
  };

  // Filter out recorder (UID 999999999) from coaches
  const RECORDER_ID = "999999999";
  const coaches = conversations.filter(
    (conv) => String(conv.id) !== RECORDER_ID
  );

  return (
    <div className="conversation-list">
      {/* Header */}
      <div className="conversation-header">
        <div className="header-title">
          <span>Coaches</span>
          {coaches.length > 0 && (
            <span className="task-badge">{coaches.length}</span>
          )}
        </div>
      </div>

      {/* Add Conversation Form */}
      {showAddForm && (
        <div className="add-conversation-form">
          <input
            type="text"
            placeholder="Contact ID"
            value={newContactId}
            onChange={(e) => setNewContactId(e.target.value)}
            className="add-form-input"
          />
          <input
            type="text"
            placeholder="Contact Name"
            value={newContactName}
            onChange={(e) => setNewContactName(e.target.value)}
            className="add-form-input"
          />
          <div className="add-form-actions">
            <button
              className="add-form-btn primary"
              onClick={handleAddConversation}
              disabled={!newContactId.trim() || !newContactName.trim()}
            >
              Add
            </button>
            <button
              className="add-form-btn"
              onClick={() => {
                setShowAddForm(false);
                setNewContactId("");
                setNewContactName("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Coach Items */}
      <div className="conversations-container">
        {coaches.length === 0 ? (
          <div className="empty-conversations">
            <p>No coaches available</p>
            <p className="empty-hint">
              No coaches are currently available
            </p>
          </div>
        ) : (
          coaches.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item ${
                selectedConversation?.id === conv.id ? "selected" : ""
              }`}
              onClick={() => onSelectConversation(conv)}
            >
              <div className="conversation-left">
                <div className="conversation-avatar">
                  <img
                    src={conv.avatar || config.defaults.avatar}
                    alt={conv.name}
                  />
                </div>
                <div className="conversation-content">
                  <div className="conversation-name">{conv.name}</div>
                </div>
              </div>
              <div className="conversation-meta">
                <div className="conversation-arrow">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
