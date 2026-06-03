const express = require('express');
const prisma = require('../utils/prisma');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/eventlog — get event log (admin only)
router.get('/', authMiddleware, requireRole('admin'), async (req, res) => {
  const { limit = 100, offset = 0 } = req.query;

  const events = await prisma.eventLog.findMany({
    orderBy: { occurredAt: 'desc' },
    take: parseInt(limit),
    skip: parseInt(offset),
    include: {
      user: { select: { id: true, fullName: true } },
    },
  });

  const total = await prisma.eventLog.count();
  res.json({ events, total });
});

module.exports = router;
