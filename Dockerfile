FROM node:20-alpine
WORKDIR /app

# Fix Prisma OpenSSL issue
RUN apk add --no-cache openssl

# Install deps
COPY package.json package-lock.json* ./
RUN npm ci || npm i --force

# Copy source
COPY . .

# Expose API port
EXPOSE 8080

# Build + run Prisma at runtime
CMD ["sh", "-c", "npx prisma generate && npm run build && npx prisma migrate deploy && node dist/index.js"]
