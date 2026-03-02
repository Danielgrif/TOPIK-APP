CREATE TABLE IF NOT EXISTS public.list_items (
    list_id uuid NOT NULL,
    word_id bigint NOT NULL,
    added_at timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX list_items_pkey ON public.list_items USING btree (list_id, word_id);
CREATE INDEX idx_list_items_lookup ON public.list_items USING btree (list_id, word_id);

ALTER TABLE public.list_items ADD CONSTRAINT list_items_list_id_fkey FOREIGN KEY (list_id) REFERENCES user_lists(id) ON DELETE CASCADE;

ALTER TABLE public.list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can delete items from own lists" ON public.list_items FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM user_lists ul
  WHERE ((ul.id = list_items.list_id) AND (ul.user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "Users can insert items to own lists" ON public.list_items FOR INSERT TO authenticated USING () WITH CHECK ((EXISTS ( SELECT 1
   FROM user_lists ul
  WHERE ((ul.id = list_items.list_id) AND (ul.user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "Users can view items in visible lists" ON public.list_items FOR SELECT TO public USING ((EXISTS ( SELECT 1
   FROM user_lists ul
  WHERE ((ul.id = list_items.list_id) AND ((ul.is_public = true) OR (ul.user_id = ( SELECT auth.uid() AS uid)))))));