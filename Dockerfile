# Use the official Node.js 18 Alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the application source
COPY . .

# Build the production app
RUN npm run build

# Expose the app's port (Traefik expects this)
EXPOSE 3000

# Run the built Node server
CMD ["node", "build"]
