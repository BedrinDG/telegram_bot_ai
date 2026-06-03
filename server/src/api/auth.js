const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');

const router = express.Router();

function generateTokens(user) {
  const payload = { id: user.id, telegramChatId: user.telegramChatId, role: user.role };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

// POST /api/auth/login — login by telegramChatId (for admin panel)
router.post('/login', async (req, res) => {
  const { telegramChatId } = req.body;
  if (!telegramChatId) {
    return res.status(400).json({ error: 'telegramChatId обязателен' });
  }

  const user = await prisma.user.findUnique({ where: { telegramChatId: String(telegramChatId) } });
  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'Пользователь не найден или не активирован' });
  }

  const tokens = generateTokens(user);
  res.json({ ...tokens, user: { id: user.id, fullName: user.fullName, role: user.role } });
});

// POST /api/auth/refresh
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken обязателен' });

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const accessToken = jwt.sign(
      { id: payload.id, telegramChatId: payload.telegramChatId, role: payload.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({ accessToken });
  } catch {
    res.status(401).json({ error: 'Недействительный refresh-токен' });
  }
});

module.exports = router;
