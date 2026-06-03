const prisma = require('../utils/prisma');
const { checkReport } = require('./openaiService');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

async function getActiveTemplate() {
  const template = await prisma.reportTemplate.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  return template;
}

async function extractTextFromPdf(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text.trim();
}

async function processReport(reportId) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { user: true },
  });

  if (!report || !report.rawText) return null;

  await prisma.report.update({
    where: { id: reportId },
    data: { status: 'processing' },
  });

  const template = await getActiveTemplate();
  if (!template) {
    await prisma.report.update({
      where: { id: reportId },
      data: { status: 'awaiting_check' },
    });
    return { error: 'no_template' };
  }

  let aiResult;
  try {
    aiResult = await checkReport(report.rawText, template.content);
  } catch (err) {
    await prisma.report.update({
      where: { id: reportId },
      data: { status: 'awaiting_check' },
    });
    await logEvent(report.userId, 'openai_error', `OpenAI API unavailable: ${err.message}`);
    return { error: 'openai_unavailable' };
  }

  const isValid = aiResult.trim().toUpperCase() === 'OK';
  const newStatus = isValid ? 'accepted' : 'needs_revision';

  await prisma.report.update({
    where: { id: reportId },
    data: { status: newStatus },
  });

  await prisma.checkResult.create({
    data: {
      reportId,
      isValid,
      issues: isValid ? null : aiResult,
    },
  });

  await logEvent(report.userId, 'report_checked', `Report ${reportId} checked: ${newStatus}`);

  return { isValid, issues: isValid ? null : aiResult };
}

async function logEvent(userId, eventType, description) {
  await prisma.eventLog.create({
    data: {
      userId: userId || null,
      eventType,
      description,
    },
  });
}

module.exports = { processReport, extractTextFromPdf, getActiveTemplate, logEvent };
