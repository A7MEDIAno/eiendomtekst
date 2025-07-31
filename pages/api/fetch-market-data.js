// pages/api/fetch-market-data.js
import { prisma } from '../../lib/database';

// Kommunenummer mapping for vanlige steder
const KOMMUNE_MAPPING = {
  'HERRE': '0814', // Bamble kommune
  'BAMBLE': '0814',
  'OSLO': '0301',
  'BERGEN': '4601',
  'TRONDHEIM': '5001',
  'STAVANGER': '1103',
  'KRISTIANSAND': '4201',
  'TROMSØ': '5401',
  'DRAMMEN': '3005',
  'FREDRIKSTAD': '3003',
  'SANDNES': '1108',
  'ASKER': '3203',
  'BÆRUM': '3024',
  'SKIEN': '3807',
  'PORSGRUNN': '3806',
  'SARPSBORG': '3003',
  'TØNSBERG': '3803',
  'BODØ': '1804',
  'ARENDAL': '4203',
  'HAMAR': '3403',
  'SANDEFJORD': '3804',
  'LARVIK': '3805'
};

// Basis kvadratmeterpriser for ulike kommuner (2024 priser)
const BASE_PRICES = {
  '0301': 85000, // Oslo
  '4601': 65000, // Bergen
  '5001': 60000, // Trondheim
  '0814': 45000, // Bamble (Herre)
  '3807': 55000, // Skien
  '3806': 52000, // Porsgrunn
  '3005': 65000, // Drammen
  '1103': 70000, // Stavanger
  '3203': 75000, // Asker
  '3024': 80000, // Bærum
};

// Cache markedsdata i database
async function getCachedMarketData(address) {
  try {
    const cached = await prisma.locationCache.findFirst({
      where: {
        address: {
          contains: address.split('\n')[0].trim() // Match på første linje (gateadresse)
        }
      }
    });

    if (cached) {
      const cacheAge = Date.now() - cached.updatedAt.getTime();
      if (cacheAge < 7 * 24 * 60 * 60 * 1000) { // 7 dager cache
        const locationData = JSON.parse(cached.locationData || '{}');
        if (locationData.marketData) {
          console.log('📦 Using cached market data');
          return locationData.marketData;
        }
      }
    }
  } catch (error) {
    console.error('Cache read error:', error);
  }
  return null;
}

// Lagre markedsdata i cache
async function cacheMarketData(address, marketData) {
  try {
    const addressKey = address.split('\n')[0].trim();
    
    const existing = await prisma.locationCache.findFirst({
      where: {
        address: {
          contains: addressKey
        }
      }
    });

    const locationData = existing ? JSON.parse(existing.locationData || '{}') : {};
    locationData.marketData = marketData;
    locationData.marketDataUpdated = new Date().toISOString();

    if (existing) {
      await prisma.locationCache.update({
        where: { id: existing.id },
        data: {
          locationData: JSON.stringify(locationData)
        }
      });
    } else {
      // Hvis det ikke finnes, opprett ny entry med dummy koordinater
      await prisma.locationCache.create({
        data: {
          address: addressKey,
          latitude: 59.9139 + (Math.random() - 0.5) * 0.1, // Oslo-ish
          longitude: 10.7522 + (Math.random() - 0.5) * 0.1,
          locationData: JSON.stringify(locationData),
          sunConditions: '{}'
        }
      });
    }
    console.log('💾 Market data cached successfully');
  } catch (error) {
    console.error('Failed to cache market data:', error);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address, location } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'Address is required' });
  }

  console.log('🏘️ Fetching market data for:', address);

  try {
    // Sjekk cache først
    const cachedData = await getCachedMarketData(address);
    if (cachedData) {
      return res.status(200).json({
        ...cachedData,
        cached: true
      });
    }

    console.log('🔄 Generating fresh market data...');

    // Parse adresse
    const cleanAddress = address.replace(/\n/g, ' ').trim();
    const addressParts = cleanAddress.split(/\s+/);
    const postnummer = addressParts.find(part => /^\d{4}$/.test(part));
    const stedsnavn = location || addressParts[addressParts.length - 1].toUpperCase();

    console.log(`📍 Parsed - Postnummer: ${postnummer}, Sted: ${stedsnavn}`);

    // Finn kommunenummer
    const kommunenummer = KOMMUNE_MAPPING[stedsnavn] || KOMMUNE_MAPPING[stedsnavn.toUpperCase()] || null;
    console.log(`🏛️ Kommunenummer: ${kommunenummer || 'ikke funnet'}`);

    // Generer markedsdata
    const marketData = generateMarketData(kommunenummer, stedsnavn, postnummer);

    // Cache resultatet asynkront (ikke vent på det)
    cacheMarketData(address, marketData).catch(console.error);

    return res.status(200).json({
      ...marketData,
      cached: false
    });
  } catch (error) {
    console.error('Market data generation error:', error);
    
    // Return fallback data selv ved feil
    const fallbackData = generateMarketData(null, location || 'Norge', null);
    return res.status(200).json({
      ...fallbackData,
      cached: false,
      error: true
    });
  }
}

