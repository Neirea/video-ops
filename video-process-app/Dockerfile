# STAGE 1
FROM node:20 as initial
WORKDIR /app
# Copy package.json and package-lock.json to the working directory
COPY package*.json ./
# Install the dependencies
RUN npm ci
# Copy the rest of the application's source code to the working directory
COPY . .
# Build app and remove "extraneous" packages
RUN npm run build
RUN npm prune --omit=dev

# STAGE 2
FROM node:20-alpine
ENV NODE_ENV production
WORKDIR /app

# Copy from 'initial' image to stage 2
COPY --from=initial /app/node_modules /app/node_modules
COPY --from=initial /app/build /app
# Expose port 8080 for the Node.js application
EXPOSE 8080

# Set environment variables for Redis
ENV REDIS_HOST redis
ENV REDIS_PORT 6379

# Install Redis server
RUN apk update && apk add --no-cache redis

# Expose port 6379 for the Redis server
EXPOSE 6379
CMD redis-server --daemonize yes && node index.js