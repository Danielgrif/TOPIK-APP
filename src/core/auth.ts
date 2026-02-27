/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
import { state } from "./state.ts";
import { loadFromSupabase } from "./db.ts";
import { showToast } from "../utils/utils.ts";
import { saveAndRender } from "../ui/ui.ts";
import { openModal, closeModal, openConfirm } from "../ui/ui_modal.ts";
import {
  applyTheme,
  updateVoiceUI,
  updateSettingsUI,
} from "../ui/ui_settings.ts";
import { User } from "../types/index.ts";
import { LS_KEYS } from "./constants.ts";
import { AuthService } from "./auth_service.ts";
import { getRole, openRolesModal } from "./stats.ts";

export function updateAuthUI(user: User | null) {
  // Keep a reference to the current user in the global state
  state.currentUser = user;

  const profileBtn = document.getElementById("profile-button");
  const avatar = document.getElementById("profile-avatar");
  const name = document.getElementById("profile-name");
  if (!profileBtn || !avatar || !name) {
    return;
  }

  if (user) {
    const email = user.email || "";
    const displayName =
      user.user_metadata?.full_name || email.split("@")[0] || "Гость";
    avatar.textContent = email.charAt(0).toUpperCase();
    name.textContent = displayName;
    profileBtn.title = `Вошли как ${email}`;
  } else {
    avatar.textContent = "👤";
    name.textContent = "Профиль";
    profileBtn.title = "Войти или зарегистрироваться";
  }
}

export function openLoginModal() {
  openModal("login-modal");
  const emailInput = document.getElementById(
    "auth-email",
  ) as HTMLInputElement | null;
  if (emailInput) emailInput.value = "";
  const passInput = document.getElementById(
    "auth-password",
  ) as HTMLInputElement | null;
  if (!passInput) return;
  passInput.value = "";
  passInput.type = "password";
  const toggleBtn = document.getElementById("toggle-password-btn");
  if (toggleBtn) toggleBtn.textContent = "👁️";

  const bar = document.getElementById("strength-bar");
  const strengthContainer = document.querySelector(
    ".password-strength",
  ) as HTMLElement | null;
  if (passInput && bar && strengthContainer) {
    bar.style.width = "0%";
    strengthContainer.style.display = "none";
    setupPasswordStrengthMeter(passInput, bar, strengthContainer);
  }

  const authError = document.getElementById("auth-error");
  if (authError) authError.style.display = "none";
  toggleResetMode(false);

  passInput.onkeydown = (e) => {
    if (e.key === "Enter") {
      const loginBtn = document.querySelector(
        'button[data-action="auth"][data-value="login"]',
      ) as HTMLElement;
      if (loginBtn) loginBtn.click();
    }
  };
}

