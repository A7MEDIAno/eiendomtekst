// ===== FILE: pages/api/fetch-location-info.js - OPPDATERT MED AVSTANDER =====
import OpenAI from 'openai';

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

// Hent områdeinfo fra OpenStreetMap Nominatim
async function getLocationData(address) {
  try {
    // Geocoding - finn koordinater
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=no&accept-language=no`;
    
    const geocodeResponse = await fetch(geocodeUrl, {
      headers: {
        'User-Agent': 'A7Generate/1.0'
      }
    });
    
    const geocodeData = await geocodeResponse.json();
    
    if (!geocodeData || geocodeData.length === 0) {
      return null;
    }
    
    const location = geocodeData[0];
    const lat = parseFloat(location.lat);
    const lon = parseFloat(location.lon);
    
    // Reverse geocoding for mer detaljert info
    const reverseUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=18&accept-language=no`;
    
    const reverseResponse = await fetch(reverseUrl, {
      headers: {
        'User-Agent': 'A7Generate/1.0'
      }
    });
    
    const reverseData = await reverseResponse.json();
    
    // Hent nearby POIs med større radius for skoler og mindre for butikker
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
        way["highway"="bus_stop"](around:500,${lat},${lon});
        way["amenity"](around:2000,${lat},${lon});
        way["leisure"](around:2000,${lat},${lon});
      );
      out body;
    `;
    
    const overpassResponse = await fetch(overpassUrl, {
      method: 'POST',
      body: `data=${encodeURIComponent(overpassQuery)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });
    
    const overpassData = await overpassResponse.json();
    
    // Analyser POIs og beregn avstander
    const pois = overpassData.elements || [];
    
    // Funksjoner for å finne nærmeste
    const findNearest = (type, subTypes = []) => {
      const items = pois.filter(p => {
        if (subTypes.length > 0) {
          return subTypes.some(st => p.tags?.[type] === st);
        }
        return p.tags?.[type];
      });
      
      if (items.length === 0) return null;
      
      // Beregn avstander og sorter
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
    
    // Finn nærmeste fasiliteter
    const nearestKindergartens = findNearest('amenity', ['kindergarten']);
    const nearestSchools = findNearest('amenity', ['school']);
    const nearestSupermarkets = findNearest('shop', ['supermarket', 'convenience']);
    const nearestRestaurants = findNearest('amenity', ['restaurant', 'cafe', 'fast_food']);
    const nearestBusStops = findNearest('highway', ['bus_stop']);
    const nearestParks = findNearest('leisure', ['park', 'playground']);
    const nearestHealthcare = findNearest('amenity', ['pharmacy', 'doctors', 'dentist', 'clinic']);
    const nearestTrainStations = findNearest('railway', ['station', 'tram_stop']);
    
    // Lag strukturert data
    const amenities = {
      kindergartens: {
        nearest: nearestKindergartens?.[0],
        count: nearestKindergartens?.length || 0,
        within1km: nearestKindergartens?.filter(k => 
          k.distance.unit === 'm' || (k.distance.unit === 'km' && k.distance.value <= 1)
        ).length || 0
      },
      schools: {
        nearest: nearestSchools?.[0],
        count: nearestSchools?.length || 0,
        within2km: nearestSchools?.filter(s => 
          s.distance.unit === 'm' || (s.distance.unit === 'km' && s.distance.value <= 2)
        ).length || 0
      },
      shopping: {
        nearestSupermarket: nearestSupermarkets?.[0],
        count: nearestSupermarkets?.length || 0,
        within500m: nearestSupermarkets?.filter(s => 
          s.distance.unit === 'm' && s.distance.value <= 500
        ).length || 0
      },
      publicTransport: {
        nearestBusStop: nearestBusStops?.[0],
        nearestTrainStation: nearestTrainStations?.[0],
        busStopsWithin500m: nearestBusStops?.filter(b => 
          b.distance.unit === 'm' && b.distance.value <= 500
        ).length || 0
      },
      recreation: {
        nearestPark: nearestParks?.[0],
        count: nearestParks?.length || 0,
        within1km: nearestParks?.filter(p => 
          p.distance.unit === 'm' || (p.distance.unit === 'km' && p.distance.value <= 1)
        ).length || 0
      },
      healthcare: {
        nearestPharmacy: nearestHealthcare?.find(h => h.type === 'pharmacy'),
        nearestDoctor: nearestHealthcare?.find(h => h.type === 'doctors'),
        count: nearestHealthcare?.length || 0
      },
      dining: {
        nearest: nearestRestaurants?.[0],
        count: nearestRestaurants?.length || 0,
        within1km: nearestRestaurants?.filter(r => 
          r.distance.unit === 'm' || (r.distance.unit === 'km' && r.distance.value <= 1)
        ).length || 0
      }
    };
    
    return {
      address: reverseData.display_name,
      coordinates: { lat, lon },
      district: reverseData.address?.suburb || reverseData.address?.neighbourhood,
      city: reverseData.address?.city || reverseData.address?.town,
      postcode: reverseData.address?.postcode,
      county: reverseData.address?.county,
      amenities,
      rawData: {
        geocode: location,
        reverse: reverseData
      }
    };
    
  } catch (error) {
    console.error('Location fetch error:', error);
    return null;
  }
}

