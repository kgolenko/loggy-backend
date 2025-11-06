# Этап сборки
FROM node:20-alpine AS builder

# Добавляем пользователя node в систему
USER node

# Создаем директорию приложения
WORKDIR /app

# Копируем файлы package*.json и конфигурационные файлы
COPY --chown=node:node package*.json ./
COPY --chown=node:node nest-cli.json tsconfig*.json ./

# Устанавливаем зависимости включая @swc/cli и @swc/core
RUN npm ci

# Копируем исходный код
COPY --chown=node:node . .

# Копируем Prisma схему и миграции для генерации клиента
COPY --chown=node:node prisma ./prisma

# Генерируем Prisma Client
RUN npx prisma generate

# Собираем приложение с использованием SWC
RUN npm run build

# Очищаем devDependencies, но оставляем @swc/core и prisma как production зависимости
RUN npm ci --only=production && npm install @swc/core prisma

# Продакшен этап
FROM node:20-alpine AS production

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем собранное приложение и node_modules из этапа сборки
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node package*.json ./

# Копируем Prisma схему и миграции (нужны для выполнения миграций в контейнере)
COPY --chown=node:node --from=builder /app/prisma ./prisma

# Устанавливаем переменные окружения
ENV NODE_ENV=production
ENV PORT=3000

# Открываем порт
EXPOSE 3000

# Запускаем приложение
CMD ["node", "dist/src/main"]