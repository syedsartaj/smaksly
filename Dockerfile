FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install Git (fixes spawn git ENOENT) and bash
RUN apk add --no-cache git bash

# Set Git identity globally (fixes "Author identity unknown")
RUN git config --global user.email "syedsartajahmed01@gmail.com" \
 && git config --global user.name "syedsartaj"

# Copy dependencies and install
COPY package.json package-lock.json ./
RUN npm install

# Copy application code
COPY . .

# Include environment file for build
COPY .env.local .env.local

# Build the Next.js app
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
