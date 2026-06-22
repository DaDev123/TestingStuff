# room.chat

A minimal real-time chat with ephemeral rooms. No signup. Share a 6-letter code, that's it.

## Architecture

```
GitHub Pages (client/)   ──WebSocket──►  Render.com (server/)
  index.html                              server.js (Node + ws)
  Free, 24/7, CDN                         Free tier, always-on
```

---

## Deploy in 3 steps

### Step 1 — Deploy the server to Render (free, 24/7)

1. Go to [render.com](https://render.com) and sign up (free).
2. Click **New → Web Service** → connect your GitHub repo.
3. Set **Root Directory** to `server`.
4. Render will auto-detect the `render.yaml` and configure everything.
5. Click **Deploy**. After ~2 minutes you'll get a URL like:
   ```
   https://room-system-server.onrender.com
   ```
6. Copy that URL.

### Step 2 — Update the frontend with your server URL

Open `client/index.html` and replace line ~150:

```js
const DEFAULT_SERVER = 'wss://YOUR-SERVER.onrender.com/ws';
```

with your actual Render URL:

```js
const DEFAULT_SERVER = 'wss://room-system-server.onrender.com/ws';
```

### Step 3 — Deploy the frontend to GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings → Pages** → set source to **GitHub Actions**.
3. The workflow at `.github/workflows/deploy.yml` will run automatically.
4. Your site will be live at:
   ```
   https://YOUR-USERNAME.github.io/YOUR-REPO/
   ```

---

## Local development

```bash
# Start the server
cd server
npm install
node server.js
# → listening on ws://localhost:3000/ws

# In index.html, temporarily change DEFAULT_SERVER to:
# const DEFAULT_SERVER = 'ws://localhost:3000/ws';

# Then open client/index.html in your browser
```

---

## How it works

- Users pick a username and either **create** a room (random 6-char code) or **join** one with a code.
- The server holds rooms in memory. Each room stores the last 200 messages and the set of connected sockets.
- When someone joins, they instantly receive the chat history.
- When someone sends a message, the server broadcasts it to everyone in the room.
- When the last person leaves, the room is deleted (ephemeral by design).
- The client auto-reconnects if the connection drops.

## File structure

```
room-system/
├── client/
│   ├── index.html              # The entire frontend (single file)
│   └── .github/
│       └── workflows/
│           └── deploy.yml      # Auto-deploys to GitHub Pages on push
├── server/
│   ├── server.js               # WebSocket server (Node.js + ws)
│   └── package.json
└── render.yaml                 # One-click deploy config for Render
```
