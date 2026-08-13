FROM php:8.4-fpm

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
    nginx \
    supervisor

# 1b. INSERITO: Installazione di Node.js e NPM (necessari per compilare Vite)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs

# 2. Installazione delle estensioni PHP necessarie a Laravel
RUN docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip

# Pulizia cache di apt
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# 3. Installazione di Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Setta la directory di lavoro
WORKDIR /var/www

# Copia i file del progetto
COPY . /var/www

# 4. Esegui il composer install
RUN COMPOSER_MEMORY_LIMIT=-1 composer install --no-interaction --optimize-autoloader --no-dev --ignore-platform-reqs

# ... (tutto uguale a prima fino al punto 4) ...

# Inserisci queste righe prima di npm run build per catturare le variabili da Render
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY

# 4b. INSERITO: Compilazione dei file CSS/JS con Vite
RUN npm install && npm run build

# ... (tutto il resto del Dockerfile rimane invariato) ...



# 4b. INSERITO: Compilazione dei file CSS/JS con Vite
RUN npm install && npm run build

# 5. Gestione permessi (Eseguita DOPO la build di Vite, così include anche la cartella public/build)
RUN chown -R www-data:www-data /var/www && chmod -R 775 /var/www/storage /var/www/bootstrap/cache

# 6. Configurazione Nginx
RUN rm /etc/nginx/sites-enabled/default || true
COPY nginx.conf /etc/nginx/sites-available/laravel.conf
RUN ln -s /etc/nginx/sites-available/laravel.conf /etc/nginx/sites-enabled/

# Supervisor mantiene attivi e riavvia automaticamente i processi del container.
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Esponi la porta 80 per Render
EXPOSE 80

# 7. Avvio e pulizia cache di Laravel a runtime
CMD su -s /bin/sh -c "php artisan config:clear && php artisan cache:clear && php artisan view:clear" www-data && \
    exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
