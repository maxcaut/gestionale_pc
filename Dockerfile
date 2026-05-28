FROM php:8.3-fpm

# 1. Installazione delle dipendenze di sistema
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    libzip-dev \
    nginx

# 2. Installazione delle estensioni PHP necessarie a Laravel (scritto una volta sola)
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip

# Pulizia cache di apt per alleggerire l'immagine
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# 3. Installazione di Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Setta la directory di lavoro
WORKDIR /var/www

# Copia i file del progetto
COPY . /var/www

# 4. Esegui il composer install (crea la cartella vendor)
RUN COMPOSER_MEMORY_LIMIT=-1 composer install --no-interaction --optimize-autoloader --no-dev --ignore-platform-reqs

# 5. Gestione permessi (Eseguita DOPO il composer install così include anche la cartella vendor)
RUN chown -R www-data:www-data /var/www && chmod -R 775 /var/www/storage /var/www/bootstrap/cache

# 6. Configurazione Nginx
RUN rm /etc/nginx/sites-enabled/default || true
COPY nginx.conf /etc/nginx/sites-available/laravel.conf
RUN ln -s /etc/nginx/sites-available/laravel.conf /etc/nginx/sites-enabled/

# Esponi la porta 80 per Render
EXPOSE 80

# 7. Avvio e pulizia cache di Laravel a runtime
# Pulisce le cache, resetta i permessi a runtime, e poi avvia i server
CMD php artisan config:clear && \
    php artisan cache:clear && \
    php artisan view:clear && \
    chown -R www-data:www-data /var/www && \
    chmod -R 775 /var/www/storage /var/www/bootstrap/cache && \ 
    php-fpm -D && \
    nginx -g "daemon off;"