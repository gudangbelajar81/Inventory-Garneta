FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy all files
COPY . .

# Copy and make start script executable
COPY start.sh ./
RUN chmod +x start.sh

# Expose port
EXPOSE 3000

# Run migrations, cron, and start server
CMD ["./start.sh"]
