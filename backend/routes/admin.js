const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const db = require('../db');
const excelParser = require('../services/excelParser');
const pdfGenerator = require('../services/pdfGenerator');

// Configure multer for Excel file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Keep original filename with timestamp prefix
    const timestamp = Date.now();
    const originalName = file.originalname;
    cb(null, `${timestamp}-${originalName}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Check if file is Excel
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (allowedTypes.includes(file.mimetype) || 
        file.originalname.toLowerCase().endsWith('.xlsx') ||
        file.originalname.toLowerCase().endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Simple admin authentication middleware (in production, use proper JWT/session)
const adminAuth = (req, res, next) => {
  const { authorization } = req.headers;
  
  // For demo purposes, accept a simple token
  // In production, implement proper JWT verification
  if (authorization === 'Bearer admin-token-123') {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// POST /api/admin/login - Simple admin login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // Simple demo credentials (use proper auth in production)
  if (username === 'admin' && password === 'admin123') {
    res.json({
      success: true,
      token: 'admin-token-123',
      message: 'Login successful'
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// POST /api/admin/upload-excel - Upload and process new Excel file
router.post('/upload-excel', adminAuth, upload.single('excel'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No Excel file uploaded' });
    }

    const filePath = req.file.path;
    
    // Parse and seed database
    const result = await excelParser.parseAndSeedDatabase(filePath);
    
    // Optionally, remove old Excel files (keep only the latest)
    const uploadDir = path.dirname(filePath);
    const files = fs.readdirSync(uploadDir)
      .filter(file => file.endsWith('.xlsx') || file.endsWith('.xls'))
      .map(file => ({
        name: file,
        path: path.join(uploadDir, file),
        stats: fs.statSync(path.join(uploadDir, file))
      }))
      .sort((a, b) => b.stats.mtime - a.stats.mtime);

    // Keep only the 3 most recent Excel files
    for (let i = 3; i < files.length; i++) {
      try {
        fs.unlinkSync(files[i].path);
      } catch (err) {
        console.error('Error deleting old Excel file:', err);
      }
    }

    res.json({
      success: true,
      message: 'Excel file uploaded and processed successfully',
      filename: req.file.filename,
      questionsImported: result.totalInserted
    });

  } catch (error) {
    console.error('Error uploading Excel file:', error);
    res.status(500).json({ 
      error: 'Failed to process Excel file',
      details: error.message 
    });
  }
});

// GET /api/admin/preview-excel - Preview Excel file before processing
router.post('/preview-excel', adminAuth, upload.single('excel'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No Excel file uploaded' });
    }

    const preview = await excelParser.getQuestionPreview(req.file.path);
    
    // Delete the temporary file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      preview: preview
    });

  } catch (error) {
    console.error('Error previewing Excel file:', error);
    
    // Clean up uploaded file if there was an error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Failed to preview Excel file',
      details: error.message 
    });
  }
});

// GET /api/admin/dashboard - Get dashboard statistics
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    // Get basic statistics
    const totalResponses = await db.query('SELECT COUNT(*) as count FROM user_responses');
    const totalQuestions = await db.query('SELECT COUNT(*) as count FROM questions');
    
    // Get responses by language
    const responsesByLang = await db.query(`
      SELECT language, COUNT(*) as count 
      FROM user_responses 
      GROUP BY language
    `);

    // Get recent responses
    const recentResponses = await db.query(`
      SELECT email, language, timestamp 
      FROM user_responses 
      ORDER BY timestamp DESC 
      LIMIT 10
    `);

    // Get question statistics
    const questionStats = await db.query(`
      SELECT 
        q.area,
        q.language,
        COUNT(DISTINCT q.id) as question_count,
        COUNT(a.id) as total_answers,
        SUM(CASE WHEN a.answer = 'Yes' THEN 1 ELSE 0 END) as yes_count,
        SUM(CASE WHEN a.answer = 'No' THEN 1 ELSE 0 END) as no_count,
        SUM(CASE WHEN a.answer = 'N/A' THEN 1 ELSE 0 END) as na_count
      FROM questions q
      LEFT JOIN answers a ON q.id = a.question_id
      GROUP BY q.area, q.language
      ORDER BY q.area, q.language
    `);

    res.json({
      success: true,
      statistics: {
        totalResponses: totalResponses[0].count,
        totalQuestions: totalQuestions[0].count,
        responsesByLanguage: responsesByLang,
        recentResponses: recentResponses,
        questionStatistics: questionStats
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch dashboard data',
      details: error.message 
    });
  }
});

// GET /api/admin/report/pdf - Generate consolidated PDF report
router.get('/report/pdf', adminAuth, async (req, res) => {
  try {
    const { startDate, endDate, language } = req.query;
    
    // Build query for responses
    let sql = 'SELECT * FROM user_responses WHERE 1=1';
    const params = [];

    if (startDate) {
      sql += ' AND timestamp >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND timestamp <= ?';
      params.push(endDate);
    }

    if (language && ['EN', 'ID'].includes(language)) {
      sql += ' AND language = ?';
      params.push(language);
    }

    sql += ' ORDER BY timestamp DESC';

    const responses = await db.query(sql, params);

    // Get question statistics
    const questionStats = await db.query(`
      SELECT 
        q.id,
        q.area,
        q.activity,
        q.criteria,
        q.language,
        COUNT(a.id) as total_responses,
        SUM(CASE WHEN a.answer = 'Yes' THEN 1 ELSE 0 END) as yes_count,
        SUM(CASE WHEN a.answer = 'No' THEN 1 ELSE 0 END) as no_count,
        SUM(CASE WHEN a.answer = 'N/A' THEN 1 ELSE 0 END) as na_count
      FROM questions q
      LEFT JOIN answers a ON q.id = a.question_id
      ${language ? 'WHERE q.language = ?' : ''}
      GROUP BY q.id, q.area, q.activity, q.criteria, q.language
      ORDER BY q.sequence_order
    `, language ? [language] : []);

    const pdfBuffer = await pdfGenerator.generateConsolidatedReport(responses, questionStats);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="consolidated-report.pdf"');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Error generating consolidated report:', error);
    res.status(500).json({ 
      error: 'Failed to generate consolidated report',
      details: error.message 
    });
  }
});

// GET /api/admin/responses - Get all responses with filters (admin view)
router.get('/responses', adminAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      email, 
      language, 
      startDate, 
      endDate 
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query
    let sql = 'SELECT * FROM user_responses WHERE 1=1';
    let countSql = 'SELECT COUNT(*) as total FROM user_responses WHERE 1=1';
    const params = [];

    if (email) {
      sql += ' AND email LIKE ?';
      countSql += ' AND email LIKE ?';
      params.push(`%${email}%`);
    }

    if (language && ['EN', 'ID'].includes(language)) {
      sql += ' AND language = ?';
      countSql += ' AND language = ?';
      params.push(language);
    }

    if (startDate) {
      sql += ' AND timestamp >= ?';
      countSql += ' AND timestamp >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND timestamp <= ?';
      countSql += ' AND timestamp <= ?';
      params.push(endDate);
    }

    // Get total count
    const totalResult = await db.query(countSql, params);
    const total = totalResult[0].total;

    // Get paginated results
    sql += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    const responses = await db.query(sql, [...params, parseInt(limit), offset]);

    res.json({
      success: true,
      data: {
        responses: responses,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching admin responses:', error);
    res.status(500).json({ 
      error: 'Failed to fetch responses',
      details: error.message 
    });
  }
});

// GET /api/admin/responses/:id/details - Get detailed response data (admin only)
router.get('/responses/:id/details', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get response with answers
    const responseData = await db.getResponseWithAnswers(id);
    
    if (!responseData.response) {
      return res.status(404).json({ error: 'Response not found' });
    }

    // Calculate answer summary
    const answerSummary = {
      total: responseData.answers.length,
      yes: responseData.answers.filter(a => a.answer === 'Yes').length,
      no: responseData.answers.filter(a => a.answer === 'No').length,
      na: responseData.answers.filter(a => a.answer === 'N/A').length,
      withRemarks: responseData.answers.filter(a => a.remarks && a.remarks.trim().length > 0).length
    };

    // Get completion percentage
    const totalQuestionsQuery = await db.query('SELECT COUNT(*) as count FROM questions WHERE language = ?', [responseData.response.language]);
    const totalQuestions = totalQuestionsQuery[0].count;
    const completionPercentage = Math.round((answerSummary.total / totalQuestions) * 100);

    res.json({
      success: true,
      data: {
        response: responseData.response,
        answerSummary,
        completionPercentage,
        totalExpectedQuestions: totalQuestions
      }
    });

  } catch (error) {
    console.error('Error fetching response details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch response details',
      details: error.message 
    });
  }
});

// DELETE /api/admin/responses/:id - Delete response (admin only)
router.delete('/responses/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Delete answers first
    await db.query('DELETE FROM answers WHERE response_id = ?', [id]);
    
    // Delete response
    const result = await db.query('DELETE FROM user_responses WHERE id = ?', [id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Response not found' });
    }

    res.json({
      success: true,
      message: 'Response deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting response:', error);
    res.status(500).json({ 
      error: 'Failed to delete response',
      details: error.message 
    });
  }
});

module.exports = router;