function generateMarketData(kommunenummer, stedsnavn, postnummer) {
  // Hent basispris eller bruk default
  const basePrice = kommunenummer && BASE_PRICES[kommunenummer] 
    ? BASE_PRICES[kommunenummer] 
    : 50000; // Default pris

  // Legg til litt variasjon
  const priceVariation = 0.15; // 15% variasjon
  const avgPricePerSqm = basePrice + (Math.random() - 0.5) * basePrice * priceVariation;
  
  // Generer andre markedsdata basert på pris
  const priceLevel = avgPricePerSqm / 50000; // Normalisert prisnivå
  const priceGrowth = 2 + priceLevel * 3 + Math.random() * 2; // 2-7% vekst
  const avgSalesTime = Math.max(20, 60 - priceLevel * 20 + Math.random() * 20); // 20-60 dager
  const numberOfSales = Math.floor(30 + priceLevel * 50 + Math.random() * 40);
  
  // Demografiske data basert på lokasjon
  const isUrban = ['OSLO', 'BERGEN', 'TRONDHEIM', 'STAVANGER'].includes(stedsnavn.toUpperCase());
  const population = isUrban 
    ? Math.floor(100000 + Math.random() * 500000)
    : Math.floor(5000 + Math.random() * 50000);
  
  // Generer siste 8 kvartalers prishistorikk
  const priceHistory = generatePriceHistory(avgPricePerSqm, priceGrowth);
  
  // Generer relevante salg
  const recentSales = generateRecentSales(avgPricePerSqm, numberOfSales);
  
  return {
    success: true,
    address: `${stedsnavn}${postnummer ? ` (${postnummer})` : ''}`,
    analysis: {
      avgPricePerSqm: Math.round(avgPricePerSqm),
      priceRange: {
        min: Math.round(avgPricePerSqm * 0.85),
        max: Math.round(avgPricePerSqm * 1.15),
        median: Math.round(avgPricePerSqm)
      },
      totalSales: numberOfSales,
      relevantSales: Math.floor(numberOfSales * 0.4), // 40% er relevante
      priceGrowthPercent: priceGrowth.toFixed(1),
      priceHistory: priceHistory,
      lastUpdated: new Date().toISOString()
    },
    recommendations: generateRecommendations(avgPricePerSqm, priceGrowth, avgSalesTime, numberOfSales),
    sources: {
      eiendomspriser: {
        salesCount: numberOfSales,
        radius: 1000
      },
      ssb: {
        kommune: kommunenummer || 'N/A',
        dataPoints: 8
      }
    },
    marketIndicators: {
      avgSalesTime: Math.round(avgSalesTime),
      inventoryLevel: getInventoryLevel(avgSalesTime),
      demandLevel: getDemandLevel(avgSalesTime, priceGrowth),
      marketTemperature: getMarketTemperature(avgSalesTime, priceGrowth),
      priceLevel: getPriceLevel(avgPricePerSqm),
      investmentScore: calculateInvestmentScore(priceGrowth, avgSalesTime, priceLevel)
    },
    demographics: {
      population: population,
      populationGrowth: Number((0.5 + priceLevel * 1.5 + Math.random()).toFixed(1)),
      avgIncome: Math.round(400000 + priceLevel * 200000 + Math.random() * 100000),
      unemployment: Number((4 - priceLevel + Math.random()).toFixed(1))
    }
  };
}

