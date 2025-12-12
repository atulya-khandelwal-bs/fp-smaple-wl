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
  return (
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
    />
  );
}
