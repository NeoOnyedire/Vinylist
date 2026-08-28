const { query } = require('../_lib/db');
const { requireAuth } = require('../_lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const user = requireAuth(req, res);
  if (!user) return;

  const { rows } = await query('SELECT * FROM users WHERE id = $1', [user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });

  res.json(rows[0]);
};
