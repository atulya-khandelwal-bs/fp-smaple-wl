import React, { useEffect, useState, useRef, useCallback } from "react";
import "./FPChatApp.css";
import FPChatInterface from "./components/FPChatInterface.tsx";
import FPCallApp from "../fp-call/FPCallApp.tsx";
import AgoraChat from "agora-chat";
import { useChatClient } from "./hooks/useChatClient.ts";
import config from "../common/config.ts";
import { buildCustomExts } from "./utils/buildCustomExts.ts";
import { createMessageHandlers } from "./utils/messageHandlers.ts";
import { Contact, Message, LogEntry } from "../common/types/chat";
import { CallEndData } from "../common/types/call";
import type { MessageBody } from "agora-chat";
import { fetchDietitianDetails } from "./services/dietitianApi";

interface FPChatAppProps {
  userId: string;
  conversationId: string; // Required: the coach/user ID to chat with
  name?: string; // Optional: the name to display for the conversation
  profilePhoto?: string; // Optional: the profile photo URL for the conversation
  designation?: string; // Optional: the designation/title to display (e.g., "Nutritionist", "Coach")
  onLogout?: () => void;
}

interface ActiveCall {
  userId: string;
  peerId: string;
  channel: string;
  isInitiator: boolean;
  callType: "video" | "audio";
  localUserName: string;
  localUserPhoto?: string;
  peerName: string;
  peerAvatar?: string;
}

interface IncomingCall {
  from: string;
  channel: string;
  callId?: string;
  callType?: "video" | "audio";
}

