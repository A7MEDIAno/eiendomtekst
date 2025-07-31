// pages/api/analyze.js - OPTIMALISERT VERSJON MED CHEERIO
import OpenAI from 'openai';
import axios from 'axios';
import { z } from 'zod';
import { getCacheKey, getFromCache, saveToCache } from '../../lib/cacheUtils';
import { getRelevantExamples, logAnalysis, getSeasonalPhrases } from '../../lib/database';
import { getCurrentSeason } from '../../lib/seasonalDescriptions';

// Importer cheerio med require for kompatibilitet
const cheerio = require('cheerio');

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// Input validering - mer fleksibel for å matche frontend
const AnalyzeSchema = z.object({
  galleryUrl: z.string().url().optional(), // Gjør optional for å få bedre feilmelding
  url: z.string().url().optional(), // Frontend kan sende 'url' i stedet for 'galleryUrl'
  targetGroup: z.enum(['standard', 'family', 'firstTime', 'investor', 'senior']).optional().default('standard'),
  inspirationText: z.string().optional(),
  propertyInfo: z.string().optional()
}).refine(data => data.galleryUrl || data.url, {
  message: "Enten 'galleryUrl' eller 'url' må være oppgitt"
});

// Samme system prompt som før
const COLOR_AWARE_SYSTEM_PROMPT = `Du er en norsk eiendomsmegler som skriver KORTE, presise beskrivelser.

LENGDE: Maks 1-2 setninger. Vær svært konsis.

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
2. Viktigste egenskap

IKKE: Møbler, pynt, lange setninger, vage fargebeskrivelser`;

// Parser for norske adresser (server-side)
function parseNorwegianAddress(addressText) {
  if (!addressText?.trim()) return null;
  
  const patterns = {
    // Format: "Storgata 15, 0184 Oslo"
    standard: /^(.+?)\s+(\d+[a-zA-Z]?),?\s*(\d{4})\s+(.+)$/,
    // Format: "Postboks 123, 0301 Oslo"
    postbox: /^(Postboks|Pb\.?)\s+(\d+),?\s*(\d{4})\s+(.+)$/i,
    // Med etasje: "Storgata 15 3.etg, 0184 Oslo"
    withFloor: /^(.+?)\s+(\d+[a-zA-Z]?)\s+(\d+\.?\s*etg\.?),?\s*(\d{4})\s+(.+)$/i
  };
  
  const cleaned = addressText.trim();
  
  // Prøv med etasje først
  const floorMatch = cleaned.match(patterns.withFloor);
  if (floorMatch) {
    return {
      streetName: floorMatch[1].trim(),
      streetNumber: floorMatch[2],
      floor: floorMatch[3],
      postalCode: floorMatch[4],
      city: floorMatch[5].trim(),
      fullAddress: cleaned,
      type: 'street_with_floor'
    };
  }
  
  // Prøv standard adresse
  const standardMatch = cleaned.match(patterns.standard);
  if (standardMatch) {
    return {
      streetName: standardMatch[1].trim(),
      streetNumber: standardMatch[2],
      postalCode: standardMatch[3],
      city: standardMatch[4].trim(),
      fullAddress: cleaned,
      type: 'street'
    };
  }
  
  // Prøv postboks
  const postboxMatch = cleaned.match(patterns.postbox);
  if (postboxMatch) {
    return {
      postbox: postboxMatch[2],
      postalCode: postboxMatch[3],
      city: postboxMatch[4].trim(),
      fullAddress: cleaned,
      type: 'postbox'
    };
  }
  
  return { 
    fullAddress: cleaned, 
    type: 'unparsed',
    warning: 'Could not parse address format'
  };
}

