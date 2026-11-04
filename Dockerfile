# doctl registry login --expiry-seconds 3600 && docker build -t registry.digitalocean.com/titanro-docr/grfhost . && docker image push registry.digitalocean.com/titanro-docr/grfhost
# Normally built by Tekton Pipelines-as-Code (.tekton/push.yaml) on pushes to main; titanro-ci[bot] pins the digest in
# TitanRO/sysops argo/prod-season/grfhost, and Argo CD deploys it. The line above is the manual fallback.

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
