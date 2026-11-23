<?php

return [
    // Environment ID dari https://console.dynamic.xyz (Developers -> API)
    'environment_id' => env('DYNAMIC_ENVIRONMENT_ID'),

    // Alamat kunci publik untuk memverifikasi token (JWT) dari Dynamic
    'jwks_url' => env(
        'DYNAMIC_JWKS_URL',
        'https://app.dynamicauth.com/api/v0/sdk/'.env('DYNAMIC_ENVIRONMENT_ID').'/.well-known/jwks'
    ),
];
