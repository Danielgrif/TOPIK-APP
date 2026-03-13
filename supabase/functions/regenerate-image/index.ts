import { serve } from "std/http/server.ts";
import { Image } from "imagescript";
import { getSupabaseAdmin } from "shared/clients.ts";
import { createErrorResponse } from "shared/utils.ts";
import { API_URLS, corsHeaders, DB_BUCKETS } from "shared/constants.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

interface ImageResult {
  url: string;
  source: string;
}

interface UnsplashPhoto {
  urls: {
    regular: string;
  };
}

interface PixabayHit {
  largeImageURL: string;
}

interface PexelsPhoto {
  src: {
    large: string;
  };
}

interface GeminiResponse {
  predictions: {
    bytesBase64Encoded: string;
    mimeType: string;
  }[];
}

// Вспомогательная функция для очистки строки запроса
const cleanQuery = (str: string | undefined): string => (str ? str.split(/[,;(]/)[0].trim() : "");

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
      `${API_URLS.PIXABAY}?key=${apiKey}&q=${encodedQuery}&image_type=photo&per_page=3&lang=${lang}&safesearch=true&orientation=horizontal`,
    );
    if (!res.ok) {
      console.warn(`Pixabay API error: ${res.status} ${res.statusText}`);
      return [];
    }
    const data = await res.json();
    if (data.hits && data.hits.length > 0) {
      // Возвращаем до 3 результатов
      return (
        data.hits
          .slice(0, 3)
          .map((hit: PixabayHit) => ({ url: hit.largeImageURL, source: "pixabay" }))
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
      `${API_URLS.UNSPLASH}?query=${encodedQuery}&per_page=3&orientation=landscape`,
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
          .slice(0, 3)
          .map((hit: UnsplashPhoto) => ({ url: hit.urls.regular, source: "unsplash" }))
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
      `${API_URLS.PEXELS}?query=${encodedQuery}&per_page=3&locale=${lang}&orientation=landscape`,
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
          .slice(0, 3)
          .map((hit: PexelsPhoto) => ({ url: hit.src.large, source: "pexels" }))
      );
    }
  } catch (e) {
    console.error("Pexels search exception:", e);
  }
  return [];
}

async function generateImageWithGemini(
  apiKey: string,
  prompt: string,
): Promise<ImageResult | null> {
  const models = [
    "imagen-3.0-generate-001",
    "gemini-3.1-flash-image-preview",
    "gemini-3-pro-image-preview",
    "gemini-2.5-flash-image",
    "gemini-2.0-flash-exp-image-generation",
  ];

  for (const model of models) {
    try {
      // eslint-disable-next-line no-console
      console.log(`Generating image with ${model} for: "${prompt}"`);
      const res = await fetch(
        `${API_URLS.GEMINI_IMAGE_GEN_BASE}${model}:predict?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: { sampleCount: 1, aspectRatio: "4:3" },
          }),
        },
      );
      if (!res.ok) {
        const err = await res.text();
        console.warn(`${model} API error: ${res.status} ${err}`);
        continue; // Пробуем следующую модель
      }
      const data: GeminiResponse = await res.json();
      if (data.predictions && data.predictions.length > 0) {
        const img = data.predictions[0];
        const mimeType = img.mimeType || "image/jpeg";
        return {
          url: `data:${mimeType};base64,${img.bytesBase64Encoded}`,
          source: "gemini",
        };
      }
    } catch (e) {
      console.error(`${model} generation exception:`, e);
    }
  }
  return null;
}

async function optimizeAndUpload(supabaseAdmin: SupabaseClient, imageBlob: Blob, id: string, source: string) {
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
    .from(DB_BUCKETS.IMAGES)
    .upload(fileName, optimizedData, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(DB_BUCKETS.IMAGES).getPublicUrl(fileName);

  return `${publicUrl}?t=${Date.now()}`;
}

serve(async (req: Request): Promise<Response> => {
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
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY"); // Опционально
    const supabaseAdmin = getSupabaseAdmin();

    if (mode === "search") {
      if (!id) throw new Error("Missing id");
      const queryRu = cleanQuery(translation);
      const queryKr = cleanQuery(word);

      const searchPromises = [];
      if (PIXABAY_API_KEY) {
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
        .filter((r): r is PromiseFulfilledResult<{ url: string; source: string }[]> => r.status === "fulfilled" && Array.isArray(r.value))
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

      return new Response(JSON.stringify({ finalUrl, source }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else if (mode === "auto") {
      // АВТОМАТИЧЕСКИЙ РЕЖИМ (для Python-воркера)
      if (!id) throw new Error("Missing id");

      const queryRu = cleanQuery(translation);
      const queryKr = cleanQuery(word);

      let selectedImage = null;

      // 1. Pixabay
      if (!selectedImage && PIXABAY_API_KEY) {
        let results: ImageResult[] = [];
        if (queryRu)
          results = await searchPixabay(PIXABAY_API_KEY, queryRu, "ru");
        if (results.length === 0 && queryKr)
          results = await searchPixabay(PIXABAY_API_KEY, queryKr, "ko");
        if (results.length > 0)
          selectedImage = results[Math.floor(Math.random() * results.length)];
      }

      // 2. Unsplash
      if (!selectedImage && UNSPLASH_ACCESS_KEY) {
        let results: ImageResult[] = [];
        if (queryRu)
          results = await searchUnsplash(UNSPLASH_ACCESS_KEY, queryRu);
        if (results.length === 0 && queryKr)
          results = await searchUnsplash(UNSPLASH_ACCESS_KEY, queryKr);
        if (results.length > 0)
          selectedImage = results[Math.floor(Math.random() * results.length)];
      }

      // 3. Pexels
      if (!selectedImage && PEXELS_API_KEY) {
        let results: ImageResult[] = [];
        if (queryRu)
          results = await searchPexels(PEXELS_API_KEY, queryRu, "ru-RU");
        if (results.length === 0 && queryKr)
          results = await searchPexels(PEXELS_API_KEY, queryKr, "ko-KR");
        if (results.length > 0)
          selectedImage = results[Math.floor(Math.random() * results.length)];
      }

      // 4. Gemini (Fallback)
      if (!selectedImage && GEMINI_API_KEY) {
        const prompt = queryRu || queryKr;
        if (prompt) {
          const result = await generateImageWithGemini(GEMINI_API_KEY, prompt);
          if (result) selectedImage = result;
        }
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
  } catch (error: unknown) {
    return createErrorResponse(error);
  }
});
