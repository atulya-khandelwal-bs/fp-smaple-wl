import React, { useEffect, useState, useRef } from "react";
import "./FPChatApp.css";
import FPConversationList from "./components/FPConversationList.tsx";
import FPChatInterface from "./components/FPChatInterface.tsx";
import FPUserDetails from "./components/FPUserDetails.tsx";
import FPCallApp from "../fp-call/FPCallApp.tsx";
import AgoraChat from "agora-chat";
import { useChatClient } from "./hooks/useChatClient.ts";
import config from "../common/config.ts";
import { buildCustomExts } from "./utils/buildCustomExts.ts";
import { createMessageHandlers } from "./utils/messageHandlers.ts";
import { Contact, Message, CoachInfo, LogEntry } from "../common/types/chat";
import { CallEndData } from "../common/types/call";
import axios from "axios";

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
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [filterType, setFilterType] = useState<
    "all" | "pending_customer" | "pending_doctor" | "first_response"
  >("all");
  const [coachInfo, setCoachInfo] = useState<CoachInfo>({
    name: "",
    profilePhoto: "",
  });

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

  // Fetch coach info when userId is set
  useEffect(() => {
    const fetchCoachInfo = async (): Promise<void> => {
      if (!userId) {
        setCoachInfo({ name: "", profilePhoto: "" });
        return;
      }

      try {
        const response = await fetch(config.api.fetchCoaches);

        if (response.ok) {
          const data = (await response.json()) as {
            coaches?: Array<{
              coachId: string | number;
              coachName?: string;
              coachPhoto?: string;
            }>;
          };
          const coach = data.coaches?.find(
            (c) => String(c.coachId) === String(userId)
          );
          if (coach) {
            setCoachInfo({
              name: coach.coachName || "",
              profilePhoto: coach.coachPhoto || "",
            });
          }
        }
      } catch (error) {
        console.error("Error fetching coach info:", error);
      }
    };

    fetchCoachInfo();
  }, [userId]);

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

  // Map filter type to API format
  const getApiFilter = (
    filterType: "all" | "pending_customer" | "pending_doctor" | "first_response"
  ): string => {
    const filterMap: Record<
      "all" | "pending_customer" | "pending_doctor" | "first_response",
      string
    > = {
      all: "all",
      first_response: "first-response",
      pending_customer: "reply-pending-from-user",
      pending_doctor: "reply-pending-from-coach",
    };
    return filterMap[filterType] || "all";
  };

  // Map sort order to API format
  const getApiSort = (sortOrder: "newest" | "oldest"): string => {
    return sortOrder === "newest" ? "desc" : "asc";
  };

  // Fetch conversations from API when userId is available (doesn't require login)
  useEffect(() => {
    const fetchConversations = async (): Promise<void> => {
      if (!userId) {
        return;
      }

      try {
        const apiFilter = getApiFilter(filterType);
        const apiSort = getApiSort(sortOrder);

        addLog(
          `Fetching conversations for coach ${userId} (filter: ${apiFilter}, sort: ${apiSort})...`
        );

        const url = new URL(config.api.fetchConversations);
        url.searchParams.append("coachId", userId);
        url.searchParams.append("filter", apiFilter);
        url.searchParams.append("sort", apiSort);
        url.searchParams.append("page", "1");
        url.searchParams.append("limit", "20");

        const response = await fetch(url.toString());

        if (!response.ok) {
          throw new Error(`Failed to fetch conversations: ${response.status}`);
        }

        const data = (await response.json()) as {
          conversations?: Array<{
            userId: string | number;
            userName?: string;
            userPhoto?: string;
            lastMessage?: string | object;
            lastMessageTime?: string | Date;
            lastMessageSender?: string | number;
            conversationId?: string;
            messageCount?: number;
            unreadCount?: number;
            filterState?: string;
          }>;
        };
        const apiConversations = data.conversations || [];

        // Helper function to generate preview from lastMessage (could be string or object)
        const generatePreviewFromLastMessage = (
          lastMsg: string | object | null | undefined
        ): string | null => {
          if (!lastMsg) return null;

          let parsed = null;

          // If it's already a string, try to parse it as JSON
          if (typeof lastMsg === "string") {
            // Check if it looks like JSON (starts with { or [)
            if (
              lastMsg.trim().startsWith("{") ||
              lastMsg.trim().startsWith("[")
            ) {
              try {
                parsed = JSON.parse(lastMsg);
              } catch {
                // Not valid JSON, return as-is
                return lastMsg;
              }
            } else {
              // Plain text string, return as-is
              return lastMsg;
            }
          } else if (typeof lastMsg === "object") {
            // Already an object
            parsed = lastMsg;
          } else {
            // Other type, convert to string
            return String(lastMsg);
          }

          // Now process the parsed object
          if (parsed && typeof parsed === "object" && "type" in parsed) {
            const parsedObj = parsed as {
              type?: string;
              fileName?: string;
              callType?: string;
              message?: string;
              body?: string;
            };
            const t = String(parsedObj.type).toLowerCase();
            if (t === "image") return "Photo";
            if (t === "file")
              return parsedObj.fileName ? `📎 ${parsedObj.fileName}` : "File";
            if (t === "audio") return "Audio";
            if (t === "meal_plan_updated" || t === "meal_plan_update")
              return "Meal plan updated";
            if (
              t === "new_nutritionist" ||
              t === "new_nutrionist" ||
              t === "coach_assigned" ||
              t === "coach_details"
            )
              return (
                (parsedObj as { title?: string; name?: string }).title ||
                (parsedObj as { title?: string; name?: string }).name ||
                "New nutritionist assigned"
              );
            if (t === "products" || t === "recommended_products")
              return "Products";
            if (t === "call")
              return `${
                parsedObj.callType === "video" ? "Video" : "Audio"
              } call`;
            if (t === "general_notification" || t === "general-notification")
              return (parsedObj as { title?: string }).title || "Notification";
            if (t === "video_call")
              return (parsedObj as { title?: string }).title || "Video call";
            if (t === "voice_call")
              return (parsedObj as { title?: string }).title || "Voice call";
            if (t === "documents")
              return (parsedObj as { title?: string }).title || "Document";
            if (t === "call_scheduled") {
              const time = (parsedObj as { time?: number | string }).time;
              if (time) {
                const scheduledDate = new Date(
                  typeof time === "number"
                    ? time * 1000
                    : parseInt(time, 10) * 1000
                );
                return `Schedule ${scheduledDate.toLocaleString()}`;
              }
              return "Call scheduled";
            }
            if (t === "scheduled_call_canceled") {
              return "Scheduled call cancelled";
            }
            if (t === "text") {
              // API uses "message" field for text messages
              return parsedObj.message || parsedObj.body || "";
            }
          }

          // If object has body or message, use it
          if (parsed && typeof parsed === "object") {
            const parsedObj = parsed as { body?: string; message?: string };
            if (parsedObj.body) return parsedObj.body;
            if (parsedObj.message) return parsedObj.message;
          }

          // If we parsed from string but it's not a recognized format, return original string
          if (typeof lastMsg === "string") {
            return lastMsg;
          }

          // Otherwise stringify the object
          return JSON.stringify(parsed || lastMsg);
        };

        // Map API response to app conversation format
        const mappedConversations = apiConversations.map(
          (conv: {
            userId: string | number;
            userName?: string;
            userPhoto?: string;
            lastMessage?: string | object;
            lastMessageTime?: string | Date;
            lastMessageSender?: string | number;
            conversationId?: string;
            messageCount?: number;
            unreadCount?: number;
            filterState?: string;
          }) => {
            // Generate preview from lastMessage (handles both string and object formats)
            const lastMessage = generatePreviewFromLastMessage(
              conv.lastMessage
            );

            return {
              id: String(conv.userId), // Use userId as Agora ID (string)
              name: conv.userName || `User ${conv.userId}`,
              avatar: conv.userPhoto || config.defaults.avatar,
              lastMessage: lastMessage ?? undefined, // Convert null to undefined
              timestamp: conv.lastMessageTime
                ? new Date(conv.lastMessageTime)
                : null,
              lastMessageFrom: conv.lastMessageSender
                ? String(conv.lastMessageSender)
                : null,
              // Store additional API data for reference
              conversationId: conv.conversationId,
              messageCount: conv.messageCount || 0,
              unreadCount: conv.unreadCount || 0,
              filterState: conv.filterState,
            };
          }
        );

        setConversations(mappedConversations);
        addLog(`Loaded ${mappedConversations.length} conversation(s) from API`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        addLog(`Error fetching conversations: ${errorMessage}`);
        console.error("Error fetching conversations:", error);
        // Set empty array on error to prevent retry loop
        setConversations([]);
      }
    };

    fetchConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, userId, filterType, sortOrder]);

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
      localUserName: userId, // You can get actual name from user profile if available
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

  function formatDurationFromSeconds(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];

    if (hours > 0) parts.push(`${hours} hr${hours > 1 ? "s" : ""}`);
    if (minutes > 0) parts.push(`${minutes} min${minutes > 1 ? "s" : ""}`);
    if (seconds > 0 || parts.length === 0)
      parts.push(`${seconds} sec${seconds > 1 ? "s" : ""}`);

    return parts.join(" ");
  }

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

    const bothUsersConnected = callInfo.bothUsersConnected === true;

    // Calculate duration - use provided duration or calculate from timestamps
    let duration = callInfo.duration || 0;
    if (duration <= 0 && callInfo.callStartTime && callInfo.callEndTime) {
      duration = Math.floor(
        (callInfo.callEndTime - callInfo.callStartTime) / 1000
      );
    }

    // Ensure duration is at least 0 (not negative)
    duration = Math.max(0, duration);

    if (!bothUsersConnected || duration <= 0) {
      console.log("📞 Call End Message - NOT sending (conditions not met):", {
        bothUsersConnected,
        duration,
      });
      addLog(
        "Call ended without other user joining. Not sending call summary to backend."
      );
      setActiveCall(null);
      setIncomingCall(null);
      setMessage("");
      return;
    }

    try {
      // Determine message type and title based on call type
      const isVideoCall = activeCall.callType === "video";
      const messageType = isVideoCall ? "video_call" : "voice_call";
      const callTitle = isVideoCall ? "Video call" : "Voice call";

      // Send call end message with duration
      const payload = {
        title: callTitle,
        description: `${formatDurationFromSeconds(duration)}`,
        icons_details: {
          left_icon: "",
          right_icon: "",
        },
        call_details: {
          call_url: "",
        },
        redirection_details: [],
      };

      const body = {
        from: userId,
        to: peerId,
        type: messageType,
        data: payload,
      };

      try {
        const response = await axios.post(config.api.customMessage, body);
        console.log(`${callTitle} message sent successfully:`, response.data);

        // Mark call end message as sent to prevent duplicates
        callEndMessageSentRef.current = true;

        // Add message directly to logs for real-time display
        if (addLog) {
          const messageToLog = JSON.stringify({
            type: messageType,
            ...payload,
          });
          addLog({
            log: `You → ${peerId}: ${messageToLog}`,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        console.error(
          `Error sending ${callTitle.toLowerCase()} message:`,
          error
        );
      }

      addLog(`${callTitle} ended. Duration: ${duration}s`);
    } catch (error) {
      console.error("Error sending call end message:", error);
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      addLog(`Failed to send call end message: ${errorMessage}`);
      // Reset flag on error so it can be retried if needed
      callEndMessageSentRef.current = false;
    }

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
        return `Schedule ${scheduledDate.toLocaleString()}`;
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

      // Prepare ext properties with sender info
      const extProperties = {
        senderName: coachInfo.name || userId,
        senderProfile: coachInfo.profilePhoto || config.defaults.avatar,
        isFromUser: false,
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
            preview = `Schedule ${scheduledDate.toLocaleString()}`;
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
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            filterType={filterType}
            onFilterTypeChange={setFilterType}
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
                coachInfo={coachInfo}
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
        {/* User Details Panel */}
        <div className="user-details-panel-wrapper">
          <FPUserDetails
            selectedContact={selectedContact}
            userId={userId}
            peerId={peerId}
            onSend={handleSendMessage}
            addLog={addLog}
          />
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
