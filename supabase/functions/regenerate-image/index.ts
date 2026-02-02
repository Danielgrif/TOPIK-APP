// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Вспомогательная функция для поиска в Pixabay
async function searchPixabay(
  apiKey: string,
  query: string,
  lang: string = "en",
): Promise<{ url: string; source: string }[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    // eslint-disable-next-line no-console
    console.log(`Searching Pixabay for: "${query}" (${lang})`);
    const res = await fetch(
      `https://pixabay.com/api/?key=${apiKey}&q=${encodedQuery}&image_type=photo&per_page=3&lang=${lang}&safesearch=true&orientation=horizontal`,
    );
    if (!res.ok) {
      console.warn(`Pixabay API error: ${res.status} ${res.statusText}`);
      return [];
    }
    const data = await res.json();
    if (data.hits && data.hits.length > 0) {
      // Возвращаем до 5 результатов
      return (
        data.hits
          .slice(0, 5)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((hit: any) => ({ url: hit.webformatURL, source: "pixabay" }))
      );
    }
  } catch (e) {
    console.error("Pixabay search exception:", e);
  }
  return [];
}

// Вспомогательная функция для поиска в Unsplash (если есть ключ)
async function searchUnsplash(
  accessKey: string,
  query: string,
): Promise<{ url: string; source: string }[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    // eslint-disable-next-line no-console
    console.log(`Searching Unsplash for: "${query}"`);
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodedQuery}&per_page=3&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${accessKey}` } },
    );
    if (!res.ok) {
      console.warn(`Unsplash API error: ${res.status} ${res.statusText}`);
      return [];
    }
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      return (
        data.results
          .slice(0, 5)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((hit: any) => ({ url: hit.urls.regular, source: "unsplash" }))
      );
    }
  } catch (e) {
    console.error("Unsplash search exception:", e);
  }
  return [];
}

// Вспомогательная функция для поиска в Pexels
async function searchPexels(
  apiKey: string,
  query: string,
  lang: string = "en-US",
): Promise<{ url: string; source: string }[]> {
  try {
    const encodedQuery = encodeURIComponent(query);
    // eslint-disable-next-line no-console
    console.log(`Searching Pexels for: "${query}" (${lang})`);
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodedQuery}&per_page=3&locale=${lang}&orientation=landscape`,
      { headers: { Authorization: apiKey } },
    );
    if (!res.ok) {
      console.warn(`Pexels API error: ${res.status} ${res.statusText}`);
      return [];
    }
    const data = await res.json();
    if (data.photos && data.photos.length > 0) {
      return (
        data.photos
          .slice(0, 5)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((hit: any) => ({ url: hit.src.large, source: "pexels" }))
      );
    }
  } catch (e) {
    console.error("Pexels search exception:", e);
  }
  return [];
}

