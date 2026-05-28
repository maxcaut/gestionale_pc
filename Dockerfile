FROM php:8.3-cli

# System deps
RUN apt-get update && apt-get install -y \
    git \
    curl \
    unzip \
    zip \
    libpq-dev \
    libzip-dev \
    nginx \
    supervisor

# PHP extensions
RUN docker-php-ext-install \
    pdo \
    pdo_mysql \
    pdo_pgsql \
    zip

# Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www

# Copia progetto
COPY . .

# Installa dipendenze
RUN composer install --no-dev --optimize-autoloader

# Laravel permissions
RUN chmod -R 775 storage bootstrap/cache

# Nginx config
COPY docker/nginx/default.conf /etc/nginx/sites-enabled/default

# Supervisor config
COPY docker/supervisor/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 10000

CMD ["/usr/bin/supervisord"]