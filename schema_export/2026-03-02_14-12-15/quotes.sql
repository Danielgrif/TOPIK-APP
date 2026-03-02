CREATE TABLE IF NOT EXISTS public.quotes (
    id bigint NOT NULL,
    quote_kr text NOT NULL,
    quote_ru text NOT NULL,
    literal_translation text,
    explanation text,
    usage_example text,
    category text,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    audio_url text
);

CREATE UNIQUE INDEX quotes_pkey ON public.quotes USING btree (id);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public quotes are viewable by everyone" ON public.quotes FOR SELECT TO public USING (true);