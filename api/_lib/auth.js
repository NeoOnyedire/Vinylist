const jwt = require('jsonwebtoken');

function getUserFromReq(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

// Call at the top of any handler that needs a logged-in user.
// Writes a 401 and returns null if there isn't one - caller should `return` immediately.
function requireAuth(req, res) {
  const user = getUserFromReq(req);
  if (!user) {
    res.status(401).json({ error: 'Missing or invalid session' });
    return null;
  }
  return user;
}

function signSession(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '30d' });
}

module.exports = { getUserFromReq, requireAuth, signSession };
