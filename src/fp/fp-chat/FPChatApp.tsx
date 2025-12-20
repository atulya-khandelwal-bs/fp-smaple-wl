import React, { useEffect, useState, useRef } from "react";
import "./FPChatApp.css";
import FPConversationList from "./components/FPConversationList.tsx";
import FPChatInterface from "./components/FPChatInterface.tsx";
import FPCallApp from "../fp-call/FPCallApp.tsx";
import AgoraChat from "agora-chat";
import { useChatClient } from "./hooks/useChatClient.ts";
import config from "../common/config.ts";
import { buildCustomExts } from "./utils/buildCustomExts.ts";
import { createMessageHandlers } from "./utils/messageHandlers.ts";
import { Contact, Message, LogEntry } from "../common/types/chat";
import { CallEndData } from "../common/types/call";
// import axios from "axios";

interface FPChatAppProps {
  userId: string;
  onLogout?: () => void;
}

interface ActiveCall {
  userId: string;
  peerId: string;
  channel: string;
  isInitiator: boolean;
  callType: "video" | "audio";
  localUserName: string;
  peerName: string;
  peerAvatar?: string;
}

interface IncomingCall {
  from: string;
  channel: string;
  callId?: string;
  callType?: "video" | "audio";
}

function FPChatApp({ userId, onLogout }: FPChatAppProps): React.JSX.Element {
  const [token, setToken] = useState<string | undefined>(undefined);
  const [isGeneratingToken, setIsGeneratingToken] = useState<boolean>(false);
  const appKey = config.agora.appKey;
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [conversations, setConversations] = useState<Contact[]>([]);
  const [peerId, setPeerId] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [logs, setLogs] = useState<(string | LogEntry)[]>([]);
  const [isMobileView, setIsMobileView] = useState<boolean>(false);
  const [showChatOnMobile, setShowChatOnMobile] = useState<boolean>(false);

  // Call state management
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  // 🔹 Global message ID tracker to prevent duplicates
  const isSendingRef = useRef<boolean>(false);
  // 🔹 Track if call end message has been sent to prevent duplicates
  const callEndMessageSentRef = useRef<boolean>(false);

  const addLog = (log: string | LogEntry): void =>
    setLogs((prev) => {
      // Always add log entries, even if they're duplicates
      // This allows users to send the same message multiple times consecutively
      return [...prev, log];
    });

  // Helper function to generate a new token
  const generateNewToken = async (): Promise<string | null> => {
    if (!userId) {
      addLog("Cannot renew token: No user ID");
      return null;
    }

    try {
      addLog(`Renewing chat token for ${userId}...`);
      const tokenResponse = await fetch(config.api.generateToken, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: userId,
          expireInSecs: config.token.expireInSecs,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Token generation failed: ${tokenResponse.status}`
        );
      }

      const tokenData = await tokenResponse.json();
      const newToken = tokenData.token;
      setToken(newToken); // Update token state
      addLog(`Chat token renewed successfully`);
      return newToken;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      addLog(`Token renewal failed: ${errorMessage}`);
      console.error("Token renewal error:", error);
      return null;
    }
  };

  // Create a ref to store clientRef for handlers
  const clientRefForHandlers = useRef<unknown>(null);

  // Handle incoming call - defined early so it can be used in handlers
  const handleIncomingCall = (callData: IncomingCall): void => {
    setIncomingCall(callData);
  };

  // // Handle presence status updates
  // const handlePresenceStatus = (presenceData: {
  //   userId: string;
  //   description: string;
  // }): void => {
  //   // Show notification when peer is waiting in call
  //   if (
  //     presenceData.description === "waiting" &&
  //     presenceData.userId === peerId
  //   ) {
  //     addLog(`🟡 ${presenceData.userId} is waiting for you in the call!`);
  //     // You can add a toast notification here if needed
  //   } else if (
  //     presenceData.description === "in_call" &&
  //     presenceData.userId === peerId
  //   ) {
  //     addLog(`🟢 ${presenceData.userId} joined the call`);
  //   }
  // };

  // Create handlers - they will use clientRefForHandlers.current
  const handlers = createMessageHandlers({
    userId,
    setIsLoggedIn,
    setIsLoggingIn: () => {}, // Not used in chat app, login handled by parent
    addLog,
    setConversations,
    generateNewToken,
    handleIncomingCall,
    // onPresenceStatus: handlePresenceStatus,
    get clientRef() {
      return clientRefForHandlers;
    },
  });

  const clientRef = useChatClient(appKey, handlers);

  // Update the ref that handlers use
  useEffect(() => {
    clientRefForHandlers.current = clientRef.current;
  }, [clientRef]);

  // Auto-login when userId and token are provided
  useEffect(() => {
    if (userId && token && !isLoggedIn && clientRef.current) {
      // Automatically login with the provided token
      if (
        typeof (
          clientRef.current as unknown as {
            open: (options: { user: string; accessToken: string }) => void;
          }
        ).open === "function"
      ) {
        (
          clientRef.current as unknown as {
            open: (options: { user: string; accessToken: string }) => void;
          }
        ).open({ user: userId, accessToken: token });
      }
    }
  }, [userId, token, isLoggedIn, clientRef]);

  // Internal function to generate token for the coach
  const generateToken = async (): Promise<string | null> => {
    setIsGeneratingToken(true);
    try {
      addLog(`Generating chat token for ${userId}...`);
      const tokenResponse = await fetch(config.api.generateToken, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: userId,
          expireInSecs: config.token.expireInSecs,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({}));
        const errorMessage =
          errorData.error || `Token generation failed: ${tokenResponse.status}`;
        addLog(`Token generation failed: ${errorMessage}`);
        setIsGeneratingToken(false);
        return null;
      }

      const tokenData = await tokenResponse.json();
      const newToken = tokenData.token;
      setToken(newToken);
      addLog(`Chat token generated successfully`);
      setIsGeneratingToken(false);
      return newToken;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      addLog(`Token generation failed: ${errorMessage}`);
      console.error("Token generation error:", error);
      setIsGeneratingToken(false);
      return null;
    }
  };

  // Helper function to ensure token exists before connecting
  const ensureToken = async (): Promise<string | null> => {
    if (token) {
      return token;
    }

    // Generate token internally
    return await generateToken();
  };

  // Note: userId is now a patient, not a coach
  // coachInfo is not needed for patients - it will be set when a coach is selected

  // Detect mobile view
  useEffect(() => {
    const checkMobile = (): void => {
      setIsMobileView(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Reset mobile chat view when contact is deselected
  useEffect(() => {
    if (!selectedContact && showChatOnMobile) {
      setShowChatOnMobile(false);
    }
  }, [selectedContact, showChatOnMobile]);

  // Fetch coaches from API when userId (patient) is available
  useEffect(() => {
    const fetchCoaches = async (): Promise<void> => {
      if (!userId) {
        return;
      }

      try {
        addLog(`Fetching coaches for patient ${userId}...`);

        const response = await fetch(config.api.fetchCoaches);

        if (!response.ok) {
          throw new Error(`Failed to fetch coaches: ${response.status}`);
        }

        const data = (await response.json()) as {
          coaches?: Array<{
            coachId: string | number;
            coachName?: string;
            coachPhoto?: string;
          }>;
          count?: number;
        };
        const apiCoaches = data.coaches || [];

        // Filter out recorder (UID 999999999) from coaches
        const filteredCoaches = apiCoaches.filter(
          (coach) => String(coach.coachId) !== "999999999"
        );

        // Map API response to app contact format (no preview messages)
        const mappedCoaches = filteredCoaches.map(
          (coach: {
            coachId: string | number;
            coachName?: string;
            coachPhoto?: string;
          }) => {
            return {
              id: String(coach.coachId), // Use coachId as Agora ID (string)
              name: coach.coachName || `Coach ${coach.coachId}`,
              avatar: coach.coachPhoto || config.defaults.avatar,
              // No lastMessage, timestamp, or preview for coaches
              lastMessage: undefined,
              timestamp: null,
              lastMessageFrom: null,
            };
          }
        );

        setConversations(mappedCoaches);
        addLog(`Loaded ${mappedCoaches.length} coach(es) from API`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        addLog(`Error fetching coaches: ${errorMessage}`);
        console.error("Error fetching coaches:", error);
        // Set empty array on error to prevent retry loop
        setConversations([]);
      }
    };

    fetchCoaches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Register a user with Agora (called when selecting a user)
  const registerUser = async (username: string): Promise<boolean> => {
    try {
      const endpoint = config.api.registerUserEndpoint;
      const requestBody = { username: username };

      // console.log("🔵 [REGISTER API] Calling registration API:", {
      //   endpoint,
      //   method: "POST",
      //   body: requestBody,
      //   timestamp: new Date().toISOString(),
      // });

      addLog(`Registering user ${username}...`);

      const registerResponse = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      // console.log("🟢 [REGISTER API] Response received:", {
      //   status: registerResponse.status,
      //   statusText: registerResponse.statusText,
      //   ok: registerResponse.ok,
      //   url: registerResponse.url,
      // });

      if (registerResponse.ok) {
        // const responseData = await registerResponse.json().catch(() => ({}));
        // console.log("✅ [REGISTER API] Registration successful:", responseData);
        await registerResponse.json().catch(() => ({})); // Consume response body
        addLog(`User ${username} registered successfully`);
        return true;
      } else {
        // User might already be registered
        const errorData = await registerResponse.json().catch(() => ({}));
        // console.log("⚠️ [REGISTER API] Registration response (not ok):", {
        //   status: registerResponse.status,
        //   errorData,
        // });

        if (
          registerResponse.status === 400 ||
          registerResponse.status === 409
        ) {
          // console.log("ℹ️ [REGISTER API] User already exists, proceeding...");
          addLog(`User ${username} already exists, proceeding...`);
          return true; // User exists, can proceed
        } else {
          // console.warn("❌ [REGISTER API] Registration failed:", {
          //   status: registerResponse.status,
          //   error: errorData.error || registerResponse.status,
          // });
          addLog(
            `Registration warning: ${
              errorData.error || registerResponse.status
            }`
          );
          return false;
        }
      }
    } catch (registerError) {
      const errorMessage =
        registerError instanceof Error
          ? registerError.message
          : String(registerError);
      // console.error("❌ [REGISTER API] Registration error:", registerError);
      addLog(`Registration error: ${errorMessage}`);
      return false;
    }
  };

  const handleLogout = (): void => {
    if (
      clientRef.current &&
      typeof (clientRef.current as { close: () => void }).close === "function"
    ) {
      (clientRef.current as { close: () => void }).close();
    }
    setIsLoggedIn(false);
    setSelectedContact(null);
    setConversations([]);
    setPeerId("");
    setMessage("");
    // Call parent's logout handler if provided
    if (onLogout) {
      onLogout();
    }
  };

  const handleSelectContact = async (contact: Contact): Promise<void> => {
    // console.log("👤 [USER SELECTION] User selected:", {
    //   contactId: contact.id,
    //   contactName: contact.name,
    //   timestamp: new Date().toISOString(),
    // });

    // Generate token if not already available
    if (!token && !isLoggedIn) {
      const newToken = await ensureToken();
      if (!newToken) {
        addLog("Failed to generate token. Cannot connect to chat.");
        console.log("Failed to generate token. Cannot connect to chat.");
        return;
      }
    }

    console.log("🔵 [USER SELECTION] Token:", token);

    // Don't allow selecting recorder (UID 999999999) as a contact
    if (String(contact.id) === "999999999") {
      console.log("🚫 Cannot select recorder (UID: 999999999) as contact");
      return;
    }

    // Register the user if not already registered
    await registerUser(contact.id);

    setSelectedContact(contact);
    setPeerId(contact.id);
    // setPeerId("1941");

    // Update conversation in list or add if new (don't update timestamp on selection)
    setConversations((prev) => {
      const existing = prev.find((c) => c.id === contact.id);
      if (existing) {
        return prev.map((c) =>
          c.id === contact.id ? { ...c, ...contact } : c
        );
      }
      return [
        ...prev,
        {
          ...contact,
          lastMessage: "",
          timestamp: new Date(),
          avatar:
            contact.avatar ||
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
        },
      ];
    });
  };

  const handleAddConversation = (contact: Contact): void => {
    // Don't allow adding recorder (UID 999999999) as a conversation
    if (String(contact.id) === "999999999") {
      console.log("🚫 Cannot add recorder (UID: 999999999) as conversation");
      return;
    }

    const newConversation = {
      ...contact,
      lastMessage: "",
      timestamp: new Date(),
      avatar:
        contact.avatar ||
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
      replyCount: 0,
    };
    setConversations((prev) => [newConversation, ...prev]);
    // Optionally auto-select the new conversation
    // handleSelectContact(newConversation);
  };

  const handleSelectConversation = async (
    conversation: Contact
  ): Promise<void> => {
    await handleSelectContact(conversation);
    // On mobile, show chat view when conversation is selected
    if (isMobileView) {
      setShowChatOnMobile(true);
    }
  };

  const handleBackToConversations = (): void => {
    setSelectedContact(null);
    setPeerId("");
    setMessage("");
    setShowChatOnMobile(false);
  };

  // Handle call initiation (video or audio)
  const handleInitiateCall = async (
    callType: "video" | "audio" = "video"
  ): Promise<void> => {
    console.log("handleInitiateCall", callType);
    if (!peerId || !userId) {
      addLog("Cannot initiate call: Missing user or peer ID");
      return;
    }

    // Generate channel name using format: fp_rtc_call_CALLTYPE_USERID_DIETITIANID
    // CALLTYPE => video or voice
    // USERID => userId (the user's ID)
    // DIETITIANID => peerId (the dietitian/coach ID)
    const callTypeStr = callType === "video" ? "video" : "voice";
    const channel = `fp_rtc_call_${callTypeStr}_${peerId}_${userId}`;

    // Reset call end message sent flag for new call
    callEndMessageSentRef.current = false;

    // DO NOT send initiate message - only send end message with duration
    // Removed: await handleSendMessage(callMessage);

    // Ensure message is cleared
    setMessage("");

    // Set active call state
    setActiveCall({
      userId,
      peerId,
      channel,
      isInitiator: true,
      callType: callType,
      localUserName: userId, // userId is now the patient
      peerName: selectedContact?.name || peerId,
      peerAvatar: selectedContact?.avatar,
    });

    addLog(`Initiating ${callType} call with ${peerId}`);
  };

  // Handle accept call
  // @ts-expect-error - May be used in future for incoming call handling
  const _handleAcceptCall = (): void => {
    if (!incomingCall) return;

    // Reset call end message sent flag for accepted call
    callEndMessageSentRef.current = false;

    // Find the contact from conversations
    const contact = conversations.find((c) => c.id === incomingCall.from);

    setActiveCall({
      userId,
      peerId: incomingCall.from,
      channel: incomingCall.channel,
      isInitiator: false,
      callType: incomingCall.callType || "video", // Default to video if not specified
      localUserName: userId, // You can get actual name from user profile if available
      peerName: contact?.name || incomingCall.from,
      peerAvatar: contact?.avatar,
    });
    setIncomingCall(null);
  };

  // function formatDurationFromSeconds(totalSeconds: number): string {
  //   const hours = Math.floor(totalSeconds / 3600);
  //   const minutes = Math.floor((totalSeconds % 3600) / 60);
  //   const seconds = totalSeconds % 60;

  //   const parts = [];

  //   if (hours > 0) parts.push(`${hours} hr${hours > 1 ? "s" : ""}`);
  //   if (minutes > 0) parts.push(`${minutes} min${minutes > 1 ? "s" : ""}`);
  //   if (seconds > 0 || parts.length === 0)
  //     parts.push(`${seconds} sec${seconds > 1 ? "s" : ""}`);

  //   return parts.join(" ");
  // }

  // Handle reject call
  // @ts-expect-error - May be used in future for incoming call handling
  const _handleRejectCall = (): void => {
    setIncomingCall(null);
  };

  // Handle end call
  const handleEndCall = async (
    callInfo: CallEndData | null = null
  ): Promise<void> => {
    // Prevent duplicate call end messages
    if (callEndMessageSentRef.current) {
      console.log("📞 Call End Message - Already sent, skipping duplicate");
      // Clear call state even if message was already sent
      setActiveCall(null);
      setIncomingCall(null);
      setMessage("");
      return;
    }

    if (!activeCall || !callInfo) {
      console.log("📞 Call End Message - NOT sending (missing data):", {
        hasCallInfo: !!callInfo,
        hasActiveCall: !!activeCall,
      });
      setActiveCall(null);
      setIncomingCall(null);
      setMessage("");
      return;
    }

    // const bothUsersConnected = callInfo.bothUsersConnected === true;

    // // Calculate duration - use provided duration or calculate from timestamps
    // let duration = callInfo.duration || 0;
    // if (duration <= 0 && callInfo.callStartTime && callInfo.callEndTime) {
    //   duration = Math.floor(
    //     (callInfo.callEndTime - callInfo.callStartTime) / 1000
    //   );
    // }

    // Ensure duration is at least 0 (not negative)
    // duration = Math.max(0, duration);

    // if (!bothUsersConnected || duration <= 0) {
    //   console.log("📞 Call End Message - NOT sending (conditions not met):", {
    //     bothUsersConnected,
    //     duration,
    //   });
    //   addLog(
    //     "Call ended without other user joining. Not sending call summary to backend."
    //   );
    //   setActiveCall(null);
    //   setIncomingCall(null);
    //   setMessage("");
    //   return;
    // }

    // try {
    // // Determine message type and title based on call type
    // const isVideoCall = activeCall.callType === "video";
    // const messageType = isVideoCall ? "video_call" : "voice_call";
    // const callTitle = isVideoCall ? "Video call" : "Voice call";

    // // Send call end message with duration
    // const payload = {
    //   title: callTitle,
    //   description: `${formatDurationFromSeconds(duration)}`,
    //   icons_details: {
    //     left_icon: "",
    //     right_icon: "",
    //   },
    //   call_details: {
    //     call_url: "",
    //   },
    //   redirection_details: [],
    // };

    // const body = {
    //   from: userId,
    //   to: peerId,
    //   type: messageType,
    //   data: payload,
    // };

    // try {
    //   const response = await axios.post(config.api.customMessage, body);
    //   console.log(`${callTitle} message sent successfully:`, response.data);

    //   // Mark call end message as sent to prevent duplicates
    //   callEndMessageSentRef.current = true;

    //   // Add message directly to logs for real-time display
    //   if (addLog) {
    //     const messageToLog = JSON.stringify({
    //       type: messageType,
    //       ...payload,
    //     });
    //     addLog({
    //       log: `You → ${peerId}: ${messageToLog}`,
    //       timestamp: new Date(),
    //     });
    //   }
    // } catch (error) {
    //   console.error(
    //     `Error sending ${callTitle.toLowerCase()} message:`,
    //     error
    //   );
    // }

    // addLog(`${callTitle} ended. Duration: ${duration}s`);
    // } catch (error) {
    //   console.error("Error sending call end message:", error);
    //   const errorMessage =
    //     error instanceof Error ? error.message : String(error);
    //   addLog(`Failed to send call end message: ${errorMessage}`);
    //   // Reset flag on error so it can be retried if needed
    //   callEndMessageSentRef.current = false;
    // }

    // Clear call state
    setActiveCall(null);
    setIncomingCall(null);
    // Clear any call message that might be in the input box
    setMessage("");
  };

  // Helper function to generate preview from a formatted message object
  const generatePreviewFromMessage = (
    formattedMsg: Message | null | undefined
  ): string => {
    if (!formattedMsg) return "";

    // Handle different message types
    if (formattedMsg.messageType === "image") {
      return "Photo";
    } else if (formattedMsg.messageType === "file") {
      return formattedMsg.fileName ? `📎 ${formattedMsg.fileName}` : "File";
    } else if (formattedMsg.messageType === "audio") {
      return "Audio";
    } else if (formattedMsg.messageType === "call") {
      // Convert old "call" format to new format for preview
      return formattedMsg.callType === "audio" ? "Voice call" : "Video call";
    } else if (formattedMsg.messageType === "general_notification") {
      return formattedMsg.system?.payload?.title || "Notification";
    } else if (formattedMsg.messageType === "video_call") {
      return formattedMsg.system?.payload?.title || "Video call";
    } else if (formattedMsg.messageType === "voice_call") {
      return formattedMsg.system?.payload?.title || "Voice call";
    } else if (formattedMsg.messageType === "documents") {
      return (
        formattedMsg.system?.payload?.title ||
        formattedMsg.fileName ||
        "Document"
      );
    } else if (formattedMsg.messageType === "call_scheduled") {
      const time = formattedMsg.system?.payload?.time as number | undefined;
      if (time) {
        const scheduledDate = new Date(time * 1000); // Convert seconds to milliseconds
        // Format date as "11 Aug 10:00 am" (12-hour format with AM/PM)
        const formatScheduledDate = (date: Date): string => {
          const day = date.getDate();
          const monthNames = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ];
          const month = monthNames[date.getMonth()];
          let hours = date.getHours();
          const minutes = date.getMinutes();
          const ampm = hours >= 12 ? "pm" : "am";
          hours = hours % 12;
          hours = hours ? hours : 12; // the hour '0' should be '12'
          const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
          return `${day} ${month} ${hours}:${minutesStr} ${ampm}`;
        };
        return `Schedule, ${formatScheduledDate(scheduledDate)}`;
      }
      return "Call scheduled";
    } else if (formattedMsg.messageType === "scheduled_call_canceled") {
      return "Scheduled call cancelled";
    } else if (formattedMsg.messageType === "text") {
      // For text messages, try to parse if it's JSON (custom message)
      try {
        const parsed = JSON.parse(formattedMsg.content);
        if (parsed && typeof parsed === "object" && "type" in parsed) {
          const parsedObj = parsed as {
            type?: string;
            fileName?: string;
            callType?: string;
            title?: string;
          };
          const t = String(parsedObj.type).toLowerCase();
          if (t === "image") return "Photo";
          if (t === "file")
            return parsedObj.fileName ? `📎 ${parsedObj.fileName}` : "File";
          if (t === "audio") return "Audio";
          if (t === "meal_plan_updated") return "Meal plan updated";
          if (t === "new_nutritionist" || t === "new_nutrionist")
            return "New nutritionist assigned";
          if (t === "products") return "Products";
          if (t === "call")
            return `${parsedObj.callType === "video" ? "Video" : "Audio"} call`;
          if (t === "general_notification" || t === "general-notification")
            return parsedObj.title || "Notification";
          if (t === "video_call") return parsedObj.title || "Video call";
          if (t === "voice_call") return parsedObj.title || "Voice call";
          if (t === "documents") return parsedObj.title || "Document";
        }
      } catch {
        // Not JSON, use content as-is
      }
      return formattedMsg.content || "";
    }

    // Fallback
    return formattedMsg.content || "Message";
  };

  // Function to update conversation's last message from history
  const updateLastMessageFromHistory = (
    peerId: string,
    formattedMsg: Message
  ): void => {
    if (!peerId || !formattedMsg) return;

    const preview = generatePreviewFromMessage(formattedMsg);
    const timestamp = formattedMsg.createdAt
      ? new Date(formattedMsg.createdAt)
      : new Date();
    const lastMessageFrom = formattedMsg.sender || peerId;

    // Normalize: try both with and without user_ prefix
    const normalizedPeerId = peerId.startsWith("user_")
      ? peerId
      : `user_${peerId}`;
    const normalizedPeerIdWithoutPrefix = peerId.startsWith("user_")
      ? peerId.replace("user_", "")
      : peerId;

    console.log(
      "🔄 [updateLastMessageFromHistory] Updating conversation preview:",
      {
        peerId,
        normalizedPeerId,
        normalizedPeerIdWithoutPrefix,
        preview,
        timestamp: timestamp.toISOString(),
        lastMessageFrom,
      }
    );

    setConversations((prev) => {
      // Find conversation by matching either format
      const existing = prev.find(
        (c) =>
          c.id === peerId ||
          c.id === normalizedPeerId ||
          c.id === normalizedPeerIdWithoutPrefix ||
          c.id === `user_${normalizedPeerIdWithoutPrefix}`
      );

      console.log(
        "🔄 [updateLastMessageFromHistory] Conversation search result:",
        {
          existing: existing
            ? { id: existing.id, lastMessage: existing.lastMessage }
            : null,
          allConversationIds: prev.map((c) => c.id),
        }
      );

      if (existing) {
        // Use the existing conversation ID format
        const conversationId = existing.id;

        // Only update if history message is more recent than existing last message
        // or if there's no existing last message
        const existingTimestamp = existing.timestamp
          ? new Date(existing.timestamp)
          : null;
        const shouldUpdate =
          !existingTimestamp ||
          timestamp.getTime() >= existingTimestamp.getTime();

        console.log("🔄 [updateLastMessageFromHistory] Update check:", {
          conversationId,
          shouldUpdate,
          existingTimestamp: existingTimestamp?.toISOString(),
          newTimestamp: timestamp.toISOString(),
          timestampComparison: existingTimestamp
            ? timestamp.getTime() >= existingTimestamp.getTime()
            : "no existing timestamp",
        });

        if (shouldUpdate) {
          const updated = prev.map((conv) => {
            if (conv.id !== conversationId) return conv;
            return {
              ...conv,
              lastMessage: preview,
              timestamp: timestamp,
              lastMessageFrom: lastMessageFrom,
            };
          });
          console.log(
            "✅ [updateLastMessageFromHistory] Conversation updated:",
            {
              conversationId,
              newLastMessage: preview,
              updatedConversation: updated.find((c) => c.id === conversationId),
            }
          );
          return updated;
        } else {
          console.log(
            "⚠️ [updateLastMessageFromHistory] Not updating - message is not more recent"
          );
        }
      } else {
        console.warn(
          "⚠️ [updateLastMessageFromHistory] Conversation not found, cannot update preview"
        );
      }
      return prev;
    });
  };

  const handleSendMessage = async (
    messageOverride: string | object | null = null
  ): Promise<void> => {
    // Prevent multiple simultaneous sends
    if (isSendingRef.current) {
      return;
    }

    if (!peerId) {
      addLog("No recipient selected");
      return;
    }

    // Use the override message if provided, otherwise use the message prop
    // This ensures we get the exact message value without race conditions
    const messageToSend = messageOverride !== null ? messageOverride : message;

    // Check if message is empty (for text messages)
    if (
      !messageToSend ||
      (typeof messageToSend === "string" && messageToSend.trim() === "")
    ) {
      addLog("Message cannot be empty");
      return;
    }

    // Clear message immediately to prevent duplicate sends
    setMessage("");

    // Mark as sending to prevent duplicate calls
    isSendingRef.current = true;

    try {
      // Verify connection before sending
      if (
        !clientRef.current ||
        (typeof (clientRef.current as unknown as { isOpened: () => boolean })
          .isOpened === "function" &&
          !(
            clientRef.current as unknown as { isOpened: () => boolean }
          ).isOpened())
      ) {
        addLog(`Send failed: Connection not established`);
        setMessage(
          typeof messageToSend === "string"
            ? messageToSend
            : JSON.stringify(messageToSend as object)
        ); // Restore message
        isSendingRef.current = false; // Reset flag on error
        return;
      }

      // Handle both string and object messages
      let parsedPayload: { type?: string; [key: string]: unknown } | null =
        null;
      let isCustomMessage = false;
      let messageString = "";

      // COMMENTED OUT: Custom message detection logic
      // Only allowing text, media (image/file/photo), and call (voice_call/video_call) messages
      // All other custom message types are disabled for sending
      /*
      if (typeof messageToSend === "object") {
        // Already an object, use it directly
        parsedPayload = messageToSend as {
          type?: string;
          [key: string]: unknown;
        };
        messageString = JSON.stringify(messageToSend);
        if (
          parsedPayload &&
          typeof parsedPayload === "object" &&
          parsedPayload.type
        ) {
          isCustomMessage = true;
        }
      } else {
        // String message - try to parse as JSON
        messageString = messageToSend;
        try {
          parsedPayload = JSON.parse(messageToSend) as {
            type?: string;
            [key: string]: unknown;
          };
          if (
            parsedPayload &&
            typeof parsedPayload === "object" &&
            parsedPayload.type
          ) {
            isCustomMessage = true;
          }
        } catch {
          // Not JSON, treat as plain text
          isCustomMessage = false;
        }
      }
      */

      // Only allow specific message types: text, image, file, audio, video_call, voice_call
      if (typeof messageToSend === "object") {
        // Already an object, use it directly
        parsedPayload = messageToSend as {
          type?: string;
          [key: string]: unknown;
        };
        messageString = JSON.stringify(messageToSend);
        if (
          parsedPayload &&
          typeof parsedPayload === "object" &&
          parsedPayload.type
        ) {
          const messageType = String(parsedPayload.type).toLowerCase();
          // Only allow: image, file, audio, video_call, voice_call
          if (
            messageType === "image" ||
            messageType === "file" ||
            messageType === "audio" ||
            messageType === "video_call" ||
            messageType === "voice_call"
          ) {
            isCustomMessage = true;
          }
        }
      } else {
        // String message - try to parse as JSON
        messageString = messageToSend;
        try {
          parsedPayload = JSON.parse(messageToSend) as {
            type?: string;
            [key: string]: unknown;
          };
          if (
            parsedPayload &&
            typeof parsedPayload === "object" &&
            parsedPayload.type
          ) {
            const messageType = String(parsedPayload.type).toLowerCase();
            // Only allow: image, file, audio, video_call, voice_call
            if (
              messageType === "image" ||
              messageType === "file" ||
              messageType === "audio" ||
              messageType === "video_call" ||
              messageType === "voice_call"
            ) {
              isCustomMessage = true;
            }
          }
        } catch {
          // Not JSON, treat as plain text
          isCustomMessage = false;
        }
      }

      // Prepare ext properties with sender info
      const extProperties = {
        senderName: userId, // userId is now the patient
        senderProfile: config.defaults.avatar,
        isFromUser: true, // Patient is the user
      };

      let options: {
        type: string;
        to: string;
        chatType: string;
        customEvent?: string;
        customExts?: unknown;
        msg?: string;
        ext?: typeof extProperties;
      };

      // COMMENTED OUT: Custom message sending logic for non-allowed types
      // Only allowing: text, image, file, audio, video_call, voice_call
      // All other custom message types (meal_plan, products, notifications, etc.) are disabled
      /*
      if (isCustomMessage && parsedPayload && parsedPayload.type) {
        // Build customExts based on message type
        const customExts = buildCustomExts(
          parsedPayload as { type: string; [key: string]: unknown }
        );

        if (!customExts) {
          addLog("Invalid custom message payload");
          setMessage(messageString); // Restore message
          isSendingRef.current = false; // Reset flag on error
          return;
        }

        // Custom message - all custom messages use type: "custom"
        options = {
          type: "custom",
          to: peerId,
          chatType: "singleChat",
          customEvent: "customEvent",
          customExts,
          ext: extProperties,
        };
      } else {
      */

      // Only allow specific custom message types: image, file, audio, video_call, voice_call
      if (isCustomMessage && parsedPayload && parsedPayload.type) {
        // Build customExts based on message type
        const customExts = buildCustomExts(
          parsedPayload as { type: string; [key: string]: unknown }
        );

        if (!customExts) {
          addLog("Invalid custom message payload");
          setMessage(messageString); // Restore message
          isSendingRef.current = false; // Reset flag on error
          return;
        }

        // Custom message - all custom messages use type: "custom"
        options = {
          type: "custom",
          to: peerId,
          chatType: "singleChat",
          customEvent: "customEvent",
          customExts,
          ext: extProperties,
        };
      } else {
        // Plain text message
        options = {
          chatType: "singleChat",
          type: "txt",
          to: peerId,
          msg: messageString,
          ext: extProperties,
        };
      }

      // Create and send message
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = AgoraChat.message.create(options as any);

      if (
        clientRef.current &&
        typeof (
          clientRef.current as unknown as {
            send: (msg: unknown) => Promise<void>;
          }
        ).send === "function"
      ) {
        const response = await (
          clientRef.current as unknown as {
            send: (msg: unknown) => Promise<{ serverMsgId?: string }>;
          }
        ).send(msg);
        console.log("Response", response);

        // Capture serverMsgId from response for message editing
        const serverMsgId = (response as { serverMsgId?: string })?.serverMsgId;
        if (serverMsgId) {
          console.log(
            "✅ [handleSendMessage] Server message ID received:",
            serverMsgId
          );
          // Add serverMsgId to the log entry so it can be used when creating messages
          addLog({
            log: `You → ${peerId}: ${messageString}`,
            timestamp: new Date(),
            serverMsgId: serverMsgId, // Store serverMsgId with the log
          });
        } else {
          // Fallback: add log without serverMsgId if not available
          // Log already added above with serverMsgId if available
        }
      } else {
        // If send failed, still add to log
        addLog(`You → ${peerId}: ${messageString}`);
      }
      console.log("Message sent successfully", msg);

      // Generate preview for conversation list
      let preview = messageString;
      if (isCustomMessage && parsedPayload) {
        const t = String(parsedPayload.type).toLowerCase();
        if (t === "image") preview = "Photo";
        else if (t === "file")
          preview = parsedPayload.fileName
            ? `📎 ${parsedPayload.fileName}`
            : "File";
        else if (t === "audio") preview = "Audio";
        else if (t === "meal_plan_updated" || t === "meal_plan_update")
          preview = "Meal plan updated";
        else if (
          t === "new_nutritionist" ||
          t === "new_nutrionist" ||
          t === "coach_assigned" ||
          t === "coach_details"
        )
          preview =
            (parsedPayload.title as string) ||
            (parsedPayload.name as string) ||
            "New nutritionist assigned";
        else if (t === "products" || t === "recommended_products")
          preview = "Products";
        else if (t === "call")
          preview = `${
            parsedPayload.callType === "video" ? "Video" : "Audio"
          } call`;
        else if (t === "general_notification" || t === "general-notification")
          preview = (parsedPayload.title as string) || "Notification";
        else if (t === "video_call")
          preview = (parsedPayload.title as string) || "Video call";
        else if (t === "voice_call")
          preview = (parsedPayload.title as string) || "Voice call";
        else if (t === "documents")
          preview = (parsedPayload.title as string) || "Document";
        else if (t === "call_scheduled") {
          const time = parsedPayload.time as number | undefined;
          if (time) {
            const scheduledDate = new Date(time * 1000); // Convert seconds to milliseconds
            // Import formatScheduledDate function
            const formatScheduledDate = (date: Date): string => {
              const day = date.getDate();
              const monthNames = [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ];
              const month = monthNames[date.getMonth()];
              let hours = date.getHours();
              const minutes = date.getMinutes();
              const ampm = hours >= 12 ? "pm" : "am";
              hours = hours % 12;
              hours = hours ? hours : 12; // the hour '0' should be '12'
              const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
              return `${day} ${month} ${hours}:${minutesStr} ${ampm}`;
            };
            preview = `Schedule, ${formatScheduledDate(scheduledDate)}`;
          } else {
            preview = "Call scheduled";
          }
        } else if (t === "scheduled_call_canceled")
          preview = "Scheduled call cancelled";
      }

      // Note: Log is already added above with serverMsgId if available from send response

      // Update conversation with last message - normalize conversation ID matching
      // Normalize: try both with and without user_ prefix
      const normalizedPeerId = peerId.startsWith("user_")
        ? peerId
        : `user_${peerId}`;
      const normalizedPeerIdWithoutPrefix = peerId.startsWith("user_")
        ? peerId.replace("user_", "")
        : peerId;

      console.log("📤 [handleSendMessage] Updating conversation preview:", {
        peerId,
        normalizedPeerId,
        normalizedPeerIdWithoutPrefix,
        preview,
      });

      setConversations((prev) => {
        // Find conversation by matching either format
        const existing = prev.find(
          (c) =>
            c.id === peerId ||
            c.id === normalizedPeerId ||
            c.id === normalizedPeerIdWithoutPrefix ||
            c.id === `user_${normalizedPeerIdWithoutPrefix}`
        );

        console.log("📤 [handleSendMessage] Conversation search result:", {
          existing: existing
            ? { id: existing.id, lastMessage: existing.lastMessage }
            : null,
          allConversationIds: prev.map((c) => c.id),
        });

        if (existing) {
          // Use the existing conversation ID format
          const conversationId = existing.id;
          const updated = prev.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  lastMessage: preview,
                  timestamp: new Date(),
                  lastMessageFrom: userId, // Current user sent the last message
                }
              : conv
          );
          console.log("✅ [handleSendMessage] Conversation updated:", {
            conversationId,
            newLastMessage: preview,
            updatedConversation: updated.find((c) => c.id === conversationId),
          });
          return updated;
        }
        // If conversation doesn't exist, create it (shouldn't happen, but handle gracefully)
        console.warn(
          "⚠️ [handleSendMessage] Conversation not found, cannot update preview"
        );
        return prev;
      });

      // Force a small delay to ensure state update propagates
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Reset the flag after successful send
      isSendingRef.current = false;
    } catch (sendError) {
      console.error("Error sending message:", sendError);
      const errorMessage =
        sendError instanceof Error
          ? sendError.message
          : (sendError as { code?: string; message?: string }).code ||
            (sendError as { code?: string; message?: string }).message ||
            String(sendError);
      addLog(`Send failed: ${errorMessage}`);
      setMessage(
        typeof messageToSend === "string"
          ? messageToSend
          : JSON.stringify(messageToSend as object)
      ); // Restore message on error
      isSendingRef.current = false; // Reset flag on error
    }
  };

  // Show call interface if there's an active call
  if (activeCall) {
    return (
      <div className="app-container">
        <FPCallApp
          userId={activeCall.userId}
          peerId={activeCall.peerId}
          channel={activeCall.channel}
          isInitiator={activeCall.isInitiator}
          onEndCall={handleEndCall}
          isAudioCall={activeCall.callType === "audio"}
          chatClient={clientRef.current}
          localUserName={activeCall.localUserName}
          localUserPhoto={config.defaults.avatar}
          peerName={activeCall.peerName}
          peerAvatar={activeCall.peerAvatar}
        />
      </div>
    );
  }

  // Determine if chat interface should show loading state
  const isChatConnecting = (token && !isLoggedIn) || isGeneratingToken;

  return (
    <div className="app-container">
      <div className="main-layout">
        {/* Conversation List - show on desktop always, on mobile only when not showing chat */}
        <div
          className={`conversation-panel ${
            isMobileView && showChatOnMobile ? "mobile-hidden" : ""
          }`}
        >
          <FPConversationList
            conversations={conversations}
            selectedConversation={selectedContact}
            onSelectConversation={handleSelectConversation}
            userId={userId}
            onAddConversation={handleAddConversation}
          />
        </div>
        {/* Chat Panel - show on desktop always, on mobile only when showing chat */}
        <div
          className={`chat-panel ${
            isMobileView && !showChatOnMobile ? "mobile-hidden" : ""
          }`}
        >
          {selectedContact ? (
            isChatConnecting ? (
              <div className="chat-loading-container">
                <div className="chat-loading-spinner" />
                <div className="chat-loading-text">
                  {isGeneratingToken
                    ? "Generating token..."
                    : "Connecting to chat..."}
                </div>
              </div>
            ) : (
              <FPChatInterface
                userId={userId}
                peerId={peerId || null}
                setPeerId={(id: string | null) => setPeerId(id || "")}
                message={message}
                setMessage={setMessage}
                onSend={handleSendMessage}
                onLogout={handleLogout}
                logs={logs}
                selectedContact={selectedContact}
                chatClient={clientRef.current}
                onBackToConversations={
                  isMobileView ? handleBackToConversations : null
                }
                onInitiateCall={handleInitiateCall}
                onUpdateLastMessageFromHistory={updateLastMessageFromHistory}
                coachInfo={{ coachName: "", profilePhoto: "" }}
              />
            )
          ) : (
            <div className="no-conversation-selected">
              <div className="empty-state">
                <h2>Welcome, {userId}!</h2>
                <p>Select a conversation from the list to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FPChatApp;

/*
 for presence:
  const Presenceoptions = {
        description: "in_call",
        userId: 444,
      };

      clientRef.current
        .publishPresence(Presenceoptions)
        .then((res) => {
          console.log("prseence msg sent");
          console.log(res);
        })
        .catch((e) => {
          console.log("err: ", e);
        });
*/
