FROM php:8.3-fpm

# Installazione delle dipendenze di sistema necessarie per le estensioni
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

# Installazione delle estensioni PHP (inclusa 'zip' che serve a Composer)
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip

# Pulizia cache
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Installazione estensioni PHP richieste da Laravel
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd

# Installazione di Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Setta la directory di lavoro
WORKDIR /var/www

# Copia i file del progetto
COPY . /var/www


RUN COMPOSER_MEMORY_LIMIT=-1 composer install --no-interaction --optimize-autoloader --no-dev --ignore-platform-reqs

RUN php artisan config:clear
RUN php artisan cache:clear
RUN php artisan view:clear


# Assicurati che i file appartengano all'utente del server web
RUN chown -R www-data:www-data /var/www

# Dai i permessi di scrittura specifici a storage e cache
RUN chmod -R 775 /var/www/storage /var/www/bootstrap/cache

# Rimuovi la configurazione predefinita di Nginx e copia la nostra
RUN rm /etc/nginx/sites-enabled/default || true
COPY nginx.conf /etc/nginx/sites-available/laravel.conf
RUN ln -s /etc/nginx/sites-available/laravel.conf /etc/nginx/sites-enabled/

# Esponi la porta 80 per Render
EXPOSE 80

# Avvia sia PHP-FPM (in background) che Nginx (in foreground)
CMD php-fpm -D && nginx -g "daemon off;"