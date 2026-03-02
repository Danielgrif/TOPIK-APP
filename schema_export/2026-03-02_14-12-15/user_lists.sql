CREATE TABLE IF NOT EXISTS public.user_lists (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    title text NOT NULL,
    icon text DEFAULT '📁'::text,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    is_public boolean DEFAULT false
);

CREATE UNIQUE INDEX user_lists_pkey ON public.user_lists USING btree (id);
CREATE INDEX idx_user_lists_user_id ON public.user_lists USING btree (user_id);

ALTER TABLE public.user_lists ADD CONSTRAINT user_lists_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE public.user_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can delete own lists" ON public.user_lists FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can insert own lists" ON public.user_lists FOR INSERT TO authenticated USING () WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can update own lists" ON public.user_lists FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can view own lists" ON public.user_lists FOR SELECT TO public USING (((( SELECT auth.uid() AS uid) = user_id) OR (is_public = true)));