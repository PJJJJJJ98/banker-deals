FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm i --force
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 8080
CMD ["sh","-c","npx prisma migrate deploy && node dist/index.js"]
