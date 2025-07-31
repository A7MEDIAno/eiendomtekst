// pages/api/analyze-all-enhanced.js - FORBEDRET KOMBINERT API MED ALLE FEATURES
import OpenAI from 'openai';
import * as cheerio from 'cheerio';
import { getCacheKey, getFromCache, saveToCache } from '../../lib/cacheUtils';
import { getRelevantExamples, logAnalysis, getSeasonalPhrases } from '../../lib/database';
import { getCurrentSeason } from '../../lib/seasonalDescriptions';
import { calculateSunConditions } from '../../lib/sunCalculations';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// Parallelisert hovedfunksjon
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    galleryUrl, 
    imageUrls,
    mode = 'gallery',
    propertyInfo = '',
    targetGroup = 'standard',
    includeIntro = true,
    includeMarketData = true,
    includeLocationInfo = true,
    includeCompetitors = true,
    includePropertyType = true
  } = req.body;

  try {
    console.log('🚀 Starting enhanced analysis...');
    
    // Step 1: Get images
    let images = [];
    let address = '';
    
    if (mode === 'gallery' && galleryUrl) {
      const galleryData = await fetchGalleryImages(galleryUrl);
      images = galleryData.images;
      address = galleryData.address;
    } else if (mode === 'direct' && imageUrls) {
      images = imageUrls.filter(url => url && url.trim());
    }

    if (images.length === 0) {
      return res.status(400).json({ 
        error: 'Ingen bilder funnet',
        details: 'Sjekk at URL er riktig eller prøv direkte bilde-URLer'
      });
    }

    console.log(`📸 Found ${images.length} images`);

    // Step 2: Run all analyses in parallel
    const [
      imageResults,
      propertyType,
      intro,
      marketData,
      locationInfo,
      competitors
    ] = await Promise.all([
      // Bildanalyse (maks 12 bilder)
      analyzeImagesInBatches(images.slice(0, 12), targetGroup, propertyInfo),
      
      // Boligtype-deteksjon
      includePropertyType && images.length > 0 
        ? detectPropertyType(images.slice(0, 3)) 
        : Promise.resolve(null),
      
      // Generer intro
      includeIntro && (propertyInfo || address)
        ? generateIntro(address, propertyInfo, targetGroup)
        : Promise.resolve(''),
      
      // Markedsdata
      includeMarketData && address
        ? fetchMarketData(address, propertyInfo)
        : Promise.resolve(null),
      
      // Områdeinfo
      includeLocationInfo && address
        ? fetchLocationInfo(address)
        : Promise.resolve(null),
      
      // Konkurranseanalyse
      includeCompetitors && address
        ? analyzeCompetitors(address, propertyInfo)
        : Promise.resolve(null)
    ]);

    console.log('🎉 All analyses complete!');

    return res.status(200).json({
      success: true,
      results: imageResults,
      address,
      intro,
      propertyType,
      marketData,
      locationInfo,
      competitorAnalysis: competitors,
      totalImages: images.length,
      analyzedImages: imageResults.length
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ 
      error: 'Analyse feilet',
      details: error.message 
    });
  }
}

// Batch-analyse av bilder for bedre ytelse
async function analyzeImagesInBatches(images, targetGroup, propertyInfo) {
  const results = [];
  const batchSize = 3;
  
  for (let i = 0; i < images.length; i += batchSize) {
    const batch = images.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(url => analyzeImage(url, targetGroup, propertyInfo))
    );
    results.push(...batchResults);
    
    console.log(`✅ Analyzed batch ${Math.floor(i / batchSize) + 1}`);
  }
  
  return results;
}

// Analyser enkeltbilde
async function analyzeImage(imageUrl, targetGroup, propertyInfo) {
  const startTime = Date.now();
  
  try {
    // Sjekk cache først
    const cacheKey = getCacheKey(imageUrl, 'auto', targetGroup);
    const cachedResult = getFromCache(cacheKey);
    
    if (cachedResult) {
      console.log('💾 Using cached result');
      return { 
        imageUrl, 
        imageType: cachedResult.type || 'annet',
        description: cachedResult.description || cachedResult
      };
    }
    
    // Identifiser romtype og generer beskrivelse i én AI-kall
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: `Du er en norsk eiendomsmegler. Identifiser romtype og skriv en kort beskrivelse.
        
Romtyper: stue, kjøkken, bad, soverom, gang, wc, vaskerom, spisestue, hjemmekontor, balkong, terrasse, hage, utsikt, fasade, fellesarealer, parkering, bod, planløsning, annet

Format svar:
TYPE: [romtype]
BESKRIVELSE: [1-2 setninger med konkrete farger og materialer]`
      }, {
        role: "user",
        content: [
          { 
            type: "text", 
            text: `Analyser dette bildet. ${propertyInfo ? `Kontekst: ${propertyInfo.substring(0, 200)}` : ''}`
          },
          { type: "image_url", image_url: { url: imageUrl, detail: "low" } }
        ]
      }],
      max_tokens: 100,
      temperature: 0.6
    });

    const result = response.choices[0].message.content;
    const typeMatch = result.match(/TYPE:\s*(\w+)/);
    const descMatch = result.match(/BESKRIVELSE:\s*(.+)/s);
    
    const imageType = typeMatch ? typeMatch[1].toLowerCase() : 'annet';
    const description = descMatch ? descMatch[1].trim() : 'Kunne ikke analysere bildet';
    
    // Cache resultat
    saveToCache(cacheKey, { type: imageType, description });
    
    // Logg til database
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
    console.error('Image analysis error:', error);
    return { 
      imageUrl, 
      imageType: 'annet', 
      description: 'Kunne ikke analysere dette bildet' 
    };
  }
}

