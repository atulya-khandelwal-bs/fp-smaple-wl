# Register User API Integration Guide

The `registerUser` API is now **automatically handled** by the FPChatApp component. You don't need to call it manually in your login flow.

## Automatic Registration Flow

The FPChatApp component implements the following flow automatically:

1. **Generate Token** - Token is generated when needed
2. **Login Into Agora SDK** - Attempts to login with the generated token
3. **If Agora SDK gives error with code "usernotfound"** - Automatically calls register API
4. **Retry Login** - After successful registration, automatically retries login
5. **Else** - Continue normal flow or handle other errors

## How It Works

When you provide `userId` and the component generates a token, it will:
- Try to login to Agora Chat SDK
- If the SDK returns a "usernotfound" error, the component will:
  - Automatically call the `registerUser` API
  - Retry the login after successful registration
- If login succeeds or other errors occur, normal flow continues

## Usage

You **don't need to call `registerUser` manually**. Just use the FPChatApp component normally:

```typescript
import FPChatApp from './src/fp/fp-chat/FPChatApp';

function YourComponent() {
  return (
    <FPChatApp
      userId="user123"
      conversationId="dietitian456"
      name="Dr. Smith"
      profilePhoto="https://example.com/photo.jpg"
      designation="Nutritionist"
    />
  );
}
```

The component will handle registration automatically if needed.

## Manual Registration (Optional)

If you still want to register users manually in your login flow (before using FPChatApp), you can use:

```typescript
import { registerUser } from './src/fp/fp-chat/services/chatApi';

async function handleLogin(username: string, password: string) {
  try {
    // 1. Perform your authentication
    const authResult = await yourAuthService.login(username, password);
    
    // 2. Optionally register user with Agora Chat (not required - FPChatApp handles it)
    try {
      await registerUser(username);
      console.log('User registered with Agora Chat');
    } catch (registerError) {
      // User might already be registered - that's okay
      const errorMessage = registerError instanceof Error 
        ? registerError.message 
        : String(registerError);
      if (!errorMessage.includes('400') && !errorMessage.includes('409')) {
        console.warn('Agora Chat registration failed:', errorMessage);
      }
    }
    
    // 3. Proceed with your app flow
    return authResult;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}
```

**Note:** Manual registration is optional. The FPChatApp component will handle it automatically if the user doesn't exist.

## API Function (For Reference)

The `registerUser` function is available in:
```typescript
import { registerUser } from './src/fp/fp-chat/services/chatApi';
```

### Function Signature

```typescript
registerUser(username: string): Promise<boolean>
```

- **Parameters:**
  - `username` (string): The user ID/username to register with Agora Chat
- **Returns:** Promise that resolves to `true` on success (or if user already exists)
- **Throws:** Error if registration fails (except for 400/409 which are treated as success)

## Error Handling

The automatic registration handles these cases:
- **User not found (usernotfound)**: Automatically registers and retries login
- **User already exists (400/409)**: Treated as success, login continues
- **Other errors**: Logged and normal error handling applies

## Important Notes

1. **Automatic handling**: Registration is handled automatically by FPChatApp - no manual calls needed
2. **User ID consistency**: Use the same `username` that you'll pass to `FPChatApp` as the `userId` prop
3. **Error codes**: The component detects "usernotfound" errors in various formats (case-insensitive):
   - "usernotfound"
   - "user not found"
   - "user_not_found"
   - Error code "404"
4. **Token generation**: Token is generated automatically when needed by the component

## API Endpoint

The registration endpoint is configured in `src/fp/common/config.ts`:
- Config property: `config.api.registerUserEndpoint`
- Method: POST
- Body: `{ username: string }`
