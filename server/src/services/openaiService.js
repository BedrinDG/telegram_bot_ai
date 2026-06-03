const OpenAI = require('openai');
const fs = require('fs');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function checkReport(reportText, templateContent) {
  const systemPrompt = `Ты — строгий проверяющий корпоративных отчётов.
Тебе будет предоставлен эталонный шаблон отчёта и текст отчёта сотрудника.
Твоя задача: сравнить структуру и содержание отчёта с шаблоном.
Проверь наличие всех обязательных разделов, полноту описания выполненных работ.
Если отчёт соответствует шаблону — ответь ровно одним словом: OK
Если есть несоответствия — ответь пронумерованным списком конкретных замечаний (не более 10 пунктов).
Отвечай только на русском языке. Не добавляй лишних слов.`;

  const userMessage = `ЭТАЛОННЫЙ ШАБЛОН ОТЧЁТА:
${templateContent}

ТЕКСТ ОТЧЁТА СОТРУДНИКА:
${reportText}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.2,
    max_tokens: 500,
  });

  return response.choices[0].message.content.trim();
}

async function transcribeAudio(audioFilePath) {
  const audioStream = fs.createReadStream(audioFilePath);

  const transcription = await openai.audio.transcriptions.create({
    file: audioStream,
    model: 'whisper-1',
    language: 'ru',
  });

  return transcription.text;
}

module.exports = { checkReport, transcribeAudio };
