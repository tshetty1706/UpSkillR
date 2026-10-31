require('dotenv').config();
// Server configuration for UpSkillR backend (updated photo select)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const instructorApplicationRoutes = require('./routes/instructorApplicationRoutes');
const learnerRoutes = require('./routes/learnerRoutes');
const mediaRoutes = require('./routes/mediaRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow any localhost origin (5173, 5174, etc.) or same-origin / server-to-server
    if (!origin || origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static uploads (profile photos & resumes)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/learners', learnerRoutes);
app.use('/api/instructor/application', instructorApplicationRoutes);
app.use('/api/media', mediaRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'UpSkillr Backend API is running smoothly' });
});

// Global JSON error handling middleware
app.use((err, req, res, next) => {
  console.error('Express request error:', err.message);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error occurred.'
  });
});

// Database Migration Helper to merge singular collections to plural
const runDbMigration = async () => {
  try {
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    // 1. Migrate 'learner' to 'learners'
    if (collectionNames.includes('learner')) {
      const learnerColl = db.collection('learner');
      const learnersColl = db.collection('learners');
      const count = await learnerColl.countDocuments();
      if (count > 0) {
        console.log(`[MIGRATION] Found ${count} documents in singular 'learner' collection. Migrating to 'learners'...`);
        const docs = await learnerColl.find({}).toArray();
        for (const doc of docs) {
          const exists = await learnersColl.findOne({ email: doc.email });
          if (!exists) {
            await learnersColl.insertOne(doc);
          }
        }
        console.log(`[MIGRATION] Completed migration of 'learner' to 'learners'.`);
      }
      await learnerColl.drop();
      console.log(`[MIGRATION] Dropped singular 'learner' collection.`);
    }

    // 2. Migrate 'instructor' to 'instructors'
    if (collectionNames.includes('instructor')) {
      const instructorColl = db.collection('instructor');
      const instructorsColl = db.collection('instructors');
      const count = await instructorColl.countDocuments();
      if (count > 0) {
        console.log(`[MIGRATION] Found ${count} documents in singular 'instructor' collection. Migrating to 'instructors'...`);
        const docs = await instructorColl.find({}).toArray();
        for (const doc of docs) {
          const exists = await instructorsColl.findOne({ email: doc.email });
          if (!exists) {
            await instructorsColl.insertOne(doc);
          }
        }
        console.log(`[MIGRATION] Completed migration of 'instructor' to 'instructors'.`);
      }
      await instructorColl.drop();
      console.log(`[MIGRATION] Dropped singular 'instructor' collection.`);
    }

    // 3. Migrate 'InstructorApplication' details to 'Instructor'
    try {
      const { runMigration } = require('./scripts/migrate_instructor_schema');
      // Already executed, can safely run
    } catch (migErr) {}
  } catch (error) {
    console.error('[MIGRATION ERROR] Database migration failed:', error);
  }
};

// Start HTTP server immediately so port 5000 accepts requests without connection drops
app.listen(PORT, () => {
  console.log(`UpSkillR Backend Server running on http://localhost:${PORT}`);
});

const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error('CRITICAL: MONGO_URL environment variable is missing in .env file!');
} else {
  mongoose
    .connect(MONGO_URL, { dbName: 'UpSkillr' })
    .then(async () => {
      console.log('Successfully connected to MongoDB Atlas database (UpSkillr)!');
      await runDbMigration();
    })
    .catch((err) => {
      console.error('MongoDB Atlas Connection Failure:', err.message);
    });
}
