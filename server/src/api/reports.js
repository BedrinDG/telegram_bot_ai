const express = require('express');
const prisma = require('../utils/prisma');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/reports — list reports (manager sees subordinates, admin sees all)
router.get('/', authMiddleware, requireRole('manager', 'admin'), async (req, res) => {
  const { userId, status, from, to } = req.query;

  const where = {};

  if (req.user.role === 'manager') {
    const subordinateIds = (await prisma.user.findMany({
      where: { managerId: req.user.id },
      select: { id: true },
    })).map(u => u.id);
    where.userId = { in: subordinateIds };
  }

  if (userId) where.userId = parseInt(userId);
  if (status) where.status = status;
  if (from || to) {
    where.submittedAt = {};
    if (from) where.submittedAt.gte = new Date(from);
    if (to) where.submittedAt.lte = new Date(to);
  }

  const reports = await prisma.report.findMany({
    where,
    orderBy: { submittedAt: 'desc' },
    include: {
      user: { select: { id: true, fullName: true, telegramChatId: true } },
      checkResult: true,
    },
  });

  res.json(reports);
});

// GET /api/reports/my — employee's own reports
router.get('/my', authMiddleware, async (req, res) => {
  const reports = await prisma.report.findMany({
    where: { userId: req.user.id },
    orderBy: { submittedAt: 'desc' },
    include: { checkResult: true },
  });
  res.json(reports);
});

// GET /api/reports/:id — single report
router.get('/:id', authMiddleware, async (req, res) => {
  const report = await prisma.report.findUnique({
    where: { id: parseInt(req.params.id) },
    include: {
      user: { select: { id: true, fullName: true } },
      checkResult: true,
    },
  });
  if (!report) return res.status(404).json({ error: 'Отчёт не найден' });

  if (req.user.role === 'employee' && report.userId !== req.user.id) {
    return res.status(403).json({ error: 'Нет доступа' });
  }

  res.json(report);
});

module.exports = router;
