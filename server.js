require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const cors = require('cors');
const path = require('path');


const app = express();
app.use(cors());
app.use(express.json()); // для чтения JSON в теле запроса

// Подключаем маршруты авторизации
app.use('/api/auth', authRoutes);

// Подключаемся к MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB подключена'))
  .catch((err) => console.error('❌ Ошибка подключения к MongoDB:', err));

// Указываем путь к собранному фронтенду
app.use(express.static(path.join(__dirname, 'front-container/build')));

// Для всех остальных маршрутов отдаем индексный файл React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'front-container/build', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Сервер запущен на порту ${PORT}`));
