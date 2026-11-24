<!doctype html>
<html lang="id" data-bs-theme="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="description" content="Lihat transaksi, token, dan wallet kripto secara langsung dari blockchain, dengan penjelasan yang mudah dipahami.">
    <title>@yield('title') - Bitquery Explorer</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="{{ asset('css/explorer.css') }}?v=4" rel="stylesheet">
</head>
@php
    $authUser = session('auth_user');
    $wallet = session('web3_address');
    $authLabel = $wallet
        ? \Illuminate\Support\Str::substr($wallet, 0, 6).'...'.\Illuminate\Support\Str::substr($wallet, -4)
        : (session('auth_email') ?: 'Akun saya');
@endphp
<body data-network="{{ $network ?? 'eth' }}"
      data-explorer="{{ $explorer ?? config('bitquery.networks.eth.explorer') }}"
      data-user="{{ $authUser ? '1' : '' }}"
      data-wallet="{{ $wallet }}"
      data-dynamic-env="{{ config('dynamic.environment_id') }}"
      data-url-trades="{{ route('trades') }}"
      data-url-tokens="{{ route('tokens') }}"
      data-url-wallet="{{ route('wallet') }}"
      data-url-login="{{ route('auth.dynamic') }}"
      data-url-logout="{{ route('auth.logout') }}">

<header class="topbar">
    <div class="container topbar-inner">
        <a class="brand" href="{{ route('trades') }}">
            <span class="logo" aria-hidden="true">B</span>
            <span>Bitquery Explorer</span>
        </a>

        <button type="button" class="searchbox" data-open-palette aria-label="Cari wallet atau token">
            <span>Cari wallet / token...</span>
            <kbd>Ctrl+K</kbd>
        </button>

        <nav class="tabs" aria-label="Halaman">
            <a @class(['tab', 'active' => request()->routeIs('trades')]) href="{{ route('trades') }}">Trade terbaru</a>
            <a @class(['tab', 'active' => request()->routeIs('tokens')]) href="{{ route('tokens') }}">Token teratas</a>
            <a @class(['tab', 'active' => request()->routeIs('wallet')]) href="{{ route('wallet') }}">Cek wallet</a>
        </nav>

        <div class="actions">
            <button type="button" class="btn btn-accent btn-sm" data-live-toggle>Live Feed</button>
            @if ($authUser)
                <div class="wallet-chip" title="{{ $wallet ?: session('auth_email') }}">
                    <span class="dot-ok" aria-hidden="true"></span>
                    <span @class(['mono' => (bool) $wallet])>{{ $authLabel }}</span>
                    <button type="button" class="link-btn" data-logout>Keluar</button>
                </div>
            @else
                <button type="button" class="btn btn-outline-light btn-sm" data-connect>Masuk</button>
            @endif
        </div>
    </div>
</header>

<main class="container pb-5">
    <h1 class="h4 mb-1">@yield('heading')</h1>
    <p class="text-secondary mb-3">@yield('lead')</p>

    @yield('filters')

    @if (!empty($error))
        <div class="alert alert-danger" role="alert">{{ $error }}</div>
    @endif

    @isset($result)
        @include('partials.status')
    @endisset

    @yield('content')

    <p class="text-secondary small mt-4 mb-0">
        Data blockchain bersifat publik dan diambil dari Bitquery. Halaman ini untuk belajar dan memantau, bukan saran keuangan.
        Waktu ditampilkan sesuai zona waktu perangkatmu.
    </p>
</main>

<dialog id="palette" class="palette" aria-label="Pencarian cepat">
    <input type="search" id="palette-input" placeholder="Tempel alamat wallet (0x...), kode transaksi, atau nama token" autocomplete="off" aria-label="Pencarian cepat">
    <ul id="palette-list" class="palette-list"></ul>
    <p class="palette-hint">Enter untuk memilih, Esc untuk menutup</p>
</dialog>

<dialog id="login-dialog" class="login" aria-labelledby="login-title">
    <div class="login-box">
        <h2 id="login-title" class="h6 mb-0">Masuk ke Bitquery Explorer</h2>
        <p class="text-secondary small mb-0">Pilih wallet atau pakai email. Masuk gratis dan tidak mengirim uang.</p>
        <div id="login-wallets" class="login-list"></div>
        <div class="login-or">atau</div>
        <form id="login-email" class="login-email" novalidate>
            <input type="email" id="login-email-input" class="form-control" placeholder="Email kamu" autocomplete="email" aria-label="Email" required>
            <input type="text" id="login-code-input" class="form-control" placeholder="Kode dari email" inputmode="numeric" autocomplete="one-time-code" aria-label="Kode dari email" hidden>
            <button type="submit" id="login-email-btn" class="btn btn-accent">Kirim kode</button>
        </form>
        <p id="login-msg" class="login-msg" role="status"></p>
        <button type="button" class="link-btn" data-close-login>Tutup</button>
    </div>
</dialog>

<div id="toast" class="toast-box" role="status" aria-live="polite" hidden></div>

<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
<script src="{{ asset('js/explorer.js') }}?v=4"></script>
<script type="module" src="{{ asset('dynamic/dynamic-auth.js') }}?v=4"></script>
@stack('scripts')
</body>
</html>
