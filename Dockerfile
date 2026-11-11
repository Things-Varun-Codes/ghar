# syntax=docker/dockerfile:1.7
# Ghar production image. Two stages: the builder has PHP, Node and -dev headers;
# the runtime is PHP-FPM, nginx and supervisor with the built tree copied in.
#
# PHP must sit alongside Node in the builder: the Wayfinder Vite plugin shells
# out to `php artisan` during `npm run build`.

# Pinned so a rebuild is reproducible. Keep both PHP stages on the same tag: the
# runtime stage copies compiled extensions from the builder.
FROM composer:2.11.2 AS composer
FROM node:26.13.0-alpine3.24 AS node

# ─── Stage 1: builder ─────────────────────────────────────────────────
FROM php:8.5.12-fpm-alpine3.24 AS builder

# Extensions compile once, here: the runtime stage copies the .so files, because
# compiling ICU/intl in both stages in parallel OOM-kills a 4 GB host. gd's
# configure flags decide which shared libs the runtime stage must carry. OPcache
# is built into PHP 8.5; adding it to the list below fails the build.
RUN apk add --no-cache \
        bash \
        git \
        libstdc++ \
        $PHPIZE_DEPS \
        icu-dev \
        libpng-dev \
        libjpeg-turbo-dev \
        freetype-dev \
        libwebp-dev \
        libzip-dev \
        oniguruma-dev \
        openssl-dev \
        libxml2-dev \
        postgresql-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_pgsql \
        mbstring \
        bcmath \
        intl \
        zip \
        gd \
        exif

# Build tools come from the pinned stages above; apk versions move underneath a
# fixed Alpine release. The node binary links libstdc++ (above).
COPY --from=composer /usr/bin/composer /usr/bin/composer
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

WORKDIR /var/www/html

# Lockfile and manifest first, so this layer caches when only app source changes.
COPY composer.json composer.lock ./
RUN --mount=type=cache,target=/root/.composer/cache \
    composer install \
        --no-dev \
        --no-scripts \
        --no-autoloader \
        --prefer-dist \
        --no-interaction

# .npmrc comes first: its ignore-scripts=true must apply here too.
COPY .npmrc package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

COPY . .

# Git keep-markers should create these, but a missing one breaks package:discover
# with a cryptic error.
RUN mkdir -p \
        bootstrap/cache \
        storage/logs \
        storage/framework/cache \
        storage/framework/sessions \
        storage/framework/views \
        storage/framework/testing \
        storage/app/htmlpurifier \
        storage/app/private

# Build-only. vite.config.ts reads SENTRY_* for
# sourcemap upload. The runtime stage copies only /var/www/html, so
# SENTRY_AUTH_TOKEN never reaches the production image.
ARG GHAR_VERSION=
ARG SENTRY_URL=
ARG SENTRY_AUTH_TOKEN=
ARG SENTRY_ORG=
ARG SENTRY_PROJECT=
ENV GHAR_VERSION=$GHAR_VERSION \
    SENTRY_URL=$SENTRY_URL \
    SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN \
    SENTRY_ORG=$SENTRY_ORG \
    SENTRY_PROJECT=$SENTRY_PROJECT

# Before `npm run build`: the Wayfinder plugin needs a working autoloader.
RUN composer dump-autoload --optimize --classmap-authoritative \
    && php artisan package:discover --ansi \
    && npm run build \
    && rm -rf node_modules /root/.npm /root/.composer /tmp/*

# ─── Stage 2: runtime ────────────────────────────────────────────────
FROM php:8.5.12-fpm-alpine3.24 AS runtime

# Only the shared libs the copied extensions link against (verified with ldd):
# icu-libs (intl), libpng/libjpeg-turbo/freetype/libwebp (gd), libzip (zip),
# oniguruma (mbstring), libpq (pdo_pgsql).
RUN apk add --no-cache \
        bash \
        nginx \
        supervisor \
        icu-libs \
        libpng \
        libjpeg-turbo \
        freetype \
        libwebp \
        libzip \
        oniguruma \
        libpq \
    && rm -rf /var/cache/apk/*

# Both stages share a base image, so extension_dir is identical.
COPY --from=builder /usr/local/lib/php/extensions/ /usr/local/lib/php/extensions/
COPY --from=builder /usr/local/etc/php/conf.d/ /usr/local/etc/php/conf.d/

# Before the app tree, so these layers cache when only app code changes.
COPY docker/php/php.ini /usr/local/etc/php/conf.d/zz-app.ini
COPY docker/nginx/default.conf /etc/nginx/http.d/default.conf
COPY docker/supervisord.conf /etc/supervisord.conf
COPY docker/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
# The container runs as www-data, and Alpine's nginx package owns its dirs as
# nginx:nginx.
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
    && mkdir -p /run/nginx /var/log/supervisord /var/lib/nginx /var/log/nginx \
    && chown -R www-data:www-data /run/nginx /var/log/supervisord /var/lib/nginx /var/log/nginx

WORKDIR /var/www/html

# Set by the release workflow from the git tag; empty for a source build.
ARG GHAR_VERSION=
ENV GHAR_VERSION=$GHAR_VERSION
LABEL org.opencontainers.image.title="Ghar" \
      org.opencontainers.image.description="A private, self-hosted home on the web for a family" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.version=$GHAR_VERSION

COPY --from=builder --chown=www-data:www-data /var/www/html ./

RUN find storage bootstrap/cache -type d -exec chmod 775 {} \; \
    && find storage bootstrap/cache -type f -exec chmod 664 {} \; \
    && chown -R www-data:www-data storage bootstrap/cache

# Port 80 still binds: Docker sets ip_unprivileged_port_start=0. php-fpm logs a
# harmless warning that its pool user/group are ignored when not started as root.
USER www-data

EXPOSE 80

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
