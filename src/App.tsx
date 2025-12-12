import React from "react";
import FPChatApp from "./fp/fp-chat/FPChatApp.tsx";

// Sample coach id
const userId = 333;

function App(): React.JSX.Element {
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
