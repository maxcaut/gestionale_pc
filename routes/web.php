<?php

use App\Http\Controllers\ServizioPdfController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::post('/servizi/pdf', [ServizioPdfController::class, 'export'])->name('servizi.pdf');
