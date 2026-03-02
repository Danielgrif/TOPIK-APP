import { client } from "./supabaseClient.ts";
import { DB_TABLES, DB_BUCKETS } from "./constants.ts";
import type {
  Session,
  User,
  Subscription,
  AuthError,
} from "@supabase/supabase-js";

export const AuthService = {
  async getSession(): Promise<{
    data: { session: Session | null };
    error: AuthError | null;
  }> {
    return await client.auth.getSession();
  },

  async getUser(): Promise<{
    data: { user: User | null };
    error: AuthError | null;
  }> {
    return await client.auth.getUser();
  },

  async updateProfile(fullName: string) {
    return await client.auth.updateUser({
      data: { full_name: fullName },
    });
  },

  async uploadAvatar(userId: string, file: File) {
    const fileExt = file.name.split(".").pop();
    const fileName = `avatars/${userId}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await client.storage
      .from(DB_BUCKETS.IMAGES)
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = client.storage
      .from(DB_BUCKETS.IMAGES)
      .getPublicUrl(fileName);
    return await client.auth.updateUser({
      data: { avatar_url: data.publicUrl },
    });
  },

  async deleteAvatar(userId: string) {
    // Пытаемся найти и удалить старые файлы аватара, чтобы не засорять хранилище
    try {
      const { data: list } = await client.storage
        .from(DB_BUCKETS.IMAGES)
        .list("avatars", {
          search: userId,
        });
      if (list && list.length > 0) {
        const filesToRemove = list.map((f) => `avatars/${f.name}`);
        await client.storage.from(DB_BUCKETS.IMAGES).remove(filesToRemove);
      }
    } catch (e) {
      console.warn("Avatar cleanup warning:", e);
    }

    return await client.auth.updateUser({ data: { avatar_url: null } });
  },

  async updatePassword(password: string) {
    return await client.auth.updateUser({ password });
  },

  async updateEmail(email: string) {
    return await client.auth.updateUser({ email });
  },

  async resetPasswordForEmail(email: string, redirectTo: string) {
    return await client.auth.resetPasswordForEmail(email, { redirectTo });
  },

  async signInWithPassword(email: string, password: string) {
    return await client.auth.signInWithPassword({
      email,
      password,
    });
  },

  async signUp(email: string, password: string) {
    return await client.auth.signUp({ email, password });
  },

  async initUserStats(userId: string) {
    try {
      await client
        .from(DB_TABLES.USER_GLOBAL_STATS)
        .insert([{ user_id: userId, xp: 0, level: 1 }]);
    } catch (e) {
      // Игнорируем, если статистика уже существует
      console.warn("Stats init warning:", e);
    }
  },

  async signInWithGoogle(redirectTo: string) {
    return await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  },

  async signOut() {
    return await client.auth.signOut();
  },

  onAuthStateChange(
    callback: (event: string, session: Session | null) => void,
  ): { data: { subscription: Subscription } } {
    return client.auth.onAuthStateChange(callback);
  },
};
