<?php

namespace App\Http\Controllers;

use App\Exceptions\DynamicAuthException;
use App\Services\DynamicJwtVerifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Masuk dengan Dynamic (wallet, email, dll).
 * Browser mengirim token Dynamic sebagai "Authorization: Bearer ...". Server memverifikasinya,
 * lalu membuka sesi Laravel biasa.
 */
class DynamicAuthController extends Controller
{
    public function login(Request $request, DynamicJwtVerifier $verifier): JsonResponse
    {
        $token = $request->bearerToken();

        if (! $token) {
            return response()->json(['message' => 'Token login tidak ditemukan. Coba masuk lagi.'], 401);
        }

        try {
            $identity = $verifier->verify($token);
        } catch (DynamicAuthException $e) {
            return response()->json(['message' => $e->getMessage()], 401);
        }

        $request->session()->regenerate(); // cegah session fixation
        $request->session()->put([
            'auth_user'    => $identity['sub'],
            'auth_email'   => $identity['email'],
            'web3_address' => $identity['address'],
        ]);

        return response()->json(['ok' => true]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['ok' => true]);
    }
}