function FPChatApp({
  userId,
  conversationId,
  name,
  profilePhoto,
  designation,
  onLogout,
}: FPChatAppProps): React.JSX.Element {
  const [token, setToken] = useState<string | undefined>(undefined);
  const [isGeneratingToken, setIsGeneratingToken] = useState<boolean>(false);
  const appKey = config.agora.appKey;
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [peerId, setPeerId] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [logs, setLogs] = useState<(string | LogEntry)[]>([]);

  // Call state management
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [_incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  // Scheduled call from API
  const [scheduledCallFromApi, setScheduledCallFromApi] = useState<{
    date: string;
    start_time: string;
    call_date_time: number; // epoch timestamp
    schedule_call_id: number;
    call_type?: "video" | "audio"; // Type of call scheduled
  } | null>(null);

  // 🔹 Global message ID tracker to prevent duplicates
  const isSendingRef = useRef<boolean>(false);
  // 🔹 Track if call end message has been sent to prevent duplicates
  const callEndMessageSentRef = useRef<boolean>(false);

  // 🔹 Track processed message IDs to avoid duplicates in polling
  const processedMessageIdsRef = useRef<Set<string>>(new Set());
  // 🔹 Track last poll time to avoid too frequent polling
  const lastPollTimeRef = useRef<number>(0);
  // 🔹 Track if direct chat has been initialized to prevent multiple initializations
  const directChatInitializedRef = useRef<boolean>(false);

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

  // Function to fetch scheduled call from API (reusable)
  // Memoized with useCallback to prevent unnecessary re-renders
  const fetchScheduledCall = useCallback(async (): Promise<void> => {
    if (!isLoggedIn || !selectedContact) {
      setScheduledCallFromApi(null);
      return;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const callDate = Math.floor(today.getTime() / 1000);

      const data = await fetchDietitianDetails(callDate);

      // Find first slot with schedule_call_id != null
      let foundScheduledSlot: {
        date: string;
        start_time: string;
        call_date_time: number;
        schedule_call_id: number;
        call_type?: "video" | "audio";
      } | null = null;

      if (data?.result?.health_coach_schedules) {
        for (const schedule of data.result.health_coach_schedules) {
          if (schedule.slots) {
            const scheduledSlot = schedule.slots.find(
              (slot) => slot.schedule_call_id != null
            );
            if (scheduledSlot && scheduledSlot.schedule_call_id) {
              // Calculate call_date_time from date and start_time
              const [year, month, day] = schedule.date.split("-").map(Number);
              const date = new Date(year, month - 1, day);

              // Parse time
              const [time, period] = scheduledSlot.start_time.split(" ");
              const [hours, minutes] = time.split(":").map(Number);
              let hour24 = hours;
              if (period === "pm" && hours !== 12) hour24 += 12;
              if (period === "am" && hours === 12) hour24 = 0;

              date.setHours(hour24, minutes, 0, 0);
              const call_date_time = Math.floor(date.getTime() / 1000);

              foundScheduledSlot = {
                date: schedule.date,
                start_time: scheduledSlot.start_time,
                call_date_time: call_date_time,
                schedule_call_id: scheduledSlot.schedule_call_id,
                call_type: "video", // Default to video, will be updated when scheduling
              };
              break; // Found first scheduled slot, exit
            }
          }
        }
      }

      setScheduledCallFromApi(foundScheduledSlot);
    } catch (error) {
      console.error("Error fetching scheduled call:", error);
      setScheduledCallFromApi(null);
    }
  }, [isLoggedIn, selectedContact]);

  // Fetch scheduled call from API on mount
  // Fetch scheduled call from API when logged in and contact is selected
  useEffect(() => {
    fetchScheduledCall();
  }, [fetchScheduledCall]);

  // Poll for scheduled call updates every 10 seconds to detect backend cancellations
  useEffect(() => {
    if (!isLoggedIn || !selectedContact) {
      return;
    }

    // Poll every 10 seconds to check for scheduled call updates
    const pollInterval = setInterval(() => {
      fetchScheduledCall();
    }, 10000); // Poll every 10 seconds

    // Cleanup interval on unmount or when dependencies change
    return () => {
      clearInterval(pollInterval);
    };
  }, [isLoggedIn, selectedContact, fetchScheduledCall]);

  // Create a ref to store clientRef for handlers
  const clientRefForHandlers = useRef<unknown>(null);

  // Handle incoming call - defined early so it can be used in handlers
  const handleIncomingCall = (callData: IncomingCall): void => {
    setIncomingCall(callData);
  };

  // Create handlers - they will use clientRefForHandlers.current
  const handlers = createMessageHandlers({
    userId,
    setIsLoggedIn,
    setIsLoggingIn: () => {}, // Not used in chat app, login handled by parent
    addLog,
    setConversations: () => {}, // Not used - conversation list removed
    generateNewToken,
    handleIncomingCall,
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

  // Initialize direct chat mode: always open chat interface with the conversationId
  useEffect(() => {
    const initializeDirectChat = async (): Promise<void> => {
      try {
        addLog(
          `Initializing direct chat with conversation ID: ${conversationId}`
        );

        // Create a contact object from conversationId and provided name/profilePhoto/designation
        // The conversationId is the coach/user ID to chat with
        const contact: Contact = {
          id: String(conversationId),
          name: name || `User ${conversationId}`, // Use provided name or default
          avatar: profilePhoto || config.defaults.avatar, // Use provided photo or default
          description: designation, // Store designation in description field
          lastMessage: undefined,
          timestamp: null,
          lastMessageFrom: null,
        };

        // If already initialized, just update the contact info (name/avatar/designation)
        if (directChatInitializedRef.current && selectedContact) {
          setSelectedContact({
            ...selectedContact,
            name: contact.name,
            avatar: contact.avatar,
            description: contact.description,
          });
          return;
        }

        // Generate token if not already available
        if (!token && !isLoggedIn) {
          const newToken = await ensureToken();
          if (!newToken) {
            addLog("Failed to generate token. Cannot connect to chat.");
            console.error("Failed to generate token. Cannot connect to chat.");
            return;
          }
        }

        // Register the user if not already registered
        await registerUser(contact.id);

        // Set selected contact and peerId to open chat interface
        setSelectedContact(contact);
        setPeerId(contact.id);

        // Mark as initialized to prevent re-initialization
        directChatInitializedRef.current = true;

        addLog(`Direct chat initialized with ${contact.id}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        addLog(`Error initializing direct chat: ${errorMessage}`);
        console.error("Error initializing direct chat:", error);
      }
    };

    initializeDirectChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, userId, name, profilePhoto, designation]);

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

  // Poll for recent messages to catch backend-sent messages that might not trigger handlers
  useEffect(() => {
    if (!peerId || !clientRef.current || !isLoggedIn) {
      return;
    }

    // Clear processed message IDs when peerId changes to start fresh
    processedMessageIdsRef.current.clear();

    const POLL_INTERVAL = 3000; // Poll every 3 seconds
    const MIN_POLL_INTERVAL = 1000; // Minimum 1 second between polls
    const INITIAL_POLL_DELAY = 3000; // Delay before first poll to allow fetchInitialMessages to complete

    const pollForMessages = async (): Promise<void> => {
      const now = Date.now();
      // Throttle polling to avoid too frequent requests
      if (now - lastPollTimeRef.current < MIN_POLL_INTERVAL) {
        return;
      }
      lastPollTimeRef.current = now;

      try {
        const targetId = peerId.startsWith("user_")
          ? peerId.replace("user_", "")
          : peerId;

        const client = clientRef.current as {
          getHistoryMessages?: (options: {
            targetId: string;
            chatType: string;
            pageSize: number;
            searchDirection: string;
          }) => Promise<{
            messages?: unknown[];
            cursor?: string;
          }>;
        };

        if (!client.getHistoryMessages) {
          return;
        }

        // Fetch only the most recent message to check for new ones
        const result = await client.getHistoryMessages({
          targetId,
          chatType: "singleChat",
          pageSize: 1,
          searchDirection: "up",
        });

        const messages = (result?.messages || []) as Array<{
          id?: string;
          mid?: string;
          from?: string;
          to?: string;
          time?: number;
          type?: string;
          msg?: string;
          customExts?: unknown;
          "v2:customExts"?: unknown;
          body?: unknown;
          ext?: unknown;
        }>;

        if (messages.length > 0) {
          const latestMessage = messages[0];
          // Generate all possible message ID formats to check against processed set
          const messageId =
            latestMessage.id ||
            latestMessage.mid ||
            `${latestMessage.from}-${latestMessage.time}`;
          const messageIdAlt1 = latestMessage.id || null;
          const messageIdAlt2 = latestMessage.mid || null;
          const messageIdAlt3 =
            latestMessage.from && latestMessage.time
              ? `${latestMessage.from}-${latestMessage.time}`
              : null;

          // Check if we've already processed this message (in any ID format)
          const isAlreadyProcessed =
            processedMessageIdsRef.current.has(messageId) ||
            (messageIdAlt1 &&
              processedMessageIdsRef.current.has(messageIdAlt1)) ||
            (messageIdAlt2 &&
              processedMessageIdsRef.current.has(messageIdAlt2)) ||
            (messageIdAlt3 &&
              processedMessageIdsRef.current.has(messageIdAlt3));

          if (isAlreadyProcessed) {
            // Message is already processed (likely from fetchInitialMessages)
            // Skip it to prevent duplicates

            return;
          }

          // Check if this message is already in logs
          const messageInLogs = logs.some((log) => {
            if (typeof log === "string") {
              return log.includes(messageId);
            }
            return (
              log.serverMsgId === messageId ||
              log.serverMsgId === messageIdAlt1 ||
              log.serverMsgId === messageIdAlt2 ||
              log.serverMsgId === messageIdAlt3
            );
          });

          if (!messageInLogs) {
            // Mark all ID formats as processed BEFORE processing
            processedMessageIdsRef.current.add(messageId);
            if (messageIdAlt1) {
              processedMessageIdsRef.current.add(messageIdAlt1);
            }
            if (messageIdAlt2) {
              processedMessageIdsRef.current.add(messageIdAlt2);
            }
            if (messageIdAlt3) {
              processedMessageIdsRef.current.add(messageIdAlt3);
            }

            // This is a new message that wasn't caught by handlers
            // Process it through the handlers manually

            // Trigger the appropriate handler based on message type
            if (latestMessage.type === "custom" && handlers.onCustomMessage) {
              handlers.onCustomMessage(latestMessage as MessageBody);
            } else if (latestMessage.type === "txt" && handlers.onTextMessage) {
              handlers.onTextMessage(latestMessage as MessageBody);
            }
          } else {
            // Message is in logs, mark as processed but don't process again
            processedMessageIdsRef.current.add(messageId);
            if (messageIdAlt1) {
              processedMessageIdsRef.current.add(messageIdAlt1);
            }
            if (messageIdAlt2) {
              processedMessageIdsRef.current.add(messageIdAlt2);
            }
            if (messageIdAlt3) {
              processedMessageIdsRef.current.add(messageIdAlt3);
            }
          }
        }
      } catch (error) {
        console.error("Error polling for messages:", error);
      }
    };

    // Delay the first poll to allow fetchInitialMessages to complete
    // This prevents duplicate messages from appearing on page load/refresh
    let intervalId: NodeJS.Timeout | null = null;
    const initialTimeoutId = setTimeout(() => {
      pollForMessages();
      intervalId = setInterval(pollForMessages, POLL_INTERVAL);
    }, INITIAL_POLL_DELAY);

    return () => {
      clearTimeout(initialTimeoutId);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerId, isLoggedIn, clientRef, logs.length]);

  // Register a user with Agora (called when selecting a user)
  const registerUser = async (username: string): Promise<boolean> => {
    try {
      const endpoint = config.api.registerUserEndpoint;
      const requestBody = { username: username };

      addLog(`Registering user ${username}...`);

      const registerResponse = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (registerResponse.ok) {
        await registerResponse.json().catch(() => ({})); // Consume response body
        addLog(`User ${username} registered successfully`);
        return true;
      } else {
        // User might already be registered
        const errorData = await registerResponse.json().catch(() => ({}));

        if (
          registerResponse.status === 400 ||
          registerResponse.status === 409
        ) {
          addLog(`User ${username} already exists, proceeding...`);
          return true; // User exists, can proceed
        } else {
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
    setPeerId("");
    setMessage("");
    // Call parent's logout handler if provided
    if (onLogout) {
      onLogout();
    }
  };

  // Handle call initiation (video or audio)
  const handleInitiateCall = async (
    callType: "video" | "audio" = "video"
  ): Promise<void> => {
    if (!peerId || !userId) {
      addLog("Cannot initiate call: Missing user or peer ID");
      return;
    }

    // Generate channel name using format: fp_rtc_call_CALLTYPE_USERID_DIETITIANID
    // CALLTYPE => video or voice
    // USERID => userId (the user's ID)
    // DIETITIANID => peerId (the dietitian/coach ID)
    const callTypeStr = callType === "video" ? "video" : "voice";
    const channel = `fp_rtc_call_${callTypeStr}_${userId}_${peerId}`;

    // Reset call end message sent flag for new call
    callEndMessageSentRef.current = false;

    // DO NOT send initiate message - only send end message with duration
    // Removed: await handleSendMessage(callMessage);

    // Ensure message is cleared
    setMessage("");

    // Set active call state
    setActiveCall({
      peerId,
      userId,
      channel,
      isInitiator: true,
      callType: callType,
      localUserName: userId, // userId is now the patient - will be used as fallback
      localUserPhoto: undefined, // Local user photo - can be fetched from user profile if available
      peerName: selectedContact?.name || peerId,
      peerAvatar: selectedContact?.avatar,
    });

    addLog(`Initiating ${callType} call with ${userId}`);
  };

  // Handle schedule call - refetch dietitian details after scheduling
  const handleScheduleCall = async (
    date: Date,
    time: string,
    _topic: string,
    callType: "video" | "audio" = "video"
  ): Promise<void> => {
    if (!selectedContact) {
      addLog("Cannot schedule call: No contact selected");
      return;
    }

    addLog(`Call scheduled for ${date.toLocaleDateString()} at ${time}`);

    // Refetch dietitian details to get the updated scheduled call info
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const callDate = Math.floor(today.getTime() / 1000);

      const data = await fetchDietitianDetails(callDate);

      // Find first slot with schedule_call_id != null
      let foundScheduledSlot: {
        date: string;
        start_time: string;
        call_date_time: number;
        schedule_call_id: number;
        call_type?: "video" | "audio";
      } | null = null;

      if (data?.result?.health_coach_schedules) {
        for (const schedule of data.result.health_coach_schedules) {
          if (schedule.slots) {
            const scheduledSlot = schedule.slots.find(
              (slot) => slot.schedule_call_id != null
            );
            if (scheduledSlot && scheduledSlot.schedule_call_id) {
              // Calculate call_date_time from date and start_time
              const [year, month, day] = schedule.date.split("-").map(Number);
              const dateObj = new Date(year, month - 1, day);

              // Parse time
              const [timePart, period] = scheduledSlot.start_time.split(" ");
              const [hours, minutes] = timePart.split(":").map(Number);
              let hour24 = hours;
              if (period === "pm" && hours !== 12) hour24 += 12;
              if (period === "am" && hours === 12) hour24 = 0;

              dateObj.setHours(hour24, minutes, 0, 0);
              const call_date_time = Math.floor(dateObj.getTime() / 1000);

              foundScheduledSlot = {
                date: schedule.date,
                start_time: scheduledSlot.start_time,
                call_date_time: call_date_time,
                schedule_call_id: scheduledSlot.schedule_call_id,
                call_type: callType, // Store the call type from scheduling
              };
              break; // Found first scheduled slot, exit
            }
          }
        }
      }

      setScheduledCallFromApi(foundScheduledSlot);
    } catch (error) {
      console.error("Error refetching scheduled call after scheduling:", error);
    }
  };

  // Handle end call
  const handleEndCall = async (
    callInfo: CallEndData | null = null
  ): Promise<void> => {
    // Prevent duplicate call end messages
    if (callEndMessageSentRef.current) {
      // Clear call state even if message was already sent
      setActiveCall(null);
      setIncomingCall(null);
      setMessage("");
      return;
    }

    if (!activeCall || !callInfo) {
      setActiveCall(null);
      setIncomingCall(null);
      setMessage("");
      return;
    }

    // Clear call state
    setActiveCall(null);
    setIncomingCall(null);
    // Clear any call message that might be in the input box
    setMessage("");
  };

  // Function to update conversation's last message from history
  const updateLastMessageFromHistory = (
    _peerId: string,
    _formattedMsg: Message
  ): void => {
    // Conversation list removed - no need to update conversation preview
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

        // Capture serverMsgId from response for message editing
        const serverMsgId = (response as { serverMsgId?: string })?.serverMsgId;
        if (serverMsgId) {
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

      // Conversation list removed - no need to generate preview or update conversation

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
          localUserPhoto={activeCall.localUserPhoto}
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
        {/* Chat Panel - always full width, no conversation list */}
        <div className="chat-panel full-width">
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
                onBackToConversations={null}
                onInitiateCall={handleInitiateCall}
                onSchedule={handleScheduleCall}
                onUpdateLastMessageFromHistory={updateLastMessageFromHistory}
                onMessagesLoadedFromHistory={(messageIds) => {
                  // Mark all message IDs from history as processed to prevent polling from processing them again
                  messageIds.forEach((id) => {
                    processedMessageIdsRef.current.add(id);
                  });
                }}
                coachInfo={{ coachName: "", profilePhoto: "" }}
                scheduledCallFromApi={scheduledCallFromApi}
                onRefreshScheduledCall={fetchScheduledCall}
              />
            )
          ) : (
            <div className="chat-loading-container">
              <div className="chat-loading-spinner" />
              <div className="chat-loading-text">Initializing chat...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FPChatApp;
