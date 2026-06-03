const express = require('express');
const prisma = require('../utils/prisma');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { logEvent } = require('../services/reportService');

const router = express.Router();

// GET /api/users — list all users (admin only)
router.get('/', authMiddleware, requireRole('admin'), async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, telegramChatId: true, fullName: true,
      role: true, isActive: true, managerId: true, createdAt: true,
    },
  });
  res.json(users);
});

// GET /api/users/subordinates — get subordinates of current manager
router.get('/subordinates', authMiddleware, requireRole('manager', 'admin'), async (req, res) => {
  const employees = await prisma.user.findMany({
    where: { managerId: req.user.id },
    select: { id: true, fullName: true, telegramChatId: true, isActive: true },
  });
  res.json(employees);
});

// POST /api/users — create or update user (admin only)
router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  const { telegramChatId, fullName, role, managerId, isActive } = req.body;
  if (!telegramChatId) return res.status(400).json({ error: 'telegramChatId обязателен' });

  const user = await prisma.user.upsert({
    where: { telegramChatId: String(telegramChatId) },
    update: { fullName, role, managerId, isActive },
    create: { telegramChatId: String(telegramChatId), fullName, role: role || 'employee', managerId, isActive: isActive ?? false },
  });

  await logEvent(req.user.id, 'user_updated', `User ${user.id} updated by admin`);
  res.json(user);
});

// PATCH /api/users/:id — partial update (admin only)
router.patch('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  const { fullName, role, managerId, isActive } = req.body;

  const user = await prisma.user.update({
    where: { id },
    data: { fullName, role, managerId, isActive },
  });

  await logEvent(req.user.id, 'user_updated', `User ${id} patched by admin`);
  res.json(user);
});

// DELETE /api/users/:id — deactivate user (admin only)
router.delete('/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  const id = parseInt(req.params.id);
  await prisma.user.update({ where: { id }, data: { isActive: false } });
  await logEvent(req.user.id, 'user_deactivated', `User ${id} deactivated`);
  res.json({ success: true });
});

module.exports = router;
