FROM node:20-alpine

WORKDIR /app

# Install build dependencies for native modules (bcrypt, better-sqlite3)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --build-from-source

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
