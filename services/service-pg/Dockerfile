FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install && npm cache clean --force

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY prisma ./prisma
COPY knexfile.js ./
COPY db ./db
COPY src ./src
RUN npx prisma generate
EXPOSE 8081
CMD ["npm", "run", "start"]
