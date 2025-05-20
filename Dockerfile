# Используем базовый образ Node.js
FROM node:18

# Рабочая директория для приложения
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем весь бэкенд в контейнер
COPY . .

# Создаем папку для клиентских файлов
RUN mkdir -p client/build

# Открываем порт, на котором будет работать приложение
EXPOSE 3000

# Запускаем сервер
CMD ["node", "server.js"]