// Generer beskrivelse av området basert på data med avstander
async function generateAreaDescription(locationData) {
  const { amenities } = locationData;
  
  // Lag kontekst med avstander
  let distanceInfo = [];
  
  if (amenities.kindergartens.nearest) {
    distanceInfo.push(`Nærmeste barnehage (${amenities.kindergartens.nearest.name || 'barnehage'}) ligger ${amenities.kindergartens.nearest.distance.value}${amenities.kindergartens.nearest.distance.unit} unna`);
  }
  
  if (amenities.schools.nearest) {
    distanceInfo.push(`Nærmeste skole (${amenities.schools.nearest.name || 'skole'}) ligger ${amenities.schools.nearest.distance.value}${amenities.schools.nearest.distance.unit} unna`);
  }
  
  if (amenities.shopping.nearestSupermarket) {
    distanceInfo.push(`Nærmeste matbutikk ligger kun ${amenities.shopping.nearestSupermarket.distance.value}${amenities.shopping.nearestSupermarket.distance.unit} unna`);
  }
  
  if (amenities.publicTransport.nearestBusStop) {
    distanceInfo.push(`Bussholdeplass ${amenities.publicTransport.nearestBusStop.distance.value}${amenities.publicTransport.nearestBusStop.distance.unit} fra boligen`);
  }
  
  const prompt = `Basert på følgende data om området, skriv en attraktiv beskrivelse av beliggenhet og nærområde for en eiendomsannonse:

Adresse: ${locationData.address}
Område: ${locationData.district || locationData.city}

AVSTANDER TIL FASILITETER:
${distanceInfo.join('\n')}

OPPSUMMERING:
- ${amenities.kindergartens.within1km} barnehager innen 1 km
- ${amenities.schools.within2km} skoler innen 2 km  
- ${amenities.shopping.within500m} matbutikker innen 500m
- ${amenities.publicTransport.busStopsWithin500m} bussholdeplasser innen 500m
- ${amenities.recreation.within1km} parker/lekeplasser innen 1 km
- ${amenities.dining.within1km} kafeer/restauranter innen 1 km

Skriv 4-6 setninger som fremhever de beste aspektene ved beliggenheten. Start med den mest attraktive egenskapen. Inkluder konkrete avstander til de viktigste fasilitetene. Vær positiv men faktabasert.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{
      role: "system",
      content: "Du er en norsk eiendomsmegler som skriver om beliggenhet og nærområde. Bruk konkrete avstander og vær faktabasert men positiv."
    }, {
      role: "user",
      content: prompt
    }],
    max_tokens: 250,
    temperature: 0.7
  });

  return response.choices[0].message.content.trim();
}

// Formater avstand for visning
function formatDistance(distanceObj) {
  if (!distanceObj) return 'Ukjent';
  return `${distanceObj.value}${distanceObj.unit}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.body;

  if (!address) {
    return res.status(400).json({ error: 'Mangler adresse' });
  }

  try {
    // Hent location data
    const locationData = await getLocationData(address);
    
    if (!locationData) {
      return res.status(404).json({ 
        error: 'Kunne ikke finne adresse',
        suggestion: 'Prøv med mer spesifikk adresse (gate + nummer + sted)'
      });
    }

    // Generer områdebeskrivelse
    const areaDescription = await generateAreaDescription(locationData);
    
    const { amenities } = locationData;

    // Formater boliginfo med avstander
    const generatedInfo = `BELIGGENHET OG NÆROMRÅDE:
${areaDescription}

AVSTANDER TIL FASILITETER:
${amenities.kindergartens.nearest ? `• Nærmeste barnehage: ${formatDistance(amenities.kindergartens.nearest.distance)} (${amenities.kindergartens.nearest.name || 'navn ukjent'})` : ''}
${amenities.schools.nearest ? `• Nærmeste skole: ${formatDistance(amenities.schools.nearest.distance)} (${amenities.schools.nearest.name || 'navn ukjent'})` : ''}
${amenities.shopping.nearestSupermarket ? `• Nærmeste matbutikk: ${formatDistance(amenities.shopping.nearestSupermarket.distance)}` : ''}
${amenities.publicTransport.nearestBusStop ? `• Nærmeste busstopp: ${formatDistance(amenities.publicTransport.nearestBusStop.distance)}` : ''}
${amenities.publicTransport.nearestTrainStation ? `• Nærmeste tog/trikk: ${formatDistance(amenities.publicTransport.nearestTrainStation.distance)}` : ''}
${amenities.recreation.nearestPark ? `• Nærmeste park/lekeplass: ${formatDistance(amenities.recreation.nearestPark.distance)}` : ''}
${amenities.healthcare.nearestPharmacy ? `• Nærmeste apotek: ${formatDistance(amenities.healthcare.nearestPharmacy.distance)}` : ''}

OMRÅDEFAKTA:
${locationData.district ? `• Område: ${locationData.district}` : ''}
${locationData.postcode ? `• Postnummer: ${locationData.postcode}` : ''}
${locationData.city ? `• By/Sted: ${locationData.city}` : ''}
• ${amenities.kindergartens.count} barnehager innen 2 km
• ${amenities.schools.count} skoler innen 3 km
• ${amenities.shopping.count} matbutikker innen 1,5 km
• ${amenities.recreation.count} parker/lekeplasser innen 2 km

Husk å verifisere og tilpasse informasjonen!`;

    res.status(200).json({
      success: true,
      locationData,
      areaDescription,
      generatedInfo,
      distances: {
        kindergarten: amenities.kindergartens.nearest?.distance,
        school: amenities.schools.nearest?.distance,
        shopping: amenities.shopping.nearestSupermarket?.distance,
        busStop: amenities.publicTransport.nearestBusStop?.distance,
        park: amenities.recreation.nearestPark?.distance
      }
    });

  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Kunne ikke hente områdeinformasjon' });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};