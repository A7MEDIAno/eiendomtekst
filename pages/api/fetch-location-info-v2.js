// ===== FILE: pages/api/fetch-location-info-v2.js - FORBEDRET MED SOLFORHOLD =====
import OpenAI from 'openai';
import { getCurrentSeason, SUN_CONDITIONS } from '../../lib/seasonalDescriptions';

const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// Beregn avstand mellom to koordinater (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius av jorden i km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  // Returner i meter hvis under 1km, ellers i km
  if (distance < 1) {
    return { value: Math.round(distance * 1000), unit: 'm' };
  }
  return { value: distance.toFixed(1), unit: 'km' };
}

// Beregn solforhold basert på koordinater og bygningsretning
function calculateSunConditions(lat, lon, buildingData = {}) {
  // Nord-Norge har midnattssol/mørketid
  const isNorthernNorway = lat > 65.0;
  
  // Basis soldata for Norge
  const sunData = {
    latitude: lat,
    longitude: lon,
    isNorthern: isNorthernNorway,
    // Sommersolverv ca 21. juni - sol opp/ned i Oslo
    summerSunrise: isNorthernNorway ? 'Midnattssol' : '03:54',
    summerSunset: isNorthernNorway ? 'Midnattssol' : '22:44',
    // Vintersolverv ca 21. desember
    winterSunrise: isNorthernNorway ? 'Mørketid' : '09:18',
    winterSunset: isNorthernNorway ? 'Mørketid' : '15:12',
    
    // Timer med direkte sollys (gjennomsnitt)
    dailySunHours: {
      summer: isNorthernNorway ? 24 : 19,
      winter: isNorthernNorway ? 0 : 6,
      spring: 12,
      autumn: 10
    }
  };

  // Analyser omkringliggende bygninger for skygge
  const shadowAnalysis = analyzeShadows(buildingData);
  
  return {
    ...sunData,
    shadowAnalysis,
    optimalRooms: getOptimalRoomPlacement(lat),
    solarGain: calculateSolarGain(lat, getCurrentSeason())
  };
}

// Analyser skyggeforhold
function analyzeShadows(buildingData) {
  const shadows = {
    morning: 'Ingen skygge',
    midday: 'Minimal skygge',
    evening: 'Noe skygge fra nabobygninger',
    winter: 'Lav vintersol kan gi skygge'
  };

  // Hvis vi har data om omkringliggende bygninger
  if (buildingData.nearbyBuildings) {
    // Forenklet skyggeanalyse
    const tall = buildingData.nearbyBuildings.filter(b => b.height > 15).length;
    if (tall > 2) {
      shadows.morning = 'Noe morgenskygge fra høye bygninger';
      shadows.winter = 'Begrenset vintersol pga. omkringliggende bebyggelse';
    }
  }

  return shadows;
}

// Få optimal romplassering basert på breddegrad
function getOptimalRoomPlacement(latitude) {
  const recommendations = {
    stue: latitude > 60 ? 'Sør/sørvest for maksimal sol' : 'Sørvest for kveldssol',
    soverom: 'Øst for morgensol, nord for kjølige netter',
    kjøkken: 'Øst/sørøst for morgensol',
    terrasse: 'Vest/sørvest for kveldssol',
    hjemmekontor: 'Nord for jevnt arbeidslys uten gjenskinn'
  };
  
  return recommendations;
}

// Beregn solinnstråling/energi
function calculateSolarGain(latitude, season) {
  // Forenklet beregning av solenergi kWh/m²/dag
  const baseValues = {
    summer: 5.5,
    spring: 3.5,
    autumn: 2.5,
    winter: 0.8
  };
  
  // Juster for breddegrad
  const latitudeFactor = 1 - ((latitude - 58) * 0.02);
  const seasonValue = baseValues[season] * latitudeFactor;
  
  return {
    daily: seasonValue.toFixed(1),
    monthly: (seasonValue * 30).toFixed(0),
    season: season,
    energySaving: `${(seasonValue * 3).toFixed(0)}% redusert oppvarmingsbehov`
  };
}

