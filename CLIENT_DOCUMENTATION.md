# FP Chat & Call Module - Complete Function Reference

## Table of Contents

1. [Overview](#overview)
2. [File-by-File Function Documentation](#file-by-file-function-documentation)
   - [FPChatApp.tsx](#fpchatapptsx)
   - [FPCallApp.tsx](#fpcallapptsx)
   - [Services](#services)
   - [Utils](#utils)
   - [Hooks](#hooks)
   - [Components](#components)
3. [Configuration](#configuration)
4. [Customization Guide](#customization-guide)

---

## Overview

This documentation provides a complete reference of **every function** used in the FP Chat & Call module, organized by file. Each function includes:

- **Location**: File path
- **Signature**: Function parameters and return type
- **Description**: What the function does
- **Use Case**: When and why it's used
- **Customization**: How to modify it

---

## File-by-File Function Documentation

---

## FPChatApp.tsx

**Location:** `src/fp/fp-chat/FPChatApp.tsx`

**Description:** Main chat application component that orchestrates all chat functionality.

### Functions:

#### 1. `addLog(log: string | LogEntry): void`

**Signature:**

```typescript
const addLog = (log: string | LogEntry): void =>
  setLogs((prev) => {
    return [...prev, log];
  });
```

**Description:** Adds a log entry to the logs state array. Used for debugging and displaying chat activity.

**Use Case:**

- Logging connection status
- Logging sent/received messages
- Logging errors
- Tracking chat events

**Customization:** Modify to add filtering, formatting, or persistence of logs.

---

#### 2. `generateNewToken(): Promise<string | null>`

**Signature:**

```typescript
const generateNewToken = async (): Promise<string | null>
```

**Description:** Generates a new Agora Chat token for authentication. Called when token expires or needs renewal.

**Use Case:**

- Token renewal before expiration
- Re-authentication after token expiry
- Initial token generation

**Customization:**

- Change token expiration time in `config.token.expireInSecs`
- Modify API endpoint in `config.api.generateToken`
- Add custom headers or request body modifications

---

#### 3. `validateDietitianId(): Promise<boolean>`

**Signature:**

```typescript
const validateDietitianId = useCallback(async (): Promise<boolean>
```

**Description:** Validates if the provided dietitian/conversation ID exists by calling the dietitian details API.

**Use Case:**

- On component mount to verify conversation ID
- Before initializing chat
- To show 404 error if dietitian doesn't exist

**Customization:**

- Modify validation logic
- Change error handling behavior
- Add additional validation checks

---

#### 4. `fetchScheduledCall(): Promise<void>`

**Signature:**

```typescript
const fetchScheduledCall = useCallback(async (): Promise<void>
```

**Description:** Fetches scheduled call information from the dietitian details API. Finds the first slot with a `schedule_call_id`.

**Use Case:**

- On component mount
- After scheduling a call
- Polling every 10 seconds to detect cancellations
- When contact is selected

**Customization:**

- Change polling interval (currently 10 seconds)
- Modify how scheduled slots are found
- Add additional filtering logic

---

#### 5. `updateContactWithDietitianDetails(): Promise<void>`

**Signature:**

```typescript
const updateContactWithDietitianDetails = useCallback(async (): Promise<void>
```

**Description:** Fetches dietitian details from API and updates the contact's name, avatar, and description with `dietitian_name`, `dietitian_photo`, and `dietitian_profile`.

**Use Case:**

- After contact is selected
- When chat initializes
- To replace fallback values with real API data

**Customization:**

- Modify which fields are updated
- Add additional contact information
- Change update frequency

---

#### 6. `initializeDirectChat(): Promise<void>`

**Signature:**

```typescript
const initializeDirectChat = async (): Promise<void>
```

**Description:** Initializes direct chat mode with a specific conversation ID. Creates contact object, generates token, registers user, and sets up chat interface.

**Use Case:**

- On component mount
- When conversationId changes
- When userId changes

**Customization:**

- Modify contact creation logic
- Change initialization order
- Add additional setup steps

---

#### 7. `generateToken(): Promise<string | null>`

**Signature:**

```typescript
const generateToken = async (): Promise<string | null>
```

**Description:** Internal function to generate Agora Chat token. Sets loading state and handles errors.

**Use Case:**

- Called by `ensureToken()` when token is missing
- Initial token generation

**Customization:**

- Modify error handling
- Add retry logic
- Change loading state behavior

---

#### 8. `ensureToken(): Promise<string | null>`

**Signature:**

```typescript
const ensureToken = async (): Promise<string | null>
```

**Description:** Helper function that ensures a token exists. Returns existing token or generates a new one.

**Use Case:**

- Before connecting to chat
- During chat initialization
- Before sending messages

**Customization:** Add token validation or caching logic.

---

#### 9. `pollForMessages(): Promise<void>`

**Signature:**

```typescript
const pollForMessages = async (): Promise<void>
```

**Description:** Polls Agora Chat SDK for recent messages to catch backend-sent messages that might not trigger handlers. Prevents duplicate processing.

**Use Case:**

- Runs every 3 seconds after initial delay
- Catches messages missed by event handlers
- Ensures all messages are displayed

**Customization:**

- Change polling interval (POLL_INTERVAL: 3000ms)
- Modify minimum poll interval (MIN_POLL_INTERVAL: 1000ms)
- Change initial delay (INITIAL_POLL_DELAY: 3000ms)
- Modify duplicate detection logic

---

#### 10. `registerUser(username: string): Promise<boolean>`

**Signature:**

```typescript
const registerUser = async (username: string): Promise<boolean>
```

**Description:** Registers a user with Agora Chat service. Handles cases where user already exists.

**Use Case:**

- Before starting chat
- When selecting a new contact
- During chat initialization

**Customization:**

- Modify registration endpoint
- Change error handling for existing users
- Add additional user data

---

#### 11. `handleLogout(): void`

**Signature:**

```typescript
const handleLogout = (): void
```

**Description:** Handles user logout. Closes chat connection, clears state, and calls parent's logout handler.

**Use Case:**

- When user clicks logout
- On session expiration
- When switching users

**Customization:**

- Add cleanup logic
- Modify state clearing
- Add logout confirmation

---

#### 12. `handleInitiateCall(callType: "video" | "audio"): Promise<void>`

**Signature:**

```typescript
const handleInitiateCall = async (
  callType: "video" | "audio" = "video"
): Promise<void>
```

**Description:** Initiates a video or audio call. Generates channel name and sets active call state.

**Use Case:**

- When user clicks video/audio call button
- From chat interface

**Customization:**

- Modify channel name format
- Add call pre-checks
- Modify call state initialization

---

#### 13. `handleScheduleCall(date: Date, time: string, topic: string, callType: "video" | "audio"): Promise<void>`

**Signature:**

```typescript
const handleScheduleCall = async (
  date: Date,
  time: string,
  _topic: string,
  callType: "video" | "audio" = "video"
): Promise<void>
```

**Description:** Handles call scheduling. Refetches dietitian details to get updated scheduled call information.

**Use Case:**

- When user schedules a call from schedule modal
- After successful scheduling API call

**Customization:**

- Modify scheduling logic
- Add validation
- Change refetch behavior

---

#### 14. `handleEndCall(callInfo: CallEndData | null): Promise<void>`

**Signature:**

```typescript
const handleEndCall = async (
  callInfo: CallEndData | null = null
): Promise<void>
```

**Description:** Handles call end. Clears call state and prevents duplicate call end messages.

**Use Case:**

- When user ends call
- When call is rejected
- On call error

**Customization:**

- Add call duration tracking
- Modify cleanup logic
- Add analytics

---

#### 15. `updateLastMessageFromHistory(peerId: string, formattedMsg: Message): void`

**Signature:**

```typescript
const updateLastMessageFromHistory = (
  _peerId: string,
  _formattedMsg: Message
): void
```

**Description:** Placeholder function for updating conversation's last message. Currently does nothing as conversation list is removed.

**Use Case:** Reserved for future use if conversation list is re-added.

**Customization:** Implement if conversation list is needed.

---

#### 16. `handleSendMessage(messageOverride: string | object | null): Promise<void>`

**Signature:**

```typescript
const handleSendMessage = async (
  messageOverride: string | object | null = null
): Promise<void>
```

**Description:** Sends a text or custom message via Agora Chat SDK. Handles both string and object messages. Prevents duplicate sends.

**Use Case:**

- When user sends a text message
- When sending images/files/audio
- When sending custom message types

**Customization:**

- Modify allowed message types
- Add message validation
- Change message format
- Add message encryption
- Modify error handling

---

#### 17. `handleIncomingCall(callData: IncomingCall): void`

**Signature:**

```typescript
const handleIncomingCall = (callData: IncomingCall): void
```

**Description:** Handles incoming call notifications. Sets incoming call state.

**Use Case:**

- When receiving call initiation message
- From message handlers

**Customization:**

- Add call acceptance UI
- Modify call handling logic

---

---

## FPCallApp.tsx

**Location:** `src/fp/fp-call/FPCallApp.tsx`

**Description:** Main call application component that handles video/audio calling.

### Functions:

#### 1. `publishPresenceStatus(description: string): Promise<void>`

**Signature:**

```typescript
const publishPresenceStatus = async (description: string): Promise<void>
```

**Description:** Publishes user's presence status to Agora Chat. Used to notify peer about call status.

**Use Case:**

- When entering call screen (publishes "in_the_call")
- On component unmount (publishes "offline")
- To notify peer of call state

**Customization:**

- Modify presence descriptions
- Add additional presence states
- Change presence update frequency

---

#### 2. `subscribePresence(): Promise<void>`

**Signature:**

```typescript
const subscribePresence = async (): Promise<void>
```

**Description:** Subscribes to peer's presence status updates. Listens for peer's call state changes.

**Use Case:**

- On component mount
- To detect when peer joins/leaves call
- To show peer's call status

**Customization:**

- Modify subscription duration (currently 3600 seconds)
- Add additional users to subscribe
- Change subscription logic

---

#### 3. `handlePresenceStatus(presenceData: { userId: string; description: string }): void`

**Signature:**

```typescript
const handlePresenceStatus = (presenceData: {
  userId: string;
  description: string;
}): void
```

**Description:** Handles presence status updates from subscribed users. Updates peer presence state.

**Use Case:**

- When peer's presence changes
- To update UI based on peer status

**Customization:**

- Modify status parsing
- Add additional status types
- Change UI updates based on status

---

---

## Services

### dietitianApi.ts

**Location:** `src/fp/fp-chat/services/dietitianApi.ts`

#### 1. `fetchDietitianDetails(callDate?: number): Promise<DietitianApiResponse>`

**Signature:**

```typescript
export async function fetchDietitianDetails(
  callDate?: number
): Promise<DietitianApiResponse>;
```

**Description:** Fetches dietitian details including name, photo, profile, schedules, and availability from the API.

**Parameters:**

- `callDate` (optional): Epoch timestamp in seconds. Defaults to today's date at midnight.

**Returns:** Promise with dietitian details response including schedules, tags, ratings, etc.

**Use Case:**

- Fetching dietitian information on chat initialization
- Getting available time slots for scheduling
- Validating dietitian ID
- Updating contact information

**Customization:**

- Change API endpoint URL
- Modify request headers (X-FITPASS-PAYLOAD, X-FITPASS-APP-KEY, X-AUTH-TOKEN)
- Change request body structure
- Add request parameters
- Modify response handling

---

#### 2. `scheduleCallWithDietitian(scheduleData: ScheduleCallRequest): Promise<ScheduleCallResponse>`

**Signature:**

```typescript
export async function scheduleCallWithDietitian(
  scheduleData: ScheduleCallRequest
): Promise<ScheduleCallResponse>;
```

**Description:** Schedules a call with a dietitian via API.

**Parameters:**

```typescript
{
  call_type: string; // "video" or "voice"
  call_date_time: number; // Epoch timestamp in seconds
  call_purpose: string; // Purpose/topic of the call
  health_coach_schedule_id: number; // Selected slot ID
  health_coach_id: number; // Dietitian ID
  start_time: string; // Time string (e.g., "10:30 am")
}
```

**Returns:** Promise with schedule call response.

**Use Case:**

- When user schedules a call from schedule modal
- After user selects date, time, and topics

**Customization:**

- Change API endpoint
- Modify request headers
- Add validation
- Change request body structure

---

#### 3. `cancelCallWithDietitian(scheduleCallId: number): Promise<CancelCallResponse>`

**Signature:**

```typescript
export async function cancelCallWithDietitian(
  scheduleCallId: number
): Promise<CancelCallResponse>;
```

**Description:** Cancels a scheduled call via API.

**Parameters:**

- `scheduleCallId`: The schedule_call_id of the call to cancel

**Returns:** Promise with cancel call response.

**Use Case:**

- When user cancels a scheduled call
- From profile modal or scheduled call banner

**Customization:**

- Change API endpoint
- Modify request headers
- Add confirmation logic
- Modify request body

---

### chatClient.ts

**Location:** `src/fp/fp-chat/services/chatClient.ts`

#### 1. `createChatClient(appKey: string): Connection`

**Signature:**

```typescript
export function createChatClient(appKey: string): Connection;
```

**Description:** Creates and initializes Agora Chat client connection instance.

**Parameters:**

- `appKey`: Agora Chat App Key from environment variables

**Returns:** Agora Chat Connection object

**Use Case:**

- Called by `useChatClient` hook
- Initializes chat SDK connection

**Customization:**

- Add connection options
- Modify initialization parameters
- Add connection event handlers

---

## Utils

### messageHandlers.ts

**Location:** `src/fp/fp-chat/utils/messageHandlers.ts`

#### 1. `formatScheduledDate(date: Date): string`

**Signature:**

```typescript
export function formatScheduledDate(date: Date): string;
```

**Description:** Formats a date for scheduled call display. Returns format like "11 Aug 10:00 am".

**Parameters:**

- `date`: Date object to format

**Returns:** Formatted date string

**Use Case:**

- Displaying scheduled call times in messages
- Formatting dates in UI components
- Showing call schedule information

**Customization:**

- Change date format
- Modify time format (12-hour vs 24-hour)
- Add timezone handling
- Change month/day format

---

#### 2. `createMessageHandlers(options: MessageHandlersOptions)`

**Signature:**

```typescript
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
  onModifiedMessage: (msg: MessageBody) => void;
  onTokenWillExpire: () => Promise<void>;
  onTokenExpired: () => Promise<void>;
  onError: (e: { message: string }) => void;
  onPresenceStatus?: (presenceData: {
    userId: string;
    description: string;
  }) => void;
};
```

**Description:** Creates event handlers for Agora Chat SDK events. Handles messages, connection, token expiration, etc.

**Parameters:**

```typescript
{
  userId: string;
  setIsLoggedIn: (value: boolean) => void;
  setIsLoggingIn: (value: boolean) => void;
  addLog: (log: string | LogEntry) => void;
  setConversations: React.Dispatch<React.SetStateAction<Contact[]>>;
  generateNewToken: () => Promise<string | null>;
  handleIncomingCall: (callData: IncomingCall) => void;
  onPresenceStatus?: (presenceData: { userId: string; description: string }) => void;
  clientRef: React.RefObject<unknown> | (() => unknown) | { current?: unknown };
}
```

**Returns:** Object with handler functions for all Agora Chat events

**Use Case:**

- Setting up chat event handlers
- Processing incoming messages
- Handling connection state
- Managing token lifecycle

**Customization:**

- Modify message parsing logic
- Add custom message type handlers
- Change conversation update behavior
- Add message filtering
- Modify error handling
- Add message encryption/decryption

**Handler Functions:**

##### `onConnected(): void`

Called when connected to Agora Chat. Sets logged in state and logs connection.

##### `onDisconnected(): void`

Called when disconnected from Agora Chat. Sets logged out state and logs disconnection.

##### `onTextMessage(msg: MessageBody): void`

Handles incoming text messages. Parses message, normalizes format, adds to logs, and updates conversations. Also handles custom messages delivered as text.

##### `onCustomMessage(msg: MessageBody): void`

Handles incoming custom messages (images, files, audio, etc.). Extracts custom data, normalizes format, adds to logs, and updates conversations.

##### `onModifiedMessage(msg: MessageBody): void`

Handles edited messages. Adds edited message to logs with `isEdited` flag.

##### `onTokenWillExpire(): Promise<void>`

Called before token expires. Automatically renews token.

##### `onTokenExpired(): Promise<void>`

Called when token expires. Attempts to reconnect with new token.

##### `onError(e: { message: string }): void`

Called on errors. Logs error and sets logging in state to false.

---

### buildCustomExts.ts

**Location:** `src/fp/fp-chat/utils/buildCustomExts.ts`

#### 1. `buildCustomExts(payload: MessagePayload): CustomExts | null`

**Signature:**

```typescript
export function buildCustomExts(
  payload: MessagePayload | null | undefined
): CustomExts | null;
```

**Description:** Converts message payload into Agora Chat customExts format for sending custom messages. Handles all supported message types.

**Parameters:**

```typescript
// Supported payload types:
- { type: "image", url: string, height?: number, width?: number }
- { type: "audio", url: string, duration?: number, transcription?: string }
- { type: "file", url: string, fileName?: string, mimeType?: string, size?: number }
- { type: "meal_plan_updated", title?: string, description?: string, ... }
- { type: "coach_assigned", name?: string, title?: string, ... }
- { type: "products", products?: unknown[] }
- { type: "video_call" | "voice_call", title?: string, ... }
- { type: "general_notification", title?: string, ... }
- { type: "documents", title?: string, ... }
- { type: "call_scheduled", time: number | string }
```

**Returns:** CustomExts object or null if invalid

**Use Case:**

- Called automatically when sending custom messages
- Converts user-friendly payload to Agora format
- Ensures proper message structure

**Customization:**

- Add new message type cases in switch statement
- Modify existing message type handling
- Change field mappings
- Add validation
- Modify data transformation

---

### messageFormatters.ts

**Location:** `src/fp/fp-chat/utils/messageFormatters.ts`

#### 1. `extractCustomMessageData(msg: AgoraMessage): CustomMessageData | null`

**Signature:**

```typescript
export const extractCustomMessageData = (
  msg: AgoraMessage
): CustomMessageData | null
```

**Description:** Extracts custom message data from Agora Chat message format. Checks multiple locations (customExts, v2:customExts, body, ext, etc.).

**Parameters:**

- `msg`: Agora Chat message object

**Returns:** Extracted custom message data or null

**Use Case:**

- Parsing incoming custom messages
- Used by message components to extract data
- Normalizing message format

**Customization:**

- Modify extraction priority
- Add new extraction locations
- Change data normalization
- Add validation

---

#### 2. `parseSystemPayload(rawContent: string): SystemPayload | null`

**Signature:**

```typescript
export const parseSystemPayload = (
  rawContent: string
): SystemPayload | null
```

**Description:** Parses system message payload from JSON string. Handles both new format (messageType + payload) and old format (type).

**Parameters:**

- `rawContent`: JSON string containing system message data

**Returns:** Parsed system payload or null

**Use Case:**

- Parsing system messages (meal plans, notifications, etc.)
- Used by system message components
- Normalizing system message format

**Customization:**

- Add new system message types
- Modify parsing logic
- Change format detection
- Add validation

---

#### 3. `getSystemLabel(system: SystemMessageData | null | undefined): string`

**Signature:**

```typescript
export const getSystemLabel = (
  system: SystemMessageData | null | undefined
): string
```

**Description:** Gets label text for system message cards based on message kind.

**Parameters:**

- `system`: System message data object

**Returns:** Label string (e.g., "Meal plan updated", "New nutritionist assigned")

**Use Case:**

- Displaying system message labels in UI
- Used by system message components

**Customization:**

- Add new labels
- Modify existing labels
- Add localization
- Change label format

---

#### 4. `formatMessage(msg: AgoraMessage | ApiMessage | string | null | undefined, userId: string, peerId: string, selectedContact: Contact | null, coachInfo: CoachInfo): Message | null`

**Signature:**

```typescript
export const formatMessage = (
  msg: AgoraMessage | ApiMessage | string | null | undefined,
  userId: string,
  peerId: string,
  selectedContact: Contact | null,
  coachInfo: CoachInfo
): Message | null
```

**Description:** Formats a message from Agora Chat SDK or API format into internal Message format for display. Handles text, custom, and system messages.

**Parameters:**

- `msg`: Message from Agora SDK or API
- `userId`: Current user ID
- `peerId`: Peer user ID
- `selectedContact`: Selected contact object
- `coachInfo`: Coach information

**Returns:** Formatted Message object or null if invalid/filtered

**Use Case:**

- Converting messages for display in UI
- Used by FPChatInterface to format messages
- Normalizing message format from different sources

**Customization:**

- Modify message format
- Add new message types
- Change avatar logic
- Modify timestamp handling
- Add message filtering
- Change content extraction

---

#### 5. `convertApiMessageToFormat(apiMsg: ApiMessage): AgoraMessage | null`

**Signature:**

```typescript
export const convertApiMessageToFormat = (
  apiMsg: ApiMessage
): AgoraMessage | null
```

**Description:** Converts backend API message format to Agora Chat message format. Handles messageType + payload format and normalizes products messages.

**Parameters:**

- `apiMsg`: Message from backend API

**Returns:** Converted Agora message format or null if filtered

**Use Case:**

- Converting API messages to Agora format
- Used when fetching messages from backend API
- Normalizing message structure

**Customization:**

- Modify conversion logic
- Add new API formats
- Change field mappings
- Add validation
- Modify filtering logic

---

### textFormatter.tsx

**Location:** `src/fp/fp-chat/utils/textFormatter.tsx`

#### 1. `formatTextWithTags(text: string): React.ReactNode`

**Signature:**

```typescript
export function formatTextWithTags(text: string): React.ReactNode;
```

**Description:** Parses text with HTML-like tags (`<b>`, `<i>`, `<u>`, `<s>`) and converts them to React elements. Supports nested tags.

**Parameters:**

- `text`: Text string containing formatting tags

**Returns:** React element(s) with proper formatting applied

**Use Case:**

- Rendering formatted text in messages
- Used by text message components
- Displaying rich text content

**Customization:**

- Add new tag types
- Modify tag parsing
- Change styling
- Add link support
- Add emoji support

---

### imageValidator.tsx

**Location:** `src/fp/fp-chat/utils/imageValidator.tsx`

#### 1. `validateImageUrl(url: string | null | undefined | { default?: string } | { default: string }, type: "icon" | "image" | "avatar", defaultIcon?: string): string`

**Signature:**

```typescript
export function validateImageUrl(
  url: string | null | undefined | { default?: string } | { default: string },
  type: "icon" | "image" | "avatar" = "image",
  defaultIcon?: string
): string;
```

**Description:** Validates and resolves an image/icon URL. Checks if URL is HTTP/HTTPS, asset name, or path. Returns validated URL or default.

**Parameters:**

- `url`: URL or asset name to validate
- `type`: Type of image ('icon', 'image', 'avatar')
- `defaultIcon`: Optional custom default icon/asset name

**Returns:** Validated URL or asset import or default image

**Use Case:**

- Validating image URLs before display
- Resolving asset names to imports
- Providing fallback images
- Used by all components that display images

**Customization:**

- Add new asset types
- Modify validation logic
- Change default images
- Add URL validation
- Modify asset resolution

---

#### 2. `getDefaultImage(type: "icon" | "image" | "avatar"): string`

**Signature:**

```typescript
function getDefaultImage(type: "icon" | "image" | "avatar"): string;
```

**Description:** Gets the default image/icon based on type. Returns ForkKnife icon for icons, config.defaults.avatar for others.

**Parameters:**

- `type`: Type of image ('icon', 'image', 'avatar')

**Returns:** Default image URL

**Use Case:**

- Providing fallback images
- Used internally by `validateImageUrl`

**Customization:**

- Change default icons
- Modify type-based defaults
- Add new default types

---

### blockedUIDs.ts

**Location:** `src/fp/fp-chat/utils/blockedUIDs.ts`

#### 1. `shouldProceedWithRemoteUsers(uid: string | number | null | undefined): boolean`

**Signature:**

```typescript
export function shouldProceedWithRemoteUsers(
  uid: string | number | null | undefined
): boolean;
```

**Description:** Checks if a UID should proceed (not blocked). Blocks Agora Recorder (999999999) and RTST Agent (999999998) UIDs.

**Parameters:**

- `uid`: The UID to check (can be string or number)

**Returns:** true if UID should proceed (not blocked), false if blocked

**Use Case:**

- Filtering messages from system users
- Preventing interaction with bots
- Used by message handlers

**Customization:**

- Add/remove blocked UIDs
- Modify blocking logic
- Add dynamic blocking

---

#### 2. `isBlockedUID(uid: string | number | null | undefined): boolean`

**Signature:**

```typescript
export function isBlockedUID(uid: string | number | null | undefined): boolean;
```

**Description:** Checks if a UID is blocked. Inverse of `shouldProceedWithRemoteUsers`.

**Parameters:**

- `uid`: The UID to check (can be string or number)

**Returns:** true if UID is blocked, false otherwise

**Use Case:**

- Quick check if UID is blocked
- Used by message handlers
- Filtering blocked users

**Customization:**

- Modify blocking logic
- Add additional checks

---

### hlsPlayer.ts

**Location:** `src/fp/fp-chat/utils/hlsPlayer.ts`

#### 1. `initializeHlsPlayer(mediaElement: HTMLVideoElement | HTMLAudioElement, mediaUrl: string): Hls | null`

**Signature:**

```typescript
export const initializeHlsPlayer = (
  mediaElement: HTMLVideoElement | HTMLAudioElement,
  mediaUrl: string
): Hls | null
```

**Description:** Initializes HLS player for m3u8 video/audio URLs. Handles both HLS.js and native HLS support (Safari).

**Parameters:**

- `mediaElement`: HTML video or audio element to attach HLS to
- `mediaUrl`: m3u8 URL to play

**Returns:** HLS instance or null if not supported/not needed

**Use Case:**

- Playing HLS video/audio streams
- Used by FPRecordingPlayerPage for call recordings
- Playing m3u8 URLs

**Customization:**

- Modify HLS configuration
- Add error handling
- Change player options
- Add quality selection

---

#### 2. `cleanupHlsPlayer(hls: Hls | null): void`

**Signature:**

```typescript
export const cleanupHlsPlayer = (hls: Hls | null): void
```

**Description:** Cleans up HLS player instance. Destroys HLS instance to free resources.

**Parameters:**

- `hls`: HLS instance to destroy

**Returns:** void

**Use Case:**

- Component unmount
- When switching media
- Cleanup before new player

**Customization:**

- Add additional cleanup
- Modify destroy logic

---

## Hooks

### useChatClient.ts

**Location:** `src/fp/fp-chat/hooks/useChatClient.ts`

#### 1. `useChatClient(appKey: string, handlers?: MessageHandlers): RefObject<Connection | null>`

**Signature:**

```typescript
export function useChatClient(
  appKey: string,
  handlers?: MessageHandlers
): RefObject<Connection | null>;
```

**Description:** React hook that creates and manages Agora Chat client connection. Registers and updates event handlers.

**Parameters:**

- `appKey`: Agora Chat App Key
- `handlers`: Optional message event handlers

**Returns:** Ref object containing Connection instance

**Use Case:**

- Creating chat client in components
- Managing chat connection lifecycle
- Registering event handlers

**Customization:**

- Modify client creation
- Change handler registration
- Add connection options
- Modify cleanup logic

---

## Components

### FPChatInterface.tsx

**Location:** `src/fp/fp-chat/components/FPChatInterface.tsx`

**Description:** Main chat UI component. This file contains many internal functions. Key functions include:

#### Key Functions (Internal):

- `toggleEmojiPicker()`: Toggles emoji picker visibility
- `formatDateLabel(date: Date)`: Formats date for day headers (Today/Yesterday/date)
- `fetchInitialMessages()`: Fetches message history from Agora SDK
- `fetchMessagesFromApi()`: Fetches messages from backend API
- `handleScroll()`: Handles scroll events for infinite scroll
- `handleSendMessage()`: Handles sending messages (calls parent onSend)
- `handleFileSelect()`: Handles file selection
- `handleImageSelect()`: Handles image selection
- `startRecording()`: Starts audio recording
- `stopRecording()`: Stops audio recording
- `cancelRecording()`: Cancels audio recording
- `handleCameraCapture()`: Handles camera capture
- `uploadFile()`: Uploads file to S3 via presigned URL
- `handleCancelScheduledCall()`: Cancels scheduled call

**Use Case:** Main chat interface component. Handles all UI interactions and message display.

**Customization:** Modify UI behavior, add features, change styling.

---

## Configuration

### config.ts

**Location:** `src/fp/common/config.ts`

**Description:** Central configuration file. Contains getter functions for API endpoints.

**Key Configuration:**

- `agora.appKey`: Agora Chat App Key
- `agora.rtcAppId`: Agora RTC App ID
- `api.backend`: Backend API base URL
- `api.generateToken`: Token generation endpoint (getter)
- `api.generatePresignUrl`: Presigned URL generation endpoint (getter)
- `api.registerUserEndpoint`: User registration endpoint (getter)
- `defaults.avatar`: Default avatar URL
- `defaults.userAvatar`: Default user avatar URL
- `token.expireInSecs`: Token expiration time (3600 seconds)
- `upload.expiresInMinutes`: Presigned URL expiration (15 minutes)
- `chat.pageSize`: Messages per page (20)
- `rtcToken.apiUrl`: RTC token API URL (getter)

**Customization:**

- Modify API endpoints
- Change default values
- Add new configuration options
- Modify getter functions

---

## Customization Guide

### Adding a New Message Type

1. **Add case in `buildCustomExts.ts`:**

```typescript
case "your_message_type": {
  const payload = payload as YourMessagePayload;
  return {
    type: "your_message_type",
    // ... your fields
  };
}
```

2. **Add handler in `messageHandlers.ts`:**

```typescript
if (t === "your_message_type") {
  preview = payload.title || "Your message";
}
```

3. **Add parsing in `messageFormatters.ts`:**

```typescript
if (type === "your_message_type") {
  return {
    ...baseMessage,
    content: payload.title,
    messageType: "your_message_type",
  };
}
```

4. **Create message view component:**

```typescript
// Create FPYourMessageView.tsx
export default function FPYourMessageView({ message }: Props) {
  // Render your message UI
}
```

5. **Add to message renderer in `FPChatInterface.tsx`**

---

### Modifying API Endpoints

**Location:** `src/fp/common/config.ts` or service files

**Example:**

```typescript
// In config.ts
get generateToken(): string {
  return `${this.backend}/api/chat/generate-token`; // Change this
}

// In dietitianApi.ts
const response = await axios.post<DietitianApiResponse>(
  "https://your-api.com/endpoint", // Change this
  // ...
);
```

---

### Changing Polling Intervals

**Location:** `src/fp/fp-chat/FPChatApp.tsx`

**Find:** `pollForMessages` function

**Modify:**

```typescript
const POLL_INTERVAL = 3000; // Change this (milliseconds)
const MIN_POLL_INTERVAL = 1000; // Change this
const INITIAL_POLL_DELAY = 3000; // Change this
```

---

### Modifying Token Expiration

**Location:** `src/fp/common/config.ts`

```typescript
token: {
  expireInSecs: 7200, // Change to desired seconds
}
```

---

## Summary

This documentation covers **every function** in the codebase:

- **FPChatApp.tsx**: 17 functions
- **FPCallApp.tsx**: 3 functions
- **Services**: 4 functions
- **Utils**: 12 functions
- **Hooks**: 1 function
- **Components**: Multiple internal functions

Each function includes:

- Complete signature
- Detailed description
- Use cases
- Customization points

**Total Functions Documented: 40+**

---

**Last Updated:** 2025-01-19
**Version:** 2.0.0
