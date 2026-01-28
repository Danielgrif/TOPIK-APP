-- Создаем функцию для очистки корзины
-- Теперь она принимает количество дней для хранения
CREATE OR REPLACE FUNCTION cleanup_deleted_words(days_to_keep integer DEFAULT 30)
RETURNS void AS $$
BEGIN
    DELETE FROM public.vocabulary
    WHERE deleted_at IS NOT NULL
    -- Используем параметр, чтобы сделать срок хранения настраиваемым
    AND deleted_at < now() - (days_to_keep || ' days')::interval;
END;
$$ LANGUAGE plpgsql;

-- Теперь эту функцию можно вызывать по расписанию