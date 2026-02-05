# Build stage
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Skip tsc and build directly with vite
RUN npx vite build

# Production stage
FROM caddy:alpine
COPY --from=build /app/dist /usr/share/caddy
EXPOSE 80
CMD ["caddy", "file-server", "--root", "/usr/share/caddy", "--listen", ":80"]
