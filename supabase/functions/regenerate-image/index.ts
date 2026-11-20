import { serve } from "std/http/server.ts";
import { Image } from "imagescript";
import { getSupabaseAdmin } from "shared/clients.ts";
import { getAuthenticatedUser } from "shared/auth.ts";
import { createErrorResponse, HttpError, jsonResponse } from "shared/utils.ts";
import { ALLOWED_IMAGE_HOSTS, API_URLS, DB_BUCKETS, DB_TABLES, LIMITS } from "shared/constants.ts";
import { readJsonObject, requireString } from "shared/validation.ts";

// --- Constants & helpers ---

interface ImageAPIResult {
  url: string;
  source: string;
}

/** Все URL, пришедшие от клиента, проходят проверку (защита от SSRF). */
function validateRemoteImageUrl(rawUrl: unknown): string {
  if (typeof rawUrl !== "string" || rawUrl.length > 2048) {
    throw new HttpError("Invalid 'selectedUrl'", 400);
  }
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new HttpError("Invalid 'selectedUrl'", 400);
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new HttpError("Only public https image URLs are allowed", 400);
  }
  if (!ALLOWED_IMAGE_HOSTS.has(url.hostname.toLowerCase())) {
    throw new HttpError("Image host is not allowed", 400);
  }
  return url.toString();
}

/** AbortSignal с фиксированным таймаутом для внешних fetch-вызовов. */
function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  // Таймер автоматически завершается после срабатывания abort().
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

/** Возвращает путь в storage из публичного URL (исправлен неверный slice(3)). */
function storagePathFromPublicUrl(url: string, bucket: string): string | null {
  try {
    const parsed = new URL(url);
    const marker = `/object/public/${bucket}/`;
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return null;
    const path = decodeURIComponent(parsed.pathname.slice(index + marker.length));
    return path || null;
  } catch {
    return null;
  }
}

/** Скачиваем изображение с проверкой Content-Length и MIME до загрузки в Storage. */
async function downloadImage(imageUrl: string): Promise<Uint8Array> {
  const safeUrl = validateRemoteImageUrl(imageUrl);
  const head = await fetch(safeUrl, {
    method: "HEAD",
    signal: timeoutSignal(8000),
  }).catch(() => null);
  if (head) {
    const declaredLength = Number(head.headers.get("content-length") ?? 0);
    if (Number.isFinite(declaredLength) && declaredLength > LIMITS.MAX_IMAGE_BYTES) {
      throw new HttpError("Image is too large to download", 413);
    }
  }

  const response = await fetch(safeUrl, { signal: timeoutSignal(15000) });
  if (!response.ok) throw new HttpError(`Failed to download image from ${new URL(safeUrl).host}`, 502);

  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > LIMITS.MAX_IMAGE_BYTES) {
    throw new HttpError("Image is too large to process", 413);
  }

  const mimeType = (response.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
    throw new HttpError("Remote file is not a supported image", 415);
  }

  const buffer = new Uint8Array(await response.arrayBuffer());
  if (buffer.byteLength > LIMITS.MAX_IMAGE_BYTES) {
    throw new HttpError("Image is too large to process", 413);
  }
  return buffer;
}

// --- Image search APIs ---

async function searchPixabay(query: string, key: string): Promise<ImageAPIResult[]> {
  const url = `${API_URLS.PIXABAY}?key=${key}&q=${encodeURIComponent(query)}&image_type=photo&lang=ko&safesearch=true&per_page=10`;
  try {
    const res = await fetch(url, { signal: timeoutSignal(8000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.hits || [])
      .map((img: { webformatURL?: string }) => img.webformatURL)
      .filter((u: unknown): u is string => typeof u === "string")
      .filter(isAllowedSearchResult)
      .map((url: string) => ({ url, source: "Pixabay" }));
  } catch {
    return [];
  }
}

async function searchPexels(query: string, key: string): Promise<ImageAPIResult[]> {
  const url = `${API_URLS.PEXELS}?query=${encodeURIComponent(query)}&per_page=10`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: key },
      signal: timeoutSignal(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.photos || [])
      .map((p: { src?: { medium?: string } }) => p.src?.medium)
      .filter((u: unknown): u is string => typeof u === "string")
      .filter(isAllowedSearchResult)
      .map((url: string) => ({ url, source: "Pexels" }));
  } catch {
    return [];
  }
}

