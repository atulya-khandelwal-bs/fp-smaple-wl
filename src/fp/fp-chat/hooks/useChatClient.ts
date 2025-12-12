import { useEffect, useRef, RefObject } from "react";
import { createChatClient } from "../services/chatClient";
import type { Connection, MessageBody } from "agora-chat";

interface MessageHandlers {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onTextMessage?: (msg: MessageBody) => void;
  onCustomMessage?: (msg: MessageBody) => void;
  onTokenWillExpire?: () => Promise<void>;
  onTokenExpired?: () => Promise<void>;
  onError?: (error: { message: string }) => void;
  onPresenceStatus?: (presenceData: {
    userId: string;
    description: string;
  }) => void;
}

export function useChatClient(
  appKey: string,
  handlers?: MessageHandlers
): RefObject<Connection | null> {
  const clientRef = useRef<Connection | null>(null);

  useEffect(() => {
    clientRef.current = createChatClient(appKey);
    if (handlers && clientRef.current) {
      clientRef.current.addEventHandler("app_handlers", handlers);
    }
    return () => {
      if (clientRef.current) {
        clientRef.current.removeEventHandler("app_handlers");
        clientRef.current.close();
      }
    };
  }, [appKey]);

  return clientRef;
}