// Ekstraher adresse fra HTML (server-side)
function extractAddressFromHTML($, url) {
  // Samle potensielle adressekilder
  const sources = {
    title: $('title').text().trim(),
    h1: $('h1').first().text().trim(),
    h2: $('h2').first().text().trim(),
    ogTitle: $('meta[property="og:title"]').attr('content') || '',
    addressMicrodata: $('[itemprop="address"]').text().trim(),
    schemaAddress: $('[itemtype*="schema.org/PostalAddress"]').text().trim(),
    // Platform-spesifikke selektorer
    finnAddress: $('h1[data-testid="object-address"]').text().trim() ||
                 $('.u-caption').first().text().trim() ||
                 $('p[data-testid="object-address"]').text().trim()
  };
  
  // Prøv å finne beste kilde
  let address = sources.finnAddress || sources.title || sources.h1 || sources.h2 || sources.ogTitle || '';
  
  // Platform-spesifikke patterns
  const platformPatterns = {
    pholio: {
      detect: /pholio\.no/i,
      clean: [
        /^\d+\s*-\s*/, // Fjern ID prefix
        /\s*\|\s*Pholio.*$/i, // Fjern Pholio suffix
        /\s*-\s*Pholio.*$/i
      ]
    },
    notar: {
      detect: /notar\.no/i,
      clean: [
        /\s*-\s*NOTAR.*$/i,
        /\s*\|.*$/
      ]
    },
    finn: {
      detect: /finn\.no/i,
      clean: [
        /\s*-\s*FINN\.no.*$/i,
        /\s*til\s*(salgs|leie).*$/i
      ]
    }
  };
  
  // Finn hvilken plattform vi er på
  let activePlatform = null;
  
  for (const [platform, config] of Object.entries(platformPatterns)) {
    if (config.detect.test(url)) {
      activePlatform = platform;
      // Apply platform-specific cleaning
      config.clean.forEach(pattern => {
        address = address.replace(pattern, '');
      });
      break;
    }
  }
  
  // Generell opprydding
  const generalCleanupPatterns = [
    // UI elementer
    /\s*SE BILDENE\s*/gi,
    /\s*VIS MER\s*/gi,
    /\s*LES MER\s*/gi,
    /\s*SE ALLE\s*/gi,
    /\s*KONTAKT.*$/i,
    /\s*BOOK.*$/i,
    /\s*BESTILL.*$/i,
    /\s*VISNING.*$/i,
    
    // Priser og metadata
    /\s*kr\s*[\d\s.,]+.*$/i,
    /\s*solgt\s*/i,
    /\s*SOLGT\s*/i,
    
    // Megler info
    /\s*-\s*[A-Za-z]+\s*[Ee]iendom.*$/,
    /\s*-\s*[A-Za-z]+\s*&\s*[A-Za-z]+.*$/,
    
    // Ekstra whitespace
    /\s+/g, // Erstatt med enkelt mellomrom
    /^\s+|\s+$/g // Trim
  ];
  
  generalCleanupPatterns.forEach((pattern, index) => {
    address = address.replace(pattern, index === generalCleanupPatterns.length - 2 ? ' ' : '');
  });
  
  // Parse adresse
  const addressComponents = parseNorwegianAddress(address);
  
  return {
    raw: sources,
    cleaned: address,
    platform: activePlatform,
    components: addressComponents,
    confidence: calculateAddressConfidence(address, addressComponents)
  };
}

// Beregn konfidensgrad for adressen
function calculateAddressConfidence(address, components) {
  let confidence = 0;
  
  // Har vi grunnleggende komponenter?
  if (components?.streetName) confidence += 40;
  if (components?.streetNumber) confidence += 20;
  if (components?.city) confidence += 20;
  if (components?.postalCode) confidence += 20;
  
  // Sjekk for typiske adressemønstre
  if (/\d/.test(address)) confidence += 5; // Inneholder tall
  if (/vei|gate|veg|plass|allé/i.test(address)) confidence += 5; // Gatetyper
  
  // Trekk fra for suspekte mønstre
  if (/\|/.test(address)) confidence -= 10; // Fortsatt har separator
  if (address.length < 10) confidence -= 20; // For kort
  if (address.length > 60) confidence -= 10; // For lang
  
  return Math.max(0, Math.min(100, confidence));
}

