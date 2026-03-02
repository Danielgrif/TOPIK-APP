CREATE TABLE IF NOT EXISTS public.user_progress (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    word_id bigint NOT NULL,
    is_learned boolean DEFAULT false,
    is_mistake boolean DEFAULT false,
    attempts integer DEFAULT 0,
    correct integer DEFAULT 0,
    last_review bigint,
    sm2_interval numeric,
    sm2_repetitions integer,
    sm2_ef numeric,
    sm2_next_review bigint,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    is_favorite boolean,
    learned_date bigint
);

CREATE UNIQUE INDEX user_progress_pkey ON public.user_progress USING btree (id);
CREATE INDEX idx_user_progress_schedule ON public.user_progress USING btree (user_id, is_learned, sm2_next_review);
CREATE UNIQUE INDEX user_progress_user_id_word_id_key ON public.user_progress USING btree (user_id, word_id);
CREATE INDEX idx_public_user_progress_user_id_word_id ON public.user_progress USING btree (user_id, word_id);

ALTER TABLE public.user_progress ADD CONSTRAINT user_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can delete own progress" ON public.user_progress FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can insert own progress" ON public.user_progress FOR INSERT TO authenticated USING () WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can update own progress" ON public.user_progress FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can view own progress" ON public.user_progress FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));