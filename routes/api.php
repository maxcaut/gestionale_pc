<?php

use App\Http\Controllers\ExternalReadController;
use App\Http\Controllers\ExternalReadLoginController;
use Illuminate\Support\Facades\Route;

Route::prefix('external')->group(function (): void {
    Route::post('/login', ExternalReadLoginController::class)
        ->middleware('throttle:10,1');

    Route::middleware('external.read')->group(function (): void {
        Route::get('/data/{resource}', ExternalReadController::class)
            ->where('resource', '[a-z0-9_]+');
    });
});
