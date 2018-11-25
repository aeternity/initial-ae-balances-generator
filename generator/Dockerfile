FROM node:10
MAINTAINER Philipp Klein (philipp@apeunit.com)

WORKDIR /usr/src/code

COPY package*.json ./

RUN npm install

COPY . .

ENTRYPOINT ["node", "initial-balances-generator.js"]
