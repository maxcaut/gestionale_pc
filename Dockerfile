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

# Configurazione permessi per Laravel
RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache

# Copia la configurazione di Nginx (crea questo file o usa i comandi di avvio)
EXPOSE 80

CMD service nginx start && php-fpm