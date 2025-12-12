import { useEffect, RefObject, KeyboardEvent } from "react";
import { Smile } from "lucide-react";
import "emoji-picker-element";
import { DraftAttachment, Contact } from "../../common/types/chat";
import React from "react";

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
            (navElement.style as any).webkitOverflowScrolling = "touch";
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
        !emojiPickerRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        onToggleEmojiPicker();
      }
    };

    if (showEmojiPicker) {
      document.addEventListener("click", handleClickOutside, true);
      return () =>
        document.removeEventListener("click", handleClickOutside, true);
    }
  }, [showEmojiPicker, emojiPickerRef, buttonRef, onToggleEmojiPicker]);

  return (
    <div className="input-container">
      <div className="input-wrapper">
        <div className="input-with-audio">
          <input
            ref={inputRef}
            type="text"
            key={`${peerId}-${inputResetKey}`} // Force remount when peer changes or after sending
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
              // Always call setMessage to ensure React detects the change
              if (draftAttachment) {
                try {
                  const obj = JSON.parse(message) as { caption?: string };
                  obj.caption = text;
                  setMessage(JSON.stringify(obj));
                } catch {
                  setMessage(text);
                }
              } else {
                // Force update by always setting the message, even if it's the same
                // This ensures React's controlled input properly tracks changes
                setMessage(text);
              }
            }}
            onInput={(e) => {
              // Additional safeguard: ensure input value is properly tracked
              // This helps catch any edge cases where onChange might not fire
              const text = (e.target as HTMLInputElement).value;
              if (!draftAttachment && text !== message) {
                setMessage(text);
              }
            }}
            onKeyPress={onKeyPress}
            className="message-input"
            disabled={!selectedContact}
            autoFocus
          />
          {!(typeof message === "string" ? message.trim() : message) &&
            !draftAttachment && (
              <button
                ref={audioBtnRef}
                className="audio-btn"
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
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </button>
            )}
        </div>
      </div>
      <div className="button-container">
        <button
          className="icon-btn attachment-btn"
          disabled={!selectedContact}
          onClick={onToggleMediaPopup}
          title="Attach media"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.2a2 2 0 0 1-2.83-2.83l8.49-8.49" />
          </svg>
        </button>
        <button
          title="Attach emoji"
          ref={buttonRef}
          className="emoji-button"
          onClick={onToggleEmojiPicker}
        >
          <Smile />
        </button>
        <button
          className="send-button"
          onClick={onSend}
          disabled={
            !selectedContact ||
            (!draftAttachment &&
              !(typeof message === "string" ? message.trim() : message))
          }
          title="Send message"
        >
          Send
        </button>

        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="emoji-picker-container">
            <emoji-picker className="emoji-picker-element"></emoji-picker>
          </div>
        )}
      </div>
    </div>
  );
}
