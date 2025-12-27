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

  // Get userId, conversationId, name, profilePhoto, and designation from URL params
  // Format: ?userId=123&conversationId=456&name=John%20Doe&profilePhoto=https://example.com/photo.jpg&designation=Nutritionist
  const urlUserId = urlParams.get("userId");
  const conversationId = urlParams.get("conversationId");
  const name = urlParams.get("name") || "atulya";
  const profilePhoto = urlParams.get("profilePhoto");
  const designation = urlParams.get("designation");

  // Use URL params or defaults
  const finalUserId = urlUserId || String(userId);
  const finalConversationId = conversationId || "333"; // Default conversation ID

  // Simply pass userId, conversationId, name, profilePhoto, and designation - token generation is handled internally by FPChatApp
  return (
    <FPChatApp
      userId={finalUserId}
      conversationId={finalConversationId}
      name={name || undefined}
      profilePhoto={profilePhoto || undefined}
      designation={designation || undefined}
      onLogout={() => {
        console.log("User logged out from chat");
      }}
    />
  );
}

export default App;
