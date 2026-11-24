(function () {
    'use strict';

    var body = document.body;
    function $(sel, root) { return (root || document).querySelector(sel); }
    function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
    var meta = $('meta[name="csrf-token"]');
    var csrf = meta ? meta.getAttribute('content') : '';

    /* ---------- Bantuan umum ---------- */
    var toastTimer;
    function toast(message, isError) {
        var el = $('#toast');
        if (!el) { return; }
        el.textContent = message;
        el.className = 'toast-box' + (isError ? ' error' : '');
        el.hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { el.hidden = true; }, 6000);
    }

    function post(url, data) {
        return fetch(url, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': csrf },
            body: JSON.stringify(data || {})
        }).then(function (r) {
            return r.json().catch(function () { return {}; }).then(function (j) {
                if (!r.ok) { throw new Error(j.message || 'Permintaan gagal. Coba lagi.'); }
                return j;
            });
        });
    }

    // Waktu sesuai zona waktu perangkat
    function localizeTimes(root) {
        $$('time[data-local]', root).forEach(function (el) {
            var iso = el.getAttribute('datetime');
            if (!iso) { return; }
            var d = new Date(iso);
            if (isNaN(d)) { return; }
            var opts = el.dataset.local === 'time'
                ? { hour: '2-digit', minute: '2-digit', second: '2-digit' }
                : { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' };
            el.textContent = d.toLocaleString('id-ID', opts);
        });
    }
    localizeTimes(document);

    /* ---------- Tabel: pencarian cepat ---------- */
    function applyFilter(input) {
        var q = input.value.toLowerCase();
        $$(input.dataset.filter + ' tbody tr').forEach(function (tr) {
            tr.hidden = q !== '' && tr.textContent.toLowerCase().indexOf(q) === -1;
        });
    }
    $$('[data-filter]').forEach(function (input) {
        input.addEventListener('input', function () { applyFilter(input); });
    });
    var qParam = new URLSearchParams(location.search).get('q');
    var firstFilter = $('[data-filter]');
    if (firstFilter && qParam) { firstFilter.value = qParam; applyFilter(firstFilter); }

    /* ---------- Formulir: penanda memuat ---------- */
    $$('form[data-loading]').forEach(function (form) {
        form.addEventListener('submit', function () {
            var b = $('button', form);
            if (!b) { return; }
            b.dataset.label = b.textContent;
            b.textContent = 'Memuat...';
            b.disabled = true;
        });
    });
    window.addEventListener('pageshow', function () {
        $$('form[data-loading] button').forEach(function (b) {
            if (b.dataset.label) { b.textContent = b.dataset.label; b.disabled = false; }
        });
    });

    /* ---------- Grafik ---------- */
    window.drawChart = function (id, type, labels, values, label) {
        var el = document.getElementById(id);
        if (!el || !window.Chart) { return; }
        Chart.defaults.color = '#9aa0a9';
        Chart.defaults.borderColor = '#26282d';
        var colors = ['#e9ecef', '#6aa9ff', '#3ecf8e', '#f0b429', '#c58bff', '#f0616d', '#9aa0a9', '#5f6670'];
        var options = {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: type === 'bar' ? 'y' : 'x',
            plugins: { legend: { display: type !== 'bar', position: 'bottom' } }
        };
        if (type === 'bar') {
            options.scales = { x: { ticks: { callback: function (v) {
                return Intl.NumberFormat('id-ID', { notation: 'compact' }).format(v);
            } } } };
        }
        new Chart(el, {
            type: type,
            data: { labels: labels, datasets: [{ label: label, data: values, borderColor: '#16171a', backgroundColor: type === 'bar' ? '#e9ecef' : colors }] },
            options: options
        });
    };

    /* ---------- Masuk (Dynamic) ---------- */
    function openLogin(redirectTo) {
        if (!body.dataset.dynamicEnv) {
            toast('Login belum dikonfigurasi. Isi DYNAMIC_ENVIRONMENT_ID di file .env.', true);
            return;
        }
        if (!window.BitqueryAuth) {
            toast('Login belum siap. Jalankan build modul Dynamic (lihat README), lalu muat ulang halaman.', true);
            return;
        }
        window.BitqueryAuth.open(redirectTo);
    }

    /* ---------- Live Feed ---------- */
    var bar = $('#livebar');
    var liveTimer = null;

    function liveTick() {
        if (document.hidden) { return; }
        fetch(bar.dataset.url + '?network=' + encodeURIComponent(bar.dataset.network), {
            headers: { 'Accept': 'application/json' },
            credentials: 'same-origin'
        })
            .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
            .then(function (res) {
                if (!res.ok) { stopLive(); toast(res.j.message || 'Live Feed berhenti.', true); return; }
                var tbody = $('#tabel tbody');
                tbody.innerHTML = res.j.html;
                localizeTimes(tbody);
                if (firstFilter && firstFilter.value) { applyFilter(firstFilter); }
                var t = $('#live-time');
                t.setAttribute('datetime', res.j.fetched_at);
                localizeTimes(t.parentNode);
                $('#live-stale').hidden = !res.j.stale;
            })
            .catch(function () { stopLive(); toast('Koneksi terputus. Live Feed dihentikan.', true); });
    }

    function setLiveUi(on) {
        bar.hidden = !on;
        $$('.actions [data-live-toggle]').forEach(function (b) {
            b.classList.toggle('on', on);
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    }

    function startLive() {
        if (liveTimer) { return; }
        setLiveUi(true);
        liveTick();
        liveTimer = setInterval(liveTick, Math.max(10, parseInt(bar.dataset.interval, 10) || 30) * 1000);
    }

    function stopLive() {
        clearInterval(liveTimer);
        liveTimer = null;
        setLiveUi(false);
    }

    function onLiveToggle() {
        var tradesLive = body.dataset.urlTrades + '?live=1';
        if (!body.dataset.user) {
            openLogin(tradesLive);
            return;
        }
        if (!bar) { location.href = tradesLive; return; }
        if (liveTimer) { stopLive(); } else { startLive(); }
    }

    if (bar && /[?&]live=1/.test(location.search)) {
        if (body.dataset.user) { startLive(); } else { toast('Masuk dulu untuk memakai Live Feed.', false); }
    }

    /* ---------- Pencarian cepat (Ctrl+K) ---------- */
    var dlg = $('#palette');
    var input = $('#palette-input');
    var list = $('#palette-list');

    function paletteItems(q) {
        var net = body.dataset.network;
        var ex = body.dataset.explorer;
        var out = [];
        if (/^0x[0-9a-fA-F]{40}$/.test(q)) {
            out.push({ t: 'Cek transfer wallet', s: q, href: body.dataset.urlWallet + '?network=' + net + '&address=' + q });
            out.push({ t: 'Buka alamat di penjelajah blockchain', s: q, href: ex + '/address/' + q, ext: true });
        } else if (/^0x[0-9a-fA-F]{64}$/.test(q)) {
            out.push({ t: 'Buka transaksi di penjelajah blockchain', s: q, href: ex + '/tx/' + q, ext: true });
        } else if (q) {
            if (firstFilter) { out.push({ t: 'Cari di tabel halaman ini', s: q, action: 'filter' }); }
            out.push({ t: 'Cari token di halaman Token teratas', s: q, href: body.dataset.urlTokens + '?network=' + net + '&q=' + encodeURIComponent(q) });
        }
        return out;
    }

    function renderPalette() {
        var found = paletteItems(input.value.trim());
        list.innerHTML = '';
        if (!found.length) {
            var empty = document.createElement('li');
            empty.className = 'palette-empty';
            empty.textContent = 'Tempel alamat wallet (0x...) atau kode transaksi, atau ketik nama token.';
            list.appendChild(empty);
            return;
        }
        found.forEach(function (it) {
            var li = document.createElement('li');
            var a = document.createElement('a');
            var title = document.createElement('span');
            var sub = document.createElement('small');
            a.href = it.href || '#';
            if (it.ext) { a.target = '_blank'; a.rel = 'noopener'; }
            title.textContent = it.t;
            sub.textContent = it.s;
            a.appendChild(title);
            a.appendChild(sub);
            if (it.action === 'filter') {
                a.addEventListener('click', function (e) {
                    e.preventDefault();
                    firstFilter.value = it.s;
                    applyFilter(firstFilter);
                    dlg.close();
                });
            }
            li.appendChild(a);
            list.appendChild(li);
        });
    }

    function openPalette() {
        if (!dlg || dlg.open) { return; }
        dlg.showModal();
        input.value = '';
        renderPalette();
        input.focus();
    }

    if (dlg) {
        input.addEventListener('input', renderPalette);
        input.addEventListener('keydown', function (e) {
            var first = $('a', list);
            if (e.key === 'Enter' && first) { e.preventDefault(); first.click(); }
            if (e.key === 'ArrowDown' && first) { e.preventDefault(); first.focus(); }
        });
        list.addEventListener('keydown', function (e) {
            var links = $$('a', list);
            var i = links.indexOf(document.activeElement);
            if (e.key === 'ArrowDown' && i < links.length - 1) { e.preventDefault(); links[i + 1].focus(); }
            if (e.key === 'ArrowUp') { e.preventDefault(); if (i > 0) { links[i - 1].focus(); } else { input.focus(); } }
        });
        dlg.addEventListener('click', function (e) { if (e.target === dlg) { dlg.close(); } });
    }

    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
    });

    /* ---------- Klik: tombol-tombol ---------- */
    document.addEventListener('click', function (e) {
        var t = e.target;
        var el;

        if ((el = t.closest('[data-copy]'))) {
            var text = el.getAttribute('data-copy');
            var done = function () {
                var old = el.textContent;
                el.textContent = 'Tersalin';
                setTimeout(function () { el.textContent = old; }, 1500);
            };
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(done);
            } else {
                var ta = document.createElement('textarea');
                ta.value = text;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.remove();
                done();
            }
        }
        if ((el = t.closest('[data-fill]'))) { $(el.dataset.fill).value = el.dataset.value; }
        if (t.closest('[data-open-palette]')) { openPalette(); }
        if (t.closest('[data-connect]')) { openLogin(null); }
        if (t.closest('[data-logout]')) {
            var out = window.BitqueryAuth ? window.BitqueryAuth.signOut() : Promise.resolve();
            out.then(function () { return post(body.dataset.urlLogout); })
                .then(function () { location.href = body.dataset.urlTrades; })
                .catch(function (err) { toast(err.message, true); });
        }
        if (t.closest('[data-live-toggle]')) { onLiveToggle(); }
    });
})();
