# syntax=docker/dockerfile:experimental
# DOCKER_BUILDKIT=1 docker build --ssh default -t registry.digitalocean.com/titanro-docr/grfhost . && docker image push registry.digitalocean.com/titanro-docr/grfhost

FROM node:20.10.0 AS node

WORKDIR /usr/app

COPY package*.json ./
RUN npm install

COPY ./index.js ./
COPY src /usr/app/src/

COPY AI /usr/app/AI/
COPY BGM /usr/app/BGM/
COPY data /usr/app/data/
COPY resources /usr/app/resources/
COPY System /usr/app/System/

ENV PORT 80
CMD ["node", "index.js"]
