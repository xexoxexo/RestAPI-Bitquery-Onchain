@extends('layouts.app')

@section('title', 'Trade terbaru')
@section('heading', 'Trade DEX terbaru')
@section('lead', 'Transaksi swap terakhir di '.$networkName.', langsung dari blockchain.')

@section('filters')
    <form method="GET" class="row g-2 mb-3" data-loading>
        <div class="col-auto">
            <label for="network" class="form-label small text-secondary mb-1">Jaringan blockchain</label>
            @include('partials.network')
        </div>
        <div class="col-auto d-flex align-items-end"><button class="btn btn-accent">Tampilkan</button></div>
    </form>

    <details class="panel help p-3 mb-3">
        <summary>Apa arti halaman ini?</summary>
        <ul class="small mt-2 mb-0">
            <li><strong>DEX</strong> adalah bursa kripto tanpa perantara. Pengguna menukar token langsung lewat program di blockchain.</li>
            <li>Satu baris adalah satu penukaran. <strong>Dibeli</strong> adalah token yang diterima pembeli, <strong>Dijual</strong> adalah token yang diberikan.</li>
            <li><strong>Nilai (USD)</strong> adalah perkiraan nilai penukaran dalam dolar AS.</li>
            <li><strong>Kode transaksi</strong> adalah nomor unik tiap transaksi. Klik untuk melihat detailnya di penjelajah blockchain.</li>
            <li><strong>Live Feed</strong> memperbarui tabel otomatis dan butuh akun yang sudah masuk. Klik Masuk, lalu pilih wallet atau pakai email. Masuk gratis dan tidak mengirim uang.</li>
        </ul>
    </details>
@endsection

@section('content')
    <div class="livebar" id="livebar" hidden
         data-url="{{ route('trades.feed') }}" data-network="{{ $network }}" data-interval="{{ config('bitquery.live_interval') }}">
        <span class="pulse" aria-hidden="true"></span>
        <span>
            Live Feed aktif. Tabel diperbarui otomatis tiap {{ config('bitquery.live_interval') }} detik.
            Terakhir: <time id="live-time" data-local="time"></time><span id="live-stale" hidden> (data lama)</span>
        </span>
        <button type="button" class="link-btn ms-auto" data-live-toggle>Hentikan</button>
    </div>

    @if (!empty($result['summary']))
        @include('partials.cards', ['cards' => [
            ['label' => 'Transaksi ditampilkan', 'value' => $result['summary']['count'], 'hint' => 'yang paling baru'],
            ['label' => 'Total nilai', 'value' => '$'.$result['summary']['usd'], 'hint' => 'jumlah nilai semua transaksi di daftar ini'],
            ['label' => 'DEX paling ramai', 'value' => $result['summary']['top_dex'], 'hint' => 'paling banyak muncul di daftar ini'],
        ]])
    @endif

    @if (!empty($result['chart']['labels']))
        <div class="panel p-3 mb-3">
            <h2 class="h6">Jumlah transaksi per DEX</h2>
            <div class="chart-box"><canvas id="chart" role="img" aria-label="Grafik jumlah transaksi per DEX"></canvas></div>
        </div>
        @push('scripts')
            <script>drawChart('chart', 'doughnut', @json($result['chart']['labels']), @json($result['chart']['values']), 'Transaksi');</script>
        @endpush
    @endif

    @if (!empty($result['rows']))
        <input type="search" class="form-control mb-2" placeholder="Cari di tabel, misalnya nama DEX atau token" aria-label="Cari di tabel" data-filter="#tabel">
    @endif

    <div class="panel table-responsive">
        <table class="table table-hover align-middle mb-0" id="tabel">
            <thead>
                <tr>
                    <th>Waktu</th>
                    <th>DEX</th>
                    <th>Dibeli</th>
                    <th>Dijual</th>
                    <th class="text-end">Nilai (USD)</th>
                    <th>Kode transaksi</th>
                </tr>
            </thead>
            <tbody>
                @include('partials.trade-rows', ['rows' => $result['rows']])
            </tbody>
        </table>
    </div>
@endsection