async function optimizeAndUpload(supabaseAdmin, imageBlob, id, source) {
  const image = await Image.decode(await imageBlob.arrayBuffer());

  // Подгоняем изображение под 1024px по большей стороне (contain), чтобы не обрезать
  const MAX_SIZE = 1024;
  if (image.width > MAX_SIZE || image.height > MAX_SIZE) {
    const scale = Math.min(MAX_SIZE / image.width, MAX_SIZE / image.height);
    image.scale(scale);
  }

  const optimizedData = await image.encodeJPEG(80);

  const fileName = `${id}_${source}_${Date.now()}.jpg`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("image-files")
    .upload(fileName, optimizedData, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from("image-files").getPublicUrl(fileName);

  return `${publicUrl}?t=${Date.now()}`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { mode, id, word, translation, selectedUrl, source } =
      await req.json();

    const PIXABAY_API_KEY = Deno.env.get("PIXABAY_API_KEY");
    const UNSPLASH_ACCESS_KEY = Deno.env.get("UNSPLASH_ACCESS_KEY"); // Опционально
    const PEXELS_API_KEY = Deno.env.get("PEXELS_API_KEY"); // Опционально
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAdmin = createClient(
      SUPABASE_URL!,
      SUPABASE_SERVICE_ROLE_KEY!,
    );

    if (mode === "search") {
      if (!id) throw new Error("Missing id");
      const clean = (str: string) => (str ? str.split(/[,;(]/)[0].trim() : "");
      const queryRu = clean(translation);
      const queryKr = clean(word);

      const searchPromises = [];
      if (PIXABAY_API_KEY) {
        if (queryRu)
          searchPromises.push(searchPixabay(PIXABAY_API_KEY, queryRu, "ru"));
        if (queryKr)
          searchPromises.push(searchPixabay(PIXABAY_API_KEY, queryKr, "ko"));
      }
      if (UNSPLASH_ACCESS_KEY) {
        if (queryRu)
          searchPromises.push(searchUnsplash(UNSPLASH_ACCESS_KEY, queryRu));
        if (queryKr)
          searchPromises.push(searchUnsplash(UNSPLASH_ACCESS_KEY, queryKr));
      }
      if (PEXELS_API_KEY) {
        if (queryRu)
          searchPromises.push(searchPexels(PEXELS_API_KEY, queryRu, "ru-RU"));
        if (queryKr)
          searchPromises.push(searchPexels(PEXELS_API_KEY, queryKr, "ko-KR"));
      }

      const results = await Promise.allSettled(searchPromises);
      const allImages = results
        .filter((r) => r.status === "fulfilled" && r.value)
        .flatMap((r) => r.value);

      // Убираем дубликаты по URL
      const uniqueImages = Array.from(
        new Map(allImages.map((item) => [item.url, item])).values(),
      );

      // Перемешиваем для разнообразия
      uniqueImages.sort(() => Math.random() - 0.5);

      return new Response(JSON.stringify({ images: uniqueImages }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else if (mode === "finalize") {
      if (!id || !selectedUrl || !source)
        throw new Error("Missing parameters for finalize");

      const imageRes = await fetch(selectedUrl);
      if (!imageRes.ok) throw new Error("Failed to download image from source");
      const imageBlob = await imageRes.blob();

      const finalUrl = await optimizeAndUpload(
        supabaseAdmin,
        imageBlob,
        id,
        source,
      );

      const { error: dbError } = await supabaseAdmin
        .from("vocabulary")
        .update({ image: finalUrl, image_source: source })
        .eq("id", id);

      if (dbError) throw dbError;

      return new Response(JSON.stringify({ finalUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else if (mode === "auto") {
      // АВТОМАТИЧЕСКИЙ РЕЖИМ (для Python-воркера)
      if (!id) throw new Error("Missing id");

      const clean = (str: string) => (str ? str.split(/[,;(]/)[0].trim() : "");
      const queryRu = clean(translation);
      const queryKr = clean(word);

      let selectedImage = null;

      // 1. Pixabay
      if (!selectedImage && PIXABAY_API_KEY) {
        let results = [];
        if (queryRu)
          results = await searchPixabay(PIXABAY_API_KEY, queryRu, "ru");
        if (results.length === 0 && queryKr)
          results = await searchPixabay(PIXABAY_API_KEY, queryKr, "ko");
        if (results.length > 0)
          selectedImage = results[Math.floor(Math.random() * results.length)];
      }

      // 2. Unsplash
      if (!selectedImage && UNSPLASH_ACCESS_KEY) {
        let results = [];
        if (queryRu)
          results = await searchUnsplash(UNSPLASH_ACCESS_KEY, queryRu);
        if (results.length === 0 && queryKr)
          results = await searchUnsplash(UNSPLASH_ACCESS_KEY, queryKr);
        if (results.length > 0)
          selectedImage = results[Math.floor(Math.random() * results.length)];
      }

      // 3. Pexels
      if (!selectedImage && PEXELS_API_KEY) {
        let results = [];
        if (queryRu)
          results = await searchPexels(PEXELS_API_KEY, queryRu, "ru-RU");
        if (results.length === 0 && queryKr)
          results = await searchPexels(PEXELS_API_KEY, queryKr, "ko-KR");
        if (results.length > 0)
          selectedImage = results[Math.floor(Math.random() * results.length)];
      }

      if (!selectedImage) {
        return new Response(JSON.stringify({ error: "No images found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        });
      }

      // Скачиваем и сохраняем
      const imageRes = await fetch(selectedImage.url);
      if (!imageRes.ok) throw new Error("Failed to download image");
      const imageBlob = await imageRes.blob();

      const finalUrl = await optimizeAndUpload(
        supabaseAdmin,
        imageBlob,
        id,
        selectedImage.source,
      );

      // Обновляем БД
      const { error: dbError } = await supabaseAdmin
        .from("vocabulary")
        .update({ image: finalUrl, image_source: selectedImage.source })
        .eq("id", id);
      if (dbError) throw dbError;

      return new Response(
        JSON.stringify({ finalUrl, source: selectedImage.source }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    } else {
      throw new Error("Invalid mode specified");
    }
  } catch (error) {
    console.error("Edge Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
