# HelpLoop

**HelpLoop** – a community‑driven platform that connects people who need help with volunteers.

## Overview
- **Frontend**: React 19 + Vite, Tailwind, React‑Query.
- **Backend**: Node 20 + Express + Prisma (PostgreSQL).
- **Chat**: Nexconn Chat SDK (real‑time messaging).

## Getting Started
### Prerequisites
- Node >= 20
- npm (or pnpm/yarn)
- PostgreSQL instance (local or Docker)

### Setup
1. Clone the repo and install dependencies:
   ```bash
   git clone <repo-url>
   cd helploop
   npm install
   ```
2. Create environment files (see `.env.example` in each workspace) and fill in the values.
3. Initialise the database:
   ```bash
   npm run db:push   # create tables
   npm run db:seed   # optional seed data
   ```
4. Run both servers in development mode:
   ```bash
   npm run dev
   ```
   - Front‑end 👉 http://localhost:5173
   - Backend 👉 http://localhost:4000 (default)

### Build for Production
```bash
npm run build   # builds client and server
npm start       # runs the compiled server
```

## Deployment
- **Frontend**: Deploy the `client/dist` folder on Vercel, Netlify, etc.
- **Backend**: Deploy the compiled `server/dist` on Render, Railway, or any Node host.
- Make sure the environment variables are set on the hosting platform.

## Project Structure
```
helploop/
├─ client/            # React app
│  ├─ src/
│  │  ├─ App.tsx
│  │  ├─ main.tsx
│  │  ├─ pages/      # Home, Login, Dashboard, etc.
│  │  └─ components/ # NexconnChat wrapper
├─ server/            # Express API
│  ├─ src/
│  │  ├─ routes/
│  │  │  ├─ auth.ts
│  │  │  ├─ users.ts
│  │  │  └─ nexconn.ts   # token endpoint
│  │  └─ lib/        # auth, nexconn, validators, etc.
├─ prisma/            # Prisma schema & seed
├─ docs/              # Project deck and demo video link
└─ README.md
```

## Nexconn Integration
- The backend issues a chat token via `POST /nexconn/token` (protected, uses session cookie).
- The React component `NexconnChat` fetches this token and renders the Nexconn SDK.
- The public App‑Key is exposed in `client/.env` as `VITE_NEXCONN_APP_KEY`.

## License
Apache‑2.0 or MIT – choose whichever you prefer.

