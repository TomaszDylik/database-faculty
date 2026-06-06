FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force

COPY prisma ./prisma
COPY knexfile.js ./
COPY db ./db
COPY src ./src

RUN npx prisma generate

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --only=production && npm cache clean --force

COPY --chown=node:node --from=builder /app/prisma ./prisma
COPY --chown=node:node --from=builder /app/knexfile.js ./knexfile.js
COPY --chown=node:node --from=builder /app/db ./db
COPY --chown=node:node --from=builder /app/src ./src
COPY --chown=node:node --from=builder /app/node_modules/.prisma ./node_modules/.prisma

RUN chown -R node:node /app

USER node

EXPOSE 8081

CMD ["npm", "run", "start"]
