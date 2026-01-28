-- Создаем функцию для очистки корзины
CREATE OR REPLACE FUNCTION cleanup_deleted_words()
RETURNS void AS $$
BEGIN
    DELETE FROM public.vocabulary
    WHERE deleted_at IS NOT NULL
    AND deleted_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql;

-- Теперь эту функцию можно вызывать по расписанию