import React from "react";
import { Download } from "lucide-react";

interface FPFileMessageViewProps {
  fileUrl?: string;
  fileName?: string;
  fileMime?: string;
  fileSizeBytes?: number;
  fileSize?: string;
  icons_details?: {
    left_icon?: string;
    right_icon?: string;
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
}

export default function FPFileMessageView({
  fileUrl,
  fileName,
  fileMime,
  fileSizeBytes,
  fileSize,
  icons_details,
  redirection_details,
}: FPFileMessageViewProps): React.JSX.Element {
  // Get first redirect URL if available (use it if fileUrl is not available)
  const redirectUrl = redirection_details?.[0]?.redirect_url;

  const handleClick = (): void => {
    // Only handle click if there's a redirect URL and no fileUrl
    if (redirectUrl && !fileUrl) {
      if (
        redirectUrl.startsWith("http://") ||
        redirectUrl.startsWith("https://")
      ) {
        window.open(redirectUrl, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = redirectUrl;
      }
    }
  };
  // Format file size
  const formatFileSize = (): string => {
    if (fileSizeBytes != null) {
      const kb = Math.round(fileSizeBytes / 1024);
      if (kb >= 1024) {
        return `${(kb / 1024).toFixed(1)} MB`;
      }
      return `${kb} KB`;
    }
    if (fileSize) {
      return `${fileSize} KB`;
    }
    return "";
  };

  // Get file type label
  const fileTypeLabel = fileMime && fileMime.includes("pdf") ? "PDF" : "FILE";

  // Truncate file name if too long
  const displayFileName = (() => {
    const name = fileName || fileUrl || "File";
    const maxLength = 40; // Adjust as needed
    if (name.length > maxLength) {
      return `${name.substring(0, maxLength)}...`;
    }
    return name;
  })();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        maxWidth: 380,
        cursor: redirectUrl && !fileUrl ? "pointer" : "default",
      }}
      onClick={redirectUrl && !fileUrl ? handleClick : undefined}
    >
      {/* First row: File name */}
      <div
        style={{
          fontWeight: 600,
          color: "#0f172a",
          fontSize: "14px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={fileName || fileUrl || "File"}
      >
        {fileUrl ? (
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              color: "#2563eb",
              textDecoration: "none",
            }}
            download={fileName || undefined}
          >
            {displayFileName}
          </a>
        ) : (
          displayFileName
        )}
      </div>

      {/* Second row: File type (left) and Download icon + File size (right) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* Left side: Left icon (if provided) or File type */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          {/* Left Icon */}
          {icons_details?.left_icon ? (
            <img
              src={icons_details.left_icon}
              alt="Left icon"
              style={{
                width: "18px",
                height: "18px",
                flexShrink: 0,
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : null}

          {/* File type badge */}
          <div
            aria-hidden
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "#fee2e2", // light red
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#b91c1c",
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            {fileTypeLabel}
          </div>
        </div>

        {/* Right side: File size, Right icon (if provided), and Download icon */}
        {fileUrl && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {/* File size */}
            {formatFileSize() && (
              <span
                style={{
                  fontSize: "12px",
                  color: "#6b7280",
                }}
              >
                {formatFileSize()}
              </span>
            )}

            {/* Right Icon */}
            {icons_details?.right_icon && (
              <img
                src={icons_details.right_icon}
                alt="Right icon"
                style={{
                  width: "18px",
                  height: "18px",
                  flexShrink: 0,
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}

            {/* Download icon */}
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "24px",
                height: "24px",
                borderRadius: "4px",
                background: "#f3f4f6",
                color: "#374151",
                textDecoration: "none",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              title="Download"
              download={fileName || undefined}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background =
                  "#e5e7eb";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background =
                  "#f3f4f6";
              }}
            >
              <Download size={14} />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
