const { Telegraf, Markup } = require('telegraf');
const prisma = require('../utils/prisma');
const { processReport, extractTextFromPdf, logEvent } = require('../services/reportService');
const { transcribeAudio } = require('../services/openaiService');
const path = require('path');
const fs = require('fs');
const https = require('https');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Постоянная клавиатура (всегда отображается внизу чата)
const mainKeyboard = Markup.keyboard([
  ['📊 Мой статус', '❓ Помощь'],
]).resize();

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function getOrCreateUser(chatId, username, firstName, lastName) {
  let user = await prisma.user.findUnique({ where: { telegramChatId: String(chatId) } });

  if (!user) {
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || username || String(chatId);
    user = await prisma.user.create({
      data: {
        telegramChatId: String(chatId),
        fullName,
        isActive: false,
      },
    });

    const adminChatId = process.env.ADMIN_TELEGRAM_CHAT_ID;
    if (adminChatId) {
      bot.telegram.sendMessage(
        adminChatId,
        `🆕 Новый пользователь запросил доступ:\nИмя: ${fullName}\nChat ID: ${chatId}\n\nАктивируйте через веб-панель.`
      ).catch(() => {});
    }

    await logEvent(user.id, 'user_registered', `New user registered: ${fullName}`);
  }

  return user;
}

// Общая функция показа статуса (используется и в /status, и в кнопке)
async function sendStatus(ctx) {
  const user = await prisma.user.findUnique({
    where: { telegramChatId: String(ctx.from.id) },
  });

  if (!user || !user.isActive) {
    return ctx.reply('❌ Ваш аккаунт не активирован. Обратитесь к администратору.');
  }

  const lastReport = await prisma.report.findFirst({
    where: { userId: user.id },
    orderBy: { submittedAt: 'desc' },
    include: { checkResult: true },
  });

  if (!lastReport) {
    return ctx.reply('📭 У вас ещё нет отправленных отчётов.', mainKeyboard);
  }

  const statusText = {
    pending: '⏳ Ожидает обработки',
    processing: '🔄 Проверяется...',
    accepted: '✅ Принят',
    needs_revision: '⚠️ Требует доработки',
    awaiting_check: '🕐 В очереди на проверку',
  };

  let message = `📊 *Последний отчёт* (${lastReport.submittedAt.toLocaleDateString('ru-RU')}):\n`;
  message += `Статус: ${statusText[lastReport.status] || lastReport.status}\n`;

  if (lastReport.checkResult && !lastReport.checkResult.isValid && lastReport.checkResult.issues) {
    message += `\n📝 *Замечания:*\n${lastReport.checkResult.issues}`;
  }

  await ctx.reply(message, { parse_mode: 'Markdown', ...mainKeyboard });
}

bot.command('start', async (ctx) => {
  const { id, username, first_name, last_name } = ctx.from;
  const user = await getOrCreateUser(id, username, first_name, last_name);

  if (!user.isActive) {
    return ctx.reply(
      '👋 Добро пожаловать!\n\nВаш аккаунт ещё не активирован. Обратитесь к администратору системы для получения доступа.'
    );
  }

  await ctx.reply(
    `👋 Добро пожаловать, *${user.fullName || 'сотрудник'}*!\n\n` +
    `Я помогу вам сдать отчёт на проверку.\n\n` +
    `📎 Отправьте *PDF-файл* отчёта или *голосовое сообщение*.\n\n` +
    `Кнопки ниже позволяют быстро узнать статус или получить справку.`,
    { parse_mode: 'Markdown', ...mainKeyboard }
  );
});

bot.command('status', async (ctx) => {
  await sendStatus(ctx);
});

bot.command('help', async (ctx) => {
  await ctx.reply(
    '📖 *Справка по работе с ботом*\n\n' +
    '📎 Отправьте PDF-файл отчёта — бот проверит его автоматически.\n' +
    '🎤 Отправьте голосовое сообщение — бот распознает речь и проверит отчёт.\n\n' +
    'После проверки вы получите:\n' +
    '✅ Подтверждение принятия — если отчёт соответствует шаблону\n' +
    '⚠️ Список замечаний — если нужно доработать\n\n' +
    'Команды:\n' +
    '/start — начало работы\n' +
    '/status — статус последнего отчёта\n' +
    '/help — эта справка',
    { parse_mode: 'Markdown', ...mainKeyboard }
  );
});

