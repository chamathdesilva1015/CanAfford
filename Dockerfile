# Stage 1: Build the React Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
# Will require VITE_GEMINI_API_KEY as an arg in reality
RUN npm run build

# Stage 2: Build the Node.js Express Backend
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production

COPY backend/ ./
# Copy the built Vite static assets into the backend's public dir to be served by Express
COPY --from=frontend-builder /app/frontend/dist ./public

EXPOSE 3000
CMD ["npm", "run", "dev"]