export function openProfileModal() {
  // АТОМАРНОЕ ИЗМЕНЕНИЕ: Синхронная проверка состояния.
  // Мы доверяем state.currentUser, который обновляется в app.ts.
  // Это гарантирует мгновенный отклик UI в том же цикле событий.

  console.log(
    "👤 [DEBUG] openProfileModal called. Current User:",
    state.currentUser,
  );

  if (state.currentUser) {
    const user = state.currentUser;
    const displayName =
      user.user_metadata?.full_name || user.email?.split("@")[0] || "Гость";

    const nameDisplay = document.getElementById("profile-name-display");
    const nameInput = document.getElementById(
      "profile-name-input",
    ) as HTMLInputElement;
    const editBtn = document.getElementById("edit-profile-name-btn");

    if (nameDisplay) nameDisplay.textContent = displayName;

    const avatarEl = document.getElementById("profile-avatar-large");
    if (avatarEl)
      avatarEl.textContent = (user.email || "U").charAt(0).toUpperCase();

    // Логика редактирования имени
    if (editBtn && nameInput && nameDisplay) {
      editBtn.onclick = () => {
        nameDisplay.style.display = "none";
        editBtn.style.display = "none";
        nameInput.style.display = "block";
        nameInput.value = displayName;
        nameInput.focus();
      };

      const saveName = async () => {
        const newName = nameInput.value.trim();
        if (newName && newName !== displayName) {
          const { error } = await AuthService.updateProfile(newName);
          if (!error) {
            nameDisplay.textContent = newName;
            showToast("Имя обновлено");
            updateAuthUI({
              ...user,
              user_metadata: { ...user.user_metadata, full_name: newName },
            });
          } else {
            showToast("Ошибка обновления: " + error.message);
          }
        }
        nameInput.style.display = "none";
        nameDisplay.style.display = "block";
        editBtn.style.display = "inline-flex";
      };

      nameInput.onblur = saveName;
      nameInput.onkeydown = (e) => {
        if (e.key === "Enter") nameInput.blur();
      };
    }

    // Обновляем звание пользователя на основе уровня
    const roleEl = document.getElementById("profile-role");
    if (roleEl) {
      const lvl = state.userStats.level;
      const role = getRole(lvl);
      roleEl.textContent = `${role.icon} ${role.name} (LVL ${lvl})`;
      roleEl.style.color = role.color;
      roleEl.style.backgroundColor = role.color + "20";
      roleEl.style.border = `1px solid ${role.color}30`;

      roleEl.style.cursor = "pointer";
      roleEl.title = "Нажмите, чтобы посмотреть все звания";
      roleEl.onclick = () => openRolesModal();
    }

    const input = document.getElementById(
      "new-password",
    ) as HTMLInputElement | null;
    const bar = document.getElementById("new-strength-bar");
    const container = document.getElementById("new-strength-container");

    if (input && bar && container) {
      input.value = "";
      container.style.display = "none";
      bar.style.width = "0%";
      setupPasswordStrengthMeter(input, bar, container);
    }

    const scrollContainer = document.getElementById("profile-scroll-container");
    if (scrollContainer) scrollContainer.scrollTop = 0;

    updateSettingsUI();
    openModal("profile-modal");
  } else {
    // Если пользователя нет в стейте - сразу открываем вход.
    // Никаких await, никаких задержек.
    console.log("👤 [DEBUG] No user, opening login modal directly");
    updateAuthUI(null);
    openLoginModal();
  }
}

function setupPasswordStrengthMeter(
  inputEl: HTMLInputElement,
  barEl: HTMLElement,
  containerEl: HTMLElement,
) {
  inputEl.oninput = () => {
    const val = inputEl.value;

    if (!val) {
      containerEl.style.display = "none";
      return;
    }
    containerEl.style.display = "block";

    let score = 0;
    if (val.length > 5) score += 20;
    if (val.length > 8) score += 20;
    if (/[A-Z]/.test(val)) score += 20;
    if (/[0-9]/.test(val)) score += 20;
    if (/[^A-Za-z0-9]/.test(val)) score += 20;

    barEl.style.width = `${score}%`;
    if (score < 40) barEl.style.backgroundColor = "var(--danger)";
    else if (score < 80) barEl.style.backgroundColor = "var(--warning)";
    else barEl.style.backgroundColor = "var(--success)";
  };
}

export async function handleAuth(type: string) {
  const emailInput = document.getElementById(
    "auth-email",
  ) as HTMLInputElement | null;
  const passwordInput = document.getElementById(
    "auth-password",
  ) as HTMLInputElement | null;
  if (!emailInput || !passwordInput) return;

  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  const errEl = document.getElementById("auth-error");
  if (errEl) errEl.style.display = "none";

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailRegex.test(email)) {
    showAuthError("Некорректный формат Email");
    return;
  }

  if (type === "reset") {
    await performReset(email);
  } else if (type === "login") {
    await performLogin(email, password);
  } else if (type === "signup") {
    await performSignup(email, password);
  }
}

async function performReset(email: string) {
  if (!email) return showAuthError("Введите Email для сброса пароля");
  showToast("⏳ Отправка письма...");
  try {
    const { error } = await AuthService.resetPasswordForEmail(
      email,
      window.location.href,
    );
    if (error) throw error;
    alert(`Ссылка для входа отправлена на ${email}.\nПроверьте почту.`);
    closeModal("login-modal");
  } catch (e: unknown) {
    handleAuthError(e);
  }
}

