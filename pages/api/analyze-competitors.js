// ===== FILE: pages/api/analyze-competitors.js - KONKURRANSEANALYSE =====
import OpenAI from 'openai';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// Mock data generator for demo - skulle i produksjon hente fra FINN.no API eller lignende
async function fetchCompetitorData(address, propertyInfo) {
  // Parse property info for key details
  const propertySize = propertyInfo.match(/(\d+)\s*m[²2]/)?.[1] || 85;
  const bedrooms = propertyInfo.match(/(\d+)\s*soverom/i)?.[1] || 2;
  const hasBalcony = /balkong/i.test(propertyInfo);
  const hasGarage = /garasje|parkering/i.test(propertyInfo);
  const bathYear = propertyInfo.match(/bad.*?(\d{4})/i)?.[1] || 2010;
  
  // Generate realistic competitor data based on location
  const basePrice = 35000; // kr per m²
  const competitors = [];
  
  for (let i = 0; i < 12; i++) {
    const sizeVariation = Math.random() * 40 - 20; // +/- 20m²
    const size = parseInt(propertySize) + sizeVariation;
    const pricePerM2 = basePrice + (Math.random() * 10000 - 5000);
    
    competitors.push({
      id: i + 1,
      address: `Eksempelveien ${Math.floor(Math.random() * 200)}, ${address.split(',').pop()}`,
      price: Math.round(size * pricePerM2 / 100000) * 100000,
      size: Math.round(size),
      pricePerM2: Math.round(pricePerM2),
      bedrooms: Math.max(1, Math.min(5, parseInt(bedrooms) + Math.floor(Math.random() * 3 - 1))),
      bathrooms: Math.random() > 0.7 ? 2 : 1,
      balcony: Math.random() > 0.6,
      garage: Math.random() > 0.75,
      yearBuilt: 1960 + Math.floor(Math.random() * 60),
      daysOnMarket: Math.floor(Math.random() * 90),
      viewings: Math.floor(Math.random() * 5),
      status: Math.random() > 0.3 ? 'Til salgs' : 'Solgt',
      link: `https://finn.no/realestate/homes/ad.html?finnkode=${200000000 + i}`
    });
  }
  
  return competitors;
}

// Analyser konkurrenter og finn fordeler
async function analyzeCompetitiveAdvantages(property, competitors) {
  const advantages = [];
  const disadvantages = [];
  const insights = {};
  
  // Calculate averages
  const avgPrice = competitors.reduce((sum, c) => sum + c.price, 0) / competitors.length;
  const avgPricePerM2 = competitors.reduce((sum, c) => sum + c.pricePerM2, 0) / competitors.length;
  const avgSize = competitors.reduce((sum, c) => sum + c.size, 0) / competitors.length;
  const avgDaysOnMarket = competitors.filter(c => c.status === 'Solgt')
    .reduce((sum, c) => sum + c.daysOnMarket, 0) / competitors.filter(c => c.status === 'Solgt').length || 45;
  
  // Features comparison
  const balconyPercentage = (competitors.filter(c => c.balcony).length / competitors.length) * 100;
  const garagePercentage = (competitors.filter(c => c.garage).length / competitors.length) * 100;
  const twoBathPercentage = (competitors.filter(c => c.bathrooms > 1).length / competitors.length) * 100;
  
  // Analyze advantages
  if (property.hasBalcony && balconyPercentage < 50) {
    advantages.push({
      feature: 'Balkong',
      rarity: `Kun ${Math.round(balconyPercentage)}% har`,
      impact: 'high'
    });
  }
  
  if (property.hasGarage && garagePercentage < 30) {
    advantages.push({
      feature: 'Garasje',
      rarity: `Kun ${Math.round(garagePercentage)}% har`,
      impact: 'high'
    });
  }
  
  if (property.bathYear && parseInt(property.bathYear) > 2015) {
    const avgBathAge = 2024 - 2008; // Assumed average
    advantages.push({
      feature: `Bad renovert ${property.bathYear}`,
      rarity: `${avgBathAge} år nyere enn snitt`,
      impact: 'medium'
    });
  }
  
  // Popular search terms based on area
  const popularKeywords = [
    'barnevennlig', 'sentralt', 'rolig', 'solrikt', 
    'moderne', 'oppusset', 'balkong', 'parkering'
  ];
  
  insights.avgPrice = avgPrice;
  insights.avgPricePerM2 = avgPricePerM2;
  insights.avgSize = avgSize;
  insights.avgDaysOnMarket = Math.round(avgDaysOnMarket);
  insights.totalListings = competitors.length;
  insights.activeListings = competitors.filter(c => c.status === 'Til salgs').length;
  insights.popularKeywords = popularKeywords;
  
  return { advantages, disadvantages, insights };
}

