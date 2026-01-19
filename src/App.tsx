import React from "react";
import FPChatApp from "./fp/fp-chat/FPChatApp.tsx";
import FPRecordingPlayerPage from "./fp/fp-chat/components/FPRecordingPlayerPage.tsx";

// Sample patient id
const userId = 119933;

function App(): React.JSX.Element {
  // Check if this is a recording player page (has URL parameter)
  const urlParams = new URLSearchParams(window.location.search);
  const isRecordingPlayer = urlParams.has("url");

  if (isRecordingPlayer) {
    return <FPRecordingPlayerPage />;
  }

  // Get userId and conversationId from URL params
  // Format: ?userId=123&conversationId=456
  // Note: name, profilePhoto, and designation are now fetched automatically from the API
  const urlUserId = urlParams.get("userId");
  const conversationId = urlParams.get("conversationId");

  // Use URL params or defaults
  const finalUserId = urlUserId || String(userId);
  const finalConversationId = conversationId || "333"; // Default conversation ID

  // Only pass required props - dietitian details (name, photo, profile) are fetched automatically
  return (
    <FPChatApp
      userId={finalUserId}
      conversationId={finalConversationId}
      onLogout={() => {
        console.log("User logged out from chat");
      }}
    />
  );
}

export default App;