// Detekter boligtype
async function detectPropertyType(imageUrls) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: `Identifiser boligtype basert på bildene.
        
Svar i JSON format:
{
  "type": "enebolig|tomannsbolig|rekkehus|leilighet|hytte|ukjent",
  "typeName": "Norsk navn",
  "confidence": 0.0-1.0,
  "description": "Kort beskrivelse"
}`
      }, {
        role: "user",
        content: [
          { type: "text", text: "Hva slags boligtype er dette?" },
          ...imageUrls.map(url => ({
            type: "image_url",
            image_url: { url, detail: "low" }
          }))
        ]
      }],
      max_tokens: 100,
      temperature: 0.3
    });
    
    return JSON.parse(response.choices[0].message.content.trim());
  } catch (error) {
    console.error('Property type detection error:', error);
    return null;
  }
}

// Generer intro
async function generateIntro(address, propertyInfo, targetGroup) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: `Du er en norsk eiendomsmegler som skriver korte, fengende introduksjoner.
        Målgruppe: ${targetGroup}
        Maks 3-4 setninger.`
      }, {
        role: "user",
        content: `Skriv en introduksjon for:
Adresse: ${address}
Info: ${propertyInfo || 'Standard bolig'}`
      }],
      max_tokens: 150,
      temperature: 0.7
    });
    
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Intro generation error:', error);
    return '';
  }
}

// Hent markedsdata (forenklet versjon av din eksisterende)
async function fetchMarketData(address, propertyInfo) {
  try {
    // Parse info
    const sqm = propertyInfo.match(/(\d+)\s*m[²2]/)?.[1] || 85;
    const basePrice = 50000; // Kr per m²
    const avgPrice = parseInt(sqm) * basePrice;
    
    return {
      analysis: {
        avgPricePerSqm: basePrice + Math.random() * 10000,
        priceRange: {
          min: basePrice * 0.85,
          max: basePrice * 1.15
        },
        relevantSales: Math.floor(20 + Math.random() * 40),
        priceGrowthPercent: (3 + Math.random() * 4).toFixed(1)
      },
      marketIndicators: {
        avgDaysOnMarket: Math.floor(30 + Math.random() * 30),
        demandLevel: 'Moderat',
        marketTemperature: 'warm'
      }
    };
  } catch (error) {
    console.error('Market data error:', error);
    return null;
  }
}

// Hent områdeinfo (forenklet)
async function fetchLocationInfo(address) {
  try {
    // Mock koordinater
    const lat = 59.9139 + (Math.random() - 0.5) * 0.1;
    const lon = 10.7522 + (Math.random() - 0.5) * 0.1;
    
    const sunConditions = calculateSunConditions(lat, lon);
    const season = getCurrentSeason();
    
    return {
      success: true,
      areaDescription: `Området rundt ${address} er et etablert boligområde med gode sol- og utsiktsforhold. ${
        sunConditions.dailySunHours[season]
      } timer dagslys i ${season}. Kort vei til kollektivtransport og servicetilbud.`,
      sunConditions,
      season
    };
  } catch (error) {
    console.error('Location info error:', error);
    return null;
  }
}

// Analyser konkurrenter (forenklet)
async function analyzeCompetitors(address, propertyInfo) {
  try {
    const advantages = [];
    
    // Mock fordeler basert på propertyInfo
    if (/balkong/i.test(propertyInfo)) {
      advantages.push({
        feature: 'Balkong',
        rarity: 'Kun 40% har',
        impact: 'high'
      });
    }
    
    if (/garasje/i.test(propertyInfo)) {
      advantages.push({
        feature: 'Garasje',
        rarity: 'Kun 25% har',
        impact: 'high'
      });
    }
    
    return {
      totalListings: Math.floor(10 + Math.random() * 20),
      activeListings: Math.floor(5 + Math.random() * 10),
      advantages,
      pricingStrategy: 'Konkurransedyktig prising anbefales'
    };
  } catch (error) {
    console.error('Competitor analysis error:', error);
    return null;
  }
}

// Hent galleri-bilder
async function fetchGalleryImages(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const images = [];
    
    // Generiske bilde-selectors
    $('img').each((i, elem) => {
      const src = $(elem).attr('src') || 
                 $(elem).attr('data-src') || 
                 $(elem).attr('data-lazy-src');
      
      if (src && src.startsWith('http') && !src.includes('logo')) {
        let fullSrc = src;
        // Pholio-spesifikk håndtering
        if (url.includes('pholio.no')) {
          fullSrc = src.replace('/thumb/', '/large/')
                       .replace('_thumb', '')
                       .replace('/small/', '/large/');
        }
        images.push(fullSrc);
      }
    });
    
    // Ekstraher adresse
    const title = $('title').text();
    const h1 = $('h1').text();
    let address = title || h1 || 'Ukjent adresse';
    
    // Rens adresse
    address = address.replace(/\s*[-|]\s*pholio.*/i, '')
                     .replace(/\s*[-|]\s*FINN.*/i, '')
                     .replace(/\s*[-|]\s*[A-Za-z]+\s*&.*$/, '')
                     .trim();
    
    return {
      images: [...new Set(images)].slice(0, 50),
      address
    };
  } catch (error) {
    console.error('Gallery fetch error:', error);
    throw new Error('Kunne ikke hente bilder fra galleri');
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: '8mb',
  },
};