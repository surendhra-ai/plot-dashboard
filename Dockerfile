# Build stage
FROM node:22-slim AS build

# Pass the API Key from Coolify to Vite
ARG VITE_GEMINI_API_KEY
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx vite build

# Production stage using Nginx
FROM nginx:stable-alpine
# Copy the Vite build output to Nginx's serve folder
COPY --from=build /app/dist /usr/share/nginx/html
# Copy your nginx.conf if you have one, or use default
# COPY nginx.conf /etc/nginx/conf.d/default.conf 

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
