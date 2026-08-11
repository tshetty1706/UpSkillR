# UpSkillr — Backend API

The **UpSkillr Backend** is a RESTful API server built with **Node.js** and **Express**, connected to **MongoDB Atlas** via Mongoose. It handles authentication (manual + OAuth), email verification via OTP, and user management for the UpSkillr education platform.

---

## 🚀 Technologies Used

| Technology | Version | Purpose |
|---|---|---|
| **Node.js** | v18+ | Runtime environment |
| **Express** | v5.x | REST API framework |
| **MongoDB Atlas** | — | Cloud NoSQL database |
| **Mongoose** | v9.x | MongoDB ODM & schema modeling |
| **bcryptjs** | v2.x | Password hashing |
| **jsonwebtoken** | v9.x | JWT-based authentication |
| **nodemailer** | v9.x | Gmail SMTP email delivery |
| **axios** | v1.x | HTTP client for OAuth flows |
| **dotenv** | v16.x | Environment variable management |
| **cors** | v2.x | Cross-origin request handling |

---

## 📁 Project Structure

```
Backend/
├── controller/
│   └── authController.js   # All auth logic (signup, login, OTP, OAuth callbacks)
│
├── model/
│   └── User.js             # Mongoose User schema & model
│
├── routes/
│   └── authRoutes.js       # Express route definitions → controller mappings
│
├── .env                    # Secret credentials (NOT committed to git)
├── .env.example            # Safe template with placeholder values
├── .gitignore              # Git ignore rules for Node.js backend
├── package.json            # Dependencies & scripts
└── server.js               # App entry point: middleware, routes, DB connection
```

---

## 🔐 API Endpoints

### Auth Routes — `/api/auth`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/signup` | Register → store in memory → send OTP email |
| `POST` | `/send-otp` | Resend OTP to email |
| `POST` | `/verify-otp` | Verify OTP → **create user in MongoDB** |
| `POST` | `/login` | Login with email & password → JWT |
| `GET` | `/me` | Get authenticated user profile (Bearer token) |
| `GET` | `/google` | Redirect to Google OAuth consent screen |
| `GET` | `/google/callback` | Google OAuth callback handler |
| `GET` | `/github` | Redirect to GitHub OAuth consent screen |
| `GET` | `/github/callback` | GitHub OAuth callback handler |

### Health Check

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Returns `{ status: 'ok' }` — server uptime check |

---

## 🔑 Registration Flow

The manual signup uses a **two-step OTP verification flow** to prevent fake accounts:

```
1. POST /api/auth/signup
   → Validates input, hashes password
   → Stores data in in-memory Map (NOT in MongoDB yet)
   → Sends 6-digit OTP to email via Gmail SMTP

2. POST /api/auth/verify-otp
   → Validates OTP against in-memory Map
   → Creates & saves user to MongoDB Atlas
   → Returns JWT token
```

> **Note**: Accounts are only saved to MongoDB **after** successful OTP verification.

---

## ⚙️ Environment Variables

Create a `.env` file in the `Backend/` directory based on `.env.example`:

```env
# MongoDB Atlas Connection
MONGO_URL=your_mongodb_atlas_connection_string

# JWT
JWT_SECRET=your_super_secret_jwt_key

# Frontend URL (for CORS & OAuth redirects)
FRONTEND_URL=http://localhost:5173

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:5000/api/auth/github/callback

# Gmail SMTP (App Password — NOT your Gmail login password)
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
```

---

## 🛠️ Getting Started

### 1. Prerequisites
- **Node.js** v18 or higher
- A **MongoDB Atlas** cluster (free tier works)
- A **Gmail** account with App Passwords enabled

### 2. Installation
```bash
cd Backend
npm install
```

### 3. Configure Environment
Copy `.env.example` to `.env` and fill in your credentials.

### 4. Start the Server
```bash
# Development (with auto-restart via nodemon)
npm run dev

# Production
npm start
```

The API server runs on: [http://localhost:5000](http://localhost:5000)

---

## 📄 License
Copyright © 2026 **UpSkillr**. All rights reserved.
