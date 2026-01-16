import { client } from './supabaseClient.js';
import { loadFromSupabase } from './db.js';
import { showToast } from '../utils/utils.js';
import { saveAndRender } from '../ui/ui.js';
import { openModal, closeModal, openConfirm } from '../ui/ui_modal.js';

export function updateAuthUI(/** @type {any} */ user) {
    const profileBtn = document.getElementById('profile-button');
    const avatar = document.getElementById('profile-avatar');
    const name = document.getElementById('profile-name');
    if (!profileBtn || !avatar || !name) return;
    
    if (user) {
        avatar.textContent = user.email.charAt(0).toUpperCase();
        name.textContent = user.email.split('@')[0];
        profileBtn.title = `Вошли как ${user.email}`;
    } else {
        avatar.textContent = '👤';
        name.textContent = 'Профиль';
        profileBtn.title = 'Войти или зарегистрироваться';
    }
}

export function openLoginModal() {
    openModal('login-modal');
    const emailInput = document.getElementById('auth-email');
    if (emailInput instanceof HTMLInputElement) emailInput.value = '';
    const passInput = /** @type {HTMLInputElement} */ (document.getElementById('auth-password'));
    if (!passInput) return;
    passInput.value = '';
    passInput.type = 'password';
    const toggleBtn = document.getElementById('toggle-password-btn');
    if(toggleBtn) toggleBtn.textContent = '👁️';
    
    const bar = document.getElementById('strength-bar');
    if(bar && bar.parentElement) { bar.style.width = '0%'; /** @type {HTMLElement} */ (bar.parentElement).style.display = 'none'; }

    const authError = document.getElementById('auth-error');
    if (authError) authError.style.display = 'none';
    toggleResetMode(false);
    
    passInput.onkeydown = (e) => { if (e.key === 'Enter') handleAuth('login'); };
    
    passInput.oninput = (e) => {
        const target = /** @type {HTMLInputElement} */ (e.target);
        if (!target) return;
        const val = target.value;
        const meter = /** @type {HTMLElement | null} */ (document.getElementById('strength-bar'));
        const container = /** @type {HTMLElement} */ (document.querySelector('.password-strength'));
        if (!val) { if(container) container.style.display = 'none'; return; }
        if(container) container.style.display = 'block';
        let score = 0;
        if (val.length > 5) score += 20;
        if (val.length > 8) score += 20;
        if (/[A-Z]/.test(val)) score += 20;
        if (/[0-9]/.test(val)) score += 20;
        if (/[^A-Za-z0-9]/.test(val)) score += 20;
        if(meter) {
            meter.style.width = score + '%';
            if (score < 40) meter.style.backgroundColor = 'var(--danger)';
            else if (score < 80) meter.style.backgroundColor = 'var(--warning)';
            else meter.style.backgroundColor = 'var(--success)';
        }
    };
}