// Samle bilder fra HTML
function collectImagesFromHTML($, baseUrl) {
  const images = new Set();
  
  // Standard img tags
  $('img').each((_, el) => {
    const srcs = [
      $(el).attr('src'),
      $(el).attr('data-src'),
      $(el).attr('data-lazy-src'),
      $(el).attr('data-original'),
      $(el).data('src')
    ].filter(Boolean);
    
    srcs.forEach(src => {
      if (src) {
        // Håndter relative URLs
        try {
          const imageUrl = src.startsWith('http') ? src : new URL(src, baseUrl).href;
          images.add(imageUrl);
        } catch (e) {
          // Ignorer ugyldige URLs
        }
      }
    });
  });
  
  // CSS background images
  $('[style*="background-image"]').each((_, el) => {
    const style = $(el).attr('style');
    const match = style.match(/url\(['"]?([^'"]+)['"]?\)/);
    if (match && match[1]) {
      try {
        const imageUrl = match[1].startsWith('http') ? match[1] : new URL(match[1], baseUrl).href;
        images.add(imageUrl);
      } catch (e) {
        // Ignorer ugyldige URLs
      }
    }
  });
  
  // Picture element sources
  $('picture source').each((_, el) => {
    const srcset = $(el).attr('srcset');
    if (srcset) {
      // Parse srcset and get first URL
      const firstUrl = srcset.split(',')[0].trim().split(' ')[0];
      if (firstUrl) {
        try {
          const imageUrl = firstUrl.startsWith('http') ? firstUrl : new URL(firstUrl, baseUrl).href;
          images.add(imageUrl);
        } catch (e) {
          // Ignorer ugyldige URLs
        }
      }
    }
  });
  
  return Array.from(images);
}

// Hovedfunksjon
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Valider input og håndter både 'galleryUrl' og 'url'
    const validatedData = AnalyzeSchema.parse(req.body);
    const galleryUrl = validatedData.galleryUrl || validatedData.url;
    const { targetGroup, inspirationText, propertyInfo } = validatedData;
    
    console.log('Starting analysis for:', galleryUrl);
    
    // Hent HTML innhold
    console.log('Fetching page content...');
    const { data: html } = await axios.get(galleryUrl, {
      timeout: 10000,
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'no-NO,no;q=0.9,en;q=0.8'
      }
    });
    
    // Parse HTML med Cheerio
    const $ = cheerio.load(html);
    
    // Ekstraher adresse
    console.log('Extracting address...');
    const addressInfo = extractAddressFromHTML($, galleryUrl);
    
    console.log('Address extraction result:', {
      cleaned: addressInfo.cleaned,
      platform: addressInfo.platform,
      confidence: addressInfo.confidence
    });

    const propertyAddress = addressInfo.confidence > 50 
      ? addressInfo.cleaned 
      : addressInfo.raw.title || 'Ukjent adresse';

    console.log('Using address:', propertyAddress);

    // Samle bilder
    console.log('Collecting images...');
    const images = collectImagesFromHTML($, galleryUrl);
    
    console.log(`Found ${images.length} images`);

    if (images.length === 0) {
      return res.status(400).json({ 
        error: 'Fant ingen bilder på siden',
        tips: 'Prøv "Direkte bilde-URLer" metoden eller sjekk at siden er offentlig tilgjengelig'
      });
    }

    // Filtrer bilder
    const validImages = images
      .filter(src => {
        try {
          const url = new URL(src);
          const path = url.pathname.toLowerCase();
          return !path.includes('logo') && 
                 !path.includes('icon') && 
                 !path.includes('pixel') &&
                 !path.includes('avatar') &&
                 !path.includes('tracking') &&
                 !path.includes('analytics') &&
                 src.length > 50;
        } catch (e) {
          return false;
        }
      })
      .slice(0, 12); // Maks 12 bilder

    console.log(`Analyzing ${validImages.length} images...`);

    // Send progress updates
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked'
    });

    // Send initial metadata
    res.write(JSON.stringify({
      type: 'metadata',
      address: propertyAddress,
      totalImages: validImages.length,
      platform: addressInfo.platform,
      addressConfidence: addressInfo.confidence
    }) + '\n');

    // Kombiner kontekst
    const fullContext = [propertyInfo, inspirationText].filter(Boolean).join('\n\n');

    // Analyser bildene
    const results = [];
    let cacheHits = 0;
    
    for (let i = 0; i < validImages.length; i++) {
      const imageUrl = validImages[i];
      console.log(`Analyzing image ${i + 1}/${validImages.length}`);
      
      try {
        // Send progress update
        res.write(JSON.stringify({
          type: 'progress',
          current: i + 1,
          total: validImages.length
        }) + '\n');

        // Sjekk cache for bildetype
        const typeKey = `${imageUrl}_type`;
        let imageType = getFromCache(typeKey);
        
        if (!imageType) {
          // Identifiser bildetype
          const identifyResponse = await openai.chat.completions.create({
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

          imageType = identifyResponse.choices[0].message.content.trim().toLowerCase();
          saveToCache(typeKey, imageType);
        } else {
          cacheHits++;
        }

        // Generer beskrivelse
        const description = await generateDescription(
          imageUrl, 
          imageType, 
          targetGroup, 
          fullContext
        );

        const result = {
          imageUrl,
          imageType,
          description
        };

        results.push(result);
        
        // Send result immediately
        res.write(JSON.stringify({
          type: 'result',
          index: i,
          result: result
        }) + '\n');
        
      } catch (error) {
        console.error(`Error analyzing image ${i + 1}:`, error.message);
        continue;
      }
    }

    console.log(`Cache hits: ${cacheHits}/${validImages.length * 2}`);

    // Send final complete status
    res.write(JSON.stringify({
      type: 'complete',
      results: results,
      address: propertyAddress,
      totalFound: images.length,
      analyzed: results.length,
      cacheHits: cacheHits
    }) + '\n');

    res.end();

  } catch (error) {
    console.error('Error:', error);
    
    // Detaljert feilhåndtering
    if (!res.headersSent) {
      if (error.code === 'ECONNREFUSED') {
        return res.status(503).json({
          error: 'Kunne ikke koble til nettstedet',
          details: 'Sjekk at URL-en er korrekt og tilgjengelig'
        });
      }
      
      if (error.name === 'ZodError') {
        return res.status(400).json({
          error: 'Ugyldig input',
          details: error.errors
        });
      }
      
      if (error.response?.status === 404) {
        return res.status(404).json({
          error: 'Siden ble ikke funnet',
          details: 'Sjekk at URL-en er korrekt'
        });
      }
      
      return res.status(500).json({ 
        error: 'Teknisk feil',
        details: error.message
      });
    }
    
    res.end();
  }
}

