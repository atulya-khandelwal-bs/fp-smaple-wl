/**
 * Message event handlers for Agora Chat SDK
 * Handles incoming text messages, custom messages, and connection events
 */

import config from "../../common/config.ts";
import { Contact, LogEntry } from "../../common/types/chat";
import type { MessageBody } from "agora-chat";
import React from "react";

interface IncomingCall {
  from: string;
  channel: string;
  callId?: string;
  callType?: "video" | "audio";
}

interface MessageHandlersOptions {
  userId: string;
  setIsLoggedIn: (value: boolean) => void;
  setIsLoggingIn: (value: boolean) => void;
  addLog: (log: string | LogEntry) => void;
  setConversations: React.Dispatch<React.SetStateAction<Contact[]>>;
  generateNewToken: () => Promise<string | null>;
  handleIncomingCall: (callData: IncomingCall) => void;
  onPresenceStatus?: (presenceData: {
    userId: string;
    description: string;
  }) => void;
  clientRef: React.RefObject<unknown> | (() => unknown) | { current?: unknown };
}

/**
 * Format date as "11 Aug 10:00 am" (no seconds, with AM/PM)
 */
function formatScheduledDate(date: Date): string {
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
}

/**
 * Creates message event handlers for the chat client
 */
export function createMessageHandlers({
  userId,
  setIsLoggedIn,
  setIsLoggingIn,
  addLog,
  setConversations,
  generateNewToken,
  handleIncomingCall,
  onPresenceStatus,
  clientRef,
}: MessageHandlersOptions): {
  onConnected: () => void;
  onDisconnected: () => void;
  onTextMessage: (msg: MessageBody) => void;
  onCustomMessage: (msg: MessageBody) => void;
  onTokenWillExpire: () => Promise<void>;
  onTokenExpired: () => Promise<void>;
  onError: (e: { message: string }) => void;
  onPresenceStatus?: (presenceData: {
    userId: string;
    description: string;
  }) => void;
} {
  // Helper to get the actual client ref
  const getClientRef = (): unknown => {
    if (typeof clientRef === "function") {
      return clientRef();
    }
    if (clientRef && typeof clientRef === "object" && "current" in clientRef) {
      return (clientRef as { current?: unknown }).current;
    }
    return clientRef;
  };
  return {
    onConnected: () => {
      setIsLoggedIn(true);
      setIsLoggingIn(false);
      addLog(`User ${userId} connected`);
    },
    onDisconnected: () => {
      setIsLoggedIn(false);
      addLog("Disconnected");
    },
    onTextMessage: (msg: MessageBody) => {
      // Check if this is actually a custom message (Agora might deliver custom as text)
      if (msg.type === "custom") {
        // Handle as custom message
        let preview = "Attachment";
        let messageContent = "";

        try {
          // First check customExts (standard Agora Chat format)
          let paramsData = null;
          if (msg.customExts && typeof msg.customExts === "object") {
            paramsData = msg.customExts;
          } else if (
            msg["v2:customExts"] &&
            typeof msg["v2:customExts"] === "object"
          ) {
            paramsData = msg["v2:customExts"];
          } else if (msg.body && typeof msg.body === "object") {
            const bodyObj = msg.body as {
              customExts?: unknown;
              "v2:customExts"?: unknown;
              messageType?: string;
              payload?: unknown;
            };
            // Check for API format first (messageType + payload)
            if (bodyObj.messageType && bodyObj.payload) {
              paramsData = {
                messageType: bodyObj.messageType,
                payload: bodyObj.payload,
              };
              console.log("Found API format in msg.body:", paramsData);
            } else if (bodyObj.customExts) {
              paramsData = bodyObj.customExts;
            } else if (bodyObj["v2:customExts"]) {
              paramsData = bodyObj["v2:customExts"];
            }
          } else if (msg.params) {
            paramsData =
              typeof msg.params === "string"
                ? JSON.parse(msg.params)
                : msg.params;
            console.log(
              "Extracted from msg.params:",
              JSON.stringify(paramsData, null, 2)
            );
          }

          // Normalize the message structure for UI parsing (same as onCustomMessage)
          let normalizedData = paramsData;

          // Handle case where customExts has a stringified 'data' field (e.g., from backend API)
          // Example: { type: 'call_scheduled', data: '{"time":"1765953010","type":"call_scheduled"}' }
          if (
            paramsData &&
            typeof paramsData === "object" &&
            "data" in paramsData &&
            typeof paramsData.data === "string"
          ) {
            try {
              const parsedData = JSON.parse(paramsData.data);
              // Merge parsed data with the outer object, preserving type from outer if not in parsed
              normalizedData = {
                ...parsedData,
                type: parsedData.type || (paramsData as { type?: string }).type,
              };
              console.log(
                "✅ Parsed stringified data field (onTextMessage):",
                JSON.stringify(normalizedData, null, 2)
              );
            } catch (parseError) {
              console.warn(
                "Failed to parse data field (onTextMessage):",
                parseError,
                paramsData.data
              );
              // Fall through to other normalization logic
            }
          }
          // Handle API format with messageType and payload
          else if (
            paramsData &&
            typeof paramsData === "object" &&
            "messageType" in paramsData &&
            "payload" in paramsData
          ) {
            normalizedData = {
              ...(paramsData.payload as object),
              type: paramsData.messageType,
            };
          }
          // Handle API format with just payload
          else if (
            paramsData &&
            typeof paramsData === "object" &&
            "payload" in paramsData &&
            !("type" in paramsData) &&
            msg.type
          ) {
            normalizedData = {
              ...(paramsData.payload as object),
              type: msg.type,
            };
          }
          // If paramsData has action_type but no type, use action_type as type
          else if (
            paramsData &&
            typeof paramsData === "object" &&
            "action_type" in paramsData &&
            !("type" in paramsData)
          ) {
            normalizedData = {
              ...paramsData,
              type: paramsData.action_type,
            };
          }

          if (
            normalizedData &&
            typeof normalizedData === "object" &&
            Object.keys(normalizedData).length > 0 &&
            ("type" in normalizedData || "action_type" in normalizedData)
          ) {
            const paramsObj = normalizedData as {
              type?: string;
              action_type?: string;
              fileName?: string;
              title?: string;
            };
            const t = String(
              paramsObj.type || paramsObj.action_type || ""
            ).toLowerCase();
            if (t === "image") preview = "Photo";
            else if (t === "file")
              preview = paramsObj.fileName
                ? `📎 ${paramsObj.fileName}`
                : "File";
            else if (t === "audio") preview = "Audio";
            else if (t === "coach_assigned" || t === "coach_details")
              preview = paramsObj.title || "New nutritionist assigned";
            else if (t === "meal_plan_updated" || t === "meal_plan_update")
              preview = "Meal plan updated";
            else if (t === "products" || t === "recommended_products")
              preview = "Products";
            else if (
              t === "general_notification" ||
              t === "general-notification"
            )
              preview = paramsObj.title || "Notification";
            else if (
              t === "video_call" ||
              t === "voice_call" ||
              t === "documents"
            )
              preview = paramsObj.title || "Message";
            else if (t === "call_scheduled") {
              const time = (paramsObj as { time?: number | string }).time;
              if (time) {
                const scheduledDate = new Date(
                  typeof time === "number"
                    ? time * 1000
                    : parseInt(time, 10) * 1000
                );
                preview = `Schedule, ${formatScheduledDate(scheduledDate)}`;
              } else {
                preview = "Call scheduled";
              }
            } else if (t === "scheduled_call_canceled")
              preview = "Scheduled call cancelled";

            // Ensure the logged message has 'type' field for UI parsing
            messageContent = JSON.stringify(normalizedData);
          } else {
            messageContent = JSON.stringify(normalizedData || {});
          }
        } catch {
          messageContent = JSON.stringify(
            msg.customExts || msg["v2:customExts"] || msg.params || {}
          );
        }

        addLog(`${msg.from}: ${messageContent}`);

        // Update conversation - normalize conversation ID matching
        if (msg.from) {
          const fromId = msg.from;
          // Normalize: try both with and without user_ prefix
          const normalizedFromId = fromId.startsWith("user_") ? fromId : `user_${fromId}`;
          const normalizedFromIdWithoutPrefix = fromId.startsWith("user_") ? fromId.replace("user_", "") : fromId;
          
          console.log("🔄 [onTextMessage] Updating conversation preview:", {
            fromId,
            normalizedFromId,
            normalizedFromIdWithoutPrefix,
            preview,
          });
          
          setConversations((prev) => {
            // Find conversation by matching either format
            const existing = prev.find((c) => 
              c.id === fromId || 
              c.id === normalizedFromId || 
              c.id === normalizedFromIdWithoutPrefix ||
              c.id === `user_${normalizedFromIdWithoutPrefix}`
            );
            
            console.log("🔄 [onTextMessage] Conversation search result:", {
              existing: existing ? { id: existing.id, lastMessage: existing.lastMessage } : null,
              allConversationIds: prev.map(c => c.id),
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
                      lastMessageFrom: fromId,
                    }
                  : conv
              );
              console.log("✅ [onTextMessage] Conversation updated:", {
                conversationId,
                newLastMessage: preview,
                updatedConversation: updated.find(c => c.id === conversationId),
              });
              return updated;
            }
            // Create new conversation - use normalized format with user_ prefix
            const newConversation = {
              id: normalizedFromId,
              name: normalizedFromIdWithoutPrefix,
              lastMessage: preview,
              timestamp: new Date(),
              avatar: config.defaults.avatar,
              replyCount: 0,
              lastSeen: "",
              lastMessageFrom: fromId,
            };
            console.log("➕ [onTextMessage] Creating new conversation:", newConversation);
            return [newConversation, ...prev];
          });
        }
        return; // Don't process as text message
      }

      // Regular text message handling
      // Derive a friendly preview for conversation list
      let preview = msg.msg || "";
      let normalizedMessageContent: string | null = null; // Store normalized content for logging
      try {
        // Only try to parse if it looks like JSON
        if (typeof msg.msg === "string" && msg.msg.trim().startsWith("{")) {
          let obj = JSON.parse(msg.msg as string);
          const originalObj = { ...obj }; // Keep original for comparison

          // Normalize API format with messageType and payload
          if (
            obj &&
            typeof obj === "object" &&
            "messageType" in obj &&
            "payload" in obj
          ) {
            obj = {
              ...obj.payload,
              type: obj.messageType,
            };
          }
          // Normalize if it has payload but no type
          else if (
            obj &&
            typeof obj === "object" &&
            "payload" in obj &&
            !("type" in obj)
          ) {
            obj = {
              ...obj.payload,
              type: obj.action_type || "unknown",
            };
          }
          // Normalize if it has action_type but no type
          else if (
            obj &&
            typeof obj === "object" &&
            "action_type" in obj &&
            !("type" in obj)
          ) {
            obj = {
              ...obj,
              type: obj.action_type,
            };
          }

          // If we normalized the object, use normalized version for logging
          if (JSON.stringify(obj) !== JSON.stringify(originalObj)) {
            normalizedMessageContent = JSON.stringify(obj);
          }

          if (obj && typeof obj === "object" && "type" in obj) {
            const objTyped = obj as {
              type?: string;
              fileName?: string;
              callType?: string;
              action?: string;
              channel?: string;
              from?: string;
            };
            const t = String(objTyped.type).toLowerCase();
            if (t === "image") preview = "Photo";
            else if (t === "file")
              preview = objTyped.fileName ? `📎 ${objTyped.fileName}` : "File";
            else if (t === "audio") preview = "Audio";
            else if (t === "text")
              preview = (objTyped as { body?: string }).body ?? "";
            else if (t === "call") {
              // Handle call messages - generate preview based on callType
              const callType =
                objTyped.callType === "video" ? "Video" : "Audio";
              preview = `${callType} call`;
              // Handle incoming call notification if action is initiate
              if (objTyped.action === "initiate" && handleIncomingCall) {
                console.log(
                  "Incoming call detected in text message:",
                  objTyped
                );
                if (objTyped.channel && objTyped.from) {
                  console.log("Calling handleIncomingCall with:", {
                    from: objTyped.from,
                    channel: objTyped.channel,
                    callId: objTyped.channel,
                  });
                  handleIncomingCall({
                    from: objTyped.from,
                    channel: objTyped.channel,
                    callId: objTyped.channel,
                    callType:
                      objTyped.callType === "video" ||
                      objTyped.callType === "audio"
                        ? objTyped.callType
                        : "video", // Default to video if not specified
                  });
                } else {
                  console.warn(
                    "Call message missing channel or from:",
                    objTyped
                  );
                }
              }
            } else if (t === "meal_plan_updated" || t === "meal_plan_update")
              preview = "Meal plan updated";
            else if (
              t === "new_nutritionist" ||
              t === "new_nutrionist" ||
              t === "coach_assigned" ||
              t === "coach_details"
            )
              preview =
                (objTyped as { title?: string; name?: string }).title ||
                (objTyped as { title?: string; name?: string }).name ||
                "New nutritionist assigned";
            else if (t === "products" || t === "recommended_products")
              preview = "Products";
            else if (
              t === "general_notification" ||
              t === "general-notification"
            )
              preview =
                (objTyped as { title?: string }).title || "Notification";
            else if (t === "video_call")
              preview = (objTyped as { title?: string }).title || "Video call";
            else if (t === "voice_call")
              preview = (objTyped as { title?: string }).title || "Voice call";
            else if (t === "documents")
              preview = (objTyped as { title?: string }).title || "Document";
            else if (t === "call_scheduled") {
              const time = (objTyped as { time?: number | string }).time;
              if (time) {
                const scheduledDate = new Date(
                  typeof time === "number"
                    ? time * 1000
                    : parseInt(time, 10) * 1000
                );
                preview = `Schedule, ${formatScheduledDate(scheduledDate)}`;
              } else {
                preview = "Call scheduled";
              }
            } else if (t === "scheduled_call_canceled")
              preview = "Scheduled call cancelled";
            // If we successfully parsed and generated a preview, use it
            // Otherwise, preview remains as the original msg.msg
          }
        }
      } catch {
        // If parsing fails, preview stays as msg.msg (plain text)
        // This is fine for regular text messages
      }

      // Use normalized content if available, otherwise use original message
      const messageToLog = normalizedMessageContent || msg.msg;
      addLog(`${msg.from}: ${messageToLog}`);

      // Update conversation when receiving a message - normalize conversation ID matching
      if (msg.from) {
        const fromId = msg.from;
        // Normalize: try both with and without user_ prefix
        const normalizedFromId = fromId.startsWith("user_") ? fromId : `user_${fromId}`;
        const normalizedFromIdWithoutPrefix = fromId.startsWith("user_") ? fromId.replace("user_", "") : fromId;
        
        setConversations((prev) => {
          // Find conversation by matching either format
          const existing = prev.find((c) => 
            c.id === fromId || 
            c.id === normalizedFromId || 
            c.id === normalizedFromIdWithoutPrefix ||
            c.id === `user_${normalizedFromIdWithoutPrefix}`
          );
          
          if (existing) {
            // Use the existing conversation ID format
            const conversationId = existing.id;
            return prev.map((conv) =>
              conv.id === conversationId
                ? {
                    ...conv,
                    lastMessage: preview,
                    timestamp: new Date(),
                    lastMessageFrom: fromId, // Customer sent the last message
                  }
                : conv
            );
          }
          // Create new conversation - use normalized format with user_ prefix
          return [
            {
              id: normalizedFromId,
              name: normalizedFromIdWithoutPrefix,
              lastMessage: preview,
              timestamp: new Date(),
              avatar: config.defaults.avatar,
              replyCount: 0,
              lastSeen: "",
              lastMessageFrom: fromId, // Customer sent the last message
            },
            ...prev,
          ];
        });
      }
    },
    onCustomMessage: (msg: MessageBody) => {
      // Handle custom messages (attachments)
      console.log("=== onCustomMessage called ===");
      console.log("Full msg object:", JSON.stringify(msg, null, 2));
      console.log("msg.type:", msg.type);
      console.log("msg.params:", msg.params);
      console.log("msg.params type:", typeof msg.params);
      console.log("msg.body:", msg.body);
      console.log("msg.ext:", msg.ext);
      console.log("msg.msg:", msg.msg);
      console.log("All msg keys:", Object.keys(msg));

      let preview = "Attachment";
      let messageContent = "";

      try {
        // Custom messages store data in v2:customExts or customExts
        let paramsData = null;

        // First priority: Check msg.body for API format (messageType + payload)
        // This is likely where API-sent custom messages arrive
        if (msg.body && typeof msg.body === "object") {
          const bodyObj = msg.body as {
            messageType?: string;
            payload?: unknown;
            customExts?: unknown;
            "v2:customExts"?: unknown;
          };
          if (bodyObj.messageType && bodyObj.payload) {
            paramsData = {
              messageType: bodyObj.messageType,
              payload: bodyObj.payload,
            };
            console.log(
              "✅ Found API format in msg.body (messageType + payload):",
              JSON.stringify(paramsData, null, 2)
            );
          }
        }

        // Second priority: Check customExts at top level (standard Agora Chat format)
        if (
          (!paramsData || Object.keys(paramsData).length === 0) &&
          msg.customExts &&
          typeof msg.customExts === "object"
        ) {
          console.log("Trying msg.customExts:", msg.customExts);
          paramsData = msg.customExts;
          console.log("Extracted from customExts:", paramsData);
        }

        // Third priority: Check v2:customExts at top level (alternative format)
        if (
          (!paramsData || Object.keys(paramsData).length === 0) &&
          msg["v2:customExts"] &&
          typeof msg["v2:customExts"] === "object"
        ) {
          console.log("Trying msg['v2:customExts']:", msg["v2:customExts"]);
          paramsData = msg["v2:customExts"];
          console.log("Extracted from v2:customExts:", paramsData);
        }

        // Fourth priority: Check body.customExts (if not already extracted API format)
        if (
          (!paramsData || Object.keys(paramsData).length === 0) &&
          msg.body &&
          typeof msg.body === "object"
        ) {
          const bodyObj = msg.body as {
            customExts?: unknown;
            "v2:customExts"?: unknown;
          };
          if (bodyObj.customExts) {
            console.log("Trying msg.body.customExts:", bodyObj.customExts);
            paramsData = bodyObj.customExts;
            console.log("Extracted from body.customExts:", paramsData);
          }
        }

        // Fifth priority: Check body.v2:customExts
        if (
          (!paramsData || Object.keys(paramsData).length === 0) &&
          msg.body &&
          typeof msg.body === "object"
        ) {
          const bodyObj = msg.body as {
            customExts?: unknown;
            "v2:customExts"?: unknown;
          };
          if (bodyObj["v2:customExts"]) {
            console.log(
              "Trying msg.body['v2:customExts']:",
              bodyObj["v2:customExts"]
            );
            paramsData = bodyObj["v2:customExts"];
            console.log("Extracted from body.v2:customExts:", paramsData);
          }
        }

        // Sixth priority: Check bodies array for v2:customExts or customExts
        if (
          (!paramsData || Object.keys(paramsData).length === 0) &&
          msg.bodies &&
          Array.isArray(msg.bodies) &&
          msg.bodies.length > 0
        ) {
          console.log("Trying msg.bodies for v2:customExts:", msg.bodies);
          for (const bodyItem of msg.bodies) {
            if (
              bodyItem &&
              typeof bodyItem === "object" &&
              bodyItem["v2:customExts"]
            ) {
              paramsData = bodyItem["v2:customExts"];
              console.log("Extracted from bodies[].v2:customExts:", paramsData);
              break;
            }
            // Also check customExts array (without v2: prefix)
            if (
              bodyItem &&
              typeof bodyItem === "object" &&
              bodyItem.customExts &&
              Array.isArray(bodyItem.customExts) &&
              bodyItem.customExts.length > 0
            ) {
              const customExt = bodyItem.customExts[0];
              if (customExt && typeof customExt === "object" && customExt.url) {
                // Extract all properties from customExt
                paramsData = { ...customExt };
                console.log(
                  "Extracted from bodies[].customExts[0]:",
                  paramsData
                );
                break;
              }
            }
          }
        }

        // Seventh priority: Try params
        if (
          (!paramsData || Object.keys(paramsData).length === 0) &&
          msg.params !== undefined &&
          msg.params !== null
        ) {
          if (typeof msg.params === "string") {
            try {
              paramsData = JSON.parse(msg.params);
              console.log("Parsed params from string:", paramsData);
            } catch (parseError) {
              console.error(
                "Failed to parse params string:",
                parseError,
                msg.params
              );
              paramsData = msg.params;
            }
          } else if (typeof msg.params === "object") {
            paramsData = msg.params;
            console.log("Using params as object:", paramsData);
          }
        }

        // Eighth priority: Try ext - we're putting data there (both as ext.data and spread directly)
        if (
          !paramsData ||
          (typeof paramsData === "object" &&
            Object.keys(paramsData).length === 0)
        ) {
          console.log("paramsData is empty, trying ext properties...");
          if (msg.ext && typeof msg.ext === "object") {
            console.log("Trying msg.ext:", msg.ext);

            // Check if ext has the attachment properties directly (we spread them)
            if (
              msg.ext.type &&
              (msg.ext.type === "image" ||
                msg.ext.type === "file" ||
                msg.ext.type === "audio")
            ) {
              paramsData = {
                type: msg.ext.type,
                url: msg.ext.url,
                fileName: msg.ext.fileName,
                mimeType: msg.ext.mimeType,
                size: msg.ext.size,
                duration: msg.ext.duration,
                transcription: msg.ext.transcription,
              };
              console.log(
                "Extracted from ext properties directly:",
                paramsData
              );
            }

            // If still empty, try ext.data
            if (
              (!paramsData || Object.keys(paramsData).length === 0) &&
              msg.ext.data
            ) {
              try {
                paramsData =
                  typeof msg.ext.data === "string"
                    ? JSON.parse(msg.ext.data)
                    : msg.ext.data;
                console.log("Extracted from ext.data:", paramsData);
              } catch {}
            }

            // Last resort: use entire ext object if it has useful data
            if (
              (!paramsData || Object.keys(paramsData).length === 0) &&
              Object.keys(msg.ext).length > 0
            ) {
              // Filter out the 'data' key if it exists and is a string (already tried)
              const extCopy = { ...msg.ext };
              if (extCopy.data && typeof extCopy.data === "string") {
                delete extCopy.data;
              }
              if (Object.keys(extCopy).length > 0) {
                paramsData = extCopy;
                console.log("Using entire ext object (filtered):", paramsData);
              }
            }
          }

          // Try body - check for API format with messageType and payload
          if (
            (!paramsData || Object.keys(paramsData).length === 0) &&
            msg.body
          ) {
            console.log("Trying msg.body:", msg.body);
            try {
              const bodyData =
                typeof msg.body === "string" ? JSON.parse(msg.body) : msg.body;
              console.log("Extracted from body:", bodyData);

              // Check if body has the API format (messageType + payload)
              if (
                bodyData &&
                typeof bodyData === "object" &&
                "messageType" in bodyData &&
                "payload" in bodyData
              ) {
                // Extract payload and add type field
                paramsData = {
                  ...(bodyData.payload as object),
                  type: bodyData.messageType,
                };
                console.log(
                  "Extracted payload from body with messageType:",
                  paramsData
                );
              } else {
                paramsData = bodyData;
              }
            } catch (parseError) {
              console.error("Failed to parse msg.body:", parseError);
            }
          }

          // Last resort: try msg.msg if it exists
          if (
            (!paramsData || Object.keys(paramsData).length === 0) &&
            msg.msg
          ) {
            console.log("Trying msg.msg:", msg.msg);
            try {
              const msgData =
                typeof msg.msg === "string" ? JSON.parse(msg.msg) : msg.msg;
              console.log("Extracted from msg.msg:", msgData);

              // Check if msg.msg has the API format (messageType + payload)
              if (
                msgData &&
                typeof msgData === "object" &&
                "messageType" in msgData &&
                "payload" in msgData
              ) {
                paramsData = {
                  messageType: msgData.messageType,
                  payload: msgData.payload,
                };
                console.log("Found API format in msg.msg:", paramsData);
              } else {
                paramsData = msgData;
              }
            } catch (parseError) {
              console.error("Failed to parse msg.msg:", parseError);
            }
          }
        }

        console.log("Final extracted paramsData:", paramsData);
        console.log(
          "Final extracted paramsData (stringified):",
          JSON.stringify(paramsData, null, 2)
        );

        // Normalize the message structure for UI parsing
        let normalizedData = paramsData;

        // Handle case where customExts has a stringified 'data' field (e.g., from backend API)
        // Example: { type: 'call_scheduled', data: '{"time":"1765953010","type":"call_scheduled"}' }
        if (
          paramsData &&
          typeof paramsData === "object" &&
          "data" in paramsData &&
          typeof paramsData.data === "string"
        ) {
          try {
            const parsedData = JSON.parse(paramsData.data);
            // Merge parsed data with the outer object, preserving type from outer if not in parsed
            normalizedData = {
              ...parsedData,
              type: parsedData.type || (paramsData as { type?: string }).type,
            };
            console.log(
              "✅ Parsed stringified data field:",
              JSON.stringify(normalizedData, null, 2)
            );
          } catch (parseError) {
            console.warn(
              "Failed to parse data field:",
              parseError,
              paramsData.data
            );
            // Fall through to other normalization logic
          }
        }
        // Handle API format with messageType and payload
        else if (
          paramsData &&
          typeof paramsData === "object" &&
          "messageType" in paramsData &&
          "payload" in paramsData
        ) {
          // Merge messageType into payload for UI compatibility
          normalizedData = {
            ...(paramsData.payload as object),
            type: paramsData.messageType,
          };
        }
        // Handle API format with just payload (messageType might be in msg.type)
        else if (
          paramsData &&
          typeof paramsData === "object" &&
          "payload" in paramsData &&
          !("type" in paramsData) &&
          msg.type
        ) {
          normalizedData = {
            ...(paramsData.payload as object),
            type: msg.type,
          };
        }
        // If paramsData has action_type but no type, use action_type as type
        else if (
          paramsData &&
          typeof paramsData === "object" &&
          "action_type" in paramsData &&
          !("type" in paramsData)
        ) {
          normalizedData = {
            ...paramsData,
            type: paramsData.action_type,
          };
        }

        if (
          normalizedData &&
          typeof normalizedData === "object" &&
          Object.keys(normalizedData).length > 0 &&
          ("type" in normalizedData || "action_type" in normalizedData)
        ) {
          const paramsObj = normalizedData as {
            type?: string;
            action_type?: string;
            fileName?: string;
            callType?: string;
            action?: string;
            channel?: string;
            from?: string;
            title?: string;
          };
          const t = String(
            paramsObj.type || paramsObj.action_type || ""
          ).toLowerCase();
          if (t === "image") preview = "Photo";
          else if (t === "file")
            preview = paramsObj.fileName ? `📎 ${paramsObj.fileName}` : "File";
          else if (t === "audio") preview = "Audio";
          else if (t === "call") {
            // Handle call messages - generate preview based on callType
            const callType = paramsObj.callType === "video" ? "Video" : "Audio";
            preview = `${callType} call`;
            // Handle incoming call notification if action is initiate
            if (paramsObj.action === "initiate" && handleIncomingCall) {
              console.log(
                "Incoming call detected in custom message:",
                paramsObj
              );
              if (paramsObj.channel && paramsObj.from) {
                handleIncomingCall({
                  from: paramsObj.from,
                  channel: paramsObj.channel,
                  callId: paramsObj.channel,
                  callType:
                    paramsObj.callType === "video" ||
                    paramsObj.callType === "audio"
                      ? paramsObj.callType
                      : "video", // Default to video if not specified
                });
              }
            }
          } else if (t === "meal_plan_updated" || t === "meal_plan_update")
            preview = "Meal plan updated";
          else if (
            t === "new_nutritionist" ||
            t === "new_nutrionist" ||
            t === "coach_assigned" ||
            t === "coach_details"
          )
            preview = paramsObj.title || "New nutritionist assigned";
          else if (t === "products" || t === "recommended_products")
            preview = "Products";
          else if (t === "general_notification" || t === "general-notification")
            preview = paramsObj.title || "Notification";
          else if (t === "video_call")
            preview = paramsObj.title || "Video call";
          else if (t === "voice_call")
            preview = paramsObj.title || "Voice call";
          else if (t === "documents") preview = paramsObj.title || "Document";
          else if (t === "call_scheduled") {
            const time = (paramsObj as { time?: number | string }).time;
            if (time) {
              const scheduledDate = new Date(
                typeof time === "number"
                  ? time * 1000
                  : parseInt(time, 10) * 1000
              );
              preview = `Schedule, ${formatScheduledDate(scheduledDate)}`;
            } else {
              preview = "Call scheduled";
            }
          } else if (t === "scheduled_call_canceled")
            preview = "Scheduled call cancelled";

          // Ensure the logged message has 'type' field for UI parsing
          messageContent = JSON.stringify(normalizedData);
          console.log(
            "Normalized messageContent (stringified):",
            messageContent
          );
        } else {
          // Log what we got for debugging
          console.warn("paramsData is not valid or empty:", paramsData);
          console.warn(
            "paramsData stringified:",
            JSON.stringify(paramsData, null, 2)
          );
          console.warn("Falling back to stringifying entire msg object");
          messageContent = JSON.stringify(msg);
        }
      } catch (error) {
        console.error("Error processing custom message:", error, msg);
        console.error(
          "Error details - msg.params:",
          JSON.stringify(msg.params, null, 2)
        );
        console.error(
          "Error details - msg.body:",
          JSON.stringify(msg.body, null, 2)
        );
        messageContent = JSON.stringify(msg.params || msg.body || msg || {});
      }

      console.log("Final messageContent to log (stringified):", messageContent);
      addLog(`${msg.from}: ${messageContent}`);

      // Update conversation when receiving a custom message - normalize conversation ID matching
      if (msg.from) {
        const fromId = msg.from;
        // Normalize: try both with and without user_ prefix
        const normalizedFromId = fromId.startsWith("user_") ? fromId : `user_${fromId}`;
        const normalizedFromIdWithoutPrefix = fromId.startsWith("user_") ? fromId.replace("user_", "") : fromId;
        
        setConversations((prev) => {
          // Find conversation by matching either format
          const existing = prev.find((c) => 
            c.id === fromId || 
            c.id === normalizedFromId || 
            c.id === normalizedFromIdWithoutPrefix ||
            c.id === `user_${normalizedFromIdWithoutPrefix}`
          );
          
          if (existing) {
            // Use the existing conversation ID format
            const conversationId = existing.id;
            return prev.map((conv) =>
              conv.id === conversationId
                ? {
                    ...conv,
                    lastMessage: preview,
                    timestamp: new Date(),
                    lastMessageFrom: fromId,
                  }
                : conv
            );
          }
          // Create new conversation - use normalized format with user_ prefix
          return [
            {
              id: normalizedFromId,
              name: normalizedFromIdWithoutPrefix,
              lastMessage: preview,
              timestamp: new Date(),
              avatar: config.defaults.avatar,
              replyCount: 0,
              lastSeen: "",
              lastMessageFrom: fromId,
            },
            ...prev,
          ];
        });
      }
    },
    onTokenWillExpire: async (): Promise<void> => {
      addLog("Token will expire soon - renewing...");
      const newToken = await generateNewToken();
      const client = getClientRef() as {
        renewToken?: (token: string) => Promise<void>;
      } | null;
      if (newToken && client && typeof client.renewToken === "function") {
        try {
          // Renew the token using Agora Chat SDK
          await client.renewToken(newToken);
          addLog("Token renewed successfully");
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          addLog(`Token renewal failed: ${errorMessage}`);
          console.error("Error renewing token:", error);
        }
      }
    },
    onTokenExpired: async (): Promise<void> => {
      addLog("Token expired - attempting to renew...");
      setIsLoggedIn(false);

      const newToken = await generateNewToken();
      const client = getClientRef() as {
        open?: (options: {
          user: string;
          accessToken: string;
        }) => Promise<void>;
      } | null;
      if (newToken && client && userId && typeof client.open === "function") {
        try {
          // Try to reconnect with the new token
          await client.open({ user: userId, accessToken: newToken });
          addLog("Reconnected with new token");
          setIsLoggedIn(true);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          addLog(`Reconnection failed: ${errorMessage}`);
          console.error("Error reconnecting:", error);
          setIsLoggingIn(false);
        }
      } else {
        addLog(
          "Cannot reconnect: Token generation failed or client unavailable"
        );
        setIsLoggingIn(false);
      }
    },
    onError: (e: { message: string }): void => {
      addLog(`Error: ${e.message}`);
      setIsLoggingIn(false);
    },
    onPresenceStatus: onPresenceStatus
      ? (presenceData: { userId: string; description: string }): void => {
          addLog(
            `Presence update from ${presenceData.userId}: ${presenceData.description}`
          );
          onPresenceStatus(presenceData);
        }
      : undefined,
  };
}