async function performLogin(email: string, password: string) {
  if (!email || !password) return showAuthError("Введите Email и пароль");
  showToast("⏳ Вход...");
  try {
    const { data, error } = await AuthService.signInWithPassword(
      email,
      password,
    );
    if (error) throw error;
    if (data.user) await finalizeAuth(data.user as any);
  } catch (e) {
    handleAuthError(e);
  }
}

async function performSignup(email: string, password: string) {
  if (!email || !password) return showAuthError("Введите Email и пароль");
  showToast("⏳ Регистрация...");
  try {
    const { data, error } = await AuthService.signUp(email, password);
    if (error) throw error;

    if (data.user && !data.session) {
      alert("Регистрация успешна! Проверьте почту для подтверждения.");
      closeModal("login-modal");
    } else {
      if (data.user) {
        await AuthService.initUserStats(data.user.id);
      }
      if (data.user) await finalizeAuth(data.user as any);
    }
  } catch (e) {
    handleAuthError(e);
  }
}

async function finalizeAuth(user: User) {
  showToast("✅ Успешно!");
  updateAuthUI(user);
  await loadFromSupabase(user);
  applyTheme();
  updateVoiceUI();
  updateSettingsUI();
  saveAndRender();
  closeModal("login-modal");
}

function showAuthError(msg: string) {
  const errEl = document.getElementById("auth-error");
  if (errEl) {
    errEl.textContent = msg;
    errEl.style.display = "block";
  }

  const passwordInput = document.getElementById(
    "auth-password",
  ) as HTMLInputElement | null;
  // Очищаем и фокусим только если поле видимо (не в режиме сброса пароля)
  if (passwordInput && passwordInput.offsetParent !== null) {
    passwordInput.value = "";
    passwordInput.focus();
  }

  shakeModal();
}

function handleAuthError(e: unknown) {
  console.error("Auth Error:", e);
  let msg = (e as Error).message || "Произошла ошибка";

  // Обработка ошибок сети
  if (
    msg.includes("Failed to fetch") ||
    msg.includes("Network request failed") ||
    msg.includes("connection error")
  ) {
    msg = "🌐 Ошибка сети. Проверьте интернет-соединение.";
  } else if (msg.includes("already registered")) {
    msg = "📧 Этот Email уже зарегистрирован. Попробуйте войти.";
  } else if (
    msg.includes("Invalid login") ||
    msg.includes("Invalid credentials")
  ) {
    msg = "❌ Неверный Email или пароль.";
  } else if (msg.includes("Email not confirmed")) {
    msg = "📩 Email не подтвержден. Проверьте почту.";
  } else if (
    msg.includes("Rate limit exceeded") ||
    msg.includes("Too many requests")
  ) {
    msg = "⏳ Слишком много попыток. Подождите немного.";
  } else if (msg.includes("Password should be at least")) {
    msg = "🔒 Пароль должен быть не менее 6 символов.";
  }

  showAuthError(msg);
}

export async function signInWithGoogle() {
  const { error } = await AuthService.signInWithGoogle(
    window.location.origin + window.location.pathname,
  );
  if (error) {
    console.error("Google Sign-In Error:", error);
    alert("Ошибка Google входа: " + error.message);
  }
}

export async function handleChangePassword() {
  const newPassInput = document.getElementById(
    "new-password",
  ) as HTMLInputElement | null;
  if (!newPassInput) return;
  const newPass = newPassInput.value.trim();
  if (!newPass) {
    alert("Введите новый пароль");
    return;
  }
  if (newPass.length < 6) {
    alert("Пароль должен содержать минимум 6 символов");
    return;
  }
  showToast("⏳ Обновление...");
  const { error } = await AuthService.updatePassword(newPass);
  if (error) {
    console.error("Update Password Error:", error);
    alert("Ошибка: " + error.message);
  } else {
    showToast("✅ Пароль изменен");
    newPassInput.value = "";
    closeModal("profile-modal");
  }
}