export function openProfileModal() {
    // FIX: Используем getSession вместо getUser для мгновенного отклика.
    // getUser делает сетевой запрос, что может вызывать задержки ("зависание").
    client.auth.getSession().then((/** @type {any} */ {data}) => {
        const session = data.session;
        if (session && session.user) {
            const emailEl = document.getElementById('profile-email');
            if (emailEl) emailEl.textContent = session.user.email;
            const avatarEl = document.getElementById('profile-avatar-large');
            if (avatarEl) avatarEl.textContent = session.user.email.charAt(0).toUpperCase();
            
            // Логика индикатора сложности для смены пароля
            const input = /** @type {HTMLInputElement} */ (document.getElementById('new-password'));
            const bar = document.getElementById('new-strength-bar');
            const container = document.getElementById('new-strength-container');
            
            if (input) {
                input.value = '';
                if (container) container.style.display = 'none';
                if (bar) bar.style.width = '0%';
                
                input.oninput = (e) => {
                    const target = /** @type {HTMLInputElement} */ (e.target);
                    if(!target) return;
                    const val = target.value;
                    if (!val) { if (container) container.style.display = 'none'; return; }
                    if (container) container.style.display = 'block';
                    
                    let score = 0;
                    if (val.length > 5) score += 20;
                    if (val.length > 8) score += 20;
                    if (/[A-Z]/.test(val)) score += 20;
                    if (/[0-9]/.test(val)) score += 20;
                    if (/[^A-Za-z0-9]/.test(val)) score += 20;
                    
                    if (bar) {
                        bar.style.width = score + '%';
                        if (score < 40) bar.style.backgroundColor = 'var(--danger)';
                        else if (score < 80) bar.style.backgroundColor = 'var(--warning)';
                        else bar.style.backgroundColor = 'var(--success)';
                    }
                };
            }
            
            // Добавляем кнопку установки, если она доступна
            const installBtn = document.getElementById('install-app-btn');
            if (!installBtn && /** @type {any} */ (window).installApp) {
                // Кнопка уже есть в HTML (см. ниже), просто управляем видимостью через app.js
            }

            openModal('profile-modal');
        } else {
            // Это может произойти, если сессия истекла.
            // Корректируем UI и перенаправляем на окно входа.
            console.warn("Кнопка профиля нажата, но активная сессия не найдена. Исправляем UI.");
            updateAuthUI(null);
            openLoginModal();
        }
    }).catch((/** @type {any} */ err) => console.error('Profile check failed:', err));
}

export async function handleAuth(/** @type {string} */ type) {
    const emailInput = /** @type {HTMLInputElement} */ (document.getElementById('auth-email'));
    const passwordInput = /** @type {HTMLInputElement} */ (document.getElementById('auth-password'));
    if(!emailInput || !passwordInput) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    
    // Сброс ошибок перед началом
    const errEl = document.getElementById('auth-error');
    if (errEl) errEl.style.display = 'none';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRegex.test(email)) {
        showAuthError('Некорректный формат Email');
        return;
    }

    if (type === 'reset') {
        await performReset(email);
    } else if (type === 'login') {
        await performLogin(email, password);
    } else if (type === 'signup') {
        await performSignup(email, password);
    }
}

async function performReset(/** @type {string} */ email) {
    if (!email) return showAuthError('Введите Email для сброса пароля');
    showToast('⏳ Отправка письма...');
    try {
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: window.location.href });
        if (error) throw error;
        alert(`Ссылка для входа отправлена на ${email}.\nПроверьте почту.`);
        closeModal('login-modal');
    } catch (/** @type {any} */ e) {
        console.error(e);
        showAuthError('Ошибка: ' + e.message);
    }
}

async function performLogin(/** @type {string} */ email, /** @type {string} */ password) {
    if (!email || !password) return showAuthError('Введите Email и пароль');
    showToast('⏳ Вход...');
    try {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await finalizeAuth(data.user);
    } catch (e) {
        handleAuthError(e);
    }
}

async function performSignup(/** @type {string} */ email, /** @type {string} */ password) {
    if (!email || !password) return showAuthError('Введите Email и пароль');
    showToast('⏳ Регистрация...');
    try {
        const { data, error } = await client.auth.signUp({ email, password });
        if (error) throw error;

        if (data.user && !data.session) {
            alert('Регистрация успешна! Проверьте почту для подтверждения.');
            closeModal('login-modal');
        } else {
            if (data.user) {
                try { await client.from('user_global_stats').insert([{ user_id: data.user.id, xp: 0, level: 1 }]); } catch(e) {}
            }
            await finalizeAuth(data.user);
        }
    } catch (e) {
        handleAuthError(e);
    }
}

async function finalizeAuth(/** @type {any} */ user) {
    showToast('✅ Успешно!');
    updateAuthUI(user);
    await loadFromSupabase(user);
    saveAndRender();
    closeModal('login-modal');
}

function showAuthError(/** @type {string} */ msg) {
    const errEl = document.getElementById('auth-error');
    if (errEl) {
        errEl.textContent = msg;
        errEl.style.display = 'block';
    }
    shakeModal();
}

