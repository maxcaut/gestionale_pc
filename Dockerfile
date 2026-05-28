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


# Forza la creazione di tutte le sottocartelle di storage che Git potrebbe aver ignorato
RUN mkdir -p /var/www/storage/framework/cache/data \
             /var/www/storage/framework/app \
             /var/www/storage/framework/sessions \
             /var/www/storage/framework/views \
             /var/www/storage/logs

# 5. Gestione permessi (Eseguita DOPO il composer install così include anche la cartella vendor)
RUN chown -R www-data:www-data /var/www && chmod -R 775 /var/www/storage /var/www/bootstrap/cache

# 6. Configurazione Nginx
RUN rm /etc/nginx/sites-enabled/default || true
COPY nginx.conf /etc/nginx/sites-available/laravel.conf
RUN ln -s /etc/nginx/sites-available/laravel.conf /etc/nginx/sites-enabled/

# Esponi la porta 80 per Render
EXPOSE 80

# AVVIO: Eseguiamo i comandi come www-data per evitare conflitti di permessi,
# poi avviamo PHP-FPM e Nginx
CMD su -s /bin/sh -c "php artisan config:clear && php artisan cache:clear && php artisan view:clear" www-data && \
    php-fpm -D && \
    nginx -g "daemon off;"