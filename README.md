# UpSkillr — Fullstack MERN Education Platform

**UpSkillr** is an online learning platform built with the **MERN** stack (**M**ongoDB, **E**xpress, **R**eact 19, **N**ode.js) and **Vite**. It provides a complete educational environment for learners to master in-demand skills and for instructors to apply, create, manage, and deliver online courses.

---

## 🚀 Repository Structure & Stack Summary

| Directory | Stack / Technologies | Key Responsibilities |
|---|---|---|
| **`Frontend/`** | React 19, Vite, Vanilla CSS, Lucide Icons, libphonenumber-js | Landing page, Light/Dark theme, auth UI, multi-step instructor application form, learner dashboard |
| **`Backend/`** | Node.js, Express v5, MongoDB Atlas, Mongoose, JWT, Nodemailer, Multer | REST API, user authentication (manual + OAuth), OTP email verification, auto-save state, file uploads |

---

## 📦 Installed Libraries & Installation Commands

### 1. Frontend Libraries (`Frontend/package.json`)

```bash
# Production Dependencies
npm install react react-dom lucide-react libphonenumber-js

# Development Dependencies
npm install -D vite @vitejs/plugin-react eslint @eslint/js eslint-plugin-react-hooks eslint-plugin-react-refresh globals
```

- **`react`** (`^19.2.8`) & **`react-dom`** (`^19.2.8`): UI framework & rendering engine
- **`lucide-react`** (`^1.31.0`): Icon library for UI controls
- **`libphonenumber-js`** (`^1.13.12`): Phone number parsing & validation
- **`vite`** (`^8.2.0`): Dev server & production bundler

---

### 2. Backend Libraries (`Backend/package.json`)

```bash
# Production Dependencies
npm install express mongoose dotenv cors jsonwebtoken bcryptjs nodemailer multer axios libphonenumber-js

# Development Dependencies (Optional)
npm install -D nodemon
```

- **`express`** (`^5.2.1`): Web API framework
- **`mongoose`** (`^9.9.1`): MongoDB Object Data Modeling (ODM)
- **`dotenv`** (`^16.6.1`): Environment variable loader
- **`cors`** (`^2.8.6`): Cross-Origin Resource Sharing
- **`jsonwebtoken`** (`^9.0.2`): JWT authentication tokens
- **`bcryptjs`** (`^2.4.3`): Password hashing
- **`nodemailer`** (`^9.0.5`): Gmail SMTP email delivery for OTP verification
- **`multer`** (`^2.2.0`): File upload processing (photos, resumes, certificates)
- **`axios`** (`^1.19.0`): HTTP requests for OAuth API calls
- **`libphonenumber-js`** (`^1.13.12`): Phone number parsing & validation

---

## ⚡ Quick Start Guide for Developers

### 1. Clone the Repository
```bash
git clone https://github.com/tshetty1706/UpSkillR.git
cd UpSkillR
```

### 2. Setup & Run Backend
```bash
# Navigate to Backend folder
cd Backend

# Install all backend dependencies
npm install

# Create environment configuration file (.env)
copy .env.example .env

# Configure environment variables in .env (MongoDB URL, JWT Secret, Email, OAuth credentials)

# Start backend server in dev mode
npm run dev
```
Backend API will be running on: `http://localhost:5000`

---

### 3. Setup & Run Frontend
```bash
# Open a new terminal and navigate to Frontend folder
cd Frontend

# Install all frontend dependencies
npm install

# Start Vite development server
npm run dev
```
Frontend web application will be running on: `http://localhost:5173`

---

## 📄 License
Copyright © 2026 **UpSkillr**. All rights reserved.
