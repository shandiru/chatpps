# ChatApp — MERN Stack Real-Time Chat

A full-featured real-time chat application built with MongoDB, Express, React, Node.js and Socket.io.

## Features

- **Email Verification** — Users must verify their email before logging in
- **Friend System** — Send/accept/decline friend requests
- **Real-Time Chat** — Instant messaging via Socket.io
- **Reply to Messages** — Click any message to reply with context
- **Typing Indicators** — See when the other person is typing
- **Online Status** — Green dot shows who is active
- **Unread Badge** — Count of unread messages per friend
- **Read Receipts** — Double-check marks when messages are read
- **Classic UI** — Parchment/ink aesthetic with Tailwind CSS

---

## Project Structure

```
chatapp/
├── backend/          ← Express + Socket.io + MongoDB
└── frontend/         ← React + Vite + Tailwind CSS
```

---

## Backend Setup

### 1. Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- Gmail account with App Password enabled

### 2. Install dependencies
```bash
cd backend
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
```
Edit `.env`:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/chatapp
JWT_SECRET=your_super_secret_key
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
CLIENT_URL=http://localhost:5173
```

> **Gmail App Password**: Go to Google Account → Security → 2-Step Verification → App passwords → Generate one for "Mail".

### 4. Run
```bash
npm run dev    # Development (nodemon)
npm start      # Production
```

---

## Frontend Setup

### 1. Install dependencies
```bash
cd frontend
npm install
```

### 2. Run
```bash
npm run dev
```

Frontend runs on: `http://localhost:5173`
Backend runs on: `http://localhost:5000`

---

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | /api/auth/register | Register user |
| GET  | /api/auth/verify-email | Verify email token |
| POST | /api/auth/login | Login |
| GET  | /api/auth/me | Get current user |
| GET  | /api/users/search?q= | Search users |
| POST | /api/friends/request | Send friend request |
| POST | /api/friends/respond | Accept/reject request |
| GET  | /api/friends/pending | Get pending requests |
| GET  | /api/friends | Get friends list |
| GET  | /api/messages/:friendId | Get conversation |
| POST | /api/messages | Send message |
| GET  | /api/messages/unread | Get unread counts |

---

## Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `send_message` | Client→Server | Send a message |
| `new_message` | Server→Client | Receive a message |
| `typing` | Both | Typing indicator |
| `mark_read` | Client→Server | Mark messages read |
| `messages_read` | Server→Client | Notify sender of read |
| `user_online` | Server→Client | Online status update |
| `friend_request_sent` | Client→Server | Notify friend request |
| `friend_request_received` | Server→Client | Incoming request |

---

## Usage

1. Register with email + password
2. Check email for verification link
3. Login after verifying
4. Search for other users by username or email
5. Send them a friend request
6. They accept → you can chat!
7. Click any message to reply with context
8. Real-time typing indicators and online status
