const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const questionsRouter = require('./routes/questions');
const responsesRouter = require('./routes/responses');
const adminRouter = require('./routes/admin');
const db = require('./db');
const excelParser = require('./services/excelParser');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? true // Allow all origins in production (Railway will handle this)
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/questions', questionsRouter);
app.use('/api/responses', responsesRouter);
app.use('/api/admin', adminRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../frontend/dist');
  console.log('Serving frontend from:', frontendPath);
  
  // Serve static files (CSS, JS, images)
  app.use(express.static(frontendPath));
  
  // Serve index.html for all routes (SPA routing)
  app.get('*', (req, res) => {
    const indexPath = path.join(frontendPath, 'index.html');
    console.log('Serving index.html from:', indexPath);
    res.sendFile(indexPath);
  });
}

// Initialize database and parse Excel on startup
async function initializeApp() {
  try {
    console.log('Initializing database...');
    
    // Parse existing Excel file if it exists
    const excelPath = path.join(__dirname, 'uploads', 'SE_Success_Criteria_Checklist_Eng_Bahasa.xlsx');
    try {
      console.log('Parsing Excel file...');
      await excelParser.parseAndSeedDatabase(excelPath);
      console.log('Excel file parsed successfully');
    } catch (error) {
      console.log('No Excel file found or error parsing:', error.message);
      console.log('Application will continue without initial questions');
    }
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing application:', error);
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`Production mode: ${process.env.NODE_ENV === 'production'}`);
  await initializeApp();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  db.close();
  process.exit(0);
});

module.exports = app;