// Målgruppespesifikke instruksjoner (samme som før)
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

// Generer beskrivelse (samme som før)
async function generateDescription(imageUrl, imageType, targetGroup, propertyContext = null) {
  const startTime = Date.now();
  
  // Sjekk cache først
  const cacheKey = getCacheKey(imageUrl, imageType, targetGroup);
  const cachedDescription = getFromCache(cacheKey);
  
  if (cachedDescription) {
    console.log('Using cached description for:', imageUrl);
    
    // Logg analyse med cache-hit
    await logAnalysis({
      imageUrl,
      roomType: imageType,
      targetGroup,
      description: cachedDescription,
      cachedResult: true,
      responseTime: Date.now() - startTime
    });
    
    return cachedDescription;
  }
  
  // Hent eksempler fra database
  const examples = await getRelevantExamples(imageType, targetGroup, 3);
  const examplePrompt = examples.length > 0 
    ? `\n\nEksempler på gode beskrivelser:\n${examples.join('\n')}` 
    : '';
  
  // Hent sesongbaserte fraser
  const season = getCurrentSeason();
  const seasonalPhrases = await getSeasonalPhrases(season, imageType);
  const seasonalPrompt = seasonalPhrases.length > 0
    ? `\n\nSesongbaserte elementer du kan inkludere: ${seasonalPhrases.join(', ')}`
    : '';
  
  const targetInstructions = getTargetGroupInstructions(targetGroup, imageType);
  
  const contextPrompt = propertyContext 
    ? `\n\nKONTEKST om boligen (bruk for bedre forståelse, men beskriv KUN det du ser i bildet):\n${propertyContext.substring(0, 300)}`
    : '';

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
          text: `Romtype: ${imageType}\nMålgruppe: ${targetGroup}\n\nBeskrivelse for målgruppe:\n${targetInstructions}${contextPrompt}${examplePrompt}${seasonalPrompt}\n\nBeskriv dette rommet i 1-2 korte setninger. BRUK SPESIFIKKE FARGER, ikke "lyst/mørkt".`
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
    temperature: 0.6,
    presence_penalty: 0.4
  });

  const description = response.choices[0].message.content.trim();
  
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
  
  return description;
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: false,
  },
};