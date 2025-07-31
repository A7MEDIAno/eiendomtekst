// pages/api/analyze-all.js
import OpenAI from 'openai';
import * as cheerio from 'cheerio';
import { getCacheKey, getFromCache, saveToCache } from '../../lib/cacheUtils';
import { getRelevantExamples, logAnalysis, getSeasonalPhrases } from '../../lib/database';
import { getCurrentSeason } from '../../lib/seasonalDescriptions';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

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
    includeIntro = true
  } = req.body;

  try {
    console.log('🚀 Starting simplified analysis...');
    
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

    // Step 2: Analyze images in batches
    const results = [];
    const batchSize = 3;
    const maxImages = Math.min(images.length, 12); // Max 12 images
    
    for (let i = 0; i < maxImages; i += batchSize) {
      const batch = images.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(url => analyzeImage(url, targetGroup, propertyInfo))
      );
      results.push(...batchResults);
      
      console.log(`✅ Analyzed batch ${Math.floor(i / batchSize) + 1}`);
    }

    // Step 3: Generate intro if requested
    let intro = '';
    if (includeIntro && (propertyInfo || address)) {
      intro = await generateIntro(address, propertyInfo, targetGroup);
    }

    // Step 4: Detect property type from first few images
    let propertyType = null;
    if (images.length > 0) {
      propertyType = await detectPropertyType(images.slice(0, 3));
    }

    // Step 5: Simple market insights (no external API)
    const marketInsights = generateSimpleMarketInsights(address, propertyType);

    console.log('🎉 Analysis complete!');

    return res.status(200).json({
      success: true,
      results,
      address,
      intro,
      propertyType,
      marketInsights,
      totalImages: images.length,
      analyzedImages: results.length
    });

  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ 
      error: 'Analyse feilet',
      details: error.message 
    });
  }
}

// Fetch gallery images using cheerio (no puppeteer)
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
    
    // Generic image selectors
    $('img').each((i, elem) => {
      const src = $(elem).attr('src') || 
                 $(elem).attr('data-src') || 
                 $(elem).attr('data-lazy-src');
      
      if (src && src.startsWith('http') && !src.includes('logo')) {
        // For pholio.no, replace thumb with large
        let fullSrc = src;
        if (url.includes('pholio.no')) {
          fullSrc = src.replace('/thumb/', '/large/')
                       .replace('_thumb', '')
                       .replace('/small/', '/large/');
        }
        images.push(fullSrc);
      }
    });
    
    // Extract address
    const title = $('title').text();
    const h1 = $('h1').text();
    let address = title || h1 || 'Ukjent adresse';
    
    // Clean up address
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

// Simplified image analysis
async function analyzeImage(imageUrl, targetGroup, propertyInfo) {
  const startTime = Date.now();
  
  try {
    // Check cache first
    const cacheKey = getCacheKey(imageUrl, 'auto', targetGroup);
    const cachedDescription = getFromCache(cacheKey);
    
    if (cachedDescription) {
      return { 
        imageUrl, 
        imageType: cachedDescription.type,
        description: cachedDescription.description 
      };
    }
    
    // Identify room type and generate description in one call
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: `Du er en norsk eiendomsmegler. Identifiser romtype og skriv en kort beskrivelse.
        
Romtyper: stue, kjøkken, bad, soverom, gang, terrasse, balkong, hage, fasade, annet

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
    
    // Cache result
    saveToCache(cacheKey, { type: imageType, description });
    
    // Log to database
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

// Generate intro text
async function generateIntro(address, propertyInfo, targetGroup) {
  try {
    const targetGroupTexts = {
      standard: 'bred målgruppe',
      family: 'barnefamilier',
      firstTime: 'førstegangskjøpere',
      investor: 'investorer',
      senior: 'seniorer'
    };
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: `Du er en norsk eiendomsmegler som skriver korte, fengende introduksjoner.
        Målgruppe: ${targetGroupTexts[targetGroup]}
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

// Detect property type from images
async function detectPropertyType(imageUrls) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: "Identifiser boligtype basert på bildene. Svar kun med: enebolig, rekkehus, leilighet, hytte eller annet"
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
      max_tokens: 20,
      temperature: 0.3
    });
    
    return response.choices[0].message.content.trim().toLowerCase();
  } catch (error) {
    console.error('Property type detection error:', error);
    return 'ukjent';
  }
}

// Generate simple market insights without external APIs
function generateSimpleMarketInsights(address, propertyType) {
  const locationMatch = address.match(/\b(\d{4})\s+([A-Za-zæøåÆØÅ\s]+)$/);
  const location = locationMatch ? locationMatch[2] : 'Norge';
  
  const isUrban = ['oslo', 'bergen', 'trondheim', 'stavanger'].some(city => 
    location.toLowerCase().includes(city)
  );
  
  const basePrices = {
    enebolig: isUrban ? 75000 : 45000,
    rekkehus: isUrban ? 65000 : 40000,
    leilighet: isUrban ? 85000 : 50000,
    hytte: 35000,
    annet: 55000
  };
  
  const basePrice = basePrices[propertyType] || basePrices.annet;
  const variation = 0.15;
  const estimatedPrice = basePrice + (Math.random() - 0.5) * basePrice * variation;
  
  return {
    location,
    estimatedPricePerSqm: Math.round(estimatedPrice),
    marketTrend: isUrban ? 'Stigende' : 'Stabil',
    demandLevel: isUrban ? 'Høy' : 'Moderat',
    averageSalesTime: isUrban ? '30-45 dager' : '45-60 dager'
  };
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
    responseLimit: '8mb',
  },
};