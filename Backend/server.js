require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'UpSkillr Backend API is running smoothly' });
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
  } catch (error) {
    console.error('[MIGRATION ERROR] Database migration failed:', error);
  }
};

// Database Connection & Server Listener
const MONGO_URL = process.env.MONGO_URL;

if (!MONGO_URL) {
  console.error('CRITICAL: MONGO_URL environment variable is missing in .env file!');
} else {
  mongoose
    .connect(MONGO_URL, { dbName: 'UpSkillr' })
    .then(async () => {
      console.log('Successfully connected to MongoDB Atlas database (UpSkillr)!');
      await runDbMigration();
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
