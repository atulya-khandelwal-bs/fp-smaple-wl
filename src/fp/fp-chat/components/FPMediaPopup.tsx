import React from "react";
interface FPMediaPopupProps {
  showMediaPopup: boolean;
  onSelect: (type: "photos" | "camera" | "file") => void;
  onClose: () => void;
}

export default function FPMediaPopup({
  showMediaPopup,
  onSelect,
  onClose: _onClose,
}: FPMediaPopupProps): React.JSX.Element | null {
  if (!showMediaPopup) return null;

  return (
    <div className="media-popup">
      <div className="media-options">
        <button className="media-option" onClick={() => onSelect("photos")}>
          <div className="media-icon photos-icon">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
          <span className="media-label">Photos</span>
        </button>

        <button className="media-option" onClick={() => onSelect("camera")}>
          <div className="media-icon camera-icon">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
          <span className="media-label">Camera</span>
        </button>

        <button className="media-option" onClick={() => onSelect("file")}>
          <div className="media-icon file-icon">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <span className="media-label">File</span>
        </button>
      </div>
    </div>
  );
}
