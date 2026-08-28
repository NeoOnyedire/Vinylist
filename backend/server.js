require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const albumRoutes = require('./routes/albums');
const reviewRoutes = require('./routes/reviews');
const userRoutes = require('./routes/users');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://127.0.0.1:5173' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/albums', albumRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/users', userRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Vinylist API running on http://127.0.0.1:${PORT}`);
});
