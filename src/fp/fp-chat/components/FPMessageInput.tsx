import React, { useEffect, RefObject, KeyboardEvent } from "react";
import { Smile, Plus, Send, Mic, X } from "lucide-react";
import "emoji-picker-element";
import { DraftAttachment, Contact } from "../../common/types/chat";

interface FPMessageInputProps {
  message: string;
  setMessage: (message: string | ((prev: string) => string)) => void;
  draftAttachment: DraftAttachment | null;
  getDraftCaption: () => string;
  selectedContact: Contact | null;
  isRecording: boolean;
  peerId: string;
  inputResetKey: number;
  onSend: () => void;
  onKeyPress: (e: KeyboardEvent<HTMLInputElement>) => void;
  onStartAudioRecording: () => void;
  onToggleMediaPopup: () => void;
  onToggleEmojiPicker: () => void;
  showEmojiPicker: boolean;
  audioBtnRef: RefObject<HTMLButtonElement>;
  inputRef: RefObject<HTMLInputElement>;
  buttonRef: RefObject<HTMLButtonElement>;
  emojiPickerRef: RefObject<HTMLDivElement>;
}

export default function FPMessageInput({
  message,
  setMessage,
  draftAttachment,
  getDraftCaption,
  selectedContact,
  isRecording,
  peerId,
  inputResetKey,
  onSend,
  onKeyPress,
  onStartAudioRecording,
  onToggleMediaPopup,
  onToggleEmojiPicker,
  showEmojiPicker,
  audioBtnRef,
  inputRef,
  buttonRef,
  emojiPickerRef,
}: FPMessageInputProps): React.JSX.Element {
  // Handle emoji selection and make navigation bar scrollable
  useEffect(() => {
    if (!showEmojiPicker) return;

    let pickerElement: Element | null = null;
    let handleEmojiSelect: ((event: Event) => void) | null = null;

    const setupEmojiPicker = () => {
      // emojiPickerRef points to the container, so we need to find the emoji-picker element
      pickerElement =
        emojiPickerRef.current?.querySelector("emoji-picker") ||
        document.querySelector("emoji-picker.emoji-picker-element");
      if (!pickerElement) return;

      // Add event listener for emoji selection
      // emoji-picker-element fires different events, try multiple
      handleEmojiSelect = (event: Event) => {
        // Try different event structures
        const customEvent = event as CustomEvent;
        const emoji =
          customEvent.detail?.unicode ||
          (customEvent.detail as { emoji?: { unicode?: string } })?.emoji
            ?.unicode ||
          customEvent.detail ||
          (event as { emoji?: string }).emoji ||
          (event as { unicode?: string }).unicode;

        if (emoji && typeof emoji === "string") {
          setMessage((prev) => prev + emoji);
        }
      };

      // Try multiple event names that emoji-picker-element might use
      pickerElement.addEventListener("emoji-click", handleEmojiSelect);
      pickerElement.addEventListener("emojiClick", handleEmojiSelect);
      pickerElement.addEventListener("change", handleEmojiSelect);

      // Try to access shadow DOM for navigation styling
      const shadowRoot = (
        pickerElement as HTMLElement & { shadowRoot?: ShadowRoot }
      ).shadowRoot;
      if (shadowRoot) {
        // Common selectors for navigation in emoji-picker-element
        const navSelectors = [
          "nav",
          ".nav",
          '[part="nav"]',
          ".category-nav",
          ".epr-category-nav",
          ".category-buttons",
          'div[role="tablist"]',
          ".tabs",
        ];

        for (const selector of navSelectors) {
          const navElement = shadowRoot.querySelector(
            selector
          ) as HTMLElement | null;
          if (navElement) {
            navElement.style.overflowX = "auto";
            navElement.style.overflowY = "hidden";
            navElement.style.whiteSpace = "nowrap";
            navElement.style.display = "flex";
            navElement.style.scrollbarWidth = "thin";
            navElement.style.setProperty("-webkit-overflow-scrolling", "touch");
            break; // Found and styled, exit
          }
        }

        // Also try to find any horizontal scrollable container
        const allDivs = shadowRoot.querySelectorAll("div");
        allDivs.forEach((div) => {
          const computedStyle = window.getComputedStyle(div);
          if (
            computedStyle.display === "flex" &&
            computedStyle.flexDirection === "row" &&
            div.children.length > 5 // Likely the nav bar with multiple category buttons
          ) {
            (div as HTMLElement).style.overflowX = "auto";
            (div as HTMLElement).style.overflowY = "hidden";
            (div as HTMLElement).style.whiteSpace = "nowrap";
          }
        });
      }
    };

    // Wait for the component to render
    const timeoutId = setTimeout(setupEmojiPicker, 100);

    return () => {
      clearTimeout(timeoutId);
      // Cleanup event listeners
      if (pickerElement && handleEmojiSelect) {
        pickerElement.removeEventListener("emoji-click", handleEmojiSelect);
        pickerElement.removeEventListener("emojiClick", handleEmojiSelect);
        pickerElement.removeEventListener("change", handleEmojiSelect);
      }
    };
  }, [showEmojiPicker, setMessage, emojiPickerRef]);

  // 👉 Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        onToggleEmojiPicker();
      }
    };

    if (showEmojiPicker) {
      document.addEventListener("click", handleClickOutside, true);
      return () =>
        document.removeEventListener("click", handleClickOutside, true);
    }
  }, [showEmojiPicker, emojiPickerRef, onToggleEmojiPicker]);

  // Determine if we should show send icon or mic icon
  const hasText = typeof message === "string" ? message.trim() : message;
  const shouldShowSend = hasText || !!draftAttachment;

  return (
    <div className="input-container">
      <div className="input-wrapper">
        <div className="input-with-icons">
          {/* Plus Icon on Left */}
          <button
            className="icon-btn plus-btn"
            disabled={!selectedContact}
            onClick={onToggleMediaPopup}
            title="Attach media"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text)",
              flexShrink: 0,
            }}
          >
            <Plus size={24} />
          </button>

          {/* Input Field */}
          <input
            ref={inputRef}
            type="text"
            key={`${peerId}-${inputResetKey}`}
            placeholder={
              draftAttachment && draftAttachment.type === "audio"
                ? "Add a caption (optional)"
                : draftAttachment
                ? "Add a caption (optional)"
                : "Type a message"
            }
            value={
              draftAttachment && draftAttachment.type !== "audio"
                ? getDraftCaption()
                : draftAttachment
                ? ""
                : typeof message === "string"
                ? message
                : ""
            }
            onChange={(e) => {
              const text = e.target.value;
              if (draftAttachment) {
                try {
                  const obj = JSON.parse(message) as { caption?: string };
                  obj.caption = text;
                  setMessage(JSON.stringify(obj));
                } catch {
                  setMessage(text);
                }
              } else {
                setMessage(text);
              }
            }}
            onInput={(e) => {
              const text = (e.target as HTMLInputElement).value;
              if (!draftAttachment && text !== message) {
                setMessage(text);
              }
            }}
            onKeyPress={onKeyPress}
            className="message-input"
            disabled={!selectedContact}
            autoFocus
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              padding: "0.75rem",
              fontSize: "1rem",
            }}
          />

          {/* Send/Mic Icon on Right */}
          {shouldShowSend ? (
            <button
              className="icon-btn send-icon-btn"
              onClick={onSend}
              disabled={
                !selectedContact ||
                (!draftAttachment && !hasText)
              }
              title="Send message"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text)",
                flexShrink: 0,
              }}
            >
              <Send size={24} />
            </button>
          ) : (
            <button
              ref={audioBtnRef}
              className="icon-btn mic-icon-btn"
              disabled={!selectedContact || isRecording}
              onClick={() => {
                if (!isRecording) {
                  onStartAudioRecording();
                }
              }}
              onMouseDown={(e) => {
                if (!isRecording && selectedContact) {
                  e.preventDefault();
                  onStartAudioRecording();
                }
              }}
              title="Hold to record audio"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text)",
                flexShrink: 0,
              }}
            >
              <Mic size={24} />
            </button>
          )}
        </div>
      </div>

      {/* Emoji Picker - Keep below input */}
      {showEmojiPicker && (
        <div ref={emojiPickerRef} className="emoji-picker-container">
          <emoji-picker className="emoji-picker-element"></emoji-picker>
        </div>
      )}
    </div>
  );
}
