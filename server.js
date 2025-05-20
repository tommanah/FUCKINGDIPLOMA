require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');

const app = express();
app.use(express.json()); // для чтения JSON в теле запроса

// Подключаемся к MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB подключена'))
  .catch((err) => console.error('❌ Ошибка подключения к MongoDB:', err));

// Подключаем маршруты авторизации
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Сервер запущен на порту ${PORT}`));