// Generer prisstrategi
async function generatePricingStrategy(property, insights, advantages) {
  const prompt = `Basert på følgende markedsdata, foreslå en prisstrategi:

Eiendom: ${property.size}m², ${property.bedrooms} soverom
Snitt pris området: ${insights.avgPrice.toLocaleString('nb-NO')} kr
Snitt per m²: ${insights.avgPricePerM2.toLocaleString('nb-NO')} kr
Snitt liggetid: ${insights.avgDaysOnMarket} dager

Konkurransefortrinn:
${advantages.map(a => `- ${a.feature} (${a.rarity})`).join('\n')}

Gi en kort anbefaling for:
1. Optimal prisantydning
2. Prisstrategi (aggressiv/moderat/konservativ)
3. Forventet liggetid`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{
      role: "system",
      content: "Du er en erfaren eiendomsmegler som gir strategiske prisanbefalinger."
    }, {
      role: "user",
      content: prompt
    }],
    max_tokens: 200,
    temperature: 0.7
  });

  return response.choices[0].message.content.trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address, propertyInfo } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'Mangler adresse' });
  }

  try {
    // Parse property details
    const property = {
      address,
      size: parseInt(propertyInfo.match(/(\d+)\s*m[²2]/)?.[1] || 85),
      bedrooms: parseInt(propertyInfo.match(/(\d+)\s*soverom/i)?.[1] || 2),
      bathrooms: parseInt(propertyInfo.match(/(\d+)\s*bad/i)?.[1] || 1),
      hasBalcony: /balkong/i.test(propertyInfo),
      hasGarage: /garasje|parkering/i.test(propertyInfo),
      bathYear: propertyInfo.match(/bad.*?(\d{4})/i)?.[1],
      yearBuilt: propertyInfo.match(/byggeår.*?(\d{4})/i)?.[1]
    };

    // Fetch competitor data (mock for now)
    const competitors = await fetchCompetitorData(address, propertyInfo);
    
    // Analyze competitive advantages
    const { advantages, disadvantages, insights } = await analyzeCompetitiveAdvantages(property, competitors);
    
    // Generate pricing strategy
    const pricingStrategy = await generatePricingStrategy(property, insights, advantages);
    
    // Calculate price distribution for visualization
    const priceRanges = {
      min: Math.min(...competitors.map(c => c.pricePerM2)),
      max: Math.max(...competitors.map(c => c.pricePerM2)),
      distribution: [
        { range: '< 30k', count: competitors.filter(c => c.pricePerM2 < 30000).length },
        { range: '30-35k', count: competitors.filter(c => c.pricePerM2 >= 30000 && c.pricePerM2 < 35000).length },
        { range: '35-40k', count: competitors.filter(c => c.pricePerM2 >= 35000 && c.pricePerM2 < 40000).length },
        { range: '> 40k', count: competitors.filter(c => c.pricePerM2 >= 40000).length }
      ]
    };
    
    // Market trends (mock data)
    const marketTrends = {
      priceChange6m: 3.2, // percentage
      demandLevel: 'Høy',
      supplyLevel: 'Moderat',
      seasonality: 'Høysesong for salg'
    };
    
    // Target audience analysis
    const audienceAnalysis = {
      primary: property.bedrooms >= 3 ? 'Barnefamilier' : 'Par/Singles',
      secondary: property.hasGarage ? 'Bilister' : 'Kollektivbrukere',
      ageGroup: '30-45 år',
      incomeLevel: 'Middel til høy'
    };

    res.status(200).json({
      property,
      competitors: competitors.slice(0, 6), // Return subset for UI
      totalListings: insights.totalListings,
      activeListings: insights.activeListings,
      insights: {
        avgPrice: Math.round(insights.avgPrice),
        avgPricePerM2: Math.round(insights.avgPricePerM2),
        avgSize: Math.round(insights.avgSize),
        avgDaysOnMarket: insights.avgDaysOnMarket,
        priceRanges,
        marketTrends
      },
      advantages: advantages.slice(0, 5),
      disadvantages: disadvantages.slice(0, 3),
      popularKeywords: insights.popularKeywords,
      pricingStrategy,
      audienceAnalysis,
      recommendations: {
        pricing: `${Math.round(property.size * insights.avgPricePerM2 * 0.95 / 100000) * 100000}-${Math.round(property.size * insights.avgPricePerM2 * 1.05 / 100000) * 100000}`,
        marketing: advantages.map(a => a.feature).join(', '),
        targetDays: insights.avgDaysOnMarket - 5
      }
    });

  } catch (error) {
    console.error('Competitor analysis error:', error);
    res.status(500).json({ 
      error: 'Kunne ikke analysere konkurrenter',
      details: error.message 
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};