export async function handleLogout() {
  openConfirm("Вы уверены, что хотите выйти?", async () => {
    showToast("👋 До встречи!");
    try {
      await AuthService.signOut();
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      const keysToRemove = [
        LS_KEYS.USER_STATS,
        LS_KEYS.LEARNED,
        LS_KEYS.MISTAKES,
        LS_KEYS.FAVORITES,
        LS_KEYS.WORD_HISTORY,
        LS_KEYS.STREAK,
        LS_KEYS.SESSIONS,
        LS_KEYS.ACHIEVEMENTS,
        "daily_challenge_v1",
        LS_KEYS.DIRTY_IDS,
        LS_KEYS.CUSTOM_WORDS,
        LS_KEYS.FAVORITE_QUOTES,
        LS_KEYS.PURCHASED_ITEMS,
        LS_KEYS.SEARCH_HISTORY,
        LS_KEYS.WORD_REQUESTS,
        LS_KEYS.STUDY_GOAL,
      ];
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      location.reload();
    }
  });
}

export function toggleResetMode(show: boolean) {
  const ids = [
    "auth-password-container",
    "auth-buttons",
    "auth-reset-buttons",
    "auth-forgot-link",
    "auth-back-link",
    "auth-social",
  ];
  const els: Record<string, HTMLElement | null> = {};
  ids.forEach((id) => (els[id] = document.getElementById(id)));
  const title = document.getElementById("auth-title");
  const desc = document.getElementById("auth-desc");
  const errEl = document.getElementById("auth-error");
  if (errEl) errEl.style.display = "none";

  if (show) {
    if (els["auth-password-container"])
      els["auth-password-container"].style.display = "none";
    if (els["auth-buttons"]) els["auth-buttons"].style.display = "none";
    if (els["auth-reset-buttons"])
      els["auth-reset-buttons"].style.display = "block";
    if (els["auth-forgot-link"]) els["auth-forgot-link"].style.display = "none";
    if (els["auth-back-link"]) els["auth-back-link"].style.display = "inline";
    if (title) title.textContent = "🔑 Сброс пароля";
    if (desc)
      desc.textContent = "Введите Email, чтобы получить ссылку для входа.";
    if (els["auth-social"]) els["auth-social"].style.display = "none";
  } else {
    if (els["auth-password-container"])
      els["auth-password-container"].style.display = "block";
    if (els["auth-buttons"]) els["auth-buttons"].style.display = "flex";
    if (els["auth-reset-buttons"])
      els["auth-reset-buttons"].style.display = "none";
    if (els["auth-forgot-link"])
      els["auth-forgot-link"].style.display = "inline";
    if (els["auth-back-link"]) els["auth-back-link"].style.display = "none";
    if (title) title.textContent = "🔐 Профиль";
    if (desc) desc.textContent = "Войдите, чтобы сохранить прогресс в облаке.";
    if (els["auth-social"]) els["auth-social"].style.display = "block";
  }
}

export function togglePasswordVisibility(triggerBtn?: HTMLElement) {
  let input: HTMLInputElement | null = null;
  const btn = triggerBtn || document.getElementById("toggle-password-btn");

  if (btn) {
    const targetId = btn.getAttribute("data-value");
    if (targetId) {
      input = document.getElementById(targetId) as HTMLInputElement;
    } else if (btn.id === "toggle-password-btn") {
      input = document.getElementById("auth-password") as HTMLInputElement;
    }
  }

  if (!input || !btn) return;
  if (input.type === "password") {
    input.type = "text";
    btn.textContent = "🙈";
  } else {
    input.type = "password";
    btn.textContent = "👁️";
  }
}

export function cleanAuthUrl() {
  if (
    window.location.hash &&
    (window.location.hash.includes("access_token") ||
      window.location.hash.includes("type=recovery") ||
      window.location.hash.includes("error="))
  ) {
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
  }
}

function shakeModal() {
  const content = document.querySelector(
    "#login-modal .modal-content",
  ) as HTMLElement | null;
  if (!content) return;
  content.classList.remove("shake");
  void content.offsetWidth;
  content.classList.add("shake");
}
