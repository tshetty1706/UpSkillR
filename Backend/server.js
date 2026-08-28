require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const instructorApplicationRoutes = require('./routes/instructorApplicationRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads (profile photos & resumes)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/instructor/application', instructorApplicationRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'UpSkillr Backend API is running smoothly' });
});

// Database Connection & Server Listener
const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error('CRITICAL: MONGO_URL environment variable is missing in .env file!');
} else {
  mongoose
    .connect(MONGO_URL, { dbName: 'UpSkillr' })
    .then(() => {
      console.log('Successfully connected to MongoDB Atlas database (UpSkillr)!');
      app.listen(PORT, () => {
        console.log(`UpSkillr Backend Server running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error('MongoDB Atlas Connection Failure:', err.message);
      // Fallback: Start HTTP server even if DB connection retries
      app.listen(PORT, () => {
        console.log(`UpSkillr Backend Server running on http://localhost:${PORT} (Database pending connection)`);
      });
    });
}
