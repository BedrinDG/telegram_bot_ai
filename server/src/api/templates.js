const express = require('express');
const prisma = require('../utils/prisma');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { logEvent } = require('../services/reportService');

const router = express.Router();

// GET /api/templates/active — get active template
router.get('/active', authMiddleware, async (req, res) => {
  const template = await prisma.reportTemplate.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!template) return res.status(404).json({ error: 'Шаблон не найден' });
  res.json(template);
});

// GET /api/templates — list all templates (admin only)
router.get('/', authMiddleware, requireRole('admin'), async (req, res) => {
  const templates = await prisma.reportTemplate.findMany({
    orderBy: { createdAt: 'desc' },
    include: { creator: { select: { fullName: true } } },
  });
  res.json(templates);
});

// POST /api/templates — create new template (admin only)
router.post('/', authMiddleware, requireRole('admin'), async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'content обязателен' });

  // Deactivate all previous templates
  await prisma.reportTemplate.updateMany({ data: { isActive: false } });

  const template = await prisma.reportTemplate.create({
    data: { content, createdBy: req.user.id, isActive: true },
  });

  await logEvent(req.user.id, 'template_updated', `New template created: id ${template.id}`);
  res.json(template);
});

module.exports = router;
