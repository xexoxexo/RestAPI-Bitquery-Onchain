<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Hanya meloloskan pengunjung yang sudah masuk (lewat Dynamic). */
class RequireLogin
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->session()->has('auth_user')) {
            return response()->json(['message' => 'Masuk dulu untuk memakai Live Feed.'], 401);
        }

        return $next($request);
    }
}
