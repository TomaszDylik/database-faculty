FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install && npm cache clean --force

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY db ./db
COPY src ./src
EXPOSE 8082
CMD ["npm", "run", "start"]
