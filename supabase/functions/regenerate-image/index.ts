import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB - изменить при необходимости

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS,PUT,DELETE",
  "Content-Type": "application/json",
};

function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...extraHeaders },
  });
}

function safeLog(...args: any[]) {
  // Не логируем секреты/полные токены
  console.info(...args);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const pixabayKey = Deno.env.get("PIXABAY_API_KEY") ?? "";

    safeLog("ENV presence:", {
      supabaseUrl: !!supabaseUrl,
      supabaseKey: !!supabaseKey,
      pixabayKey: !!pixabayKey,
    });

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Server Config Error: Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
      );
    }
    if (!pixabayKey) {
      throw new Error(
        'Server Config Error: Missing PIXABAY_API_KEY. Run: npx supabase secrets set PIXABAY_API_KEY=...'
      );
    }

    const rawText = await req.text().catch(() => "");
    if (!rawText) throw new Error("Empty request body");
    let body: any;
    try {
      body = JSON.parse(rawText);
    } catch (e) {
      throw new Error("Invalid JSON body in request");
    }

    const { word, id, translation } = body || {};
    if (!id) throw new Error('Missing required field: "id"');

    // Опциональная валидация id (если ожидается UUID)
    // if (!/^[0-9a-fA-F-]{36}$/.test(String(id))) throw new Error("Invalid id format");

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    const rawQuery = (translation || word || "").toString();
    const cleanQuery = rawQuery.replace(/\(.*\)/, "").split(",")[0].trim();
    if (!cleanQuery) throw new Error("Empty query string for image search");

    safeLog(`Searching Pixabay for: "${cleanQuery}"`);

    const pixRes = await fetch(
      `https://pixabay.com/api/?key=${encodeURIComponent(
        pixabayKey
      )}&q=${encodeURIComponent(cleanQuery)}&lang=ru&image_type=photo&orientation=horizontal&min_height=400&per_page=20&safesearch=true`
    );

    if (!pixRes.ok) {
      const errText = await pixRes.text().catch(() => "");
      throw new Error(`Pixabay API Error (${pixRes.status}): ${errText}`);
    }

    const pixData = await pixRes.json().catch(() => null);
    if (!pixData || !Array.isArray(pixData.hits) || pixData.hits.length === 0) {
      throw new Error(`Изображения не найдены для запроса: "${cleanQuery}"`);
    }

    const validHits = pixData.hits.filter((h: any) => {
      const tags = (h?.tags || "").toLowerCase();
      return !tags.includes("grayscale") && !tags.includes("black and white") && !tags.includes("monochrome");
    });
    const hits = validHits.length > 0 ? validHits : pixData.hits;
    const hit = hits[Math.floor(Math.random() * hits.length)];
    const imgUrl = hit?.largeImageURL || hit?.webformatURL || hit?.previewURL;
    if (!imgUrl) throw new Error("Selected image has no usable URL");

    safeLog("Selected image URL preview:", imgUrl.slice(0, 200));

    const imgRes = await fetch(imgUrl);
    if (!imgRes.ok) throw new Error(`Failed to download image: ${imgRes.status}`);

    const contentType = (imgRes.headers.get("content-type") || "").toLowerCase();
    if (!contentType.startsWith("image/")) {
      throw new Error("Downloaded resource is not an image: " + contentType);
    }

    const contentLengthHeader = imgRes.headers.get("content-length");
    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : NaN;
    if (!Number.isNaN(contentLength) && contentLength > MAX_IMAGE_BYTES) {
      throw new Error(`Image too large (${Math.round(contentLength / 1024)} KB). Limit is ${Math.round(MAX_IMAGE_BYTES / 1024)} KB.`);
    }

    const arrayBuffer = await imgRes.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);
    if (fileBuffer.length > MAX_IMAGE_BYTES) {
      throw new Error(`Image too large after download (${Math.round(fileBuffer.length / 1024)} KB). Limit is ${Math.round(MAX_IMAGE_BYTES / 1024)} KB.`);
    }

    // Определяем расширение по contentType
    const mimePart = contentType.split("/")[1] || "jpeg";
    // убрать возможные параметры типа "png; charset=utf-8"
    const mimeClean = mimePart.split(";")[0].trim();
    const ext = mimeClean === "jpeg" ? "jpg" : mimeClean.replace(/[^a-z0-9]/gi, "") || "jpg";
    const fileName = `${id}.${ext}`;

    safeLog("Uploading to storage (filename):", fileName, "content-type:", contentType);

    // Загружаем изображение в bucket "image-files"
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("image-files")
      .upload(fileName, fileBuffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      // логируем ошибку сервера, но возвращаем пользователю краткий текст
      console.error("Storage upload error:", uploadError);
      throw new Error("Failed to upload image to storage");
    }

    // Получаем публичный URL или signed URL в зависимости от конфигурации bucket
    // Если bucket публичный:
    const { data: publicUrlData, error: publicUrlError } = supabaseAdmin.storage.from("image-files").getPublicUrl(fileName);
    if (publicUrlError) {
      console.error("getPublicUrl error:", publicUrlError);
      // Попробуем получить signed URL как fallback (1 час)
      // const { data: signedData, error: signedError } = await supabaseAdmin.storage.from("image-files").createSignedUrl(fileName, 60 * 60);
      // if (signedError) throw new Error("Failed to get public or signed URL for uploaded image");
      // const publicUrl = signedData.signedUrl + `?t=${Date.now()}`;
      // ... использовать signedUrl
      throw new Error("Failed to obtain public URL for uploaded image");
    }

    const publicUrl = publicUrlData?.publicUrl;
    if (!publicUrl) throw new Error("Failed to obtain public URL for uploaded image");
    const publicUrlWithTs = `${publicUrl}?t=${Date.now()}`;

    // Обновляем запись в таблице vocabulary
    const { data: updatedRows, error: dbError } = await supabaseAdmin
      .from("vocabulary")
      .update({ image: publicUrlWithTs, image_pixabay: publicUrlWithTs })
      .eq("id", id)
      .select();

    if (dbError) {
      console.error("DB update error:", dbError);
      throw new Error("Failed to update database record");
    }

    if (!Array.isArray(updatedRows) || updatedRows.length === 0) {
      safeLog("No rows updated. Check provided id and RLS/permissions.");
      // Возвращаем success:true, но предупреждаем
      return jsonResponse({ success: true, warning: "No rows updated. Check id and permissions.", imageUrl: publicUrlWithTs }, 200);
    }

    return jsonResponse({ success: true, imageUrl: publicUrlWithTs }, 200);
  } catch (err: any) {
    // Логируем стек на сервере, не возвращаем весь стек клиенту
    console.error("❌ Function Error:", err?.message || err, err?.stack ? err.stack.split("\n").slice(0, 5).join("\n") : "");
    const message = err?.message || "Unknown Error";
    return jsonResponse({ error: message }, 500);
  }
});