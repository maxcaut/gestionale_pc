FROM php:8.2-fpm

# Installazione dipendenze di sistema e conversioni
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    nginx

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

# Installazione dipendenze Laravel
RUN composer install --no-interaction --optimize-autoloader --no-dev

# Configurazione permessi per Laravel
RUN chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache

# Copia la configurazione di Nginx (crea questo file o usa i comandi di avvio)
EXPOSE 80

CMD service nginx start && php-fpm