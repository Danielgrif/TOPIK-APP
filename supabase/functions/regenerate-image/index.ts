import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Обработка CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { word, id, translation } = await req.json();
    console.log(`🔄 Regenerating image for word ID: ${id}, word: ${word}`);
    
    // Инициализация клиента
    const supabaseAdmin = createClient(
      (Deno.env.get('SUPABASE_URL') as string) ?? '',
      (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string) ?? ''
    )

    const PIXABAY_KEY = Deno.env.get('PIXABAY_API_KEY')
    if (!PIXABAY_KEY) throw new Error('PIXABAY_API_KEY not set')

    // 1. Поиск в Pixabay
    const query = translation || word
    const q = encodeURIComponent(query.replace(/\(.*\)/, '').split(',')[0].trim());
    
    const pixRes = await fetch(`https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${q}&lang=ru&image_type=photo&per_page=20&safesearch=true`)
    const pixData = await pixRes.json()

    if (!pixData.hits || pixData.hits.length === 0) {
      throw new Error('Изображения не найдены')
    }

    // 2. Выбор случайного изображения
    const hit = pixData.hits[Math.floor(Math.random() * pixData.hits.length)]
    const imgUrl = hit.webformatURL

    // 3. Скачивание изображения
    const imgRes = await fetch(imgUrl)
    const imgBlob = await imgRes.blob()

    // 4. Загрузка в Supabase Storage
    const fileName = `${id}_${Date.now()}.jpg`
    
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('image-files')
      .upload(fileName, imgBlob, {
        contentType: 'image/jpeg',
        upsert: true
      })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabaseAdmin
      .storage
      .from('image-files')
      .getPublicUrl(fileName)

    // 5. Обновление записи в БД
    console.log(`💾 Updating database for word ID: ${id}`);
    const { error: dbError } = await supabaseAdmin
      .from('vocabulary')
      .update({ image: publicUrl, image_source: 'pixabay' })
      .eq('id', id)

    if (dbError) throw dbError

    console.log(`✅ Successfully updated image for word ID: ${id}`);
    return new Response(
      JSON.stringify({ success: true, imageUrl: publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('❌ Function Error:', { message: error.message, stack: error.stack });
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