// Обработка кнопок постоянной клавиатуры
bot.hears('📊 Мой статус', async (ctx) => {
  await sendStatus(ctx);
});

bot.hears('❓ Помощь', async (ctx) => {
  await ctx.reply(
    '📖 *Справка по работе с ботом*\n\n' +
    '📎 Отправьте PDF-файл отчёта — бот проверит его автоматически.\n' +
    '🎤 Отправьте голосовое сообщение — бот распознает речь и проверит отчёт.\n\n' +
    'После проверки вы получите:\n' +
    '✅ Подтверждение принятия — если отчёт соответствует шаблону\n' +
    '⚠️ Список замечаний — если нужно доработать',
    { parse_mode: 'Markdown', ...mainKeyboard }
  );
});

// Обработка inline-кнопки "Показать замечания"
bot.action('show_issues', async (ctx) => {
  await ctx.answerCbQuery();

  const user = await prisma.user.findUnique({
    where: { telegramChatId: String(ctx.from.id) },
  });
  if (!user) return;

  const lastReport = await prisma.report.findFirst({
    where: { userId: user.id },
    orderBy: { submittedAt: 'desc' },
    include: { checkResult: true },
  });

  if (!lastReport?.checkResult?.issues) {
    return ctx.reply('Замечания не найдены.');
  }

  await ctx.reply(
    `📝 *Замечания по последнему отчёту:*\n\n${lastReport.checkResult.issues}`,
    { parse_mode: 'Markdown', ...mainKeyboard }
  );
});

bot.on('document', async (ctx) => {
  const user = await prisma.user.findUnique({
    where: { telegramChatId: String(ctx.from.id) },
  });

  if (!user || !user.isActive) {
    return ctx.reply('❌ Ваш аккаунт не активирован. Обратитесь к администратору.');
  }

  const document = ctx.message.document;

  if (!document.file_name?.toLowerCase().endsWith('.pdf') && document.mime_type !== 'application/pdf') {
    return ctx.reply(
      '❌ Принимаются только файлы в формате PDF.\n' +
      'Пожалуйста, конвертируйте ваш документ в PDF и отправьте повторно.'
    );
  }

  const processingMsg = await ctx.reply('⏳ Получил файл. Извлекаю текст и отправляю на проверку...');

  try {
    const fileLink = await ctx.telegram.getFileLink(document.file_id);
    const fileName = `${user.id}_${Date.now()}.pdf`;
    const filePath = path.join(UPLOADS_DIR, fileName);

    await downloadFile(fileLink.href, filePath);

    let rawText;
    try {
      rawText = await extractTextFromPdf(filePath);
    } catch (e) {
      fs.unlink(filePath, () => {});
      return ctx.reply(
        '❌ Не удалось извлечь текст из PDF.\n' +
        'Возможно, это сканированный документ. Пожалуйста, отправьте текстовый PDF или голосовое сообщение.'
      );
    }

    if (!rawText || rawText.length < 20) {
      fs.unlink(filePath, () => {});
      return ctx.reply(
        '❌ PDF не содержит текста.\n' +
        'Пожалуйста, убедитесь, что файл является текстовым PDF, или отправьте отчёт голосовым сообщением.'
      );
    }

    const report = await prisma.report.create({
      data: {
        userId: user.id,
        filePath: `uploads/${fileName}`,
        rawText,
        status: 'pending',
      },
    });

    await logEvent(user.id, 'report_submitted', `PDF report submitted, id: ${report.id}`);

    const result = await processReport(report.id);

    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id).catch(() => {});

    if (!result) {
      return ctx.reply('❌ Произошла ошибка при обработке отчёта. Попробуйте позже.', mainKeyboard);
    }
    if (result.error === 'no_template') {
      return ctx.reply('⚠️ Шаблон отчёта не настроен. Обратитесь к администратору.', mainKeyboard);
    }
    if (result.error === 'openai_unavailable') {
      return ctx.reply('🕐 Сервис проверки временно недоступен. Ваш отчёт сохранён и будет проверен позже.', mainKeyboard);
    }

    if (result.isValid) {
      await ctx.reply(
        '✅ *Отчёт принят!*\n\nСтруктура и содержание соответствуют шаблону. Спасибо!',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('📊 Посмотреть статус', 'show_status')],
          ]),
        }
      );
    } else {
      await ctx.reply(
        `⚠️ *Отчёт требует доработки.*\n\nПожалуйста, исправьте замечания и отправьте повторно.`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('📋 Показать замечания', 'show_issues')],
          ]),
        }
      );
    }
  } catch (err) {
    console.error('Document handler error:', err);
    ctx.reply('❌ Произошла ошибка при обработке файла. Попробуйте позже.', mainKeyboard);
  }
});

