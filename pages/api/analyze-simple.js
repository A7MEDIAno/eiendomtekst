// ===== FILE: pages/api/analyze-simple.js - DIREKTE URL ANALYSE =====
import OpenAI from 'openai';
import { getCacheKey, getFromCache, saveToCache } from '../../lib/cacheUtils';
import { getRelevantExamples, logAnalysis } from '../../lib/database';
import { getCurrentSeason } from '../../lib/seasonalDescriptions';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// Samme system prompt som analyze.js
const COLOR_AWARE_SYSTEM_PROMPT = `Du er en norsk eiendomsmegler som skriver KORTE, presise beskrivelser.

LENGDE: Maks 2-3 setninger. Vær konsis.

FARGER OG BESKRIVELSER:
- BRUK SPESIFIKKE FARGER når synlig: hvit, grå, beige, eik, bøk, sort, blå, grønn osv.
- UNNGÅ vage ord som: lys, mørk, lyse vegger, mørkt gulv
- Eksempler på gode beskrivelser:
  ✓ "Eikeparkett" (ikke "lyst tregulv")
  ✓ "Beige teppe" (ikke "lyst gulvbelegg")

STIL:
- Faktabasert og konkret
- Start rett på sak
- Fokus på det viktigste
- Varier setningsstart

STRUKTUR:
1. Gulv og vegger (med farger/materialer)
2. Vinduer og fast innredning
3. Spesielle egenskaper

IKKE: Møbler, pynt, lange setninger, vage fargebeskrivelser`;

// Målgruppespesifikke instruksjoner (samme som analyze.js)
const getTargetGroupInstructions = (targetGroup, imageType) => {
  const isOutdoor = ['fasade', 'hage', 'terrasse', 'balkong', 'utsikt', 'fellesarealer', 'parkering'].includes(imageType);
  const isFloorPlan = imageType === 'planløsning';
  
  const instructions = {
    standard: {
      indoor: "Beskriv rommets faste egenskaper: gulvtype, veggoverflater, vinduer, fast innredning og tekniske installasjoner.",
      outdoor: "Beskriv fasade, bygningsmaterialer, vinduer, dører, tak og eventuelle faste uteinstallasjoner.",
      floorplan: "Beskriv romfordeling, sammenheng mellom rom og planløsningens funksjonalitet."
    },
    family: {
      indoor: "Fokuser på rommets egnethet for familieliv: størrelse, robuste overflater, oppbevaringsløsninger i fast innredning, sikkerhet.",
      outdoor: "Vektlegg bygningens sikkerhet, inngjerding, gangveier, belysning og oversiktlighet.",
      floorplan: "Kommenter sonefordeling for familieliv, antall bad/wc, oppbevaringsplass."
    },
    firstTime: {
      indoor: "Fokuser på vedlikeholdstilstand av gulv, vegger og fast innredning. Nevn modernitet på kjøkken/bad.",
      outdoor: "Beskriv fasadematerialer og deres vedlikeholdsbehov, taktype og synlig tilstand.",
      floorplan: "Kommenter effektiv arealutnyttelse og praktisk romfordeling."
    },
    investor: {
      indoor: "Vurder standard og alder på gulv, fast innredning og tekniske installasjoner. Noter synlige oppgraderingsbehov.",
      outdoor: "Focus på bygningens vedlikeholdstilstand, fellesarealer og parkeringsforhold.",
      floorplan: "Vurder fleksibilitet for utleie, antall soverom og bad."
    },
    senior: {
      indoor: "Fokuser på terskler, dørbredder, tilgjengelighet i bad, håndtak og støtteanordninger hvis synlig.",
      outdoor: "Beskriv adkomst, trinnfrihet, rekkverk og belysning.",
      floorplan: "Kommenter tilgjengelighet, korte avstander og om bad/soverom er på samme plan."
    }
  };
  
  const type = isFloorPlan ? 'floorplan' : isOutdoor ? 'outdoor' : 'indoor';
  return instructions[targetGroup]?.[type] || instructions.standard[type];
};

