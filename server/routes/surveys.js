const express  = require('express');
const jwt      = require('jsonwebtoken');
const { Op }   = require('sequelize');
const { Survey, User, Comment, Response } = require('../models');

const router = express.Router();


// ── Middleware ───────────────────────────────────────────

// Міндетті авторизация
const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Авторизация қажет' });
  try {
    const decoded = jwt.verify(header.replace('Bearer ', ''), process.env.JWT_SECRET || 'secret');
    req.userId   = decoded.id;
    req.userName = decoded.name;
    next();
  } catch {
    res.status(401).json({ error: 'Токен жарамсыз' });
  }
};

// Міндетті емес авторизация
const optAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (header) {
    try {
      const decoded = jwt.verify(header.replace('Bearer ', ''), process.env.JWT_SECRET || 'secret');
      req.userId   = decoded.id;
      req.userName = decoded.name;
    } catch {}
  }
  next();
};

// ── GET /api/surveys — барлық жарияланған ───────────────
router.get('/', async (req, res) => {
  try {
    const surveys = await Survey.findAll({
      where: { isPublished: true },           // ← тек жарияланғандар
      include: [{ model: User, attributes: ['id', 'name', 'avatarUrl'] }],
      order: [['createdAt', 'DESC']],
      attributes: { exclude: [] },
    });
    res.json(surveys);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Қате орын алды' });
  }
});

// ── GET /api/surveys/stats — жалпы статистика ───────────
router.get('/stats', async (req, res) => {
  try {
    const surveys = await Survey.count({ where: { isPublished: true } });
    const responses = await Response.count();
    const users = await User.count();
    const comments = await Comment.count();

    const allSurveys = await Survey.findAll({
      where: { isPublished: true },
      attributes: ['questions']
    });
    let totalQuestions = 0;
    allSurveys.forEach(s => {
      let q = s.questions;
      if (typeof q === 'string') {
        try { q = JSON.parse(q); } catch(e) { q = []; }
      }
      totalQuestions += (Array.isArray(q) ? q.length : 0);
    });

    res.json({ surveys, responses, users, comments, questions: totalQuestions });
  } catch (err) {
    res.status(500).json({ error: 'Қате орын алды' });
  }
});

// ── GET /api/surveys/activity — соңғы белсенділік ──────
router.get('/activity', async (req, res) => {
  try {
    const recentComments = await Comment.findAll({
      include: [{ model: User, attributes: ['id', 'name', 'avatarUrl'] }],
      order: [['createdAt', 'DESC']],
      limit: 10
    });
    
    const recentResponses = await Response.findAll({
      include: [{ model: User, attributes: ['id', 'name', 'avatarUrl'] }],
      order: [['createdAt', 'DESC']],
      limit: 10
    });
    
    const recentSurveys = await Survey.findAll({
      where: { isPublished: true },
      include: [{ model: User, attributes: ['id', 'name', 'avatarUrl'] }],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    const activities = [];
    recentComments.forEach(c => {
      activities.push({ user: c.User?.name || 'Анонимді', type: 'Пікір қалдырды', date: c.createdAt });
    });
    recentResponses.forEach(r => {
      activities.push({ user: r.User?.name || 'Анонимді', type: 'Жауап берді', date: r.createdAt });
    });
    recentSurveys.forEach(s => {
      activities.push({ user: s.User?.name || 'Белгісіз', type: 'Сауалнама жасады', date: s.createdAt });
    });
    
    // Sort combined by date descending
    activities.sort((a, b) => b.date - a.date);
    
    // Return top 5 recent specific actions
    res.json(activities.slice(0, 5));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Қате орын алды' });
  }
});

// ── GET /api/surveys/my — менікі (auth) ─────────────────
// МАҢЫЗДЫ: /my маршруты /:id-дан ЖОҒАРЫ тұруы керек!
router.get('/my', auth, async (req, res) => {
  try {
    const surveys = await Survey.findAll({
      where: { userId: req.userId },
      order: [['createdAt', 'DESC']],
    });
    res.json(surveys);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Қате орын алды' });
  }
});

// ── GET /api/surveys/:id — жеке сауалнама ────────────────
router.get('/:id', async (req, res) => {
  try {
    const survey = await Survey.findByPk(req.params.id, {
      include: [{ model: User, attributes: ['id', 'name', 'avatarUrl'] }],
    });
    if (!survey) return res.status(404).json({ error: 'Сауалнама табылмады' });
    res.json(survey);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Қате орын алды' });
  }
});

// ── POST /api/surveys — жаңа сауалнама ──────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, questions, isPublished } = req.body;

    if (!title?.trim())
      return res.status(400).json({ error: 'Сауалнама атауы міндетті' });
    if (!questions?.length)
      return res.status(400).json({ error: 'Кем дегенде 1 сұрақ қосыңыз' });

    const survey = await Survey.create({
      title:       title.trim(),
      description: description || '',
      questions,
      isPublished: !!isPublished,   // boolean-ға айналдыру
      userId:      req.userId,
    });

    res.status(201).json(survey);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Қате орын алды' });
  }
});

