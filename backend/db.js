const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config();

class Database {
  constructor() {
    this.supabase = null;
    this.sqlite = null;
    this.useSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY;
    
    if (this.useSupabase) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY
      );
    } else {
      // Fallback to SQLite
      const dbPath = path.join(__dirname, 'database.sqlite');
      this.sqlite = new sqlite3.Database(dbPath);
      this.initSQLite();
    }
  }

  async initSQLite() {
    return new Promise((resolve, reject) => {
      this.sqlite.serialize(() => {
        // Create tables
        this.sqlite.run(`
          CREATE TABLE IF NOT EXISTS user_responses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            language TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        this.sqlite.run(`
          CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            area TEXT NOT NULL,
            activity TEXT NOT NULL,
            criteria TEXT NOT NULL,
            language TEXT NOT NULL,
            sequence_order INTEGER DEFAULT 0
          )
        `);

        this.sqlite.run(`
          CREATE TABLE IF NOT EXISTS answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id INTEGER,
            response_id INTEGER,
            answer TEXT,
            remarks TEXT,
            FOREIGN KEY(question_id) REFERENCES questions(id),
            FOREIGN KEY(response_id) REFERENCES user_responses(id)
          )
        `);

        this.sqlite.run(`
          CREATE TABLE IF NOT EXISTS excel_files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  async query(sql, params = []) {
    if (this.useSupabase) {
      // Convert SQLite syntax to Supabase/PostgreSQL
      return this.executeSupabaseQuery(sql, params);
    } else {
      return this.executeSQLiteQuery(sql, params);
    }
  }

  async executeSQLiteQuery(sql, params) {
    return new Promise((resolve, reject) => {
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        this.sqlite.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      } else {
        this.sqlite.run(sql, params, function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        });
      }
    });
  }

  async executeSupabaseQuery(sql, params) {
    // This would need to be implemented based on Supabase client methods
    // For now, throw error to indicate Supabase integration needed
    throw new Error('Supabase integration not fully implemented');
  }

  async insertUserResponse(email, language) {
    const sql = 'INSERT INTO user_responses (email, language) VALUES (?, ?)';
    const result = await this.query(sql, [email, language]);
    return result.lastID;
  }

  async insertQuestion(area, activity, criteria, language, sequenceOrder = 0) {
    const sql = 'INSERT INTO questions (area, activity, criteria, language, sequence_order) VALUES (?, ?, ?, ?, ?)';
    return await this.query(sql, [area, activity, criteria, language, sequenceOrder]);
  }

  async getQuestionsByLanguage(language) {
    const sql = 'SELECT * FROM questions WHERE language = ? ORDER BY sequence_order ASC, id ASC';
    return await this.query(sql, [language]);
  }

  async insertAnswer(questionId, responseId, answer, remarks) {
    const sql = 'INSERT INTO answers (question_id, response_id, answer, remarks) VALUES (?, ?, ?, ?)';
    return await this.query(sql, [questionId, responseId, answer, remarks]);
  }

  async getResponseWithAnswers(responseId) {
    const response = await this.query('SELECT * FROM user_responses WHERE id = ?', [responseId]);
    const answers = await this.query(`
      SELECT a.*, q.area, q.activity, q.criteria, q.sequence_order
      FROM answers a 
      JOIN questions q ON a.question_id = q.id 
      WHERE a.response_id = ?
      ORDER BY q.sequence_order ASC, q.id ASC
    `, [responseId]);
    
    return {
      response: response[0],
      answers: answers
    };
  }

  async getAllResponses() {
    return await this.query('SELECT * FROM user_responses ORDER BY timestamp DESC');
  }

  async getAnswersByQuestionId(questionId) {
    return await this.query('SELECT * FROM answers WHERE question_id = ?', [questionId]);
  }

  async clearQuestions() {
    await this.query('DELETE FROM questions');
  }

  async insertExcelFile(filename) {
    const sql = 'INSERT INTO excel_files (filename) VALUES (?)';
    return await this.query(sql, [filename]);
  }

  close() {
    if (this.sqlite) {
      this.sqlite.close();
    }
  }
}

module.exports = new Database();