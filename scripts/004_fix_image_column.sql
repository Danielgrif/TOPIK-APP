-- 🛠️ ИСПРАВЛЕНИЕ КОЛОНКИ: image_pixabay -> image_source

DO $$
BEGIN
    -- 1. Если есть image_pixabay, но нет image_source -> просто переименовываем
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'vocabulary' AND column_name = 'image_pixabay') 
       AND NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'vocabulary' AND column_name = 'image_source') THEN
        
        ALTER TABLE public.vocabulary RENAME COLUMN "image_pixabay" TO "image_source";
        
    -- 2. Если есть ОБЕ колонки (например, image_source создалась пустой) -> переносим данные и удаляем старую
    ELSIF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'vocabulary' AND column_name = 'image_pixabay') 
          AND EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'vocabulary' AND column_name = 'image_source') THEN
          
        -- Копируем данные, где image_source пустой
        UPDATE public.vocabulary 
        SET image_source = image_pixabay 
        WHERE image_source IS NULL;
        
        -- Удаляем старую колонку (раскомментируйте строку ниже, если уверены)
        -- ALTER TABLE public.vocabulary DROP COLUMN "image_pixabay";
    END IF;
END $$;