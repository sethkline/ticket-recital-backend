# Use a specific version of node that is compatible with your project
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and yarn.lock files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install

# Copy the rest of your project files
COPY . .

# Build your Strapi project (if necessary, you might skip this for development mode)
RUN yarn build

# Expose the port Strapi runs on
EXPOSE 1337

# Command to run your app
# CMD ["yarn", "start"]
CMD ["yarn", "develop"]
