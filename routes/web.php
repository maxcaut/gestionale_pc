<?php

use App\Http\Controllers\AdminAssociazioneController;
use App\Http\Controllers\AdminProfileController;
use App\Http\Controllers\ArgoXRadioController;
use App\Http\Controllers\CanadairLiveController;
use App\Http\Controllers\MagazzinoPrelievoPdfController;
use App\Http\Controllers\ServizioPdfController;
use App\Http\Controllers\SquadraAibPdfController;
use App\Http\Controllers\VolontarioPdfController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::post('/servizi/pdf', [ServizioPdfController::class, 'export'])->name('servizi.pdf');
Route::post('/squadre-aib/pdf', [SquadraAibPdfController::class, 'export'])->name('squadre-aib.pdf');
Route::post('/volontari/pdf', [VolontarioPdfController::class, 'export'])->name('volontari.pdf');
Route::post('/magazzino/prelievi/pdf', [MagazzinoPrelievoPdfController::class, 'export'])->name('magazzino.prelievi.pdf');
Route::get('/api/canadair/live', CanadairLiveController::class)->name('canadair.live');
Route::get('/api/radios/live', ArgoXRadioController::class)
    ->middleware('supabase.authenticated')
    ->name('radios.live');

Route::middleware('supabase.master')->prefix('api/admin')->group(function () {
    Route::get('/associazioni', [AdminAssociazioneController::class, 'index']);
    Route::post('/associazioni', [AdminAssociazioneController::class, 'store']);
    Route::patch('/associazioni/{id}', [AdminAssociazioneController::class, 'update']);
    Route::delete('/associazioni/{id}', [AdminAssociazioneController::class, 'destroy']);
    Route::post('/profiles', [AdminProfileController::class, 'store']);
    Route::patch('/profiles/{id}', [AdminProfileController::class, 'update']);
    Route::delete('/profiles/{id}', [AdminProfileController::class, 'destroy']);
});
