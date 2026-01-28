-- 🛠️ ИСПРАВЛЕНИЕ УДАЛЕНИЯ СЛОВ

-- 1. Включаем каскадное удаление (ON DELETE CASCADE)
-- Это позволит удалять слово, даже если оно есть в списках или прогрессе (зависимые записи удалятся сами)

ALTER TABLE public.list_items
DROP CONSTRAINT IF EXISTS list_items_word_id_fkey,
ADD CONSTRAINT list_items_word_id_fkey
    FOREIGN KEY (word_id)
    REFERENCES public.vocabulary(id)
    ON DELETE CASCADE;

ALTER TABLE public.user_progress
DROP CONSTRAINT IF EXISTS user_progress_word_id_fkey,
ADD CONSTRAINT user_progress_word_id_fkey
    FOREIGN KEY (word_id)
    REFERENCES public.vocabulary(id)
    ON DELETE CASCADE;

-- 2. Разрешаем удалять "бесхозные" слова (у которых user_id IS NULL)
-- Если вы единственный пользователь приложения, это безопасно.

CREATE POLICY "Allow delete orphan words"
ON public.vocabulary
FOR DELETE
USING (user_id IS NULL);

-- 3. (Опционально) Присваиваем все бесхозные слова текущему пользователю, который выполняет этот запрос
-- Внимание: в SQL Editor auth.uid() может быть null, поэтому лучше просто разрешить удаление выше.
-- Но если вы хотите закрепить слова за собой, выполните это отдельно, подставив свой UUID:
-- UPDATE public.vocabulary SET user_id = 'ВАШ-UUID-ЗДЕСЬ' WHERE user_id IS NULL;

-- 4. Убедимся, что RLS включен
ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;