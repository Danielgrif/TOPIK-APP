CREATE TABLE IF NOT EXISTS public.vocabulary (
    id bigint NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    word_kr text,
    word_hanja text,
    translation text,
    level text,
    synonyms text,
    my_notes text,
    example_kr text,
    example_ru text,
    antonyms text,
    user_id uuid DEFAULT auth.uid(),
    topic text,
    category text,
    collocations text,
    audio_url text,
    image text,
    example_audio text,
    audio_male text,
    image_source text,
    type text DEFAULT 'word'::text,
    deleted_at timestamp with time zone,
    grammar_info text,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    created_by uuid,
    is_public boolean DEFAULT false
);

CREATE INDEX idx_public_vocabulary_user_id ON public.vocabulary USING btree (user_id);
CREATE UNIQUE INDEX vocabulary_pkey ON public.vocabulary USING btree (id);
CREATE UNIQUE INDEX unique_word_translation ON public.vocabulary USING btree (word_kr, translation);
CREATE INDEX idx_vocabulary_topic ON public.vocabulary USING btree (topic);
CREATE INDEX idx_vocabulary_category ON public.vocabulary USING btree (category);
CREATE INDEX idx_vocabulary_level ON public.vocabulary USING btree (level);
CREATE INDEX idx_vocabulary_deleted_at ON public.vocabulary USING btree (deleted_at);
CREATE INDEX idx_vocabulary_word_kr ON public.vocabulary USING btree (word_kr);
CREATE INDEX idx_vocabulary_user_id ON public.vocabulary USING btree (user_id);

ALTER TABLE public.vocabulary ADD CONSTRAINT vocabulary_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE public.vocabulary ADD CONSTRAINT vocabulary_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can delete own words" ON public.vocabulary FOR DELETE TO authenticated USING ((( SELECT auth.uid() AS uid) = created_by));
CREATE POLICY "Users can insert own words" ON public.vocabulary FOR INSERT TO authenticated USING () WITH CHECK ((( SELECT auth.uid() AS uid) = created_by));
CREATE POLICY "Users can update own words" ON public.vocabulary FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = created_by));
CREATE POLICY "View public and own words" ON public.vocabulary FOR SELECT TO public USING (((is_public = true) OR (( SELECT auth.uid() AS uid) = created_by)));