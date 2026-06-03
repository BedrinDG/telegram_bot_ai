require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRouter = require('./api/auth');
const usersRouter = require('./api/users');
const reportsRouter = require('./api/reports');
const templatesRouter = require('./api/templates');
const eventlogRouter = require('./api/eventlog');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/eventlog', eventlogRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

module.exports = app;
