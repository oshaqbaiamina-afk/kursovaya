const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const { Op }   = require('sequelize');

const { User } = require('../models');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// ── Multer Configuration ──────────────────────────────────
const uploadsDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Тек бейнелер жүктелуі мүмкін'));
    }
  }
});

// ── Register ──────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Барлық өрістер міндетті' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль кемінде 6 таңба' });
    }

    // Check if user exists
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Электрондық пошта già бар' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      avatarUrl: null
    });

    // Generate token
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Қайта тіркеу қатесі' });
  }
});

// ── Login ─────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Электрондық пошта және пароль міндетті' });
    }

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Электрондық пошта немесе пароль қате' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Электрондық пошта немесе пароль қате' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Кірету қатесі' });
  }
});

// ── GET /me ───────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Пайдаланушы мәліметін алу қатесі' });
  }
});

// ── Update Profile (with avatar upload) ───────────────────
router.patch('/profile', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = req.user;

    // Update basic info
    if (name) user.name = name;
    if (email) {
      // Check if email is already taken by another user
      const existing = await User.findOne({
        where: { email, id: { [Op.ne]: user.id } }
      });
      if (existing) {
        return res.status(400).json({ error: 'Электрондық пошта істігінен бар' });
      }
      user.email = email;
    }

    // Update avatar if uploaded
    if (req.file) {
      user.avatarUrl = '/uploads/avatars/' + req.file.filename;
    }

    await user.save();

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Профиль жаңарту қатесі' });
  }
});

module.exports = router;
