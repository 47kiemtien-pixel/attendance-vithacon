FROM node:22-bookworm-slim

WORKDIR /app

COPY package*.json ./
COPY server/package*.json ./server/

RUN npm ci --omit=dev

COPY . .

EXPOSE 5000

CMD ["npm", "run", "server:start:prod"]
