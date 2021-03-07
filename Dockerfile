FROM node:12
WORKDIR /usr/src/app
COPY ./dist/src/ ./
RUN npm install --only=prod
EXPOSE 3000
CMD [ "node","index.js" ]