async function searchUnsplash(query: string, key: string): Promise<ImageAPIResult[]> {
  const url = `${API_URLS.UNSPLASH}?query=${encodeURIComponent(query)}&per_page=10&client_id=${key}`;
  try {
    const res = await fetch(url, { signal: timeoutSignal(8000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || [])
      .map((r: { urls?: { regular?: string } }) => r.urls?.regular)
      .filter((u: unknown): u is string => typeof u === "string")
      .filter(isAllowedSearchResult)
      .map((url: string) => ({ url, source: "Unsplash" }));
  } catch {
    return [];
  }
}

function isAllowedSearchResult(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && ALLOWED_IMAGE_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Downloads, compresses, and stores an image, then updates the database.
 * This is a shared helper for both 'auto' and 'finalize' modes.
 */
async function processAndStoreImage(wordId: string, imageUrl: string, source: string) {
  const supabaseAdmin = getSupabaseAdmin();

  // 1. Download the image (with size/host validation).
  const imageBuffer = await downloadImage(imageUrl);

  // 2. Compress and resize the image using ImageScript
  const image = await Image.decode(imageBuffer);
  image.resize(image.width > 1024 ? 1024 : Image.RESIZE_AUTO, Image.RESIZE_AUTO);
  const compressedData = await image.encode(0.8); // 80% JPEG quality

  // 3. Delete old image from storage to save space
  const { data: wordData } = await supabaseAdmin
    .from(DB_TABLES.VOCABULARY)
    .select("image")
    .eq("id", wordId)
    .single();
  if (wordData?.image) {
    // Публичный URL имеет вид .../object/public/image-files/<path>:
    // корректно вырезаем всё после имени бакета (раньше было slice(3)).
    const oldPath = storagePathFromPublicUrl(wordData.image, DB_BUCKETS.IMAGES);
    if (oldPath) {
      try {
        await supabaseAdmin.storage.from(DB_BUCKETS.IMAGES).remove([oldPath]);
      } catch (e) {
        console.warn("Could not delete old image:", e);
      }
    }
  }

  // 4. Upload new image to Supabase Storage
  const filePath = `images/${wordId}_${Date.now()}.jpg`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from(DB_BUCKETS.IMAGES)
    .upload(filePath, compressedData, { contentType: "image/jpeg", upsert: true });

  if (uploadError) throw uploadError;

  // 5. Get public URL of the newly uploaded file
  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(DB_BUCKETS.IMAGES).getPublicUrl(filePath);

  // 6. Update the vocabulary table with the new image URL and source
  const { error: dbError } = await supabaseAdmin
    .from(DB_TABLES.VOCABULARY)
    .update({ image: publicUrl, image_source: source })
    .eq("id", wordId);

  if (dbError) throw dbError;

  return { finalUrl: publicUrl, source };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return jsonResponse({ ok: true });
  }

  try {
    // [SECURITY] Проверяем аутентификацию пользователя по JWT.
    const { user } = await getAuthenticatedUser(req);

    const body = await readJsonObject(req);
    const mode = requireString(body.mode, "mode", 20);
    const word = body.word ? requireString(body.word, "word", LIMITS.MAX_WORD_LENGTH) : "";
    const translation = body.translation
      ? requireString(body.translation, "translation", LIMITS.MAX_WORD_LENGTH)
      : "";

    // --- SEARCH MODE ---
    if (mode === "search") {
      if (!word) throw new HttpError("Missing 'word' for search mode", 400);

      const query = translation || word;
      const supabaseAdmin = getSupabaseAdmin();

      // --- Caching Logic ---
      const cacheKey = `image-search:${query}`;
      try {
        const { data: cachedData, error: cacheError } = await supabaseAdmin
          .from(DB_TABLES.AI_CACHE)
          .select("response_data")
          .eq("cache_key", cacheKey)
          .gt("expires_at", new Date().toISOString())
          .maybeSingle();

        if (cacheError) throw cacheError;

        if (cachedData?.response_data) {
          console.log(`✅ Image search cache hit for user ${user.id}: ${query}`);
          return jsonResponse({ success: true, images: cachedData.response_data });
        }
      } catch (e) {
        console.warn("Image search cache read error:", (e as Error).message);
      }

      const pixabayKey = Deno.env.get("PIXABAY_API_KEY");
      const pexelsKey = Deno.env.get("PEXELS_API_KEY");
      const unsplashKey = Deno.env.get("UNSPLASH_ACCESS_KEY");

      const results = await Promise.allSettled([
        pixabayKey ? searchPixabay(query, pixabayKey) : Promise.resolve([]),
        pexelsKey ? searchPexels(query, pexelsKey) : Promise.resolve([]),
        unsplashKey ? searchUnsplash(query, unsplashKey) : Promise.resolve([]),
      ]);

      const images = results
        .filter((p) => p.status === "fulfilled")
        .flatMap((p) => (p as PromiseFulfilledResult<ImageAPIResult[]>).value);

      images.sort(() => Math.random() - 0.5); // Shuffle results for variety

      // --- Store successful result in cache ---
      if (images.length > 0) {
        try {
          await supabaseAdmin
            .from(DB_TABLES.AI_CACHE)
            .insert({ cache_key: cacheKey, response_data: images });
          console.log(`- Cache miss. Stored new image search results for: ${query}`);
        } catch (e) {
          console.error("Image search cache insert error:", (e as Error).message);
        }
      }

      return jsonResponse({ success: true, images: images.slice(0, 12) });
    }

    // --- AUTO MODE ---
    // Background worker wants to automatically assign an image.
    if (mode === "auto") {
      if (!body.id || !word) {
        throw new HttpError("Missing 'id' or 'word' for auto mode", 400);
      }
      if (typeof body.id !== "string" && typeof body.id !== "number") {
        throw new HttpError("Invalid 'id' for auto mode", 400);
      }

      const query = translation || word;
      let images: ImageAPIResult[] = [];

      // --- Optimization: Try multiple sources for auto-generation ---
      const pixabayKey = Deno.env.get("PIXABAY_API_KEY");
      if (pixabayKey) images = await searchPixabay(query, pixabayKey);

      if (images.length === 0) {
        const pexelsKey = Deno.env.get("PEXELS_API_KEY");
        if (pexelsKey) images = await searchPexels(query, pexelsKey);
      }

      if (images.length === 0) {
        const unsplashKey = Deno.env.get("UNSPLASH_ACCESS_KEY");
        if (unsplashKey) images = await searchUnsplash(query, unsplashKey);
      }

      if (images.length === 0) {
        return jsonResponse({ success: true, finalUrl: null, source: null });
      }

      const randomImage = images[Math.floor(Math.random() * images.length)];
      const result = await processAndStoreImage(String(body.id), randomImage.url, randomImage.source);

      return jsonResponse({ success: true, ...result });
    }

    // --- FINALIZE MODE ---
    // User has selected an image from the search results returned by this function.
    if (mode === "finalize") {
      if (!body.id || !body.selectedUrl || !body.source) {
        throw new HttpError("Missing 'id', 'selectedUrl' or 'source' for finalize mode", 400);
      }
      if (typeof body.id !== "string" && typeof body.id !== "number") {
        throw new HttpError("Invalid 'id' for finalize mode", 400);
      }
      const source = requireString(body.source, "source", 30);
      if (!["Pixabay", "Pexels", "Unsplash"].includes(source)) {
        throw new HttpError("Invalid image source", 400);
      }
      const safeUrl = validateRemoteImageUrl(body.selectedUrl);
      const result = await processAndStoreImage(String(body.id), safeUrl, source);
      return jsonResponse({ success: true, ...result });
    }

    throw new HttpError("Invalid 'mode' provided to regenerate-image function", 400);
  } catch (error: unknown) {
    return createErrorResponse(error);
  }
});
