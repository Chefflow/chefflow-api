# Use node 22.20 and the alpine 3.21 base image (Mini OS)
FROM node:22.20-alpine3.21

# Install pnpm globally (thi command is comming from the doc site)
RUN npm install -g pnpm@latest-10

# Create app directory and 
WORKDIR app/

# Copy package.json and package-lock.json files and install
COPY package*.json .
COPY pnpm-lock.yaml .
RUN pnpm install
COPY . .
RUN pnpm run prisma:generate
CMD ["pnpm", "run", "start:dev"]