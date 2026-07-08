const {
  findUserByEmail,
  findUserById,
  verifyPassword,
  createUser,
  listUsers,
} = require('./db');

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  req.user = findUserById(req.session.userId);
  if (!req.user) {
    req.session.destroy();
    return res.status(401).json({ error: 'Session expired' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
}

function mountAuthRoutes(app) {
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = findUserByEmail(email);
    if (!user || !verifyPassword(user, password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    req.session.userId = user.id;
    res.json({ user: findUserById(user.id) });
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => {
      res.json({ ok: true });
    });
  });

  app.get('/api/auth/me', (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const user = findUserById(req.session.userId);
    if (!user) {
      req.session.destroy();
      return res.status(401).json({ error: 'Session expired' });
    }
    res.json({ user });
  });

  app.get('/api/users', requireAuth, requireAdmin, (req, res) => {
    res.json({ users: listUsers() });
  });

  app.post('/api/users', requireAuth, requireAdmin, (req, res) => {
    const { email, password, name, role = 'editor' } = req.body || {};
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    if (findUserByEmail(email)) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const user = createUser({ email, password, name, role });
    res.status(201).json({ user });
  });
}

module.exports = { requireAuth, requireAdmin, mountAuthRoutes };
