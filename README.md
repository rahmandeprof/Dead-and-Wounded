# Dead and Wounded

A multiplayer number-guessing game built with Next.js, Socket.IO, and PostgreSQL.

## Features

- 🎯 **Quick Match**: Random matchmaking
- 🔒 **Private Games**: Play with friends using game codes
- 📜 **Game History**: View past matches and stats
- 🏆 **Real-time Multiplayer**: Powered by Socket.IO
- 💾 **PostgreSQL Database**: Production-ready persistence

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file:

```env
NODE_ENV=production
SESSION_SECRET=your-random-secret-here
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### Run Locally

```bash
node server.js
```

Visit `http://localhost:3000`

## Deployment

### Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

See [deployment.md](./deployment.md) for detailed instructions.

### Vercel

Not recommended due to Socket.IO requirements. Use Railway instead.

## Tech Stack

- **Framework**: Next.js 16 (Pages Router)
- **Real-time**: Socket.IO
- **Database**: PostgreSQL
- **Styling**: Tailwind CSS
- **Auth**: Express Session + bcrypt

## Game Rules

1. Choose 4 unique digits (0-9)
2. Order matters exactly
3. **Dead**: Correct digit in correct position
4. **Wounded**: Correct digit in wrong position
5. First to get 4 Dead wins!

## License

MIT
