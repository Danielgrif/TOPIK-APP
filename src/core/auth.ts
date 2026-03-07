import { client } from "./supabaseClient.ts";
import { state } from "./state.ts";
import { loadFromSupabase } from "./db.ts";
import { showToast } from "../utils/utils.ts";
import { promiseWithTimeout } from "../utils/utils.ts";
import { saveAndRender } from "../ui/ui.ts";
import { openModal, closeModal, openConfirm } from "../ui/ui_modal.ts";
import {
  applyTheme,
  updateVoiceUI,
  updateSettingsUI,
} from "../ui/ui_settings.ts";
import { User } from "../types/index.ts";
import { LS_KEYS, DB_TABLES } from "./constants.ts";
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
    const avatarUrl = user.user_metadata?.avatar_url;

    if (avatarUrl) {
      avatar.textContent = "";
      avatar.style.backgroundImage = `url('${avatarUrl}')`;
      avatar.style.backgroundSize = "cover";
      avatar.style.backgroundPosition = "center";
    } else {
      avatar.style.backgroundImage = "";
      avatar.textContent = email.charAt(0).toUpperCase();
    }
    name.textContent = displayName;
    profileBtn.title = `Вошли как ${email}`;
  } else {
    avatar.style.backgroundImage = "";
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

export function openProfileModal(focusPassword = false) {
  // АТОМАРНОЕ ИЗМЕНЕНИЕ: Синхронная проверка состояния.
  // Мы доверяем state.currentUser, который обновляется в app.ts.
  // Это гарантирует мгновенный отклик UI в том же цикле событий.

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
    const avatarImg = document.getElementById(
      "profile-avatar-img",
    ) as HTMLImageElement;
    const avatarText = document.getElementById("profile-avatar-text");
    const avatarInput = document.getElementById(
      "avatar-upload",
    ) as HTMLInputElement;
    const deleteAvatarBtn = document.getElementById("delete-avatar-btn");

    if (avatarEl && avatarImg && avatarText) {
      const avatarUrl = user.user_metadata?.avatar_url;
      if (avatarUrl) {
        avatarImg.src = String(avatarUrl);
        avatarImg.style.display = "block";
        avatarText.style.display = "none";
        if (deleteAvatarBtn) deleteAvatarBtn.style.display = "flex";
      } else {
        avatarImg.style.display = "none";
        avatarText.style.display = "block";
        avatarText.textContent = (user.email || "U").charAt(0).toUpperCase();
        if (deleteAvatarBtn) deleteAvatarBtn.style.display = "none";
      }

      // Обработчик клика для загрузки
      if (avatarInput) {
        avatarEl.onclick = () => avatarInput.click();
        avatarInput.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) return;

          if (file.size > 5 * 1024 * 1024) {
            showToast("❌ Файл слишком большой (макс 5MB)");
            return;
          }

          showToast("⏳ Загрузка аватара...");
          try {
            const { data, error } = await AuthService.uploadAvatar(
              user.id,
              file,
            );
            if (error) throw error;

            if (data.user) {
              updateAuthUI(data.user as unknown as User);
              // Мгновенное обновление в модальном окне
              if (data.user.user_metadata.avatar_url) {
                avatarImg.src = data.user.user_metadata.avatar_url;
                avatarImg.style.display = "block";
                avatarText.style.display = "none";
                if (deleteAvatarBtn) deleteAvatarBtn.style.display = "flex";
              }
              showToast("✅ Аватар обновлен");
            }
          } catch (err: unknown) {
            console.error("Avatar upload error:", err);
            showToast("❌ Ошибка загрузки: " + (err as Error).message);
          }
        };
      }

      // Обработчик удаления
      if (deleteAvatarBtn) {
        deleteAvatarBtn.onclick = (e) => {
          e.stopPropagation();
          openConfirm("Удалить фото профиля?", async () => {
            showToast("⏳ Удаление...");
            try {
              const { data, error } = await AuthService.deleteAvatar(user.id);
              if (error) throw error;

              updateAuthUI(data.user as unknown as User);
              // Мгновенное обновление UI
              avatarImg.style.display = "none";
              avatarText.style.display = "block";
              avatarText.textContent = (user.email || "U")
                .charAt(0)
                .toUpperCase();
              deleteAvatarBtn.style.display = "none";
              showToast("✅ Фото удалено");
            } catch (err: unknown) {
              console.error("Avatar delete error:", err);
              showToast("❌ Ошибка: " + (err as Error).message);
            }
          });
        };
      }
    }

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

    // Очистка поля смены email
    const emailInput = document.getElementById(
      "new-email",
    ) as HTMLInputElement | null;
    if (emailInput) emailInput.value = "";

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

    if (focusPassword) {
      setTimeout(() => {
        const passInput = document.getElementById("new-password");
        if (passInput) {
          passInput.focus();
          passInput.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300); // Ждем завершения анимации открытия модалки
    }
  } else {
    // Если пользователя нет в стейте - сразу открываем вход.
    // Никаких await, никаких задержек.
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

  // Используем тот же URL, что и для входа, чтобы избежать проблем с редиректами
  const redirectTo = import.meta.env.DEV
    ? "http://localhost:5173/"
    : window.location.origin + window.location.pathname;

  try {
    const { error } = await AuthService.resetPasswordForEmail(
      email,
      redirectTo,
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
    if (data.user) await finalizeAuth(data.user as unknown as User);
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
      if (data.user) await finalizeAuth(data.user as unknown as User);
    }
  } catch (e) {
    handleAuthError(e);
  }
}

async function finalizeAuth(user: User) {
  showToast("✅ Успешно!");

  // Анимация успеха (конфетти + вспышка)
  if (typeof window.confetti === "function") {
    window.confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      zIndex: 20005,
    });
  }
  document.body.classList.add("correct-flash");
  setTimeout(() => document.body.classList.remove("correct-flash"), 1000);

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
  // В режиме разработки принудительно используем localhost,
  // так как Google Cloud может не разрешать редиректы на локальные IP (192.168.x.x).
  // Это гарантирует, что после входа Google вернет вас на основной адрес разработки.
  // Для продакшена будет использоваться реальный домен сайта.
  const redirectTo = import.meta.env.DEV
    ? "http://localhost:5173/"
    : window.location.origin + window.location.pathname;

  const { error } = await AuthService.signInWithGoogle(redirectTo);
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

