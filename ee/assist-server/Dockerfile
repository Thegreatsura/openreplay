ARG ARCH=linux/amd64

FROM --platform=$ARCH node:23-alpine
LABEL Maintainer="Zavorotynskiy Alexander <zavorotynskiy@pm.me>"
RUN apk add --no-cache tini git libc6-compat
ARG envarg
ENV ENTERPRISE_BUILD=${envarg} \
  MAXMINDDB_FILE=/home/openreplay/geoip.mmdb \
  PRIVATE_ENDPOINTS=false \
  LISTEN_PORT=9001 \
  ERROR=1 \
  NODE_ENV=production
WORKDIR /work
COPY package.json .
COPY package-lock.json .
RUN npm install
COPY . .

RUN adduser -u 1001 openreplay -D
USER 1001
ADD --chown=1001 https://static.openreplay.com/geoip/GeoLite2-City.mmdb  $MAXMINDDB_FILE

ENTRYPOINT ["/sbin/tini", "--"]
CMD npm start
