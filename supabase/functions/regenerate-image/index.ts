import { serve } from "std/http/server.ts";
import { Image } from "imagescript";
import { getSupabaseAdmin } from "shared/clients.ts";
import { createErrorResponse } from "shared/utils.ts";
import { API_URLS, corsHeaders, DB_BUCKETS, DB_TABLES } from "shared/constants.ts";

// --- API Helper Functions ---

interface ImageAPIResult {
  url: string;
  source: string;
}

async function searchPixabay(query: string, key: string): Promise<ImageAPIResult[]> {
  const url = `${API_URLS.PIXABAY}?key=${key}&q=${encodeURIComponent(query)}&image_type=photo&lang=ko&safesearch=true&per_page=10`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.hits || []).map((img: { webformatURL: string }) => ({
      url: img.webformatURL,
      source: "Pixabay",
    }));
  } catch {
    return [];
  }
}

async function searchPexels(query: string, key: string): Promise<ImageAPIResult[]> {
  const url = `${API_URLS.PEXELS}?query=${encodeURIComponent(query)}&per_page=10`;
  try {
    const res = await fetch(url, { headers: { Authorization: key } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.photos || []).map((p: { src: { medium: string } }) => ({
      url: p.src.medium,
      source: "Pexels",
    }));
  } catch {
    return [];
  }
}

async function searchUnsplash(query: string, key: string): Promise<ImageAPIResult[]> {
  const url = `${API_URLS.UNSPLASH}?query=${encodeURIComponent(query)}&per_page=10&client_id=${key}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((r: { urls: { regular: string } }) => ({
      url: r.urls.regular,
      source: "Unsplash",
    }));
  } catch {
    return [];
  }
}

/**
 * Downloads, compresses, and stores an image, then updates the database.
 * This is a shared helper for both 'auto' and 'finalize' modes.
 */
async function processAndStoreImage(wordId: string, imageUrl: string, source: string) {
  const supabaseAdmin = getSupabaseAdmin();

  // 1. Download the image
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) throw new Error(`Failed to download image from ${source}`);
  const imageBuffer = await imageResponse.arrayBuffer();

  // 2. Compress and resize the image using ImageScript
  const image = await Image.decode(imageBuffer);
  image.resize(image.width > 1024 ? 1024 : Image.RESIZE_AUTO, Image.RESIZE_AUTO);
  const compressedData = await image.encode(0.8); // 80% JPEG quality

  // 3. Delete old image from storage to save space
  const { data: wordData } = await supabaseAdmin.from(DB_TABLES.VOCABULARY).select('image').eq('id', wordId).single();
  if (wordData?.image) {
    try {
      const oldPath = new URL(wordData.image).pathname.split('/').slice(3).join('/'); // Extracts path after bucket name
      if (oldPath) {
        await supabaseAdmin.storage.from(DB_BUCKETS.IMAGES).remove([oldPath]);
      }
    } catch (e) {
      console.warn("Could not parse or delete old image path:", e);
    }
  }

  // 4. Upload new image to Supabase Storage
  const filePath = `images/${wordId}_${Date.now()}.jpg`;
  const { error: uploadError } = await supabaseAdmin.storage
    .from(DB_BUCKETS.IMAGES)
    .upload(filePath, compressedData, { contentType: "image/jpeg", upsert: true });

  if (uploadError) throw uploadError;

  // 5. Get public URL of the newly uploaded file
  const { data: { publicUrl } } = supabaseAdmin.storage
    .from(DB_BUCKETS.IMAGES)
    .getPublicUrl(filePath);

  // 6. Update the vocabulary table with the new image URL and source
  const { error: dbError } = await supabaseAdmin
    .from(DB_TABLES.VOCABULARY)
    .update({ image: publicUrl, image_source: source })
    .eq('id', wordId);
  
  if (dbError) throw dbError;

  return { finalUrl: publicUrl, source };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { mode, id, word, translation, selectedUrl, source } = await req.json();

    // --- SEARCH MODE ---
    // User wants to pick a new image. We search all available APIs.
    if (mode === 'search') {
      if (!word) throw new Error("Missing 'word' for search mode.");
      
      const query = translation || word;
      const supabaseAdmin = getSupabaseAdmin();

      // --- Caching Logic ---
      const cacheKey = `image-search:${query}`;
      try {
        const { data: cachedData, error: cacheError } = await supabaseAdmin
          .from(DB_TABLES.AI_CACHE)
          .select('response_data')
          .eq('cache_key', cacheKey)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (cacheError) throw cacheError;

        if (cachedData?.response_data) {
          console.log(`✅ Image search cache hit for: ${query}`);
          return new Response(JSON.stringify({ success: true, images: cachedData.response_data }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (e) { console.warn("Image search cache read error:", (e as Error).message); }

      const pixabayKey = Deno.env.get("PIXABAY_API_KEY");
      const pexelsKey = Deno.env.get("PEXELS_API_KEY");
      const unsplashKey = Deno.env.get("UNSPLASH_ACCESS_KEY");

      const results = await Promise.allSettled([
        pixabayKey ? searchPixabay(query, pixabayKey) : Promise.resolve([]),
        pexelsKey ? searchPexels(query, pexelsKey) : Promise.resolve([]),
        unsplashKey ? searchUnsplash(query, unsplashKey) : Promise.resolve([]),
      ]);

      const images = results
        .filter(p => p.status === 'fulfilled')
        .flatMap(p => (p as PromiseFulfilledResult<ImageAPIResult[]>).value);
      
      images.sort(() => Math.random() - 0.5); // Shuffle results for variety

      // --- Store successful result in cache ---
      if (images.length > 0) {
        try {
          await supabaseAdmin
            .from(DB_TABLES.AI_CACHE)
            .insert({ cache_key: cacheKey, response_data: images });
          console.log(`- Cache miss. Stored new image search results for: ${query}`);
        } catch (e) { console.error("Image search cache insert error:", (e as Error).message); }
      }

      return new Response(JSON.stringify({ success: true, images: images.slice(0, 12) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- AUTO MODE ---
    // Background worker wants to automatically assign an image.
    if (mode === 'auto') {
        if (!id || !word) throw new Error("Missing 'id' or 'word' for auto mode.");
        
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
            return new Response(JSON.stringify({ success: true, finalUrl: null, source: null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const randomImage = images[Math.floor(Math.random() * images.length)];
        const result = await processAndStoreImage(id, randomImage.url, randomImage.source);
        
        return new Response(JSON.stringify({ success: true, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- FINALIZE MODE ---
    // User has selected an image, or auto mode has picked one.
    if (mode === 'finalize') {
        if (!id || !selectedUrl || !source) throw new Error("Missing 'id', 'selectedUrl', or 'source' for finalize mode.");
        const result = await processAndStoreImage(id, selectedUrl, source);
        return new Response(JSON.stringify({ success: true, ...result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error("Invalid 'mode' provided to regenerate-image function.");

  } catch (error: unknown) {
    return createErrorResponse(error);
  }
});