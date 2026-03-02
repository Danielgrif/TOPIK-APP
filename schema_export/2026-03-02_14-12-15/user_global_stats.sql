CREATE TABLE IF NOT EXISTS public.user_global_stats (
    user_id uuid NOT NULL,
    xp integer DEFAULT 0,
    level integer DEFAULT 1,
    sprint_record integer DEFAULT 0,
    survival_record integer DEFAULT 0,
    streak_count integer DEFAULT 0,
    streak_last_date text,
    achievements jsonb DEFAULT '[]'::jsonb,
    sessions jsonb DEFAULT '[]'::jsonb,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    coins integer DEFAULT 0,
    streak_freeze integer DEFAULT 0,
    settings jsonb DEFAULT '{}'::jsonb,
    avatar_url text,
    full_name text,
    league text DEFAULT 'Bronze'::text,
    weekly_xp bigint DEFAULT 0,
    last_week_id text
);

CREATE UNIQUE INDEX user_global_stats_pkey ON public.user_global_stats USING btree (user_id);

ALTER TABLE public.user_global_stats ADD CONSTRAINT user_global_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_global_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can delete own stats" ON public.user_global_stats FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can insert own stats" ON public.user_global_stats FOR INSERT TO authenticated USING () WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can update own stats" ON public.user_global_stats FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can view all stats" ON public.user_global_stats FOR SELECT TO public USING (true);