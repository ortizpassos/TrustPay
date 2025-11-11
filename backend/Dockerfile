FROM node:18-alpine

WORKDIR /app

# Install build deps
COPY package*.json ./
COPY tsconfig*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "dist/app.js"]
