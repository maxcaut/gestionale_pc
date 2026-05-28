<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\URL;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
    // Forza l'HTTPS se l'applicazione si trova su Render/Produzione
    if (config('app.env') === 'production') {
        URL::forceScheme('https');
    }
}
}    