function handleAuthError(/** @type {any} */ e) {
    console.error(e);
    let msg = e.message;
    if (msg.includes('already registered')) msg = 'Такой пользователь уже есть. Попробуйте войти.';
    else if (msg.includes('Invalid login')) msg = 'Неверный Email или пароль.';
    else if (msg.includes('Email not confirmed')) msg = 'Email не подтвержден.';
    showAuthError(msg);
}

export async function signInWithGoogle() {
    const { data, error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if (error) {
        console.error('Google Sign-In Error:', error);
        alert('Ошибка Google входа: ' + error.message);
    }
}

export async function handleChangePassword() {
    const newPassInput = /** @type {HTMLInputElement} */ (document.getElementById('new-password'));
    if(!newPassInput) return;
    const newPass = newPassInput.value.trim();
    if (!newPass) { alert('Введите новый пароль'); return; }
    if (newPass.length < 6) { alert('Пароль должен содержать минимум 6 символов'); return; }
    showToast('⏳ Обновление...');
    const { error } = await client.auth.updateUser({ password: newPass });
    if (error) {
        console.error('Update Password Error:', error);
        alert('Ошибка: ' + error.message);
    }
    else { showToast('✅ Пароль изменен'); newPassInput.value = ''; closeModal('profile-modal'); }
}

export async function handleLogout() {
    // FIX: Используем кастомное модальное окно для консистентности UI
    openConfirm('Выйти из аккаунта?', async () => {
        await client.auth.signOut();
        location.reload();
    });
}

export function toggleResetMode(/** @type {boolean} */ show) {
    const ids = ['auth-password-container', 'auth-buttons', 'auth-reset-buttons', 'auth-forgot-link', 'auth-back-link', 'auth-social'];
    const els = /** @type {Record<string, HTMLElement | null>} */ ({});
    ids.forEach(id => els[id] = document.getElementById(id));
    const title = document.getElementById('auth-title');
    const desc = document.getElementById('auth-desc');
    const errEl = document.getElementById('auth-error');
    if (errEl) errEl.style.display = 'none';

    if (show) {
        if(els['auth-password-container']) els['auth-password-container'].style.display = 'none';
        if(els['auth-buttons']) els['auth-buttons'].style.display = 'none';
        if(els['auth-reset-buttons']) els['auth-reset-buttons'].style.display = 'block';
        if(els['auth-forgot-link']) els['auth-forgot-link'].style.display = 'none';
        if(els['auth-back-link']) els['auth-back-link'].style.display = 'inline';
        if(title) title.textContent = '🔑 Сброс пароля';
        if(desc) desc.textContent = 'Введите Email, чтобы получить ссылку для входа.';
        if(els['auth-social']) els['auth-social'].style.display = 'none';
    } else {
        if(els['auth-password-container']) els['auth-password-container'].style.display = 'block';
        if(els['auth-buttons']) els['auth-buttons'].style.display = 'flex';
        if(els['auth-reset-buttons']) els['auth-reset-buttons'].style.display = 'none';
        if(els['auth-forgot-link']) els['auth-forgot-link'].style.display = 'inline';
        if(els['auth-back-link']) els['auth-back-link'].style.display = 'none';
        if(title) title.textContent = '🔐 Профиль';
        if(desc) desc.textContent = 'Войдите, чтобы сохранить прогресс в облаке.';
        if(els['auth-social']) els['auth-social'].style.display = 'block';
    }
}

export function togglePasswordVisibility() {
    const input = /** @type {HTMLInputElement} */ (document.getElementById('auth-password'));
    const btn = document.getElementById('toggle-password-btn');
    if (!input || !btn) return;
    if (input.type === 'password') { input.type = 'text'; btn.textContent = '🙈'; } 
    else { input.type = 'password'; btn.textContent = '👁️'; }
}

export function cleanAuthUrl() {
    if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('type=recovery') || window.location.hash.includes('error='))) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
}

function shakeModal() {
    const content = /** @type {HTMLElement} */ (document.querySelector('#login-modal .modal-content'));
    if (!content) return;
    content.classList.remove('shake');
    void content.offsetWidth;
    content.classList.add('shake');
}