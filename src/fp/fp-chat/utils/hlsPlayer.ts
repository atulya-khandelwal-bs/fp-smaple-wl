import Hls, { type ErrorData } from "hls.js";

/**
 * Initialize HLS player for m3u8 video URLs
 * @param videoElement - HTML video element to attach HLS to
 * @param videoUrl - m3u8 URL to play
 * @returns HLS instance or null if not supported
 */
export const initializeHlsPlayer = (
  videoElement: HTMLVideoElement,
  videoUrl: string
): Hls | null => {
  if (!videoUrl || !videoUrl.includes(".m3u8")) {
    console.warn("Invalid HLS URL:", videoUrl);
    return null;
  }

  // Check if HLS is supported
  if (Hls.isSupported()) {
    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      backBufferLength: 90,
    });

    hls.loadSource(videoUrl);
    hls.attachMedia(videoElement);

    // Error handling
    hls.on(Hls.Events.ERROR, (_event: string, data: ErrorData) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.error("Fatal network error encountered, try to recover");
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.error("Fatal media error encountered, try to recover");
            hls.recoverMediaError();
            break;
          default:
            console.error("Fatal error, cannot recover");
            hls.destroy();
            break;
        }
      }
    });

    return hls;
  } else if (videoElement.canPlayType("application/vnd.apple.mpegurl")) {
    // Native HLS support (Safari)
    videoElement.src = videoUrl;
    return null; // No Hls instance needed for native support
  } else {
    console.error("HLS is not supported in this browser");
    return null;
  }
};

/**
 * Cleanup HLS player instance
 * @param hls - HLS instance to destroy
 */
export const cleanupHlsPlayer = (hls: Hls | null): void => {
  if (hls) {
    hls.destroy();
  }
};
