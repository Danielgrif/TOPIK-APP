-- =============================================================================
-- 0001_initial_rls.sql
-- Включение RLS и базовые политики для таблиц и storage-бакетов TOPIK APP.
-- Файл только создаёт политики; он НЕ применяется автоматически к БД.
-- Предполагается стандартная схема Supabase: auth.users, public.profiles,
-- у пользовательских таблиц есть колонка user_id (у vocabulary — created_by/user_id).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Вспомогательная функция: проверка роли admin без рекурсии в RLS profiles.
-- SECURITY DEFINER + жёсткий search_path защищают от подмены search_path.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

COMMENT ON FUNCTION public.is_admin() IS
  'Возвращает true, если текущий пользователь (auth.uid()) имеет роль admin.';

-- =============================================================================
-- 1. ПУБЛИЧНЫЕ СПРАВОЧНИКИ
-- =============================================================================

-- vocabulary: публичная часть словаря читается всеми; приватные слова — только автор.
ALTER TABLE public.vocabulary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vocabulary_select ON public.vocabulary;
CREATE POLICY vocabulary_select ON public.vocabulary
  FOR SELECT TO anon, authenticated
  USING (
    is_public IS TRUE
    OR created_by = auth.uid()
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS vocabulary_insert_own ON public.vocabulary;
CREATE POLICY vocabulary_insert_own ON public.vocabulary
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() OR user_id = auth.uid());

DROP POLICY IF EXISTS vocabulary_update_own ON public.vocabulary;
CREATE POLICY vocabulary_update_own ON public.vocabulary
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR user_id = auth.uid())
  WITH CHECK (created_by = auth.uid() OR user_id = auth.uid());

DROP POLICY IF EXISTS vocabulary_delete_own ON public.vocabulary;
CREATE POLICY vocabulary_delete_own ON public.vocabulary
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR user_id = auth.uid());

COMMENT ON TABLE public.vocabulary IS
  'Словарь: is_public=true доступен всем, остальные строки — только создателю/владельцу.';

-- quotes: публичный справочник цитат, изменение — только service role/admin.
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quotes_public_select ON public.quotes;
CREATE POLICY quotes_public_select ON public.quotes
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS quotes_admin_all ON public.quotes;
CREATE POLICY quotes_admin_all ON public.quotes
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================================================
-- 2. ПОЛЬЗОВАТЕЛЬСКИЕ ТАБЛИЦЫ: доступ строго по auth.uid()
-- =============================================================================

ALTER TABLE public.word_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS word_requests_own_all ON public.word_requests;
CREATE POLICY word_requests_own_all ON public.word_requests
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS word_requests_admin_select ON public.word_requests;
CREATE POLICY word_requests_admin_select ON public.word_requests
  FOR SELECT TO authenticated
  USING (public.is_admin());

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_progress_own_all ON public.user_progress;
CREATE POLICY user_progress_own_all ON public.user_progress
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.user_lists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_lists_own_all ON public.user_lists;
CREATE POLICY user_lists_own_all ON public.user_lists
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- list_items: владелец определяется через родительский user_lists.
ALTER TABLE public.list_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS list_items_own_all ON public.list_items;
CREATE POLICY list_items_own_all ON public.list_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_lists ul
      WHERE ul.id = list_items.list_id
        AND ul.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_lists ul
      WHERE ul.id = list_items.list_id
        AND ul.user_id = auth.uid()
    )
  );

ALTER TABLE public.user_vocabulary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_vocabulary_own_all ON public.user_vocabulary;
CREATE POLICY user_vocabulary_own_all ON public.user_vocabulary
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.user_global_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_global_stats_own_all ON public.user_global_stats;
CREATE POLICY user_global_stats_own_all ON public.user_global_stats
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.user_favorite_quotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_favorite_quotes_own_all ON public.user_favorite_quotes;
CREATE POLICY user_favorite_quotes_own_all ON public.user_favorite_quotes
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- 3. ПРОФИЛИ И ОТЧЁТЫ
-- =============================================================================

-- profiles: пользователь видит только себя; роль может менять только admin.
-- Пользовательские обновления профиля идут через auth.updateUser + триггер.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;
CREATE POLICY profiles_admin_all ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS profiles_insert_self ON public.profiles;
CREATE POLICY profiles_insert_self ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- feedback_reports: пользователь читает/создаёт свои отчёты, admin — все.
ALTER TABLE public.feedback_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feedback_reports_own_select ON public.feedback_reports;
CREATE POLICY feedback_reports_own_select ON public.feedback_reports
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS feedback_reports_own_insert ON public.feedback_reports;
CREATE POLICY feedback_reports_own_insert ON public.feedback_reports
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS feedback_reports_admin_all ON public.feedback_reports;
CREATE POLICY feedback_reports_admin_all ON public.feedback_reports
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================================================
-- 4. AI-КЭШ
-- Ключи кэша общие, пользовательского идентификатора нет: прямой доступ
-- закрыт для клиентов, работает только service role (Edge Functions) и admin.
-- =============================================================================

ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_cache_admin_all ON public.ai_cache;
CREATE POLICY ai_cache_admin_all ON public.ai_cache
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================================================
-- 5. SUPABASE STORAGE (storage.objects)
-- Публичные бакеты audio-files / image-files читаются всеми, запись — только
-- в свою папку; вложения feedback_attachments приватны для владельца и admin.
-- =============================================================================

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Публичное чтение медиа (нужно для getPublicUrl без авторизации).
DROP POLICY IF EXISTS storage_audio_public_read ON storage.objects;
CREATE POLICY storage_audio_public_read ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'audio-files');

DROP POLICY IF EXISTS storage_images_public_read ON storage.objects;
CREATE POLICY storage_images_public_read ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'image-files');

DROP POLICY IF EXISTS storage_feedback_owner_read ON storage.objects;
CREATE POLICY storage_feedback_owner_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'feedback_attachments'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

-- Запись только в собственную папку: <uid>/... или avatars/<uid>_...
DROP POLICY IF EXISTS storage_audio_owner_write ON storage.objects;
CREATE POLICY storage_audio_owner_write ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'audio-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'audio-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS storage_images_owner_write ON storage.objects;
CREATE POLICY storage_images_owner_write ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'image-files'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR name LIKE 'avatars/' || auth.uid()::text || '%'
    )
  )
  WITH CHECK (
    bucket_id = 'image-files'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR name LIKE 'avatars/' || auth.uid()::text || '%'
    )
  );

DROP POLICY IF EXISTS storage_feedback_owner_write ON storage.objects;
CREATE POLICY storage_feedback_owner_write ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'feedback_attachments'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  )
  WITH CHECK (
    bucket_id = 'feedback_attachments'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

-- Admin имеет полный доступ ко всем бакетам.
DROP POLICY IF EXISTS storage_admin_all ON storage.objects;
CREATE POLICY storage_admin_all ON storage.objects
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =============================================================================
-- Итог: service role (Edge Functions) обходит RLS; anon видит только
-- публичные справочники/медиа; authenticated — только свои строки и admin-операции.
-- =============================================================================