export async function handleChangeEmail() {
  const newEmailInput = document.getElementById(
    "new-email",
  ) as HTMLInputElement | null;
  if (!newEmailInput) return;
  const newEmail = newEmailInput.value.trim();

  if (!newEmail) {
    alert("Введите новый Email");
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(newEmail)) {
    alert("Некорректный формат Email");
    return;
  }

  showToast("⏳ Обновление...");
  const { error } = await AuthService.updateEmail(newEmail);

  if (error) {
    console.error("Update Email Error:", error);
    alert("Ошибка: " + error.message);
  } else {
    alert(
      `На адрес ${newEmail} отправлено письмо для подтверждения.\n\nВАЖНО: Проверьте также старую почту, если требуется подтверждение смены.`,
    );
    newEmailInput.value = "";
  }
}

export async function handleLogout() {
  openConfirm("Вы уверены, что хотите выйти?", async () => {
    showToast("👋 До встречи!");
    try {
      // Attempt to sign out from Supabase with a timeout
      // If it takes too long (e.g., network issue), we proceed anyway
      await promiseWithTimeout(
        AuthService.signOut(),
        5000,
        new Error("Logout request timed out"),
      );
    } catch (e) {
      console.error("Logout error:", e);
      showToast(
        "⚠️ Ошибка выхода из аккаунта на сервере или таймаут. Очистка локальных данных.",
      );
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
        LS_KEYS.ONBOARDING, // Reset onboarding status on logout
      ];
      keysToRemove.forEach((k) => localStorage.removeItem(k));

      // Explicitly remove common Supabase auth tokens from local storage
      localStorage.removeItem("sb-supabase-auth-token");
      localStorage.removeItem("supabase.auth.token");

      location.reload();
    }
  });
}

export async function handleDeleteAccount() {
  const {
    data: { session },
  } = await AuthService.getSession();

  if (!session?.user) {
    showToast("Вы не авторизованы");
    return;
  }

  const providers = session.user.app_metadata?.providers || [];
  const isEmailAuth = providers.includes("email");

  openConfirm(
    "Удалить аккаунт навсегда? Все данные будут потеряны. Это действие нельзя отменить.",
    async () => {
      showToast("⏳ Удаление данных...");
      const uid = session.user.id;

      try {
        // --- Deleting user data from all related tables ---

        // 1. Delete avatar from storage
        await AuthService.deleteAvatar(uid);

        // 2. Get all list IDs owned by the user
        const { data: lists, error: listError } = await client
          .from(DB_TABLES.USER_LISTS)
          .select("id")
          .eq("user_id", uid);

        if (listError) throw listError;

        if (lists && lists.length > 0) {
          const listIds = lists.map((l) => l.id);
          // 3. Delete items from those lists first
          await client
            .from(DB_TABLES.LIST_ITEMS)
            .delete()
            .in("list_id", listIds);
        }

        // 4. Delete all other user-specific data in parallel
        await Promise.all([
          client.from(DB_TABLES.USER_PROGRESS).delete().eq("user_id", uid),
          client.from(DB_TABLES.USER_GLOBAL_STATS).delete().eq("user_id", uid),
          client.from(DB_TABLES.WORD_REQUESTS).delete().eq("user_id", uid),
          client.from(DB_TABLES.USER_LISTS).delete().eq("user_id", uid),
          // Delete words created by the user from the main vocabulary table
          client.from(DB_TABLES.VOCABULARY).delete().eq("created_by", uid),
        ]);

        // 5. Call the Edge Function to delete the user from auth.users
        const { data: funcData, error: functionError } =
          await client.functions.invoke("delete-user");

        if (functionError) {
          // Even if the function fails, we proceed with local cleanup.
          // The user data is already deleted from tables.
          console.error("Edge Function delete-user error:", functionError);
          showToast("❌ Ошибка полного удаления аккаунта на сервере.");
        } else {
          console.info("✅ Edge Function delete-user success:", funcData);
        }

        // 6. Sign out and clean up local data
        await AuthService.signOut();
        localStorage.clear();

        alert("Аккаунт и все данные удалены.");
        location.reload();
      } catch (e) {
        console.error("Delete account error:", e);
        showToast("❌ Ошибка при удалении данных: " + (e as Error).message);
      }
    },
    {
      confirmText: "Удалить навсегда",
      cancelText: "Отмена",
      showInput: isEmailAuth,
      inputPlaceholder: "Введите пароль для подтверждения",
      onValidate: isEmailAuth
        ? async (val) => {
            if (!val) {
              showToast("Введите пароль");
              return false;
            }
            const { error } = await AuthService.signInWithPassword(
              session.user.email!,
              val,
            );
            if (error) {
              showToast("❌ Неверный пароль");
              return false;
            }
            return true;
          }
        : undefined,
    },
  );
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
