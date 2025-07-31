// ===== FILE: pages/api/detect-property-type.js - AUTO-DETECT BOLIGTYPE =====
import OpenAI from 'openai';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// Boligtyper vi kan identifisere
const PROPERTY_TYPES = {
  'enebolig': {
    name: 'Enebolig',
    indicators: ['frittliggende', 'hage', 'egen tomt', 'carport', 'garasje'],
    confidence: 0
  },
  'tomannsbolig': {
    name: 'Tomannsbolig',
    indicators: ['felles vegg', 'to enheter', 'halvpart', 'vertikaldelt'],
    confidence: 0
  },
  'rekkehus': {
    name: 'Rekkehus',
    indicators: ['rekke', 'felles vegger', 'egen inngang', 'lite hage'],
    confidence: 0
  },
  'leilighet': {
    name: 'Leilighet',
    indicators: ['etasje', 'oppgang', 'balkong', 'blokk', 'felles inngang'],
    confidence: 0
  },
  'hytte': {
    name: 'Hytte',
    indicators: ['fjell', 'natur', 'tømmer', 'peis', 'fritidsbolig'],
    confidence: 0
  }
};

// Analyser enkeltbilde for boligtype-indikatorer
async function analyzeImageForPropertyType(imageUrl) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: `Du er en ekspert på norske boligtyper. Analyser bildet og identifiser:
1. Er dette tatt innendørs eller utendørs?
2. Hvis utendørs: Hvilken type bygning ser du? (enebolig/rekkehus/blokk/hytte)
3. Hvis innendørs: Hvilke arkitektoniske elementer indikerer boligtype?

Svar i JSON format:
{
  "location": "indoor/outdoor",
  "buildingType": "enebolig/tomannsbolig/rekkehus/leilighet/hytte/ukjent",
  "confidence": 0.0-1.0,
  "indicators": ["liste", "over", "observasjoner"],
  "floor": "hvis synlig, hvilket etasje",
  "exteriorMaterial": "tre/murstein/puss/etc"
}`
      }, {
        role: "user",
        content: [
          { type: "text", text: "Analyser dette bildet for boligtype:" },
          { type: "image_url", image_url: { url: imageUrl, detail: "low" } }
        ]
      }],
      max_tokens: 200,
      temperature: 0.1
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result;
  } catch (error) {
    console.error('Error analyzing image:', error);
    return { location: 'unknown', buildingType: 'ukjent', confidence: 0 };
  }
}

// Aggreger resultater fra alle bilder
function determinePropertyType(imageAnalyses) {
  const typeScores = { ...PROPERTY_TYPES };
  let hasOutdoorImage = false;
  let hasIndoorImage = false;
  let highestFloor = 0;
  const materials = new Set();

  // Analyser hver bildeanalyse
  for (const analysis of imageAnalyses) {
    if (analysis.location === 'outdoor') {
      hasOutdoorImage = true;
      
      // Utendørsbilder gir sterk indikasjon
      if (analysis.buildingType !== 'ukjent') {
        typeScores[analysis.buildingType].confidence += analysis.confidence * 2;
      }
      
      if (analysis.exteriorMaterial) {
        materials.add(analysis.exteriorMaterial);
      }
    } else if (analysis.location === 'indoor') {
      hasIndoorImage = true;
      
      // Sjekk etasje
      if (analysis.floor) {
        const floor = parseInt(analysis.floor);
        if (!isNaN(floor)) highestFloor = Math.max(highestFloor, floor);
      }
    }

    // Tell indikatorer
    for (const indicator of (analysis.indicators || [])) {
      const lowerIndicator = indicator.toLowerCase();
      for (const [type, data] of Object.entries(typeScores)) {
        if (data.indicators.some(ind => lowerIndicator.includes(ind))) {
          typeScores[type].confidence += 0.3;
        }
      }
    }
  }

  // Ekstra regler basert på aggregerte data
  if (highestFloor >= 3) {
    typeScores.leilighet.confidence += 1.5;
    typeScores.enebolig.confidence -= 0.5;
  }

  if (materials.has('tømmer') && !hasOutdoorImage) {
    typeScores.hytte.confidence += 1;
  }

  // Finn mest sannsynlige type
  let bestType = 'ukjent';
  let bestScore = 0;
  
  for (const [type, data] of Object.entries(typeScores)) {
    if (data.confidence > bestScore) {
      bestScore = data.confidence;
      bestType = type;
    }
  }

  // Normaliser confidence til 0-1
  const normalizedConfidence = Math.min(1, bestScore / (imageAnalyses.length * 2));

  return {
    type: bestType,
    typeName: PROPERTY_TYPES[bestType]?.name || 'Ukjent',
    confidence: normalizedConfidence,
    hasOutdoorImage,
    highestFloor,
    materials: Array.from(materials),
    scores: Object.entries(typeScores).map(([type, data]) => ({
      type,
      name: data.name,
      score: data.confidence
    })).sort((a, b) => b.score - a.score)
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageUrls } = req.body;

  if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
    return res.status(400).json({ error: 'Mangler bilde-URLer' });
  }

  try {
    console.log(`🏠 Analyzing ${imageUrls.length} images for property type`);

    // Prioriter utendørsbilder og de første bildene
    const prioritizedUrls = imageUrls.slice(0, 8); // Maks 8 bilder for kostnadseffektivitet

    // Analyser bilder parallelt
    const analyses = await Promise.all(
      prioritizedUrls.map(url => analyzeImageForPropertyType(url))
    );

    // Bestem boligtype basert på alle analyser
    const propertyTypeResult = determinePropertyType(analyses);

    // Generer beskrivelse
    const description = generatePropertyDescription(propertyTypeResult);

    console.log(`✅ Detected property type: ${propertyTypeResult.typeName} (${Math.round(propertyTypeResult.confidence * 100)}% confidence)`);

    res.status(200).json({
      success: true,
      propertyType: propertyTypeResult.type,
      propertyTypeName: propertyTypeResult.typeName,
      confidence: propertyTypeResult.confidence,
      description,
      details: {
        hasOutdoorImage: propertyTypeResult.hasOutdoorImage,
        highestFloor: propertyTypeResult.highestFloor,
        materials: propertyTypeResult.materials,
        topMatches: propertyTypeResult.scores.slice(0, 3)
      },
      imageAnalyses: analyses // For debugging
    });

  } catch (error) {
    console.error('Property type detection error:', error);
    res.status(500).json({ 
      error: 'Kunne ikke identifisere boligtype',
      details: error.message 
    });
  }
}

// Generer beskrivelse basert på boligtype
function generatePropertyDescription(result) {
  const descriptions = {
    'enebolig': `Enebolig${result.highestFloor > 1 ? ` over ${result.highestFloor} etasjer` : ''}. ${
      result.materials.length > 0 ? `Fasade i ${result.materials[0]}.` : ''
    }`,
    'tomannsbolig': 'Tomannsbolig med egen inngang.',
    'rekkehus': `Rekkehus${result.highestFloor > 1 ? ` i ${result.highestFloor} etasjer` : ''}.`,
    'leilighet': `Leilighet${result.highestFloor > 0 ? ` i ${result.highestFloor}. etasje` : ''}. ${
      result.highestFloor >= 3 ? 'Mulighet for heis.' : ''
    }`,
    'hytte': `Hytte${result.materials.includes('tømmer') ? ' i tømmer' : ''}. Fritidsbolig.`,
    'ukjent': 'Boligtype kunne ikke fastslås med sikkerhet.'
  };

  return descriptions[result.type] || descriptions.ukjent;
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};