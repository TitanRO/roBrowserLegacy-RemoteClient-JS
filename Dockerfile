# doctl registry login --expiry-seconds 3600 && docker build -t registry.digitalocean.com/titanro-nyc/grfhost . && docker image push registry.digitalocean.com/titanro-nyc/grfhost
# Normally built by Tekton Pipelines-as-Code (.tekton/push.yaml) on pushes to main; titanro-ci[bot] pins the digest in
# TitanRO/sysops argo/prod-season/grfhost, and Argo CD deploys it. The line above is the manual fallback.

FROM node:24.22.2-slim AS node

WORKDIR /usr/app

COPY package*.json ./
# npm/npx/corepack aren't used at runtime; dropping them removes the image's largest bundled JS dependency tree.
# Install exactly the versions in package-lock.json (fails if it doesn't match package.json).
RUN npm ci --omit=dev --no-audit --no-fund \
 && npm cache clean --force \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

COPY ./index.js ./
COPY src /usr/app/src/

# Client resources (GRF archives + TDATA.INI in resources/, loose files in data/ BGM/ System/ AI/) are git-ignored and
# are not baked in: sysops mounts them from the NFS share prod-season/grfhost. These are the mount points. grfhost
# writes the files it extracts from the GRFs into data/, so that one belongs to the runtime user.
RUN mkdir -p AI BGM data resources System && chown node:node data

# Runs as the image's unprivileged node user (uid 1000), so it listens on 8080 rather than 80.
# production: Express omits stack traces from error responses.
ENV NODE_ENV=production PORT=8080
USER node
EXPOSE 8080
CMD ["node", "index.js"]
