import { client } from "./supabaseClient.ts";
import { DB_TABLES } from "./constants.ts";
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

  async updatePassword(password: string) {
    return await client.auth.updateUser({ password });
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