async function analyzeImage(imageUrl, targetGroup, propertyInfo) {
  const startTime = Date.now();
  
  try {
    // Identifiser bildetype først
    const typeResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: "Identifiser hva dette bildet viser. Svar KUN med én av disse kategoriene: stue, kjøkken, bad, soverom, gang, wc, vaskerom, spisestue, hjemmekontor, balkong, terrasse, hage, utsikt, fasade, fellesarealer, parkering, bod, planløsning, annet"
      }, {
        role: "user",
        content: [
          { type: "text", text: "Hva viser dette bildet?" },
          { type: "image_url", image_url: { url: imageUrl, detail: "low" } }
        ]
      }],
      max_tokens: 20,
      temperature: 0.1
    });

    const imageType = typeResponse.choices[0].message.content.trim().toLowerCase();
    
    // Sjekk cache
    const cacheKey = getCacheKey(imageUrl, imageType, targetGroup);
    const cachedDescription = getFromCache(cacheKey);
    
    if (cachedDescription) {
      console.log('Using cached description for:', imageUrl);
      
      await logAnalysis({
        imageUrl,
        roomType: imageType,
        targetGroup,
        description: cachedDescription,
        cachedResult: true,
        responseTime: Date.now() - startTime
      });
      
      return { imageUrl, imageType, description: cachedDescription };
    }
    
    // Hent eksempler fra database
    const examples = await getRelevantExamples(imageType, targetGroup, 3);
    const examplePrompt = examples.length > 0 
      ? `\n\nEksempler på gode beskrivelser:\n${examples.join('\n')}` 
      : '';
    
    const targetInstructions = getTargetGroupInstructions(targetGroup, imageType);
    
    const contextPrompt = propertyInfo 
      ? `\n\nKONTEKST om boligen (bruk for bedre forståelse, men beskriv KUN det du ser i bildet):\n${propertyInfo.substring(0, 300)}`
      : '';

    // Generer beskrivelse
    const descResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: COLOR_AWARE_SYSTEM_PROMPT
      }, {
        role: "user",
        content: [
          { 
            type: "text", 
            text: `Romtype: ${imageType}\nMålgruppe: ${targetGroup}\n\nBeskrivelse for målgruppe:\n${targetInstructions}${contextPrompt}${examplePrompt}\n\nBeskriv dette rommet i 2-3 korte setninger. BRUK SPESIFIKKE FARGER, ikke "lyst/mørkt".`
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
      max_tokens: 150,
      temperature: 0.6,
      presence_penalty: 0.4
    });

    const description = descResponse.choices[0].message.content.trim();
    
    // Lagre i cache
    saveToCache(cacheKey, description);
    
    // Logg analyse
    await logAnalysis({
      imageUrl,
      roomType: imageType,
      targetGroup,
      description,
      cachedResult: false,
      responseTime: Date.now() - startTime
    });
    
    return { imageUrl, imageType, description };
    
  } catch (error) {
    console.error('Error analyzing image:', error);
    return { 
      imageUrl, 
      imageType: 'annet', 
      description: 'Kunne ikke analysere dette bildet',
      error: error.message 
    };
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageUrls, targetGroup = 'standard', propertyInfo } = req.body;

  if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
    return res.status(400).json({ error: 'Mangler bilde-URLer' });
  }

  // Filter ut tomme URLer
  const validUrls = imageUrls.filter(url => url && url.trim());
  
  if (validUrls.length === 0) {
    return res.status(400).json({ error: 'Ingen gyldige bilde-URLer funnet' });
  }

  console.log(`🚀 Starting analysis of ${validUrls.length} images`);

  try {
    // Analyser alle bildene parallelt (maks 5 samtidig)
    const results = [];
    const batchSize = 5;
    
    for (let i = 0; i < validUrls.length; i += batchSize) {
      const batch = validUrls.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(url => analyzeImage(url, targetGroup, propertyInfo))
      );
      results.push(...batchResults);
      
      console.log(`✅ Analyzed batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(validUrls.length / batchSize)}`);
    }

    // Filtrer ut eventuelle feil
    const successfulResults = results.filter(r => !r.error);
    
    console.log(`🎉 Analysis complete! ${successfulResults.length} of ${validUrls.length} images analyzed successfully`);

    res.status(200).json({
      results: successfulResults,
      totalRequested: validUrls.length,
      totalAnalyzed: successfulResults.length,
      errors: results.filter(r => r.error).map(r => ({
        url: r.imageUrl,
        error: r.error
      }))
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      error: 'Analyse feilet',
      details: error.message
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};