bot.on('voice', async (ctx) => {
  const user = await prisma.user.findUnique({
    where: { telegramChatId: String(ctx.from.id) },
  });

  if (!user || !user.isActive) {
    return ctx.reply('❌ Ваш аккаунт не активирован. Обратитесь к администратору.');
  }

  const processingMsg = await ctx.reply('⏳ Получил голосовое сообщение. Распознаю речь...');

  try {
    const fileLink = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
    const fileName = `voice_${user.id}_${Date.now()}.oga`;
    const filePath = path.join(UPLOADS_DIR, fileName);

    await downloadFile(fileLink.href, filePath);

    let rawText;
    try {
      rawText = await transcribeAudio(filePath);
      fs.unlink(filePath, () => {});
    } catch (e) {
      fs.unlink(filePath, () => {});
      await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id).catch(() => {});
      return ctx.reply(
        '❌ Не удалось распознать голосовое сообщение.\n' +
        'Пожалуйста, продиктуйте чётче или отправьте PDF-файл.',
        mainKeyboard
      );
    }

    if (!rawText || rawText.length < 10) {
      await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id).catch(() => {});
      return ctx.reply('❌ Не удалось распознать речь. Попробуйте говорить чётче.', mainKeyboard);
    }

    await ctx.telegram.editMessageText(
      ctx.chat.id, processingMsg.message_id, undefined,
      '🔄 Речь распознана. Проверяю отчёт...'
    ).catch(() => {});

    const report = await prisma.report.create({
      data: {
        userId: user.id,
        rawText,
        status: 'pending',
      },
    });

    await logEvent(user.id, 'report_submitted', `Voice report submitted, id: ${report.id}`);

    const result = await processReport(report.id);

    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id).catch(() => {});

    if (!result || result.error === 'openai_unavailable') {
      return ctx.reply('🕐 Сервис проверки временно недоступен. Ваш отчёт сохранён и будет проверен позже.', mainKeyboard);
    }
    if (result.error === 'no_template') {
      return ctx.reply('⚠️ Шаблон отчёта не настроен. Обратитесь к администратору.', mainKeyboard);
    }

    if (result.isValid) {
      await ctx.reply(
        '✅ *Отчёт принят!*\n\nСтруктура и содержание соответствуют шаблону. Спасибо!',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('📊 Посмотреть статус', 'show_status')],
          ]),
        }
      );
    } else {
      await ctx.reply(
        `⚠️ *Отчёт требует доработки.*\n\nПожалуйста, исправьте замечания и отправьте повторно.`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('📋 Показать замечания', 'show_issues')],
          ]),
        }
      );
    }
  } catch (err) {
    console.error('Voice handler error:', err);
    ctx.reply('❌ Произошла ошибка при обработке голосового сообщения. Попробуйте позже.', mainKeyboard);
  }
});

// Inline-кнопка "Посмотреть статус"
bot.action('show_status', async (ctx) => {
  await ctx.answerCbQuery();
  await sendStatus(ctx);
});

bot.on('message', (ctx) => {
  if (ctx.message.text && !ctx.message.text.startsWith('/')) {
    ctx.reply(
      'Для отправки отчёта прикрепите PDF-файл или запишите голосовое сообщение.\n' +
      'Используйте кнопки ниже или /help для справки.',
      mainKeyboard
    );
  }
});

module.exports = bot;
