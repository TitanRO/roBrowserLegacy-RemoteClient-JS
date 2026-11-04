# doctl registry login --expiry-seconds 3600 && docker build -t registry.digitalocean.com/titanro-nyc/grfhost . && docker image push registry.digitalocean.com/titanro-nyc/grfhost
# Normally built by Tekton Pipelines-as-Code (.tekton/push.yaml) on pushes to main; titanro-ci[bot] pins the digest in
# TitanRO/sysops argo/prod-season/grfhost, and Argo CD deploys it. The line above is the manual fallback.

FROM node:24.22.2-slim AS node

WORKDIR /usr/app

COPY package*.json ./
RUN npm install

COPY ./index.js ./
COPY src /usr/app/src/

# Client resources (GRF archives + TDATA.INI in resources/, loose files in data/ BGM/ System/ AI/) are git-ignored and
# are not baked in: sysops mounts them from the NFS share prod-season/grfhost. These are the mount points.
RUN mkdir -p AI BGM data resources System

ENV PORT 80
CMD ["node", "index.js"]
