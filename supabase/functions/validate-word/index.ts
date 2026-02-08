import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: authError } = await supabaseUser.auth.getClaims(token)
    if (authError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { word } = body

    if (!word || typeof word !== 'string') {
      return new Response(JSON.stringify({ error: 'Word is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const cleanWord = word.trim().toUpperCase()

    // Basic validation
    if (cleanWord.length < 3 || cleanWord.length > 20) {
      return new Response(JSON.stringify({ valid: false, reason: 'Le mot doit contenir entre 3 et 20 lettres.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Only allow letters (including French accented)
    if (!/^[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜŸÇŒÆ]+$/i.test(cleanWord)) {
      return new Response(JSON.stringify({ valid: false, reason: 'Le mot ne doit contenir que des lettres.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use AI to validate the word is a real French word
    const apiKey = Deno.env.get('LOVABLE_API_KEY')
    if (!apiKey) {
      console.error('LOVABLE_API_KEY not set')
      // Fallback: accept the word if we can't validate
      return new Response(JSON.stringify({ valid: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          {
            role: 'system',
            content: 'Tu es un dictionnaire français. Réponds UNIQUEMENT par "OUI" si le mot est un mot français valide (nom, verbe, adjectif, adverbe, etc.), ou "NON" si ce n\'est pas un mot français reconnu. Rien d\'autre.'
          },
          {
            role: 'user',
            content: `Le mot "${cleanWord}" est-il un mot français valide ?`
          }
        ],
        max_tokens: 10,
        temperature: 0,
      }),
    })

    if (!aiResponse.ok) {
      console.error('AI validation failed:', await aiResponse.text())
      // Fallback: accept the word
      return new Response(JSON.stringify({ valid: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const aiData = await aiResponse.json()
    const answer = aiData.choices?.[0]?.message?.content?.trim()?.toUpperCase() || ''
    const isValid = answer.startsWith('OUI')

    console.log(`Word validation: "${cleanWord}" -> ${answer} (valid: ${isValid})`)

    return new Response(JSON.stringify({
      valid: isValid,
      reason: isValid ? undefined : 'Ce mot n\'est pas reconnu comme un mot français valide.',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Validate word error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
