import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ageMonths, preferences, childName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const ageText = ageMonths < 12 
      ? `${ageMonths} bulan` 
      : `${Math.floor(ageMonths / 12)} tahun ${ageMonths % 12} bulan`;

    const systemPrompt = `Kamu adalah ahli gizi anak Indonesia yang membuat rencana makan mingguan. 
Buat rencana makan sehat untuk anak usia ${ageText} bernama ${childName || 'anak'}.
${preferences ? `Preferensi makanan: ${preferences}` : ''}

PENTING: Respons HARUS dalam format JSON yang valid dengan struktur berikut:
{
  "weekPlan": [
    {
      "day": "Senin",
      "meals": {
        "breakfast": { "name": "nama makanan", "description": "deskripsi singkat", "nutrients": "nutrisi utama" },
        "lunch": { "name": "nama makanan", "description": "deskripsi singkat", "nutrients": "nutrisi utama" },
        "dinner": { "name": "nama makanan", "description": "deskripsi singkat", "nutrients": "nutrisi utama" },
        "snacks": [{ "name": "nama snack", "description": "deskripsi" }]
      }
    }
  ],
  "tips": ["tip nutrisi 1", "tip nutrisi 2"]
}

Buat untuk 7 hari (Senin-Minggu) dengan makanan Indonesia yang bergizi dan sesuai usia anak.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Buatkan rencana makan mingguan untuk anak usia ${ageText}${preferences ? ` dengan preferensi: ${preferences}` : ''}. Respons dalam JSON.` }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    // Parse JSON from response
    let mealPlan;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        mealPlan = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse meal plan:', parseError);
      console.log('Raw content:', content);
      throw new Error('Failed to parse meal plan response');
    }

    return new Response(JSON.stringify(mealPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in generate-meal-plan:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
