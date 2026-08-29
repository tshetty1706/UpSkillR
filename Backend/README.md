# UpSkillr — Backend API Application

The **UpSkillr Backend** is a robust RESTful API built with **Node.js**, **Express v5**, and **MongoDB Atlas** via **Mongoose**. It manages authentication (manual + OAuth), OTP email verification, user account state, instructor applications, and file uploads (profile photos, resumes, certificates).

---

## 📦 Installed Libraries & Package Guide

Below is the complete list of packages installed in the Backend service, along with individual and one-line download commands.

### Production Dependencies

| Library | Version | Purpose | Individual Install Command |
|---|---|---|---|
| **express** | `^5.2.1` | REST API Web application framework | `npm install express` |
| **mongoose** | `^9.9.1` | MongoDB Object Data Modeling (ODM) & schema validator | `npm install mongoose` |
| **dotenv** | `^16.6.1` | Loads environment variables from `.env` file | `npm install dotenv` |
| **cors** | `^2.8.6` | Cross-Origin Resource Sharing middleware | `npm install cors` |
| **jsonwebtoken** | `^9.0.2` | JWT token authentication & signature verification | `npm install jsonwebtoken` |
| **bcryptjs** | `^2.4.3` | Password hashing & salt encryption | `npm install bcryptjs` |
| **nodemailer** | `^9.0.5` | Email sending service for OTP verification | `npm install nodemailer` |
| **multer** | `^2.2.0` | Middleware for handling multipart/form-data file uploads | `npm install multer` |
| **axios** | `^1.19.0` | Promise-based HTTP client for OAuth token exchange | `npm install axios` |
| **libphonenumber-js** | `^1.13.12` | International phone number parsing & validation | `npm install libphonenumber-js` |

### Recommended Development Dependencies

| Library | Version | Purpose | Individual Install Command |
|---|---|---|---|
| **nodemon** | `^3.1.9` | Auto-restarts Node server on file changes | `npm install -D nodemon` |

---

## ⚡ Quick Download Commands

To install all required packages at once for a fresh clone:

```bash
# Navigate to the Backend directory
cd Backend

# Option A: Install all dependencies automatically from package.json (Recommended)
npm install

# Option B: Download all backend dependencies explicitly
npm install express mongoose dotenv cors jsonwebtoken bcryptjs nodemailer multer axios libphonenumber-js

# Option C: Download development dependencies explicitly
npm install -D nodemon
```

---

## 📁 Project Structure

```
Backend/
├── controller/
│   ├── authController.js                 # Authentication logic (signup, login, OTP, OAuth)
│   └── instructorApplicationController.js # Instructor application draft save & submit logic
│
├── middleware/
│   └── authMiddleware.js                 # JWT Bearer token verification middleware
│
├── model/
│   ├── User.js                           # User account schema & model
│   └── InstructorApplication.js          # Instructor application draft schema & model
│
├── routes/
│   ├── authRoutes.js                     # Express auth routes (/api/auth)
│   └── instructorApplicationRoutes.js    # Instructor application routes (/api/instructor/application)
│
├── uploads/                              # Uploaded profile photos, resumes, and certificates
├── .env                                  # Environment credentials (NOT committed to git)
├── .env.example                          # Safe template with placeholder values
├── .gitignore                            # Git ignore rules for Node.js backend
├── package.json                          # Package configuration & scripts
└── server.js                             # Entry point: Express app setup, DB connect & middleware
```

---

## 🔑 Environment Setup (`.env`)

Create a `.env` file in the `Backend/` folder based on `.env.example`:

```env
# Server Configuration
PORT=5000
FRONTEND_URL=http://localhost:5173

# MongoDB Atlas Connection
MONGO_URL=mongodb+srv://<username>:<password>@cluster.mongodb.net/upskillr

# JWT Authentication Secret
JWT_SECRET=your_super_secret_jwt_key_here

# Gmail SMTP Credentials (for OTP Emails)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# GitHub OAuth Credentials
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:5000/api/auth/github/callback
```

---

## 🔐 API Routes Summary

### Auth Routes — `/api/auth`
- `POST /api/auth/signup` — Store registration draft & send 6-digit OTP email
- `POST /api/auth/verify-otp` — Verify OTP & create verified user in MongoDB
- `POST /api/auth/login` — Authenticate user & return JWT token
- `GET /api/auth/me` — Return profile of authenticated user

### Instructor Application Routes — `/api/instructor/application`
- `GET /api/instructor/application` — Fetch current application draft
- `PUT /api/instructor/application` — Auto-save section draft progress
- `POST /api/instructor/application/submit` — Submit application for review
- `POST /api/instructor/application/upload/photo` — Upload profile photo file
- `POST /api/instructor/application/upload/resume` — Upload resume file
- `POST /api/instructor/application/upload/certificate` — Upload certificate document

---

## 🛠️ Running Locally

```bash
# Start server in development mode (with nodemon auto-restart)
npm run dev

# Start server in production mode
npm start
```

The API server will run on: [http://localhost:5000](http://localhost:5000)

---

## 📄 License
Copyright © 2026 **UpSkillr**. All rights reserved.
