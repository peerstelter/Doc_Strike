FROM node:20-alpine
WORKDIR /app

# Only install the single runtime dep — avoids pulling in native addons
RUN npm install ws@8

COPY server.js ./

EXPOSE 3001
CMD ["node", "server.js"]