// ── PUT /api/surveys/:id — өзгерту ──────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const survey = await Survey.findByPk(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Табылмады' });
    if (survey.userId !== req.userId) return res.status(403).json({ error: 'Рұқсат жоқ' });

    await survey.update(req.body);
    res.json(survey);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Қате орын алды' });
  }
});

// ── DELETE /api/surveys/:id — жою ───────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const survey = await Survey.findByPk(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Табылмады' });
    if (survey.userId !== req.userId) return res.status(403).json({ error: 'Рұқсат жоқ' });

    await survey.destroy();
    res.json({ message: 'Сауалнама жойылды' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Қате орын алды' });
  }
});

// ── POST /api/surveys/:id/respond — жауап жіберу ────────
router.post('/:id/respond', optAuth, async (req, res) => {
  try {
    const survey = await Survey.findByPk(req.params.id);
    if (!survey) return res.status(404).json({ error: 'Сауалнама табылмады' });

    const { answers } = req.body;
    if (!answers) return res.status(400).json({ error: 'Жауаптар жоқ' });

    await Response.create({
      answers,
      surveyId: survey.id,
      userId:   req.userId || null,
    });

    await Survey.increment('responseCount', { where: { id: survey.id } });

    res.status(201).json({ message: 'Жауап сақталды!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Қате орын алды' });
  }
});

// ── GET /api/surveys/:id/results/public ─────────────────
router.get('/:id/results/public', async (req, res) => {
  try {
    const survey = await Survey.findByPk(req.params.id, { include: [Response] });
    if (!survey) return res.status(404).json({ error: 'Табылмады' });

    const stats = (survey.questions || []).map((q, i) => {
      const allAnswers = survey.Responses.map(r => r.answers[i]).filter(v => v != null && v !== '');
      if (q.type === 'text') {
        return { question: q.text, type: 'text', answers: allAnswers.slice(0, 20), total: allAnswers.length };
      }
      const counts = {};
      (q.options || []).forEach(o => (counts[o] = 0));
      allAnswers.forEach(a => {
        if (Array.isArray(a)) a.forEach(v => { if (v in counts) counts[v]++; });
        else if (a in counts) counts[a]++;
      });
      return { question: q.text, type: q.type, counts, total: allAnswers.length };
    });

    res.json({ title: survey.title, total: survey.Responses.length, stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Қате орын алды' });
  }
});

// ── GET /api/surveys/:id/results — тек автор ─────────────
router.get('/:id/results', auth, async (req, res) => {
  try {
    const survey = await Survey.findByPk(req.params.id, { include: [Response] });
    if (!survey) return res.status(404).json({ error: 'Табылмады' });
    if (survey.userId !== req.userId) return res.status(403).json({ error: 'Рұқсат жоқ' });

    const stats = (survey.questions || []).map((q, i) => {
      const all = survey.Responses.map(r => r.answers[i]).filter(Boolean);
      if (q.type === 'text') return { question: q.text, type: 'text', answers: all, total: all.length };
      const counts = {};
      (q.options || []).forEach(o => (counts[o] = 0));
      all.forEach(a => { if (a in counts) counts[a]++; });
      return { question: q.text, type: q.type, counts, total: all.length };
    });

    res.json({ title: survey.title, total: survey.Responses.length, stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Қате орын алды' });
  }
});

// ── GET /api/surveys/:id/comments ────────────────────────
router.get('/:id/comments', async (req, res) => {
  try {
    const comments = await Comment.findAll({
      where: { surveyId: req.params.id },
      include: [{ model: User, attributes: ['id', 'name'] }],
      order: [['createdAt', 'DESC']],
    });
    res.json(comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Қате орын алды' });
  }
});

// ── POST /api/surveys/:id/comments ───────────────────────
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Пікір мәтіні бос болмауы керек' });

    const comment = await Comment.create({
      text:     text.trim(),
      surveyId: req.params.id,
      userId:   req.userId,
    });

    await Survey.increment('commentCount', { where: { id: req.params.id } });

    const full = await Comment.findByPk(comment.id, {
      include: [{ model: User, attributes: ['id', 'name'] }],
    });

    res.status(201).json(full);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Қате орын алды' });
  }
});

module.exports = router;