// Analyser nabolaget mer detaljert
async function analyzeNeighborhood(lat, lon, amenities) {
  const analysis = {
    familyFriendly: 0,
    urbanLevel: 0,
    greenAreas: 0,
    noiseLevel: 'Lavt',
    safety: 'Trygt område',
    demographics: 'Variert',
    development: 'Stabilt'
  };

  // Familie-vennlighet
  if (amenities.kindergartens.count > 2) analysis.familyFriendly += 3;
  if (amenities.schools.count > 1) analysis.familyFriendly += 2;
  if (amenities.recreation.count > 2) analysis.familyFriendly += 2;
  
  // Urban-nivå
  if (amenities.dining.count > 10) analysis.urbanLevel += 3;
  if (amenities.shopping.count > 5) analysis.urbanLevel += 2;
  if (amenities.publicTransport.busStopsWithin500m > 3) analysis.urbanLevel += 2;
  
  // Grøntområder
  analysis.greenAreas = amenities.recreation.count;
  
  // Støynivå (basert på nærhet til hovedveier/transport)
  if (amenities.publicTransport.nearestBusStop?.distance?.value < 50) {
    analysis.noiseLevel = 'Moderat (nær busstopp)';
  }
  
  // Vurderinger
  analysis.familyScore = analysis.familyFriendly > 5 ? 'Svært barnevennlig' : 
                        analysis.familyFriendly > 2 ? 'Barnevennlig' : 'Egnet for voksne';
  
  analysis.urbanScore = analysis.urbanLevel > 5 ? 'Urbant' :
                       analysis.urbanLevel > 2 ? 'Semi-urbant' : 'Rolig boligområde';

  return analysis;
}

