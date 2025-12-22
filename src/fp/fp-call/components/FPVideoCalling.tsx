import React from "react";
import AgoraRTC, { AgoraRTCProvider, IAgoraRTCClient } from "agora-rtc-react";
import FPCallUI from "./FPCallUI.tsx";
import VirtualBackgroundExtension from "agora-extension-virtual-background";
import {
  useIsConnected,
  useJoin,
  useLocalMicrophoneTrack,
  useLocalCameraTrack,
  usePublish,
  useRemoteUsers,
} from "agora-rtc-react";
import { useEffect, useRef, useState } from "react";
import config from "../../common/config.ts";
import { FPVideoCallingProps, BackgroundOption } from "../../common/types/call";

interface FPVideoCallingInnerProps extends FPVideoCallingProps {
  client: IAgoraRTCClient;
  peerPresenceStatus?: "offline" | "waiting" | "in_call" | null;
  localUserName?: string;
  localUserPhoto?: string;
  peerName?: string;
  peerAvatar?: string;
}

// Inner component that uses Agora hooks - must be wrapped by AgoraRTCProvider
const FPVideoCallingInner = ({
  userId,
  peerId: _peerId,
  channel: propChannel,
  isInitiator: _isInitiator,
  onEndCall,
  isAudioCall = false,
  client: _client,
  peerPresenceStatus,
  localUserName,
  localUserPhoto,
  peerName,
  peerAvatar,
}: FPVideoCallingInnerProps): React.JSX.Element => {
  // State management
  const [calling, setCalling] = useState<boolean>(false);
  const isConnected = useIsConnected();
  const isStandalone = !userId || !propChannel;
  const [appId, setAppId] = useState<string>(config.agora.rtcAppId);
  const [channel, setChannel] = useState<string>(propChannel || "second-time");
  const [token, setToken] = useState<string>("");

  // Generate UID from userId (convert string to number hash)
  const generateUidFromUserId = (userId: string): number => {
    if (!userId) return 0;
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  };

  const initialUid = userId ? generateUidFromUserId(userId) : 0;
  const [uid, setUid] = useState<string | number>(initialUid);
  const [generatingToken, setGeneratingToken] = useState<boolean>(false);
  const [pendingJoin, setPendingJoin] = useState<boolean>(false);
  const hasAttemptedJoinRef = useRef<boolean>(false);

  // Media controls state
  const [micOn, setMic] = useState<boolean>(true);
  const [cameraOn, setCamera] = useState<boolean>(!isAudioCall);
  const [virtualBackground, setVirtualBackground] = useState<boolean>(false);
  const [selectedBackground, setSelectedBackground] = useState<string | null>(
    null
  );
  const [showBackgroundOptions, setShowBackgroundOptions] =
    useState<boolean>(false);
  const [speakerOn, setSpeakerOn] = useState<boolean>(true);
  const [showMoreOptions, setShowMoreOptions] = useState<boolean>(false);
  const [useAgoraExtension, setUseAgoraExtension] = useState<boolean>(true);
  const [controlsVisible, setControlsVisible] = useState<boolean>(true);
  const [mainUserId, setMainUserId] = useState<number | null>(null);

  // Refs
  const hideControlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);
  const callStartTimeRef = useRef<number | null>(null);
  const remoteUserEverJoinedRef = useRef<boolean>(false);
  const processorRef = useRef<{
    setOptions?: (options: unknown) => Promise<void> | void;
    enable?: () => Promise<void> | void;
    disable?: () => Promise<void> | void;
    init?: () => Promise<void>;
    pipe?: (processor: unknown) => unknown;
  } | null>(null);
  const extensionRef = useRef<VirtualBackgroundExtension | null>(null);
  const loadedImagesRef = useRef<Map<string, HTMLImageElement>>(
    new Map()
  ); /*  */

  // Recorder UID constant - ignore all events for this user
  const RECORDER_UID = 999999999;

  // Agora hooks
  const { localMicrophoneTrack } = useLocalMicrophoneTrack(micOn);
  const { localCameraTrack } = useLocalCameraTrack(cameraOn && !isAudioCall);
  const allRemoteUsers = useRemoteUsers();

  // Helper function to stop MediaStreamTrack (system device)
  const stopMediaStreamTrack = (
    track: {
      getMediaStreamTrack?: () => MediaStreamTrack | null;
      getTrack?: () => MediaStreamTrack | null;
    } | null,
    trackName: string
  ): void => {
    if (!track) return;

    try {
      // Get the underlying MediaStreamTrack
      let mediaStreamTrack: MediaStreamTrack | null = null;
      if (typeof track.getMediaStreamTrack === "function") {
        mediaStreamTrack = track.getMediaStreamTrack();
      } else if (typeof track.getTrack === "function") {
        mediaStreamTrack = track.getTrack();
      } else if ("track" in track && track.track instanceof MediaStreamTrack) {
        mediaStreamTrack = track.track as MediaStreamTrack;
      }

      // Stop the MediaStreamTrack to turn off system device
      if (mediaStreamTrack && mediaStreamTrack.readyState !== "ended") {
        mediaStreamTrack.stop();
        console.log(`🛑 Stopped ${trackName} MediaStreamTrack (system device)`);
      }
    } catch (error) {
      console.warn(`Error stopping ${trackName} MediaStreamTrack:`, error);
    }
  };

  // Filter out recorder user (UID 999999999) - ignore all events for this user
  const remoteUsers = allRemoteUsers.filter((user) => {
    const userUid =
      typeof user.uid === "string" ? parseInt(user.uid, 10) : user.uid;
    return userUid !== RECORDER_UID;
  });

  // Log all connected users details
  useEffect(() => {
    if (isConnected && calling) {
      const localUserDetails = {
        userId: userId,
        uid: typeof uid === "number" ? uid : parseInt(String(uid), 10),
        name: localUserName || userId,
        photo: localUserPhoto || null,
        hasAudio: localMicrophoneTrack ? true : false,
        hasVideo: localCameraTrack ? true : false,
        micOn: micOn,
        cameraOn: cameraOn,
        isLocal: true,
      };

      const remoteUsersDetails = remoteUsers.map((user) => ({
        uid:
          typeof user.uid === "number"
            ? user.uid
            : parseInt(String(user.uid), 10),
        hasAudio: user.hasAudio || false,
        hasVideo: user.hasVideo || false,
        audioTrack: user.audioTrack ? "present" : "absent",
        videoTrack: user.videoTrack ? "present" : "absent",
        isLocal: false,
      }));

      console.log("📞 === CALL CONNECTION DETAILS ===");
      console.log("Local User:", localUserDetails);
      console.log("Remote Users:", remoteUsersDetails);
      console.log("Total Users in Call:", 1 + remoteUsers.length);
      console.log("Channel:", channel);
      console.log("Is Connected:", isConnected);
      console.log("Calling State:", calling);
      console.log("===================================");
    }
  }, [
    isConnected,
    calling,
    userId,
    uid,
    localUserName,
    localUserPhoto,
    localMicrophoneTrack,
    localCameraTrack,
    micOn,
    cameraOn,
    remoteUsers,
    channel,
  ]);

  // Background options
  const backgroundOptions: BackgroundOption[] = [
    { id: "blur", name: "Blur", type: "blur" },
    {
      id: "office",
      name: "Office",
      type: "image",
      url: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop",
    },
    {
      id: "nature",
      name: "Nature",
      type: "image",
      url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop",
    },
    {
      id: "space",
      name: "Space",
      type: "image",
      url: "https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=800&h=600&fit=crop",
    },
    {
      id: "beach",
      name: "Beach",
      type: "image",
      url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop",
    },
    {
      id: "city",
      name: "City",
      type: "image",
      url: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop",
    },
  ];

  // Register virtual background extension for video calls
  useEffect(() => {
    if (!isAudioCall) {
      const extension = new VirtualBackgroundExtension();
      if (!extension.checkCompatibility()) {
        console.error("Does not support Virtual Background!");
      }
      AgoraRTC.registerExtensions([extension]);
      extensionRef.current = extension;
    }
  }, [isAudioCall]);

  // Suppress Agora analytics errors
  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;

    const isAgoraAnalyticsError = (message: unknown): boolean => {
      if (typeof message === "string") {
        return (
          message.includes("statscollector") ||
          message.includes("ERR_CONNECTION_RESET") ||
          message.includes("events/messages") ||
          message.includes("net::ERR_CONNECTION_RESET")
        );
      }
      return false;
    };

    const errorHandler = (message: unknown, ...args: unknown[]): void => {
      if (
        isAgoraAnalyticsError(message) ||
        (args.length > 0 &&
          typeof args[0] === "string" &&
          isAgoraAnalyticsError(args[0]))
      ) {
        return;
      }
      originalError(message, ...args);
    };

    const warnHandler = (message: unknown, ...args: unknown[]): void => {
      if (
        isAgoraAnalyticsError(message) ||
        (args.length > 0 &&
          typeof args[0] === "string" &&
          isAgoraAnalyticsError(args[0]))
      ) {
        return;
      }
      originalWarn(message, ...args);
    };

    console.error = errorHandler;
    console.warn = warnHandler;

    const handleRejection = (event: PromiseRejectionEvent): void => {
      const reason = event.reason?.message || event.reason?.toString() || "";
      if (isAgoraAnalyticsError(reason)) {
        event.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  // Track call start time
  useEffect(() => {
    if (isConnected && !callStartTimeRef.current) {
      callStartTimeRef.current = Date.now();
      console.log("Call started at:", new Date(callStartTimeRef.current));
    }
  }, [isConnected]);

  // Track previous calling state to detect call end
  const prevCallingRef = useRef<boolean>(calling);

  // Stop system camera and mic when call ends (calling becomes false)
  useEffect(() => {
    // When calling changes from true to false, stop the system devices
    if (prevCallingRef.current && !calling) {
      console.log(
        "🛑 Call ended (calling=false), stopping system camera and microphone"
      );
      stopMediaStreamTrack(localCameraTrack, "camera");
      stopMediaStreamTrack(localMicrophoneTrack, "microphone");

      // Also close the Agora tracks to fully release resources
      try {
        if (localCameraTrack && typeof localCameraTrack.close === "function") {
          localCameraTrack.close();
          console.log("🛑 Closed camera Agora track");
        }
        if (
          localMicrophoneTrack &&
          typeof localMicrophoneTrack.close === "function"
        ) {
          localMicrophoneTrack.close();
          console.log("🛑 Closed microphone Agora track");
        }
      } catch (error) {
        console.warn("Error closing tracks:", error);
      }
    }
    prevCallingRef.current = calling;
  }, [calling, localCameraTrack, localMicrophoneTrack]);

  // Cleanup on component unmount - stop all tracks
  useEffect(() => {
    return () => {
      console.log(
        "🛑 Component unmounting, stopping system camera and microphone"
      );
      stopMediaStreamTrack(localCameraTrack, "camera");
      stopMediaStreamTrack(localMicrophoneTrack, "microphone");

      // Also close the Agora tracks
      try {
        if (localCameraTrack && typeof localCameraTrack.close === "function") {
          localCameraTrack.close();
        }
        if (
          localMicrophoneTrack &&
          typeof localMicrophoneTrack.close === "function"
        ) {
          localMicrophoneTrack.close();
        }
      } catch (error) {
        console.warn("Error closing tracks on unmount:", error);
      }
    };
  }, [localCameraTrack, localMicrophoneTrack]);

  // Ignore all remote events for recorder (UID 999999999)
  useEffect(() => {
    if (!_client) return;

    // Helper to check if UID is recorder
    const isRecorder = (uid: string | number): boolean => {
      const uidNum = typeof uid === "string" ? parseInt(uid, 10) : uid;
      return uidNum === RECORDER_UID;
    };

    // Ignore user-joined event for recorder
    const handleUserJoined = (user: { uid: string | number }): void => {
      if (isRecorder(user.uid)) {
        console.log("Ignoring recorder user join event (UID: 999999999)");
        return;
      }
    };

    // Ignore user-left event for recorder
    const handleUserLeft = (user: { uid: string | number }): void => {
      if (isRecorder(user.uid)) {
        console.log("Ignoring recorder user leave event (UID: 999999999)");
        return;
      }
    };

    // Ignore user-published event for recorder (mute/unmute)
    const handleUserPublished = (user: { uid: string | number }): void => {
      if (isRecorder(user.uid)) {
        console.log("Ignoring recorder user published event (UID: 999999999)");
        return;
      }
    };

    // Ignore user-unpublished event for recorder (mute/unmute)
    const handleUserUnpublished = (user: { uid: string | number }): void => {
      if (isRecorder(user.uid)) {
        console.log(
          "Ignoring recorder user unpublished event (UID: 999999999)"
        );
        return;
      }
    };

    // Add event listeners
    _client.on("user-joined", handleUserJoined);
    _client.on("user-left", handleUserLeft);
    _client.on("user-published", handleUserPublished);
    _client.on("user-unpublished", handleUserUnpublished);

    // Cleanup
    return () => {
      _client.off("user-joined", handleUserJoined);
      _client.off("user-left", handleUserLeft);
      _client.off("user-published", handleUserPublished);
      _client.off("user-unpublished", handleUserUnpublished);
    };
  }, [_client]);

  // Track if remote user ever joined (excluding recorder)
  useEffect(() => {
    if (remoteUsers.length > 0) {
      remoteUserEverJoinedRef.current = true;
      console.log("Remote user joined. Both users are connected.");
    }
  }, [remoteUsers.length]);

  // Reset mainUserId when number of users changes
  useEffect(() => {
    if (remoteUsers.length !== 1) {
      setMainUserId(null);
    } else if (mainUserId !== null) {
      const userExists = remoteUsers.some((user) => user.uid === mainUserId);
      if (!userExists) {
        setMainUserId(null);
      }
    }
  }, [remoteUsers.length, mainUserId, remoteUsers]);

  // Preload background images
  useEffect(() => {
    const preloadImages = async () => {
      for (const bg of backgroundOptions) {
        if (bg.type === "image" && bg.url) {
          try {
            const img = new Image();
            img.crossOrigin = "anonymous";
            await new Promise<HTMLImageElement>((resolve, reject) => {
              img.onload = () => {
                loadedImagesRef.current.set(bg.id, img);
                console.log(`Preloaded image for ${bg.name}`);
                resolve(img);
              };
              img.onerror = reject;
              if (bg.url) {
                img.src = bg.url;
              } else {
                reject(new Error("No URL provided"));
              }
            });
          } catch (error) {
            console.error(`Failed to preload image for ${bg.name}:`, error);
          }
        }
      }
    };
    preloadImages();
  }, []);

  // Setup virtual background processor
  useEffect(() => {
    if (!localCameraTrack || isAudioCall) return;

    const setupVirtualBackground = async () => {
      try {
        if (!extensionRef.current) {
          const ext = new VirtualBackgroundExtension();
          AgoraRTC.registerExtensions([ext]);
          extensionRef.current = ext;
        }

        if (!processorRef.current && extensionRef.current) {
          const processor = extensionRef.current.createProcessor();
          processorRef.current = processor as unknown as {
            setOptions?: (options: unknown) => Promise<void> | void;
            enable?: () => Promise<void> | void;
            disable?: () => Promise<void> | void;
            init?: () => Promise<void>;
            pipe?: (processor: unknown) => unknown;
          } | null;
          if (processorRef.current?.init) {
            await processorRef.current.init();
          }
        }

        if (processorRef.current && localCameraTrack.pipe) {
          // Type assertion needed for Agora SDK processor
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          localCameraTrack
            .pipe(processorRef.current as any)
            .pipe(localCameraTrack.processorDestination);
        }
      } catch (err) {
        console.error("Error setting up virtual background:", err);
      }
    };

    setupVirtualBackground();
  }, [localCameraTrack, isAudioCall]);

  // Enable/disable background effect dynamically
  useEffect(() => {
    const updateBackground = async () => {
      if (!processorRef.current && useAgoraExtension) return;

      try {
        if (virtualBackground && selectedBackground) {
          if (useAgoraExtension && processorRef.current) {
            let options: {
              type: string;
              blurDegree?: number;
              source?: HTMLImageElement | string;
            } = { type: "blur" };

            if (selectedBackground === "blur") {
              options = {
                type: "blur",
                blurDegree: 2,
              };
            } else if (selectedBackground) {
              const bg = backgroundOptions.find(
                (bg) => bg.id === selectedBackground
              );
              if (bg?.type === "image") {
                const preloadedImg =
                  loadedImagesRef.current.get(selectedBackground);
                if (preloadedImg) {
                  options = {
                    type: "img",
                    source: preloadedImg,
                  };
                  console.log("Using preloaded image for background");
                } else {
                  console.warn(
                    "Preloaded image not found, falling back to URL"
                  );
                  if (bg.url) {
                    options = {
                      type: "img",
                      source: bg.url,
                    };
                  }
                }
              }
            }

            console.log("Setting background options:", options);
            if (processorRef.current?.setOptions) {
              await processorRef.current.setOptions(options as unknown);
              if (processorRef.current.enable) {
                await processorRef.current.enable();
              }
            }
          }
        } else {
          console.log("Disabling virtual background");
          if (useAgoraExtension && processorRef.current?.disable) {
            await processorRef.current.disable();
          }
        }
      } catch (error) {
        console.error("Error updating background:", error);
        if (useAgoraExtension) {
          console.log("Agora extension failed, falling back to CSS approach");
          setUseAgoraExtension(false);
        }
      }
    };

    updateBackground();
  }, [virtualBackground, selectedBackground, useAgoraExtension]);

  // Auto-hide controls on mobile
  useEffect(() => {
    if (!isConnected || !videoContainerRef.current) return;

    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return;

    const container = videoContainerRef.current;

    const resetTimer = () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
      setControlsVisible(true);
      hideControlsTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 10000);
    };

    resetTimer();

    const handleUserInteraction = (e: Event): void => {
      const target = e.target as HTMLElement | null;
      if (target?.closest(".control-bar") || target?.closest(".call-header")) {
        resetTimer();
        return;
      }
      resetTimer();
    };

    container.addEventListener("click", handleUserInteraction);
    container.addEventListener("touchstart", handleUserInteraction);
    container.addEventListener("mousemove", handleUserInteraction);

    return () => {
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
      container.removeEventListener("click", handleUserInteraction);
      container.removeEventListener("touchstart", handleUserInteraction);
      container.removeEventListener("mousemove", handleUserInteraction);
    };
  }, [isConnected]);

  // Agora join and publish hooks
  useJoin(
    {
      appid: appId,
      channel,
      token: token || null,
      uid: typeof uid === "number" ? uid : undefined,
    },
    calling
  );
  usePublish(
    isAudioCall
      ? [localMicrophoneTrack]
      : [localMicrophoneTrack, localCameraTrack]
  );

  // Generate token from API
  const generateToken = async (): Promise<string | null> => {
    if (!channel || typeof uid !== "number") {
      if (!isStandalone) {
        console.error("Cannot generate token: missing channel or UID");
      } else {
        alert("Please enter channel name and UID");
      }
      return null;
    }
    setGeneratingToken(true);
    try {
      const response = await fetch(config.rtcToken.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channelName: channel,
          uid: uid,
          expireSecs: 3600,
          role: "publisher",
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate token: ${response.statusText}`);
      }

      const data = (await response.json()) as { token?: string };
      if (data.token) {
        const newToken = data.token;
        setToken(newToken);
        console.log(
          "Token generated successfully:",
          newToken.substring(0, 50) + "..."
        );
        return newToken;
      } else {
        throw new Error("Token not found in response");
      }
    } catch (error) {
      console.error("Error generating token:", error);
      alert(
        `Failed to generate token: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      return null;
    } finally {
      setGeneratingToken(false);
    }
  };

  // Handle join call
  const handleJoinCall = async (): Promise<void> => {
    if (!token && channel && typeof uid === "number") {
      setPendingJoin(true);
      const generatedToken = await generateToken();
      if (!generatedToken) {
        setPendingJoin(false);
        alert("Failed to generate token. Cannot join call.");
        return;
      }
    } else if (token) {
      setCalling(true);
    } else {
      alert("Token is required to join the call");
    }
  };

  // Auto-join when props are provided - only run once to prevent re-joining on re-renders
  useEffect(() => {
    // Prevent re-running if we've already attempted to join or if conditions aren't met
    if (
      hasAttemptedJoinRef.current ||
      isStandalone ||
      !propChannel ||
      !userId ||
      calling ||
      token ||
      pendingJoin ||
      typeof uid !== "number" ||
      uid <= 0
    ) {
      return;
    }

    console.log("Auto-joining call with props:", {
      channel: propChannel,
      userId: userId,
      uid: uid,
    });

    hasAttemptedJoinRef.current = true;
    const autoJoin = async () => {
      setPendingJoin(true);
      const generatedToken = await generateToken();
      if (generatedToken) {
        setToken(generatedToken);
      } else {
        setPendingJoin(false);
        hasAttemptedJoinRef.current = false; // Reset on failure to allow retry
        console.error("Failed to auto-generate token");
      }
    };
    autoJoin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStandalone, propChannel, userId, uid, calling, token, pendingJoin]);

  // Handle join when token is ready
  useEffect(() => {
    if (pendingJoin && token) {
      console.log(
        "Token ready, joining call with token:",
        token.substring(0, 50) + "..."
      );
      console.log("App ID:", appId);
      console.log("Channel:", channel);
      console.log("UID:", uid);
      setPendingJoin(false);
      setTimeout(() => {
        console.log("Setting calling to true...");
        setCalling(true);
      }, 300);
    }
  }, [token, pendingJoin, appId, channel, uid]);

  // Close more options menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      const target = event.target as HTMLElement | null;
      if (
        !target?.closest(".more-options-menu") &&
        !target?.closest(".more-options-button")
      ) {
        setShowMoreOptions(false);
      }
    };

    if (showMoreOptions) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showMoreOptions]);

  // Handlers
  const handleBackgroundSelect = (background: BackgroundOption): void => {
    console.log("Background selected:", background);
    setSelectedBackground(background.id);
    setVirtualBackground(true);
    setShowBackgroundOptions(false);
  };

  const toggleVirtualBackground = (): void => {
    if (!virtualBackground) {
      setVirtualBackground(true);
      setSelectedBackground("blur");
    } else {
      setVirtualBackground(false);
      setSelectedBackground(null);
    }
  };

  const handleEndCall = (): void => {
    // Stop system camera and mic when call ends
    console.log("🛑 Call ending, stopping system camera and microphone");
    stopMediaStreamTrack(localCameraTrack, "camera");
    stopMediaStreamTrack(localMicrophoneTrack, "microphone");

    // Also close the Agora tracks to fully release resources
    try {
      if (localCameraTrack && typeof localCameraTrack.close === "function") {
        localCameraTrack.close();
        console.log("🛑 Closed camera Agora track");
      }
      if (
        localMicrophoneTrack &&
        typeof localMicrophoneTrack.close === "function"
      ) {
        localMicrophoneTrack.close();
        console.log("🛑 Closed microphone Agora track");
      }
    } catch (error) {
      console.warn("Error closing tracks:", error);
    }

    if (calling && onEndCall) {
      const callEndTime = Date.now();
      const callStartTime = callStartTimeRef.current;
      const duration = callStartTime
        ? Math.floor((callEndTime - callStartTime) / 1000)
        : 0;
      const bothUsersConnected = remoteUserEverJoinedRef.current;

      console.log("Ending call with:", {
        duration,
        bothUsersConnected,
        callStartTime: callStartTime ? new Date(callStartTime) : null,
        callEndTime: new Date(callEndTime),
      });

      onEndCall({
        duration,
        bothUsersConnected,
        callStartTime,
        callEndTime,
      });

      callStartTimeRef.current = null;
      remoteUserEverJoinedRef.current = false;
    } else {
      setCalling((a) => !a);
    }
  };

  return (
    <div>
      <FPCallUI
        // Connection state
        isConnected={isConnected}
        isStandalone={isStandalone}
        calling={calling}
        // Media tracks
        localMicrophoneTrack={localMicrophoneTrack}
        localCameraTrack={localCameraTrack}
        remoteUsers={remoteUsers}
        // Media controls
        micOn={micOn}
        setMic={setMic}
        cameraOn={cameraOn}
        setCamera={setCamera}
        speakerOn={speakerOn}
        setSpeakerOn={setSpeakerOn}
        // Virtual background
        virtualBackground={virtualBackground}
        selectedBackground={selectedBackground}
        showBackgroundOptions={showBackgroundOptions}
        setShowBackgroundOptions={setShowBackgroundOptions}
        useAgoraExtension={useAgoraExtension}
        backgroundOptions={backgroundOptions}
        toggleVirtualBackground={toggleVirtualBackground}
        handleBackgroundSelect={handleBackgroundSelect}
        // UI state
        showMoreOptions={showMoreOptions}
        setShowMoreOptions={setShowMoreOptions}
        controlsVisible={controlsVisible}
        setControlsVisible={setControlsVisible}
        mainUserId={mainUserId}
        setMainUserId={setMainUserId}
        // Refs
        videoContainerRef={videoContainerRef}
        hideControlsTimerRef={hideControlsTimerRef}
        // Standalone mode props
        appId={appId}
        setAppId={setAppId}
        channel={channel}
        setChannel={setChannel}
        uid={uid}
        setUid={setUid}
        token={token}
        setToken={setToken}
        generatingToken={generatingToken}
        generateToken={generateToken}
        handleJoinCall={handleJoinCall}
        // Other props
        isAudioCall={isAudioCall}
        onEndCall={handleEndCall}
        peerPresenceStatus={peerPresenceStatus}
        // User info
        localUserId={userId}
        localUserName={localUserName}
        localUserPhoto={localUserPhoto}
        peerName={peerName}
        peerAvatar={peerAvatar}
      />
    </div>
  );
};

// Outer component that creates client and wraps with provider
export const FPVideoCalling = ({
  userId,
  peerId,
  channel: propChannel,
  isInitiator,
  onEndCall,
  isAudioCall = false,
  peerPresenceStatus,
  localUserName,
  localUserPhoto,
  peerName,
  peerAvatar,
}: FPVideoCallingProps): React.JSX.Element => {
  // Create Agora client
  const client = AgoraRTC.createClient({
    mode: "rtc",
    codec: "vp8",
  });

  return (
    <AgoraRTCProvider client={client}>
      <FPVideoCallingInner
        userId={userId}
        peerId={peerId}
        channel={propChannel}
        isInitiator={isInitiator}
        onEndCall={onEndCall}
        isAudioCall={isAudioCall}
        client={client}
        peerPresenceStatus={peerPresenceStatus}
        localUserName={localUserName}
        localUserPhoto={localUserPhoto}
        peerName={peerName}
        peerAvatar={peerAvatar}
      />
    </AgoraRTCProvider>
  );
};
