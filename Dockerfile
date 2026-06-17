FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy all files
COPY . .

# Expose port
EXPOSE 3000

# Run migrations and start server
CMD ["sh", "-c", "node migrate.js && node scripts/add-base-price-ecer.js && node server.js"]
