# ---- dev ----
FROM node:20-alpine AS dev

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ---- build ----
FROM node:20-alpine AS build

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ---- production ----
FROM nginx:alpine AS production

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 8080
