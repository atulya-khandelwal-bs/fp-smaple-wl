// import React, { useEffect } from "react";
import React from "react";
import { LocalUser, RemoteUser } from "agora-rtc-react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  Palette,
  Sparkles,
  X,
  Droplets,
  Volume2,
  VolumeX,
  Ellipsis,
} from "lucide-react";
import { FPCallUIProps } from "../../common/types/call";

export const FPCallUI = ({
  // Connection state
  isConnected,
  isStandalone,
  calling,
  // Media tracks
  localMicrophoneTrack,
  localCameraTrack,
  remoteUsers,
  // Media controls
  micOn,
  setMic,
  cameraOn,
  setCamera,
  speakerOn,
  setSpeakerOn,
  // Virtual background
  virtualBackground,
  selectedBackground,
  showBackgroundOptions,
  setShowBackgroundOptions,
  useAgoraExtension,
  backgroundOptions,
  toggleVirtualBackground,
  handleBackgroundSelect,
  // UI state
  showMoreOptions,
  setShowMoreOptions,
  controlsVisible,
  setControlsVisible,
  mainUserId,
  setMainUserId,
  // Refs
  videoContainerRef,
  hideControlsTimerRef,
  // Standalone mode props
  appId,
  setAppId,
  channel,
  setChannel,
  uid,
  setUid,
  token,
  setToken,
  generatingToken,
  generateToken,
  handleJoinCall,
  // Other props
  isAudioCall,
  onEndCall,
  peerPresenceStatus,
  // User info
  localUserName,
  localUserPhoto,
  localUserId,
  peerName,
  peerAvatar,
}: FPCallUIProps): React.JSX.Element => {
  // Helper function to get initials from name or userId
  const getInitials = (name?: string, userId?: string): string => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    if (userId) {
      return userId.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  // Helper component for circular avatar
  const CircularAvatar = ({
    name,
    photo,
    userId,
    size = 120,
  }: {
    name?: string;
    photo?: string;
    userId?: string;
    size?: number;
  }): React.JSX.Element => {
    const initials = getInitials(name, userId);
    const hasPhoto = photo && photo.trim() !== "";

    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: "50%",
          background: hasPhoto ? "transparent" : "#4f46e5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {hasPhoto ? (
          <img
            src={photo}
            alt={name || "User"}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            onError={(e) => {
              // Fallback to initials if image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
              const parent = target.parentElement;
              if (parent) {
                parent.style.background = "#4f46e5";
                const initialsDiv = document.createElement("div");
                initialsDiv.textContent = initials;
                initialsDiv.style.cssText = `
                  color: #ffffff;
                  font-size: ${size * 0.4}px;
                  font-weight: 600;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  width: 100%;
                  height: 100%;
                `;
                parent.appendChild(initialsDiv);
              }
            }}
          />
        ) : (
          <span
            style={{
              color: "#ffffff",
              fontSize: `${size * 0.4}px`,
              fontWeight: 600,
            }}
          >
            {initials}
          </span>
        )}
      </div>
    );
  };
  // // Log remote user details
  // useEffect(() => {
  //   if (remoteUsers && remoteUsers.length > 0) {
  //     console.log("📞 Remote Users in Call:", {
  //       count: remoteUsers.length,
  //       users: remoteUsers.map((user) => ({
  //         uid: user.uid,
  //         hasAudio: !!user.audioTrack,
  //         hasVideo: !!user.videoTrack,
  //         audioTrackState: user.audioTrack?.isPlaying
  //           ? "playing"
  //           : "not playing",
  //         videoTrackState: user.videoTrack?.isPlaying
  //           ? "playing"
  //           : "not playing",
  //         muted: user.audioTrack?.muted,
  //         cameraOn: user.videoTrack?.isPlaying,
  //         // Additional track details
  //         audioTrackId: user.audioTrack?.trackMediaType,
  //         videoTrackId: user.videoTrack?.trackMediaType,
  //       })),
  //     });

  //     // Log individual user details
  //     remoteUsers.forEach((user, index) => {
  //       console.log(`👤 Remote User ${index + 1}:`, {
  //         uid: user.uid,
  //         uidType: typeof user.uid,
  //         hasAudioTrack: !!user.audioTrack,
  //         hasVideoTrack: !!user.videoTrack,
  //         audioTrack: user.audioTrack
  //           ? {
  //               isPlaying: user.audioTrack.isPlaying,
  //               muted: user.audioTrack.muted,
  //               trackMediaType: user.audioTrack.trackMediaType,
  //               getVolumeLevel: typeof user.audioTrack.getVolumeLevel,
  //             }
  //           : null,
  //         videoTrack: user.videoTrack
  //           ? {
  //               isPlaying: user.videoTrack.isPlaying,
  //               trackMediaType: user.videoTrack.trackMediaType,
  //               getCurrentFrameData: typeof user.videoTrack.getCurrentFrameData,
  //             }
  //           : null,
  //       });
  //     });
  //   } else {
  //     console.log("📞 No remote users in call");
  //   }
  // }, [remoteUsers]);

  // Helper to reset controls timer on mobile
  const resetControlsTimer = (): void => {
    if (window.innerWidth <= 768) {
      setControlsVisible(true);
      if (hideControlsTimerRef.current) {
        clearTimeout(hideControlsTimerRef.current);
      }
      hideControlsTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 10000);
    }
  };

  // Show call UI if connected OR if calling is true (to handle race conditions)
  const shouldShowCallUI = isConnected || calling;
  
  return (
    <>
      {shouldShowCallUI ? (
        <div className="video-call-container" ref={videoContainerRef}>
          {/* Header */}
          <div
            className={`call-header ${
              controlsVisible ? "controls-visible" : "controls-hidden"
            }`}
            onClick={resetControlsTimer}
          >
            <h1 className="call-title">
              {isAudioCall ? "Audio Call" : "Video Call"}
            </h1>
            <div className="participant-count">
              {remoteUsers.length + 1} participant
              {remoteUsers.length !== 0 ? "s" : ""}
            </div>
            {peerPresenceStatus && remoteUsers.length === 0 && (
              <div
                className="presence-status"
                style={{
                  marginTop: "8px",
                  fontSize: "14px",
                  color: "#6b7280",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {peerPresenceStatus === "waiting" && (
                  <>
                    <span
                      style={{
                        display: "inline-block",
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: "#f59e0b",
                        animation: "pulse 2s infinite",
                      }}
                    />
                    <span>Waiting for peer to join...</span>
                  </>
                )}
                {peerPresenceStatus === "in_call" && (
                  <>
                    <span
                      style={{
                        display: "inline-block",
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: "#10b981",
                      }}
                    />
                    <span>Peer is in call</span>
                  </>
                )}
                {peerPresenceStatus === "offline" && (
                  <>
                    <span
                      style={{
                        display: "inline-block",
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: "#6b7280",
                      }}
                    />
                    <span>Peer is offline</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Video Grid */}
          <div className={`video-grid users-${remoteUsers.length + 1}`}>
            {/* Determine if local user is main based on mainUserId */}
            {remoteUsers.length === 1 && mainUserId === null ? (
              // Local user is main (full screen)
              <>
                <div className="video-item local main-video">
                  <div
                    className={`video-container ${
                      virtualBackground && !useAgoraExtension
                        ? "virtual-bg"
                        : ""
                    }`}
                  >
                    {virtualBackground &&
                      !useAgoraExtension &&
                      selectedBackground && (
                        <div className="virtual-background">
                          {selectedBackground === "blur" ? (
                            <div className="blur-background"></div>
                          ) : (
                            <img
                              src={
                                backgroundOptions.find(
                                  (bg) => bg.id === selectedBackground
                                )?.url
                              }
                              alt="Virtual background"
                              className="background-image"
                            />
                          )}
                        </div>
                      )}
                    {localCameraTrack && cameraOn && !isAudioCall ? (
                      <LocalUser
                        audioTrack={localMicrophoneTrack}
                        cameraOn={cameraOn}
                        micOn={micOn}
                        playAudio={false}
                        videoTrack={localCameraTrack}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: "8px",
                          position:
                            virtualBackground && !useAgoraExtension
                              ? "relative"
                              : "static",
                          zIndex:
                            virtualBackground && !useAgoraExtension ? 2 : 1,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#000",
                          color: "#fff",
                          borderRadius: "8px",
                          gap: "16px",
                        }}
                      >
                        {isAudioCall ? (
                          <>
                            <CircularAvatar
                              name={localUserName}
                              photo={localUserPhoto}
                              userId={localUserId}
                              size={120}
                            />
                            <span style={{ fontSize: "16px", fontWeight: 500 }}>
                              {localUserName || "Audio Call"}
                            </span>
                          </>
                        ) : cameraOn ? (
                          "Waiting for camera..."
                        ) : (
                          <>
                            <CircularAvatar
                              name={localUserName}
                              photo={localUserPhoto}
                              userId={localUserId}
                              size={120}
                            />
                            <span style={{ fontSize: "16px", fontWeight: 500 }}>
                              {localUserName || "Camera off"}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Remote user */}
                {remoteUsers.map((user) => (
                  <div
                    key={user.uid}
                    className="video-item remote-overlay"
                    onClick={(): void => {
                      setMainUserId(user.uid);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    {user.hasVideo && user.videoTrack ? (
                      <RemoteUser
                        user={user}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: "8px",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#000",
                          color: "#fff",
                          borderRadius: "8px",
                          gap: "16px",
                        }}
                      >
                        <CircularAvatar
                          name={peerName}
                          photo={peerAvatar}
                          userId={undefined}
                          size={120}
                        />
                        <span style={{ fontSize: "16px", fontWeight: 500 }}>
                          {peerName || "Camera off"}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </>
            ) : remoteUsers.length === 1 && mainUserId !== null ? (
              // Remote user is main (full screen)
              <>
                {remoteUsers.map((user) => (
                  <div
                    key={user.uid}
                    className="video-item remote-main main-video"
                  >
                    <RemoteUser
                      user={user}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: "8px",
                      }}
                    />
                  </div>
                ))}

                {/* Local user */}
                <div
                  className="video-item local remote-overlay"
                  onClick={(): void => {
                    setMainUserId(null);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <div
                    className={`video-container ${
                      virtualBackground && !useAgoraExtension
                        ? "virtual-bg"
                        : ""
                    }`}
                  >
                    {virtualBackground &&
                      !useAgoraExtension &&
                      selectedBackground && (
                        <div className="virtual-background">
                          {selectedBackground === "blur" ? (
                            <div className="blur-background"></div>
                          ) : (
                            <img
                              src={
                                backgroundOptions.find(
                                  (bg) => bg.id === selectedBackground
                                )?.url
                              }
                              alt="Virtual background"
                              className="background-image"
                            />
                          )}
                        </div>
                      )}
                    {localCameraTrack && cameraOn && !isAudioCall ? (
                      <LocalUser
                        audioTrack={localMicrophoneTrack}
                        cameraOn={cameraOn}
                        micOn={micOn}
                        playAudio={false}
                        videoTrack={localCameraTrack}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: "8px",
                          position:
                            virtualBackground && !useAgoraExtension
                              ? "relative"
                              : "static",
                          zIndex:
                            virtualBackground && !useAgoraExtension ? 2 : 1,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#000",
                          color: "#fff",
                          borderRadius: "8px",
                          gap: "16px",
                        }}
                      >
                        {isAudioCall ? (
                          <>
                            <CircularAvatar
                              name={localUserName}
                              photo={localUserPhoto}
                              userId={localUserId}
                              size={120}
                            />
                            <span style={{ fontSize: "16px", fontWeight: 500 }}>
                              {localUserName || "Audio Call"}
                            </span>
                          </>
                        ) : cameraOn ? (
                          "Waiting for camera..."
                        ) : (
                          <>
                            <CircularAvatar
                              name={localUserName}
                              photo={localUserPhoto}
                              userId={localUserId}
                              size={120}
                            />
                            <span style={{ fontSize: "16px", fontWeight: 500 }}>
                              {localUserName || "Camera off"}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              // Default layout for 1 user or 3+ users (no switching)
              <>
                <div className="video-item local main-video">
                  <div
                    className={`video-container ${
                      virtualBackground && !useAgoraExtension
                        ? "virtual-bg"
                        : ""
                    }`}
                  >
                    {virtualBackground &&
                      !useAgoraExtension &&
                      selectedBackground && (
                        <div className="virtual-background">
                          {selectedBackground === "blur" ? (
                            <div className="blur-background"></div>
                          ) : (
                            <img
                              src={
                                backgroundOptions.find(
                                  (bg) => bg.id === selectedBackground
                                )?.url
                              }
                              alt="Virtual background"
                              className="background-image"
                            />
                          )}
                        </div>
                      )}
                    {localCameraTrack && cameraOn && !isAudioCall ? (
                      <LocalUser
                        audioTrack={localMicrophoneTrack}
                        cameraOn={cameraOn}
                        micOn={micOn}
                        playAudio={false}
                        videoTrack={localCameraTrack}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: "8px",
                          position:
                            virtualBackground && !useAgoraExtension
                              ? "relative"
                              : "static",
                          zIndex:
                            virtualBackground && !useAgoraExtension ? 2 : 1,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#000",
                          color: "#fff",
                          borderRadius: "8px",
                          gap: "16px",
                        }}
                      >
                        {isAudioCall ? (
                          <>
                            <CircularAvatar
                              name={localUserName}
                              photo={localUserPhoto}
                              userId={localUserId}
                              size={120}
                            />
                            <span style={{ fontSize: "16px", fontWeight: 500 }}>
                              {localUserName || "Audio Call"}
                            </span>
                          </>
                        ) : cameraOn ? (
                          "Waiting for camera..."
                        ) : (
                          <>
                            <CircularAvatar
                              name={localUserName}
                              photo={localUserPhoto}
                              userId={localUserId}
                              size={120}
                            />
                            <span style={{ fontSize: "16px", fontWeight: 500 }}>
                              {localUserName || "Camera off"}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Remote Users */}
                {remoteUsers.map((user) => (
                  <div key={user.uid} className="video-item remote-overlay">
                    {user.hasVideo && user.videoTrack ? (
                      <RemoteUser
                        user={user}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: "8px",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "#000",
                          color: "#fff",
                          borderRadius: "8px",
                          gap: "16px",
                        }}
                      >
                        <CircularAvatar
                          name={peerName}
                          photo={peerAvatar}
                          userId={undefined}
                          size={120}
                        />
                        <span style={{ fontSize: "16px", fontWeight: 500 }}>
                          {peerName || "Camera off"}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Control Bar */}
          <div
            className={`control-bar ${
              controlsVisible ? "controls-visible" : "controls-hidden"
            }`}
            style={{
              display: "flex",
              gap: "0.75rem",
              alignItems: "center",
              justifyContent: "center",
            }}
            onClick={resetControlsTimer}
          >
            {/* 1. Speaker/Volume Control */}
            <button
              className={`control-button ${!speakerOn ? "active" : ""}`}
              onClick={(): void => setSpeakerOn((a) => !a)}
              title={speakerOn ? "Mute speaker" : "Unmute speaker"}
            >
              <div className="control-icon">
                {speakerOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </div>
            </button>

            {/* 2. Video Camera Control */}
            {!isAudioCall && (
              <button
                className={`control-button ${!cameraOn ? "active" : ""}`}
                onClick={(): void => setCamera((a) => !a)}
                title={cameraOn ? "Stop video" : "Start video"}
              >
                <div className="control-icon">
                  {cameraOn ? <Video size={18} /> : <VideoOff size={18} />}
                </div>
              </button>
            )}

            {/* 3. End Call (Red Rectangular Button) */}
            <button
              className="control-button danger"
              onClick={(): void => onEndCall()}
              title={calling ? "End call" : "Join call"}
              style={{
                borderRadius: "8px",
                minWidth: "60px",
                padding: "0.75rem 1.25rem",
              }}
            >
              <div className="control-icon">
                <Phone size={18} style={{ transform: "rotate(135deg)" }} />
              </div>
            </button>

            {/* 4. Microphone Control */}
            <button
              className={`control-button ${!micOn ? "active" : ""}`}
              onClick={(): void => setMic((a) => !a)}
              title={micOn ? "Mute microphone" : "Unmute microphone"}
            >
              <div className="control-icon">
                {micOn ? <Mic size={18} /> : <MicOff size={18} />}
              </div>
            </button>

            {/* 5. More Options */}
            {!isAudioCall && (
              <div style={{ position: "relative" }}>
                <button
                  className="control-button more-options-button"
                  onClick={(): void => setShowMoreOptions((prev) => !prev)}
                  title="More options"
                >
                  <div className="control-icon">
                    <Ellipsis size={18} />
                  </div>
                </button>

                {/* More Options Menu */}
                {showMoreOptions && (
                  <div
                    className="more-options-menu"
                    style={{
                      position: "absolute",
                      bottom: "100%",
                      right: "0",
                      marginBottom: "0.5rem",
                      background: "white",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                      padding: "0.5rem",
                      zIndex: 1000,
                      display: "flex",
                      gap: "0.5rem",
                      alignItems: "center",
                    }}
                  >
                    <button
                      className="control-button"
                      onClick={(): void => {
                        toggleVirtualBackground();
                        setShowMoreOptions(false);
                      }}
                      style={{
                        width: "64px",
                        height: "64px",
                        borderRadius: "50%",
                        justifyContent: "center",
                      }}
                      title="Virtual Background"
                    >
                      <div className="control-icon">
                        <Sparkles size={18} />
                      </div>
                    </button>
                    {virtualBackground && (
                      <button
                        className="control-button"
                        onClick={(): void => {
                          setShowBackgroundOptions(!showBackgroundOptions);
                          setShowMoreOptions(false);
                        }}
                        style={{
                          width: "64px",
                          height: "64px",
                          borderRadius: "50%",
                          justifyContent: "center",
                        }}
                        title="Background Options"
                      >
                        <div className="control-icon">
                          <Palette size={18} />
                        </div>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Background Options Panel */}
          {showBackgroundOptions && (
            <div className="background-options-panel">
              <div className="background-options-header">
                <h3>Choose Background</h3>
                <button
                  className="close-button"
                  onClick={(): void => setShowBackgroundOptions(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="background-options-grid">
                {backgroundOptions.map((background) => (
                  <button
                    key={background.id}
                    className={`background-option ${
                      selectedBackground === background.id ? "selected" : ""
                    }`}
                    onClick={(): void => handleBackgroundSelect(background)}
                  >
                    {background.type === "blur" ? (
                      <div className="background-preview blur-preview">
                        <div className="blur-icon">
                          <Droplets size={24} />
                        </div>
                        <span>{background.name}</span>
                      </div>
                    ) : (
                      <div className="background-preview">
                        <img
                          src={background.url}
                          alt={background.name}
                          className="background-thumbnail"
                        />
                        <span className="background-name">
                          {background.name}
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : isStandalone ? (
        <div className="join-screen">
          <div className="join-form">
            <h2 className="join-title">Join Video Call</h2>

            <div className="form-group">
              <label className="form-label">App ID</label>
              <input
                className="form-input"
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setAppId(e.target.value)
                }
                placeholder="Enter your App ID"
                value={appId}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Channel Name</label>
              <input
                className="form-input"
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                  setChannel(e.target.value)
                }
                placeholder="Enter channel name"
                value={channel}
              />
            </div>

            <div className="form-group">
              <label className="form-label">UID</label>
              <input
                className="form-input"
                type="number"
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                  const value = e.target.value;
                  setUid(value === "" ? "" : Number(value));
                }}
                placeholder="Enter your UID"
                value={uid === "" ? "" : uid}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Token (Optional - Auto-generated if empty)
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  className="form-input"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                    setToken(e.target.value)
                  }
                  placeholder="Enter your token or generate one"
                  value={token}
                  style={{ flex: 1 }}
                />
                <button
                  className="join-button"
                  onClick={generateToken}
                  disabled={
                    !channel || typeof uid !== "number" || generatingToken
                  }
                  style={{
                    minWidth: "120px",
                    padding: "10px 16px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {generatingToken ? "Generating..." : "Generate Token"}
                </button>
              </div>
            </div>

            <button
              className="join-button"
              disabled={!appId || !channel || typeof uid !== "number"}
              onClick={handleJoinCall}
            >
              Join Call
            </button>
          </div>
        </div>
      ) : (
        <div className="join-screen">
          <div className="join-form">
            <h2 className="join-title">Joining call...</h2>
            <p style={{ textAlign: "center", color: "#6b7280" }}>
              Generating token and connecting...
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default FPCallUI;
