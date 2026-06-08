FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install && npm cache clean --force

COPY src ./src

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --chown=node:node package*.json ./
RUN npm install --only=production && npm cache clean --force

COPY --chown=node:node --from=builder /app/src ./src

RUN chown -R node:node /app

USER node

EXPOSE 8080

CMD ["npm", "run", "start"]