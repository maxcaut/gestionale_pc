<?php

use App\Http\Controllers\AdminProfileController;
use App\Http\Controllers\ServizioPdfController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::post('/servizi/pdf', [ServizioPdfController::class, 'export'])->name('servizi.pdf');

Route::middleware('supabase.master')->prefix('api/admin')->group(function () {
    Route::post('/profiles', [AdminProfileController::class, 'store']);
    Route::patch('/profiles/{id}', [AdminProfileController::class, 'update']);
    Route::delete('/profiles/{id}', [AdminProfileController::class, 'destroy']);
});