// Generer omfattende områdebeskrivelse
async function generateEnhancedAreaDescription(locationData, sunConditions, neighborhoodAnalysis) {
  const season = getCurrentSeason();
  
  const prompt = `Lag en omfattende og attraktiv områdebeskrivelse for eiendomsprospekt.

ADRESSE: ${locationData.address}
OMRÅDE: ${locationData.district || locationData.city}

SOLFORHOLD:
- Breddegrad: ${sunConditions.latitude}°N
- Soltimer sommer: ${sunConditions.dailySunHours.summer}
- Soltimer vinter: ${sunConditions.dailySunHours.winter}
- Sesong nå: ${season}
- Potensiell solenergi: ${sunConditions.solarGain.daily} kWh/m²/dag

NABOLAGSANALYSE:
- Karakter: ${neighborhoodAnalysis.urbanScore}
- Familievennlighet: ${neighborhoodAnalysis.familyScore}
- Grøntområder: ${neighborhoodAnalysis.greenAreas} innen 2km
- Støynivå: ${neighborhoodAnalysis.noiseLevel}

AVSTANDER:
${locationData.amenities.kindergartens.nearest ? `- Barnehage: ${locationData.amenities.kindergartens.nearest.distance.value}${locationData.amenities.kindergartens.nearest.distance.unit}` : ''}
${locationData.amenities.schools.nearest ? `- Skole: ${locationData.amenities.schools.nearest.distance.value}${locationData.amenities.schools.nearest.distance.unit}` : ''}
${locationData.amenities.shopping.nearestSupermarket ? `- Matbutikk: ${locationData.amenities.shopping.nearestSupermarket.distance.value}${locationData.amenities.shopping.nearestSupermarket.distance.unit}` : ''}
${locationData.amenities.publicTransport.nearestBusStop ? `- Buss: ${locationData.amenities.publicTransport.nearestBusStop.distance.value}${locationData.amenities.publicTransport.nearestBusStop.distance.unit}` : ''}

Skriv 2 avsnitt:
1. Beliggenhet og nabolag (fokus på områdets kvaliteter, solforhold og sesongfordeler)
2. Fasiliteter og transport (konkrete avstander og tilbud)

Vær positiv men faktabasert. Fremhev sesongspesifikke fordeler.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{
      role: "system",
      content: "Du er en erfaren eiendomsmegler som skriver attraktive men ærlige områdebeskrivelser. Bruk konkret informasjon og fremhev sesongfordeler."
    }, {
      role: "user",
      content: prompt
    }],
    max_tokens: 400,
    temperature: 0.7
  });

  return response.choices[0].message.content.trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address, includeAdvancedAnalysis = true } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'Mangler adresse' });
  }

  try {
    // Geocoding
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=no&accept-language=no`;
    
    const geocodeResponse = await fetch(geocodeUrl, {
      headers: { 'User-Agent': 'A7Generate/1.0' }
    });
    
    const geocodeData = await geocodeResponse.json();
    
    if (!geocodeData || geocodeData.length === 0) {
      return res.status(404).json({ 
        error: 'Kunne ikke finne adresse',
        suggestion: 'Prøv med mer spesifikk adresse (gate + nummer + sted)'
      });
    }

    const location = geocodeData[0];
    const lat = parseFloat(location.lat);
    const lon = parseFloat(location.lon);

    // Reverse geocoding
    const reverseUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=18&accept-language=no`;
    
    const reverseResponse = await fetch(reverseUrl, {
      headers: { 'User-Agent': 'A7Generate/1.0' }
    });
    
    const reverseData = await reverseResponse.json();

    // Hent POIs med Overpass
    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    const overpassQuery = `
      [out:json][timeout:25];
      (
        node["amenity"="kindergarten"](around:2000,${lat},${lon});
        node["amenity"="school"](around:3000,${lat},${lon});
        node["shop"="supermarket"](around:1500,${lat},${lon});
        node["shop"="convenience"](around:1000,${lat},${lon});
        node["amenity"="cafe"](around:1000,${lat},${lon});
        node["amenity"="restaurant"](around:1500,${lat},${lon});
        node["leisure"="playground"](around:1000,${lat},${lon});
        node["leisure"="park"](around:2000,${lat},${lon});
        node["highway"="bus_stop"](around:500,${lat},${lon});
        node["railway"="station"](around:5000,${lat},${lon});
        node["railway"="tram_stop"](around:1000,${lat},${lon});
        node["amenity"="pharmacy"](around:1500,${lat},${lon});
        node["amenity"="doctors"](around:2000,${lat},${lon});
        node["amenity"="dentist"](around:2000,${lat},${lon});
        node["natural"="tree"](around:200,${lat},${lon});
        node["building"](around:100,${lat},${lon});
        way["highway"="primary"](around:500,${lat},${lon});
        way["highway"="trunk"](around:500,${lat},${lon});
      );
      out body;
    `;
    
    const overpassResponse = await fetch(overpassUrl, {
      method: 'POST',
      body: `data=${encodeURIComponent(overpassQuery)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    const overpassData = await overpassResponse.json();
    
    // Analyser POIs
    const pois = overpassData.elements || [];
    
    // Beregn avstander til fasiliteter
    const findNearest = (type, subTypes = []) => {
      const items = pois.filter(p => {
        if (subTypes.length > 0) {
          return subTypes.some(st => p.tags?.[type] === st);
        }
        return p.tags?.[type];
      });
      
      if (items.length === 0) return null;
      
      const withDistances = items.map(item => {
        const dist = calculateDistance(lat, lon, item.lat, item.lon);
        return {
          name: item.tags.name || item.tags[type],
          distance: dist,
          type: item.tags[type],
          ...item
        };
      }).sort((a, b) => {
        const aDist = a.distance.unit === 'km' ? a.distance.value * 1000 : a.distance.value;
        const bDist = b.distance.unit === 'km' ? b.distance.value * 1000 : b.distance.value;
        return aDist - bDist;
      });
      
      return withDistances;
    };

    // Strukturer amenities data
    const amenities = {
      kindergartens: {
        nearest: findNearest('amenity', ['kindergarten'])?.[0],
        count: findNearest('amenity', ['kindergarten'])?.length || 0,
        within1km: findNearest('amenity', ['kindergarten'])?.filter(k => 
          k.distance.unit === 'm' || (k.distance.unit === 'km' && k.distance.value <= 1)
        ).length || 0
      },
      schools: {
        nearest: findNearest('amenity', ['school'])?.[0],
        count: findNearest('amenity', ['school'])?.length || 0,
        within2km: findNearest('amenity', ['school'])?.filter(s => 
          s.distance.unit === 'm' || (s.distance.unit === 'km' && s.distance.value <= 2)
        ).length || 0
      },
      shopping: {
        nearestSupermarket: findNearest('shop', ['supermarket', 'convenience'])?.[0],
        count: findNearest('shop', ['supermarket', 'convenience'])?.length || 0,
        within500m: findNearest('shop', ['supermarket', 'convenience'])?.filter(s => 
          s.distance.unit === 'm' && s.distance.value <= 500
        ).length || 0
      },
      publicTransport: {
        nearestBusStop: findNearest('highway', ['bus_stop'])?.[0],
        nearestTrainStation: findNearest('railway', ['station', 'tram_stop'])?.[0],
        busStopsWithin500m: findNearest('highway', ['bus_stop'])?.filter(b => 
          b.distance.unit === 'm' && b.distance.value <= 500
        ).length || 0
      },
      recreation: {
        nearestPark: findNearest('leisure', ['park', 'playground'])?.[0],
        count: findNearest('leisure', ['park', 'playground'])?.length || 0,
        within1km: findNearest('leisure', ['park', 'playground'])?.filter(p => 
          p.distance.unit === 'm' || (p.distance.unit === 'km' && p.distance.value <= 1)
        ).length || 0
      },
      healthcare: {
        nearestPharmacy: findNearest('amenity', ['pharmacy'])?.[0],
        nearestDoctor: findNearest('amenity', ['doctors'])?.[0],
        count: findNearest('amenity', ['pharmacy', 'doctors', 'dentist'])?.length || 0
      },
      dining: {
        nearest: findNearest('amenity', ['restaurant', 'cafe', 'fast_food'])?.[0],
        count: findNearest('amenity', ['restaurant', 'cafe', 'fast_food'])?.length || 0,
        within1km: findNearest('amenity', ['restaurant', 'cafe', 'fast_food'])?.filter(r => 
          r.distance.unit === 'm' || (r.distance.unit === 'km' && r.distance.value <= 1)
        ).length || 0
      }
    };

    const locationData = {
      address: reverseData.display_name,
      coordinates: { lat, lon },
      district: reverseData.address?.suburb || reverseData.address?.neighbourhood,
      city: reverseData.address?.city || reverseData.address?.town,
      postcode: reverseData.address?.postcode,
      county: reverseData.address?.county,
      amenities
    };

    // Beregn solforhold
    const sunConditions = calculateSunConditions(lat, lon);
    
    // Analyser nabolaget
    const neighborhoodAnalysis = await analyzeNeighborhood(lat, lon, amenities);
    
    // Generer beskrivelse
    const areaDescription = await generateEnhancedAreaDescription(
      locationData, 
      sunConditions, 
      neighborhoodAnalysis
    );

    // Formater output
    const season = getCurrentSeason();
    const seasonNames = {
      summer: 'sommer',
      winter: 'vinter',
      spring: 'vår',
      autumn: 'høst'
    };
    
    const generatedInfo = `BELIGGENHET OG NÆROMRÅDE:
${areaDescription}

SOLFORHOLD (${seasonNames[season]}):
• Soltimer per dag: ${sunConditions.dailySunHours[season]} timer
• Potensiell solenergi: ${sunConditions.solarGain.daily} kWh/m²/dag
• Energibesparelse: ${sunConditions.solarGain.energySaving}
${sunConditions.isNorthern ? `• Nord-Norge: ${season === 'summer' ? 'Midnattssol' : season === 'winter' ? 'Mørketid' : 'Normale lysforhold'}` : ''}

OMRÅDEKARAKTER:
• Type: ${neighborhoodAnalysis.urbanScore}
• Familievennlighet: ${neighborhoodAnalysis.familyScore}
• Støynivå: ${neighborhoodAnalysis.noiseLevel}
• Grøntområder: ${neighborhoodAnalysis.greenAreas} innen 2 km

AVSTANDER TIL FASILITETER:
${amenities.kindergartens.nearest ? `• Nærmeste barnehage: ${formatDistance(amenities.kindergartens.nearest.distance)} (${amenities.kindergartens.nearest.name || 'navn ukjent'})` : ''}
${amenities.schools.nearest ? `• Nærmeste skole: ${formatDistance(amenities.schools.nearest.distance)} (${amenities.schools.nearest.name || 'navn ukjent'})` : ''}
${amenities.shopping.nearestSupermarket ? `• Nærmeste matbutikk: ${formatDistance(amenities.shopping.nearestSupermarket.distance)}` : ''}
${amenities.publicTransport.nearestBusStop ? `• Nærmeste busstopp: ${formatDistance(amenities.publicTransport.nearestBusStop.distance)}` : ''}
${amenities.publicTransport.nearestTrainStation ? `• Nærmeste tog/trikk: ${formatDistance(amenities.publicTransport.nearestTrainStation.distance)}` : ''}
${amenities.recreation.nearestPark ? `• Nærmeste park/lekeplass: ${formatDistance(amenities.recreation.nearestPark.distance)}` : ''}
${amenities.healthcare.nearestPharmacy ? `• Nærmeste apotek: ${formatDistance(amenities.healthcare.nearestPharmacy.distance)}` : ''}

OPTIMAL ROMPLASSERING:
${Object.entries(sunConditions.optimalRooms).map(([room, recommendation]) => 
  `• ${room.charAt(0).toUpperCase() + room.slice(1)}: ${recommendation}`
).join('\n')}`;

    res.status(200).json({
      success: true,
      locationData,
      sunConditions,
      neighborhoodAnalysis,
      areaDescription,
      generatedInfo,
      season,
      recommendations: {
        photography: `Beste tid for foto: ${season === 'summer' ? 'Morgen eller sen ettermiddag' : 'Midt på dagen for maksimal lys'}`,
        marketing: `Fremhev: ${season === 'winter' ? 'Lune, varme rom og god isolasjon' : 'Utendørs kvaliteter og lysforhold'}`
      }
    });

  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Kunne ikke hente områdeinformasjon' });
  }
}

// Hjelpefunksjoner
function formatDistance(distanceObj) {
  if (!distanceObj) return 'Ukjent';
  return `${distanceObj.value}${distanceObj.unit}`;
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};