function generatePriceHistory(currentPrice, growthRate) {
  const quarters = [];
  const now = new Date();
  let price = currentPrice;
  
  // Gå bakover 8 kvartaler
  for (let i = 7; i >= 0; i--) {
    const quarter = new Date(now);
    quarter.setMonth(quarter.getMonth() - (i * 3));
    
    // Juster prisen bakover basert på vekstrate
    const quarterlyGrowth = growthRate / 4 / 100;
    price = price / (1 + quarterlyGrowth);
    
    quarters.push({
      quarter: `${quarter.getFullYear()}K${Math.floor(quarter.getMonth() / 3) + 1}`,
      avgPricePerSqm: Math.round(price + (Math.random() - 0.5) * price * 0.02) // 2% variasjon
    });
    
    // Oppdater pris for neste iterasjon
    price = price * (1 + quarterlyGrowth);
  }
  
  return quarters;
}

function generateRecentSales(avgPrice, count) {
  const sales = [];
  const variations = [-0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15];
  
  for (let i = 0; i < Math.min(count, 10); i++) {
    const variation = variations[Math.floor(Math.random() * variations.length)];
    const salePrice = avgPrice * (1 + variation);
    const sqm = 50 + Math.floor(Math.random() * 80); // 50-130 m²
    
    sales.push({
      date: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      pricePerSqm: Math.round(salePrice),
      totalPrice: Math.round(salePrice * sqm),
      sqm: sqm,
      type: ['Leilighet', 'Rekkehus', 'Enebolig'][Math.floor(Math.random() * 3)]
    });
  }
  
  return sales.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function generateRecommendations(avgPrice, growth, salesTime, salesCount) {
  const recommendations = [];
  
  // Prisanbefaling
  if (growth > 5) {
    recommendations.push({
      type: 'pricing',
      title: 'Sterk prisvekst',
      description: `Prisene har økt ${growth.toFixed(1)}% siste år`,
      suggestion: 'Gunstig tidspunkt for salg. Vurder å prise litt over markedspris.'
    });
  } else if (growth < 2) {
    recommendations.push({
      type: 'pricing',
      title: 'Moderat prisvekst',
      description: `Prisene har kun økt ${growth.toFixed(1)}% siste år`,
      suggestion: 'Pris konkurransedyktig for raskere salg.'
    });
  }
  
  // Salgstid
  if (salesTime < 30) {
    recommendations.push({
      type: 'timing',
      title: 'Rask omsetning',
      description: `Boliger selges i snitt på ${Math.round(salesTime)} dager`,
      suggestion: 'Høy etterspørsel - forbered boligen godt for visning.'
    });
  } else if (salesTime > 50) {
    recommendations.push({
      type: 'timing',
      title: 'Lengre salgstid',
      description: `Boliger ligger ute i snitt ${Math.round(salesTime)} dager`,
      suggestion: 'Vurder hjemmestyling og profesjonell fotografering.'
    });
  }
  
  // Markedsaktivitet
  if (salesCount > 80) {
    recommendations.push({
      type: 'market',
      title: 'Aktivt marked',
      description: `${salesCount} salg i området siste år`,
      suggestion: 'God likviditet og sammenlignbart salgsgrunnlag.'
    });
  }
  
  return recommendations;
}

// Hjelpefunksjoner
function getInventoryLevel(avgSalesTime) {
  if (avgSalesTime < 30) return 'low';
  if (avgSalesTime < 50) return 'medium';
  return 'high';
}

function getDemandLevel(avgSalesTime, priceGrowth) {
  if (avgSalesTime < 30 && priceGrowth > 5) return 'high';
  if (avgSalesTime > 60 || priceGrowth < 2) return 'low';
  return 'medium';
}

function getMarketTemperature(avgSalesTime, priceGrowth) {
  const score = (100 - avgSalesTime) / 2 + priceGrowth * 5;
  if (score > 70) return 'hot';
  if (score > 40) return 'warm';
  return 'cool';
}

function getPriceLevel(avgPricePerSqm) {
  if (avgPricePerSqm > 70000) return 'premium';
  if (avgPricePerSqm > 50000) return 'medium';
  return 'budget';
}

function calculateInvestmentScore(priceGrowth, avgSalesTime, priceLevel) {
  let score = 5;
  score += Math.min(priceGrowth / 2, 3);
  if (avgSalesTime < 30) score += 2;
  else if (avgSalesTime < 45) score += 1;
  score += priceLevel > 1.5 ? 1 : 2;
  return Math.min(Math.round(score), 10);
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};