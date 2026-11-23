<?php

use App\Http\Controllers\BitqueryController;
use App\Http\Controllers\DynamicAuthController;
use App\Http\Middleware\RequireLogin;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/trades');

// Batas per pengunjung (per IP). Awalan (pages, wallet, ...) memisahkan hitungan tiap kelompok.
Route::middleware('throttle:60,1,pages')->group(function () {
    Route::get('/trades', [BitqueryController::class, 'trades'])->name('trades');
    Route::get('/tokens', [BitqueryController::class, 'tokens'])->name('tokens');
});

Route::get('/wallet', [BitqueryController::class, 'wallet'])
    ->middleware('throttle:20,1,wallet')
    ->name('wallet');

// Live Feed: hanya untuk pengunjung yang sudah masuk.
Route::get('/trades/feed', [BitqueryController::class, 'feed'])
    ->middleware(['throttle:30,1,feed', RequireLogin::class])
    ->name('trades.feed');

// Masuk dengan Dynamic.
Route::prefix('auth')->middleware('throttle:10,1,auth')->group(function () {
    Route::post('/dynamic', [DynamicAuthController::class, 'login'])->name('auth.dynamic');
    Route::post('/logout', [DynamicAuthController::class, 'logout'])->name('auth.logout');
});
