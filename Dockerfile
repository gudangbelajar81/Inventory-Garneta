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

# Start command
CMD ["npm", "start"]
