import { useState, useRef, useEffect } from "react";
import { SlidersHorizontal } from "lucide-react";
import { ArrowUpDown } from "lucide-react";
import { Search } from "lucide-react";
import config from "../../common/config.ts";
import { Contact } from "../../common/types/chat";
import { formatTextWithTags } from "../utils/textFormatter";
import React from "react";

type SortOrder = "newest" | "oldest";
type FilterType =
  | "all"
  | "pending_customer"
  | "pending_doctor"
  | "first_response";

interface FPConversationListProps {
  conversations?: Contact[];
  selectedConversation: Contact | null;
  onSelectConversation: (conversation: Contact) => void | Promise<void>;
  userId: string;
  onAddConversation: (conversation: Contact) => void;
  sortOrder?: SortOrder;
  onSortOrderChange?: (order: SortOrder) => void;
  filterType?: FilterType;
  onFilterTypeChange?: (filter: FilterType) => void;
}

export default function FPConversationList({
  conversations = [],
  selectedConversation,
  onSelectConversation,
  userId,
  onAddConversation,
  sortOrder = "newest",
  onSortOrderChange,
  filterType = "all",
  onFilterTypeChange,
}: FPConversationListProps): React.JSX.Element {
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [showSortModal, setShowSortModal] = useState<boolean>(false);
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [showSearchInput, setShowSearchInput] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [newContactId, setNewContactId] = useState<string>("");
  const [newContactName, setNewContactName] = useState<string>("");
  const sortButtonRef = useRef<HTMLButtonElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Format date as "11 Aug 10:00 am" (no seconds, with AM/PM)
  const formatScheduledDate = (date: Date): string => {
    const day = date.getDate();
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
    const month = monthNames[date.getMonth()];
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
    return `${day} ${month} ${hours}:${minutesStr} ${ampm}`;
  };

  // Helper function to generate preview from lastMessage (handles both string and object formats)
  const generatePreviewFromLastMessage = (
    lastMsg: string | object | null | undefined
  ): string | null => {
    if (!lastMsg) return null;

    let parsed: unknown = null;

    // If it's already a string, try to parse it as JSON
    if (typeof lastMsg === "string") {
      // Check if it looks like JSON (starts with { or [)
      if (lastMsg.trim().startsWith("{") || lastMsg.trim().startsWith("[")) {
        try {
          parsed = JSON.parse(lastMsg);
        } catch {
          // Not valid JSON, return as-is
          return lastMsg;
        }
      } else {
        // Plain text string, return as-is
        return lastMsg;
      }
    } else if (typeof lastMsg === "object") {
      // Already an object
      parsed = lastMsg;
    } else {
      // Other type, convert to string
      return String(lastMsg);
    }

    // Now process the parsed object
    if (parsed && typeof parsed === "object" && "type" in parsed) {
      const parsedObj = parsed as {
        type?: string;
        fileName?: string;
        callType?: string;
        message?: string;
        body?: string;
      };
      const t = String(parsedObj.type).toLowerCase();
      if (t === "image") return "Photo";
      if (t === "file")
        return parsedObj.fileName ? `📎 ${parsedObj.fileName}` : "File";
      if (t === "audio") return "Audio";
      if (t === "meal_plan_updated" || t === "meal_plan_update")
        return "Meal plan updated";
      if (
        t === "new_nutritionist" ||
        t === "new_nutrionist" ||
        t === "coach_assigned" ||
        t === "coach_details"
      )
        return (
          (parsedObj as { title?: string; name?: string }).title ||
          (parsedObj as { title?: string; name?: string }).name ||
          "New nutritionist assigned"
        );
      if (t === "products" || t === "recommended_products") return "Products";
      if (t === "call")
        return `${parsedObj.callType === "video" ? "Video" : "Audio"} call`;
      if (t === "general_notification" || t === "general-notification")
        return (parsedObj as { title?: string }).title || "Notification";
      if (t === "video_call")
        return (parsedObj as { title?: string }).title || "Video call";
      if (t === "voice_call")
        return (parsedObj as { title?: string }).title || "Voice call";
      if (t === "documents")
        return (parsedObj as { title?: string }).title || "Document";
      if (t === "call_scheduled") {
        const time = (parsedObj as { time?: number | string }).time;
        if (time) {
          const scheduledDate = new Date(
            typeof time === "number" ? time * 1000 : parseInt(time, 10) * 1000
          );
          return `Schedule, ${formatScheduledDate(scheduledDate)}`;
        }
        return "Call scheduled";
      }
      if (t === "scheduled_call_canceled") {
        return "Scheduled call cancelled";
      }
      if (t === "text") {
        // API uses "message" field for text messages
        return parsedObj.message || parsedObj.body || "";
      }
    }

    // If object has body or message, use it
    if (parsed && typeof parsed === "object") {
      const parsedObj = parsed as { body?: string; message?: string };
      if (parsedObj.body) return parsedObj.body;
      if (parsedObj.message) return parsedObj.message;
    }

    // If we parsed from string but it's not a recognized format, return original string
    if (typeof lastMsg === "string") {
      return lastMsg;
    }

    // Otherwise stringify the object
    return JSON.stringify(parsed || lastMsg);
  };

  // Format time ago
  const formatTimeAgo = (date: Date | string | null | undefined): string => {
    if (!date) return "";
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return "";

    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - dateObj.getTime()) / (1000 * 60)
    );
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} mins ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24)
      return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  };

  // Handle sort option selection
  const handleSortOption = (option: SortOrder): void => {
    if (onSortOrderChange) {
      onSortOrderChange(option);
    }
    setShowSortModal(false);
  };

  // Handle filter option selection
  const handleFilterOption = (option: FilterType): void => {
    if (onFilterTypeChange) {
      onFilterTypeChange(option);
    }
    setShowFilterModal(false);
  };

  // Focus search input when it becomes visible
  useEffect(() => {
    if (showSearchInput && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearchInput]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      const target = event.target as Node;
      // Close sort dropdown
      if (
        showSortModal &&
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(target) &&
        sortButtonRef.current &&
        !sortButtonRef.current.contains(target)
      ) {
        setShowSortModal(false);
      }
      // Close filter dropdown
      if (
        showFilterModal &&
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(target) &&
        filterButtonRef.current &&
        !filterButtonRef.current.contains(target)
      ) {
        setShowFilterModal(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSortModal, showFilterModal]);

  // Filter and sort conversations
  const getFilteredAndSortedConversations = (): Contact[] => {
    // First, filter out the logged-in user (user can't send messages to themselves)
    let filtered = conversations.filter((conv) => conv.id !== userId);

    // Apply search filter (client-side only, since API doesn't support search)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((conv) => {
        const nameMatch = conv.name?.toLowerCase().includes(query);
        // Search in conversationId or userId if available
        const idMatch = conv.id?.toLowerCase().includes(query);
        return nameMatch || idMatch;
      });
    }

    // Apply client-side sorting as fallback/ensurance
    // Sort by timestamp (lastMessageTime)
    filtered = [...filtered].sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;

      if (sortOrder === "newest") {
        // Newest first: descending order (higher timestamp first)
        return timeB - timeA;
      } else {
        // Oldest first: ascending order (lower timestamp first)
        return timeA - timeB;
      }
    });

    return filtered;
  };

  const filteredConversations = getFilteredAndSortedConversations();

  return (
    <div className="conversation-list">
      {/* Header */}
      <div className="conversation-header">
        <div className="header-title">
          <span>All Tasks</span>
          {filteredConversations.length > 0 && (
            <span className="task-badge">{filteredConversations.length}</span>
          )}
        </div>
        <div className="header-actions">
          <div className="search-button-wrapper">
            <button
              className={`header-icon-btn ${showSearchInput ? "active" : ""}`}
              onClick={() => {
                setShowSearchInput(!showSearchInput);
                if (showSearchInput) {
                  setSearchQuery("");
                }
              }}
              title="Search conversations"
            >
              <Search />
            </button>
          </div>
          <div className="filter-button-wrapper">
            <button
              ref={filterButtonRef}
              className="header-icon-btn"
              onClick={() => {
                setShowFilterModal(!showFilterModal);
                setShowSearchInput(false);
              }}
              title="Filter conversations"
            >
              <SlidersHorizontal />
            </button>
            {/* Filter Dropdown */}
            {showFilterModal && (
              <div
                ref={filterDropdownRef}
                className="sort-dropdown"
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className={`sort-dropdown-option ${
                    filterType === "all" ? "active" : ""
                  }`}
                  onClick={() => handleFilterOption("all")}
                >
                  All
                </div>
                <div
                  className={`sort-dropdown-option ${
                    filterType === "pending_customer" ? "active" : ""
                  }`}
                  onClick={() => handleFilterOption("pending_customer")}
                >
                  Reply pending from customer
                </div>
                <div
                  className={`sort-dropdown-option ${
                    filterType === "pending_doctor" ? "active" : ""
                  }`}
                  onClick={() => handleFilterOption("pending_doctor")}
                >
                  Reply pending from doctor
                </div>
                <div
                  className={`sort-dropdown-option ${
                    filterType === "first_response" ? "active" : ""
                  }`}
                  onClick={() => handleFilterOption("first_response")}
                >
                  First Response
                </div>
              </div>
            )}
          </div>
          <div className="sort-button-wrapper">
            <button
              ref={sortButtonRef}
              className="header-icon-btn"
              onClick={() => {
                setShowSortModal(!showSortModal);
                setShowSearchInput(false);
              }}
              title="Sort conversations"
            >
              <ArrowUpDown />
            </button>
            {/* Sorting Dropdown */}
            {showSortModal && (
              <div
                ref={sortDropdownRef}
                className="sort-dropdown"
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  className={`sort-dropdown-option ${
                    sortOrder === "newest" ? "active" : ""
                  }`}
                  onClick={() => handleSortOption("newest")}
                >
                  Newest to Oldest
                </div>
                <div
                  className={`sort-dropdown-option ${
                    sortOrder === "oldest" ? "active" : ""
                  }`}
                  onClick={() => handleSortOption("oldest")}
                >
                  Oldest to Newest
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Input */}
      {showSearchInput && (
        <div className="search-input-container">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by name, contact number, or Fitpass ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button
              className="search-clear-btn"
              onClick={() => setSearchQuery("")}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>
      )}

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

      {/* Conversation Items */}
      <div className="conversations-container">
        {filteredConversations.length === 0 ? (
          <div className="empty-conversations">
            <p>
              {conversations.length === 0
                ? "No conversations yet"
                : searchQuery.trim()
                ? "No conversations match your search"
                : "No conversations match the current filter"}
            </p>
            <p className="empty-hint">
              {conversations.length === 0
                ? "Click the + icon to start a new chat"
                : searchQuery.trim()
                ? "Try a different search term"
                : "Try changing the filter"}
            </p>
          </div>
        ) : (
          filteredConversations.map((conv) => (
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
                  <div className="conversation-preview">
                    {conv.lastMessage
                      ? (() => {
                          const preview = generatePreviewFromLastMessage(
                            conv.lastMessage
                          );
                          if (!preview) return "No messages yet";

                          // Check if this is a general notification with HTML tags
                          let parsed: { type?: string; title?: string } | null =
                            null;
                          try {
                            if (typeof conv.lastMessage === "string") {
                              parsed = JSON.parse(conv.lastMessage);
                            } else if (typeof conv.lastMessage === "object") {
                              parsed = conv.lastMessage as {
                                type?: string;
                                title?: string;
                              };
                            }
                          } catch {
                            // Not JSON, ignore
                          }

                          const isGeneralNotification =
                            parsed &&
                            typeof parsed === "object" &&
                            (parsed.type === "general_notification" ||
                              parsed.type === "general-notification");

                          // If it's a general notification, format HTML tags
                          if (isGeneralNotification && parsed && parsed.title) {
                            return formatTextWithTags(parsed.title);
                          }

                          return preview;
                        })()
                      : "No messages yet"}
                  </div>
                </div>
              </div>
              <div className="conversation-meta">
                <div className="conversation-time">
                  {formatTimeAgo(conv.timestamp)}
                </div>
                {conv.replyCount && conv.replyCount > 0 && (
                  <div className="conversation-reply-indicators">
                    {Array.from({ length: Math.min(conv.replyCount, 2) }).map(
                      (_, i) => (
                        <div key={i} className="reply-avatar">
                          <img src={config.defaults.userAvatar} alt="Reply" />
                        </div>
                      )
                    )}
                  </div>
                )}
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
