import React from "react";

interface FPImageMessageViewProps {
  imageUrl: string;
  fileName?: string;
  openImageViewer: (url: string, alt?: string) => void;
}

export default function FPImageMessageView({
  imageUrl,
  fileName,
  openImageViewer,
}: FPImageMessageViewProps): React.JSX.Element {
  const [imageError, setImageError] = React.useState(false);

  return (
    <div
      style={{
        maxWidth: "100%",
        maxHeight: "300px",
        borderRadius: "0.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f3f4f6",
        minHeight: "150px",
        position: "relative",
      }}
    >
      {!imageError ? (
        <img
          src={imageUrl}
          alt={fileName || "Image"}
          className="message-image"
          style={{
            maxWidth: "100%",
            maxHeight: "300px",
            borderRadius: "0.5rem",
            display: "block",
            cursor: "zoom-in",
            pointerEvents: "auto",
            userSelect: "none",
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            openImageViewer(imageUrl, fileName);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            // Use setTimeout to avoid passive event listener issue
            setTimeout(() => {
              openImageViewer(imageUrl, fileName);
            }, 0);
          }}
          onError={() => {
            setImageError(true);
          }}
        />
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            color: "#9ca3af",
            textAlign: "center",
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ marginBottom: "0.5rem" }}
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>
            Image not available
          </span>
        </div>
      )}
    </div>
  );
}
