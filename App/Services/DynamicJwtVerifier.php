<?php

namespace App\Services;

use App\Exceptions\DynamicAuthException;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

/**
 * Memeriksa token (JWT, RS256) yang diterbitkan Dynamic sebelum dipercaya.
 * Token dari browser tidak boleh dipercaya sebelum tanda tangannya diverifikasi di sini.
 * Token tidak pernah dicatat ke log.
 */
class DynamicJwtVerifier
{
    private const CACHE_KEY = 'dynamic:jwks';

    /** @return array{sub: string, email: ?string, address: ?string} */
    public function verify(string $jwt): array
    {
        $environmentId = (string) config('dynamic.environment_id');

        if ($environmentId === '') {
            throw new DynamicAuthException('Login belum dikonfigurasi: DYNAMIC_ENVIRONMENT_ID belum diisi di file .env.');
        }

        JWT::$leeway = 30; // toleransi selisih jam (detik)

        try {
            $claims = $this->decode($jwt, false);
        } catch (ExpiredException) {
            throw new DynamicAuthException('Sesi login sudah kedaluwarsa. Masuk lagi.');
        } catch (DynamicAuthException $e) {
            throw $e;
        } catch (Throwable) {
            // Kunci penandatangan bisa berganti. Ambil ulang sekali, lalu coba lagi.
            try {
                $claims = $this->decode($jwt, true);
            } catch (DynamicAuthException $e) {
                throw $e;
            } catch (Throwable) {
                throw new DynamicAuthException('Token login tidak valid. Masuk lagi.');
            }
        }

        $claims = json_decode(json_encode($claims), true) ?: [];

        // Token harus berasal dari environment Dynamic milik kita.
        if (! str_contains((string) ($claims['iss'] ?? ''), $environmentId)) {
            throw new DynamicAuthException('Token login bukan dari proyek Dynamic ini.');
        }

        // Token tanpa scope user:basic belum menyelesaikan proses login.
        $scopes = preg_split('/\s+/', trim((string) ($claims['scope'] ?? '')), -1, PREG_SPLIT_NO_EMPTY);

        if (! in_array('user:basic', $scopes, true)) {
            throw new DynamicAuthException('Proses login belum selesai. Selesaikan verifikasi, lalu coba lagi.');
        }

        $sub = (string) ($claims['sub'] ?? '');

        if ($sub === '') {
            throw new DynamicAuthException('Token login tidak valid. Masuk lagi.');
        }

        return [
            'sub'     => $sub,
            'email'   => isset($claims['email']) ? (string) $claims['email'] : null,
            'address' => $this->walletAddress($claims),
        ];
    }

    /** Alamat wallet EVM pertama yang sudah terverifikasi, kalau ada. */
    private function walletAddress(array $claims): ?string
    {
        foreach ((array) ($claims['verified_credentials'] ?? []) as $credential) {
            if (! is_array($credential) || ($credential['format'] ?? null) !== 'blockchain') {
                continue;
            }

            $address = (string) ($credential['address'] ?? '');

            if (preg_match('/^0x[a-fA-F0-9]{40}$/', $address)) {
                return strtolower($address);
            }
        }

        return null;
    }

    private function decode(string $jwt, bool $freshKeys): object
    {
        return JWT::decode($jwt, JWK::parseKeySet($this->jwks($freshKeys), 'RS256'));
    }

    private function jwks(bool $fresh): array
    {
        if ($fresh) {
            Cache::forget(self::CACHE_KEY);
        }

        return Cache::remember(self::CACHE_KEY, now()->addMinutes(10), function () {
            $response = Http::acceptJson()->timeout(10)->get((string) config('dynamic.jwks_url'));

            if ($response->failed() || empty($response->json('keys'))) {
                throw new DynamicAuthException('Tidak bisa mengambil kunci verifikasi dari Dynamic. Coba lagi beberapa saat lagi.');
            }

            return $response->json();
        });
    }
}
