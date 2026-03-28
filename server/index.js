const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const sequelize = require('./db');

// Models — реттілік маңызды
require('./models/User');
require('./models/Survey');
require('./models/Comment');
require('./models/Response');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Static HTML files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static('uploads')); // Serving root uploads folder

// API routes
app.use('/api/auth',    require('./routes/auth.routes'));
app.use('/api/surveys', require('./routes/surveys'));

// 404 handler — criteria point 1
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Маршрут табылмады' });
  }
  next();
});

// Global error handler — criteria point 5
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Сервер қатесі орын алды' });
});

// Fallback — all non-API routes serve index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

sequelize
  .sync({ alter: true })
  .then(() => {
    console.log('✅ PostgreSQL қосылды');
    app.listen(PORT, () => {
      console.log(`🚀 Сервер: http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Дерекқор қатесі:', err.message);
  });