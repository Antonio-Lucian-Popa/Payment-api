# Imagine oficială Node.js, varianta Alpine pentru footprint mic
FROM node:20-alpine

# Directorul de lucru din container
WORKDIR /app

# Copiem doar fișierele de dependențe pentru layer caching eficient
COPY package*.json ./
RUN npm ci --omit=dev

# Copiem codul sursă al aplicației
COPY src ./src
COPY .env.example ./.env.example

# Variabile implicite pentru rulare în producție
ENV NODE_ENV=production
ENV PORT=3000

# Portul expus de aplicație în container
EXPOSE 3000

# Comanda de pornire a API-ului
CMD ["npm", "start"]
