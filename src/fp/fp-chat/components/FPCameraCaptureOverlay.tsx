import { RefObject } from "react";
import React from "react";

interface FPCameraCaptureOverlayProps {
  showCameraCapture: boolean;
  videoRef: RefObject<HTMLVideoElement>;
  onClose: () => void;
  onCapture: () => void;
}

export default function FPCameraCaptureOverlay({
  showCameraCapture,
  videoRef,
  onClose,
  onCapture,
}: FPCameraCaptureOverlayProps): React.JSX.Element | null {
  if (!showCameraCapture) return null;

  return (
    <div
      className="camera-overlay"
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
          borderRadius: 12,
          padding: 12,
          width: "min(90vw, 640px)",
        }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ width: "100%", borderRadius: 8, background: "black" }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 8,
            gap: 8,
          }}
        >
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 8,
              border: "none",
              background: "#6b7280",
              color: "white",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onCapture}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 8,
              border: "none",
              background: "#10b981",
              color: "white",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Capture
          </button>
        </div>
      </div>
    </div>
  );
}
