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

  // Simply pass userId - token generation is handled internally by FPChatApp
  return (
    <FPChatApp
      userId={String(userId)}
      onLogout={() => {
        console.log("User logged out from chat");
      }}
    />
  );
}

export default App;
