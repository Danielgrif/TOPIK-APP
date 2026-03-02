CREATE TABLE IF NOT EXISTS public.word_requests (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid,
    word_kr text NOT NULL,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    target_list_id uuid,
    translation text,
    word_hanja text,
    topic text,
    category text,
    level text,
    type text DEFAULT 'word'::text,
    audio_url text,
    audio_male text,
    image text,
    image_source text,
    example_kr text,
    example_ru text,
    example_audio text,
    synonyms text,
    antonyms text,
    collocations text,
    my_notes text,
    grammar_info text
);

CREATE UNIQUE INDEX word_requests_pkey ON public.word_requests USING btree (id);
CREATE INDEX idx_word_requests_status ON public.word_requests USING btree (status);
CREATE INDEX idx_word_requests_target_list_id ON public.word_requests USING btree (target_list_id);
CREATE INDEX idx_word_requests_user_id ON public.word_requests USING btree (user_id);

ALTER TABLE public.word_requests ADD CONSTRAINT word_requests_target_list_id_fkey FOREIGN KEY (target_list_id) REFERENCES user_lists(id) ON DELETE SET NULL;
ALTER TABLE public.word_requests ADD CONSTRAINT word_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE public.word_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can delete own requests" ON public.word_requests FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can insert own requests" ON public.word_requests FOR INSERT TO authenticated USING () WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY "Users can view own requests" ON public.word_requests FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));