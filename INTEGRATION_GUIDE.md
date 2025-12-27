# FP Chat & Call Module - Integration Guide

## Quick Start

### 1. Copy the Module

Copy the `fp` folder to your `src` directory:

```
src/
└── fp/
    ├── common/
    ├── fp-call/
    └── fp-chat/
```

### 2: Install Core Dependencies

Install React and React DOM:

```bash
npm install react react-dom
```

---

### 3: Install TypeScript and Type Definitions

If you didn't use the TypeScript template, install TypeScript and type definitions:

```bash
npm install -D typescript @types/node @types/react @types/react-dom @types/hls.js
```

---

### 4: Install Build Tools

Install Vite and React plugin:

```bash
npm install -D vite @vitejs/plugin-react
```

**Note:** If you're using a different build tool, you may need to adapt the configuration accordingly.

---

### 5: Install Dependencies

Install Agora Chat and RTC SDKs for messaging and video calling:

```bash
npm install agora-chat agora-rtc-react agora-rtc-sdk-ng agora-extension-virtual-background
```

Install additional UI and utility libraries:

```bash
npm install lucide-react emoji-picker-react emoji-picker-element axios hls.js
```

**Note:** `hls.js` is required for playing HLS video/audio streams (used for call recordings).

Install PWA plugin for Progressive Web App support:

```bash
npm install -D vite-plugin-pwa
```

**Note:** The PWA plugin enables offline support, app-like experience, and installability on mobile devices.

---

### 6: Install ESLint (Optional but Recommended)

Install ESLint for code quality:

```bash
npm install -D eslint @eslint/js eslint-plugin-react-hooks eslint-plugin-react-refresh globals
```

**Note:** ESLint is optional but recommended for maintaining code quality. You can skip this step if you're using a different linter or don't need linting.

---

### 7: Add Google Fonts (Required)

The fp module uses the **Figtree** font. Add this to your `index.html` in the `<head>` section:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700;800;900&display=swap"
  rel="stylesheet"
/>
```

### 7.1: Add PWA Meta Tags (Required for PWA)

Add PWA-related meta tags to your `index.html` in the `<head>` section:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="theme-color" content="#2563eb" />
<meta
  name="description"
  content="FitPass - Your fitness and nutrition companion"
/>
<link rel="manifest" href="/manifest.json" />
<link rel="apple-touch-icon" href="/icon-192x192.png" />
```

**Note:** These meta tags enable proper PWA functionality, including install prompts and app-like behavior on mobile devices.

---

### 8: Configure TypeScript

Create `tsconfig.json` in the root directory:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,

    /* Path aliases */
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },

    /* Additional checks */
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Create `tsconfig.node.json` for Node.js configuration files:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

Create `src/vite-env.d.ts` for Vite type definitions:

```typescript
/// <reference types="vite/client" />
```

---

### 9: Configure Vite

Update `vite.config.ts`:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import fs from "fs";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, "localhost-key.pem")),
      cert: fs.readFileSync(path.resolve(__dirname, "localhost-cert.pem")),
    },
    port: 5173,
  },
});
```

**Note:** For HTTPS, you'll need SSL certificates.

### 9.1: Generate SSL Certificate on localhost

```shell
openssl req -nodes -new -x509 \
  -keyout localhost-key.pem \
  -out localhost-cert.pem \
  -days 365 \
  -subj "/CN=localhost"

```

---

### 10: Create PWA Icons

Create PWA icons and place them in the `public` directory:

- `public/icon-192x192.png` - 192x192 pixels (required)
- `public/icon-512x512.png` - 512x512 pixels (required)

**Note:** These icons are used for the app icon when installed on mobile devices and desktop. They should be square images with transparent or solid backgrounds. The icons should be optimized for web use (PNG format recommended).

### 11: Set Environment Variables

Create a `.env` file:

```env
VITE_AGORA_APP_KEY=your_chat_app_key
VITE_RTC_APP_ID=your_rtc_app_id
VITE_BACKEND_API_URL=https://your-api-domain.com
```

---

### 12. Add manifest.json file in the root folder

```
{
  "name": "FitPass",
  "short_name": "FitPass",
  "description": "FitPass - Your fitness and nutrition companion",
  "theme_color": "#2563eb",
  "background_color": "#ffffff",
  "display": "standalone",
  "orientation": "portrait",
  "scope": "/",
  "start_url": "/",
  "icons": [
    {
      "src": "public/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "public/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "categories": ["health", "fitness", "lifestyle"],
  "screenshots": [],
  "shortcuts": []
}


```

---

### 13: Use the Component

The module includes a recording player page that opens call recordings in a new tab. Your `App.tsx` should handle both the main chat interface and the recording player route:

```tsx
import React from "react";
import FPChatApp from "./fp/fp-chat/FPChatApp.tsx";
import FPRecordingPlayerPage from "./fp/fp-chat/components/FPRecordingPlayerPage.tsx";

function App() {
  // Check if this is a recording player page (has URL parameter)
  const urlParams = new URLSearchParams(window.location.search);
  const isRecordingPlayer = urlParams.has("url");

  if (isRecordingPlayer) {
    return <FPRecordingPlayerPage />;
  }

  return <FPChatApp userId="your-user-id" />;
}

export default App;
```

**Note:** The recording player page automatically reads the `url` and `type` query parameters from the URL to play video or audio call recordings. When users click "Play Video Recording" or "Play Audio Recording" on a call message, it opens in a new tab with these parameters.

## Props

| Prop       | Type         | Required | Description                 |
| ---------- | ------------ | -------- | --------------------------- |
| `userId`   | `string`     | ✅ Yes   | The coach/user ID           |
| `onLogout` | `() => void` | ❌ No    | Callback when user logs out |
