// ===== FILE: pages/api/regenerate.js - RETTET MED DATABASE =====
import OpenAI from 'openai';
import { getCacheKey, saveToCache } from '../../lib/cacheUtils';
import { getRelevantExamples } from '../../lib/database';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

const COLOR_AWARE_SYSTEM_PROMPT = `Du er en norsk eiendomsmegler som skriver KORTE, presise beskrivelser.

LENGDE: Maks 1-2 setninger. Vær svært konsis.

FARGER OG BESKRIVELSER:
- BRUK SPESIFIKKE FARGER når synlig: hvit, grå, beige, eik, bøk, sort, blå, grønn osv.
- UNNGÅ vage ord som: lys, mørk, lyse vegger, mørkt gulv

STIL:
- Faktabasert og konkret
- Varier formuleringene - lag en ANNERLEDES beskrivelse enn forrige gang
- Start med forskjellige ord hver gang`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageUrl, imageType, targetGroup = 'standard' } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ error: 'Mangler bilde-URL' });
  }

  try {
    // Hent eksempler fra database
    const examples = await getRelevantExamples(imageType, targetGroup, 3);
    const exampleText = examples.length > 0 
      ? examples.join('\n') 
      : '';

    console.log(`🔄 Regenerating description for ${imageType} (${targetGroup})`);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: COLOR_AWARE_SYSTEM_PROMPT
      }, {
        role: "user",
        content: [
          { 
            type: "text", 
            text: `Romtype: ${imageType}\nMålgruppe: ${targetGroup}\n\n${
              exampleText ? `Andre måter å beskrive ${imageType} på:\n${exampleText}\n\n` : ''
            }Lag en NY, kort beskrivelse med SPESIFIKKE FARGER (ikke kopier eksemplene):`
          },
          { 
            type: "image_url", 
            image_url: { 
              url: imageUrl,
              detail: "low"
            } 
          }
        ]
      }],
      max_tokens: 100,
      temperature: 0.8, // Høyere for mer variasjon
      presence_penalty: 0.6,
      frequency_penalty: 0.5 // Unngå repetisjon
    });

    const description = response.choices[0].message.content.trim();
    
    // Oppdater cache med ny beskrivelse
    const cacheKey = getCacheKey(imageUrl, imageType, targetGroup);
    saveToCache(cacheKey, description);

    res.status(200).json({ 
      description,
      regenerated: true
    });

  } catch (error) {
    console.error('Regenerate error:', error);
    res.status(500).json({ error: 'Kunne ikke generere ny beskrivelse' });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};