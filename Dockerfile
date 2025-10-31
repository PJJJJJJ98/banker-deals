FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm i --force
COPY . .
EXPOSE 8080
CMD ["sh","-c","npx prisma generate && npm run build && npx prisma migrate deploy && node dist/index.js"]
