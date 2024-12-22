# syntax=docker/dockerfile:experimental
# DOCKER_BUILDKIT=1 docker build --ssh default -t registry.digitalocean.com/titanro-docr/robrowserlegacy . && docker image push registry.digitalocean.com/titanro-docr/robrowserlegacy

FROM node:20.10.0 AS node

WORKDIR /usr/app
COPY ./ ./

RUN npm install
RUN npm run build -- -O -T -H


# FROM php:8-apache

# RUN apt-get update -y && apt-get install -y libpng-dev
# RUN docker-php-ext-install pdo pdo_mysql mysqli gd
# RUN a2enmod rewrite

# COPY --from=node /usr/app/dist/Web /var/www/html
# COPY ./index.html /var/www/html/
# COPY src/Plugins /var/www/html/src/Plugins/

# RUN chown -R www-data:www-data /var/www/html
# RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"
