require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const prisma = require('./prisma');

const DEFAULT_TEMPLATE = `# Шаблон еженедельного отчёта

## 1. Выполненные работы за период
(Опишите, что было сделано за неделю. Укажите конкретные задачи и результаты.)

## 2. Затраченное время
(Укажите количество часов по каждой задаче или итоговое за неделю.)

## 3. Проблемы и препятствия
(Опишите проблемы, с которыми столкнулись, и как они были решены или требуют решения.)

## 4. Планы на следующий период
(Опишите задачи, запланированные на следующую неделю.)

## 5. Дополнительные комментарии
(Любые дополнительные сведения, предложения или вопросы.)`;

async function main() {
  console.log('Seeding database...');

  const admin = await prisma.user.upsert({
    where: { telegramChatId: '000000000' },
    update: {},
    create: {
      telegramChatId: '000000000',
      fullName: 'Администратор системы',
      role: 'admin',
      isActive: true,
    },
  });

  console.log('Admin user created:', admin.id);

  const existing = await prisma.reportTemplate.findFirst({ where: { isActive: true } });
  if (!existing) {
    await prisma.reportTemplate.create({
      data: { content: DEFAULT_TEMPLATE, createdBy: admin.id, isActive: true },
    });
    console.log('Default template created');
  }

  console.log('Done!');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
