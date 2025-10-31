FROM node:20-alpine
WORKDIR /app

# Install deps
COPY package.json package-lock.json* ./
RUN npm ci || npm i --force

# Copy source
COPY . .

# Expose API port
EXPOSE 8080

# IMPORTANT: run prisma + build at runtime (env vars available)
CMD ["sh","-c","npx prisma generate && npm run build && npx prisma migrate deploy && node dist/index.js"]
