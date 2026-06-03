require('dotenv').config();
const app = require('./app');
const bot = require('./bot');
const cron = require('node-cron');
const prisma = require('./utils/prisma');
const { processReport } = require('./services/reportService');

const PORT = process.env.PORT || 3001;

// Retry pending reports every 10 minutes
cron.schedule('*/10 * * * *', async () => {
  const pendingReports = await prisma.report.findMany({
    where: { status: 'awaiting_check' },
    take: 10,
  });

  for (const report of pendingReports) {
    try {
      const result = await processReport(report.id);
      if (result && !result.error) {
        const user = await prisma.user.findUnique({ where: { id: report.userId } });
        if (user) {
          const msg = result.isValid
            ? '✅ Ваш отчёт проверен и принят!'
            : `⚠️ Ваш отчёт проверен. Замечания:\n${result.issues}`;
          bot.telegram.sendMessage(user.telegramChatId, msg).catch(() => {});
        }
      }
    } catch (e) {
      console.error(`Retry check failed for report ${report.id}:`, e.message);
    }
  }
});

async function main() {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  bot.launch();
  console.log('Telegram bot started');

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

main().catch(console.error);
