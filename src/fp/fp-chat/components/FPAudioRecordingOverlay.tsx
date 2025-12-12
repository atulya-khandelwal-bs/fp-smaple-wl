import React from "react";

interface FPAudioRecordingOverlayProps {
  isRecording: boolean;
  recordingDuration: number;
  onCancel: () => void;
  onStop: () => void;
  formatDuration: (seconds: number) => string;
}

export default function FPAudioRecordingOverlay({
  isRecording,
  recordingDuration,
  onCancel,
  onStop,
  formatDuration,
}: FPAudioRecordingOverlayProps): React.JSX.Element | null {
  if (!isRecording) return null;

  return (
    <div
      className="audio-recording-overlay"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div
        style={{
          background: "#111827",
          borderRadius: 16,
          padding: 24,
          width: "min(90vw, 320px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "#dc2626",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </div>
        <div style={{ color: "white", fontSize: 24, fontWeight: 700 }}>
          {formatDuration(recordingDuration)}
        </div>
        <div style={{ color: "#9ca3af", fontSize: 14, textAlign: "center" }}>
          Recording audio message...
        </div>
        <div
          style={{
            display: "flex",
            gap: 12,
            width: "100%",
            marginTop: 8,
          }}
        >
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: 8,
              border: "none",
              background: "#6b7280",
              color: "white",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onStop}
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: 8,
              border: "none",
              background: "#10b981",
              color: "white",
              cursor: "pointer",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5 3h14v18H5V3z" />
            </svg>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
