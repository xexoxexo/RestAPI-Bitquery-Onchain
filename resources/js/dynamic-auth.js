import {
    connectAndVerifyWithWalletProvider,
    createDynamicClient,
    getAvailableWalletProvidersData,
    initializeClient,
    logout,
    sendEmailOTP,
    verifyOTP,
} from '@dynamic-labs-sdk/client';
import { addEvmExtension } from '@dynamic-labs-sdk/evm';

const body = document.body;
const environmentId = body.dataset.dynamicEnv;
const csrf = (document.querySelector('meta[name="csrf-token"]') || {}).content || '';

if (environmentId) {
    // SDK Dynamic tidak punya tampilan bawaan. Kotak login dibuat di layout (#login-dialog).
    const client = createDynamicClient({
        autoInitialize: false,
        environmentId,
        metadata: { name: 'Bitquery Explorer', universalLink: window.location.origin },
    });
    addEvmExtension(); // daftarkan ekstensi sebelum inisialisasi
    const ready = Promise.resolve(initializeClient());

    const dlg = document.getElementById('login-dialog');
    const walletsBox = document.getElementById('login-wallets');
    const form = document.getElementById('login-email');
    const emailInput = document.getElementById('login-email-input');
    const codeInput = document.getElementById('login-code-input');
    const formBtn = document.getElementById('login-email-btn');
    const msg = document.getElementById('login-msg');

    let redirectTo = null;
    let otpVerification = null;

    function say(text, isError) {
        msg.textContent = text || '';
        msg.className = 'login-msg' + (isError ? ' error' : '');
    }

    function busy(on) {
        dlg.querySelectorAll('button, input').forEach(function (el) { el.disabled = on; });
    }

    function explain(e) {
        const name = e && (e.name || (e.constructor && e.constructor.name));
        if (name === 'UserRejectedError' || (e && e.code === 4001)) {
            return 'Permintaan dibatalkan di wallet.';
        }
        return (e && e.message) || 'Gagal masuk. Coba lagi.';
    }

    // Kirim token Dynamic ke Laravel. Laravel memverifikasinya lalu membuka sesi.
    async function finishLogin() {
        let token = client.token;
        for (let i = 0; !token && i < 30; i++) {
            await new Promise(function (r) { setTimeout(r, 100); });
            token = client.token;
        }
        if (!token) {
            throw new Error('Token login tidak tersedia. Pastikan proyek Dynamic menyimpan token di penyimpanan aplikasi, bukan cookie.');
        }

        const res = await fetch(body.dataset.urlLogin, {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrf,
                'Authorization': 'Bearer ' + token,
            },
            body: '{}',
        });
        const data = await res.json().catch(function () { return {}; });
        if (!res.ok) { throw new Error(data.message || 'Gagal masuk. Coba lagi.'); }

        if (redirectTo) { location.href = redirectTo; } else { location.reload(); }
    }

    async function signOut() {
        try { await ready; await logout(); } catch (e) { /* abaikan */ }
    }

    function renderWallets() {
        walletsBox.replaceChildren();
        const seen = new Set();

        getAvailableWalletProvidersData().forEach(function (p) {
            const group = p.groupKey || p.key;
            if (seen.has(group)) { return; }
            seen.add(group);

            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'wallet-btn';
            if (p.metadata && p.metadata.icon) {
                const img = document.createElement('img');
                img.src = p.metadata.icon;
                img.alt = '';
                img.width = 24;
                img.height = 24;
                b.appendChild(img);
            }
            b.appendChild(document.createTextNode((p.metadata && p.metadata.displayName) || p.key));
            b.addEventListener('click', function () { loginWithWallet(p.key); });
            walletsBox.appendChild(b);
        });

        if (!walletsBox.children.length) {
            const p = document.createElement('p');
            p.className = 'text-secondary small mb-0';
            p.textContent = 'Tidak ada wallet yang terdeteksi di browser ini. Pasang MetaMask, atau masuk dengan email di bawah.';
            walletsBox.appendChild(p);
        }
    }

    async function loginWithWallet(walletProviderKey) {
        busy(true);
        say('Menunggu persetujuan di wallet...');
        try {
            await ready;
            await connectAndVerifyWithWalletProvider({ walletProviderKey: walletProviderKey });
            say('Memeriksa login...');
            await finishLogin();
        } catch (e) {
            busy(false);
            say(explain(e), true);
        }
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        busy(true);
        try {
            await ready;
            if (!otpVerification) {
                say('Mengirim kode...');
                otpVerification = await sendEmailOTP({ email: emailInput.value.trim() });
                busy(false);
                emailInput.readOnly = true;
                codeInput.hidden = false;
                formBtn.textContent = 'Masuk';
                say('Kode dikirim. Cek email-mu, lalu masukkan kodenya.');
                codeInput.focus();
            } else {
                say('Memeriksa kode...');
                await verifyOTP({ otpVerification: otpVerification, verificationToken: codeInput.value.trim() });
                await finishLogin();
            }
        } catch (err) {
            busy(false);
            if (otpVerification) { emailInput.readOnly = true; }
            say(explain(err), true);
        }
    });

    async function open(redirect) {
        redirectTo = redirect || null;
        otpVerification = null;
        emailInput.readOnly = false;
        emailInput.value = '';
        codeInput.hidden = true;
        codeInput.value = '';
        formBtn.textContent = 'Kirim kode';
        busy(false);
        say('');
        walletsBox.replaceChildren();
        dlg.showModal();

        try {
            await ready;
            if (client.token) {
                // Sesi Dynamic sudah ada di browser ini. Sinkronkan ke server.
                say('Memeriksa sesi...');
                try { await finishLogin(); return; } catch (e) { await signOut(); say(''); }
            }
            renderWallets();
        } catch (e) {
            say(explain(e), true);
        }
    }

    dlg.addEventListener('click', function (e) { if (e.target === dlg) { dlg.close(); } });
    document.querySelectorAll('[data-close-login]').forEach(function (b) {
        b.addEventListener('click', function () { dlg.close(); });
    });

    window.BitqueryAuth = { open: open, signOut: signOut };
}
