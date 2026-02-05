# Build stage
FROM node:22-slim AS build

# 1. Define the API Key as an Argument
ARG VITE_GEMINI_API_KEY
# 2. Set it as an Environment Variable for the build process
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Build the project (Vite will now see the VITE_GEMINI_API_KEY)
RUN npx vite build

# Production stage
FROM caddy:alpine
COPY --from=build /app/dist /usr/share/caddy

# Standardizing to port 80 for easier Coolify mapping
EXPOSE 80
CMD ["caddy", "file-server", "--root", "/usr/share/caddy", "--listen", ":80"]
