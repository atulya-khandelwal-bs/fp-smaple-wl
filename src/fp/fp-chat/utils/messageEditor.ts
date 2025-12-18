import AgoraChat from "agora-chat";
import type { Connection } from "agora-chat";

/**
 * Interface for edit message options
 */
export interface EditMessageOptions {
  /** The chat client connection */
  chatClient: Connection;
  /** The server message ID (from the send response) */
  messageId: string;
  /** The new text content for the message */
  newText: string;
  /** Optional extension properties (sender info, etc.) */
  ext?: {
    senderName?: string;
    senderProfile?: string;
    isFromUser?: boolean;
    [key: string]: unknown;
  };
  /** Optional peer ID (recipient) */
  peerId?: string;
}

/**
 * Edits a text message using Agora Chat SDK's modifyMessage method
 *
 * @param options - Edit message options
 * @returns Promise that resolves with the modified message response
 * @throws Error if chatClient is not available or modifyMessage fails
 *
 * @example
 * ```typescript
 * const response = await editMessage({
 *   chatClient: clientRef.current,
 *   messageId: "1495986484149226474",
 *   newText: "Updated message text",
 *   ext: {
 *     senderName: "Dr. Meera Kapoor",
 *     senderProfile: "https://...",
 *     isFromUser: false
 *   },
 *   peerId: "119933"
 * });
 * console.log(response.message);
 * ```
 */
export async function editMessage(
  options: EditMessageOptions
): Promise<{ message: unknown }> {
  const { chatClient, messageId, newText, ext, peerId } = options;

  if (!chatClient) {
    throw new Error("Chat client is not available");
  }

  if (!messageId) {
    throw new Error("Message ID is required");
  }

  if (!newText || typeof newText !== "string") {
    throw new Error("New text content is required and must be a string");
  }

  // Create the text message object for modification
  const messageOptions: {
    chatType: string;
    type: string;
    msg: string;
    ext?: typeof ext;
    to?: string;
  } = {
    chatType: "singleChat",
    type: "txt",
    msg: newText,
  };

  // Add extension properties if provided
  if (ext) {
    messageOptions.ext = ext;
  }

  // Add peer ID if provided
  if (peerId) {
    messageOptions.to = peerId;
  }

  // Create the message object using Agora Chat SDK
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const textMessage = AgoraChat.message.create(messageOptions as any);

  // Modify the message using the chat client
  try {
    console.log("🔄 [editMessage] Starting message edit:", {
      messageId,
      newText,
      peerId,
      hasExt: !!ext,
    });

    // Type assertion for modifyMessage method
    const response = await (
      chatClient as unknown as {
        modifyMessage: (params: {
          messageId: string;
          modifiedMessage: unknown;
        }) => Promise<{ message: unknown }>;
      }
    ).modifyMessage({
      messageId,
      modifiedMessage: textMessage,
    });

    console.log("✅ [editMessage] Message edited successfully:", {
      messageId,
      response: response,
      message: response.message,
    });

    return response;
  } catch (error) {
    console.error("❌ [editMessage] Error editing message:", {
      messageId,
      newText,
      error: error,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
