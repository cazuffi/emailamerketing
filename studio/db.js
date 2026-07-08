const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'studio.db');

let db;

function getDb() {
  if (!db) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initSchema(db);
    seedAdmin(db);
  }
  return db;
}

function initSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'editor',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      modules TEXT NOT NULL DEFAULT '[]',
      created_by INTEGER NOT NULL REFERENCES users(id),
      updated_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function seedAdmin(database) {
  const count = database.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (count > 0) return;

  const email = process.env.ADMIN_EMAIL || 'admin@weidmuller.local';
  const password = process.env.ADMIN_PASSWORD || 'changeme';
  const name = process.env.ADMIN_NAME || 'Admin';

  const hash = bcrypt.hashSync(password, 10);
  database.prepare(
    'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)'
  ).run(email, hash, name, 'admin');

  console.log(`Studio admin created: ${email}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log('Default password: changeme — set ADMIN_PASSWORD in production');
  }
}

function findUserByEmail(email) {
  return getDb().prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
}

function findUserById(id) {
  return getDb().prepare('SELECT id, email, name, role, created_at FROM users WHERE id = ?').get(id);
}

function createUser({ email, password, name, role = 'editor' }) {
  const hash = bcrypt.hashSync(password, 10);
  const result = getDb().prepare(
    'INSERT INTO users (email, password_hash, name, role) VALUES (?, ?, ?, ?)'
  ).run(email.toLowerCase(), hash, name, role);
  return findUserById(result.lastInsertRowid);
}

function listUsers() {
  return getDb().prepare('SELECT id, email, name, role, created_at FROM users ORDER BY name').all();
}

function verifyPassword(user, password) {
  return bcrypt.compareSync(password, user.password_hash);
}

function listCampaigns() {
  return getDb().prepare(`
    SELECT c.id, c.title, c.modules, c.created_at, c.updated_at,
           u.name AS updated_by_name
    FROM campaigns c
    JOIN users u ON u.id = c.updated_by
    ORDER BY c.updated_at DESC
  `).all().map((row) => ({
    ...row,
    modules: JSON.parse(row.modules),
  }));
}

function getCampaign(id) {
  const row = getDb().prepare(`
    SELECT c.*, u.name AS updated_by_name
    FROM campaigns c
    JOIN users u ON u.id = c.updated_by
    WHERE c.id = ?
  `).get(id);
  if (!row) return null;
  return { ...row, modules: JSON.parse(row.modules) };
}

function createCampaign({ title, modules, userId }) {
  const result = getDb().prepare(`
    INSERT INTO campaigns (title, modules, created_by, updated_by)
    VALUES (?, ?, ?, ?)
  `).run(title, JSON.stringify(modules), userId, userId);
  return getCampaign(result.lastInsertRowid);
}

function updateCampaign(id, { title, modules, userId }) {
  getDb().prepare(`
    UPDATE campaigns
    SET title = ?, modules = ?, updated_by = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(title, JSON.stringify(modules), userId, id);
  return getCampaign(id);
}

function deleteCampaign(id) {
  return getDb().prepare('DELETE FROM campaigns WHERE id = ?').run(id);
}

module.exports = {
  getDb,
  findUserByEmail,
  findUserById,
  createUser,
  listUsers,
  verifyPassword,
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
};
