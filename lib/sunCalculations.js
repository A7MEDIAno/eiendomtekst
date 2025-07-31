// ===== FILE: lib/sunCalculations.js - NY FIL =====
const { getCurrentSeason } = require('./seasonalDescriptions');

// Mer presis beregning av soltimer basert på breddegrad og dato
function calculateSunConditions(lat, lon, buildingData = {}) {
  const season = getCurrentSeason();
  const month = new Date().getMonth();
  
  // Nord-Norge har midnattssol/mørketid
  const isNorthernNorway = lat > 65.0;
  
  // Faktiske soltimer per dag basert på norske forhold
  const sunHoursByLatitude = {
    summer: {
      south: 17,   // Sør-Norge (lat < 60)
      mid: 19,     // Midt-Norge (lat 60-65)
      north: 24    // Nord-Norge (lat > 65, midnattssol)
    },
    winter: {
      south: 7,    // Sør-Norge
      mid: 5,      // Midt-Norge
      north: 0     // Nord-Norge (mørketid)
    },
    spring: {
      south: 12,
      mid: 11,
      north: 13
    },
    autumn: {
      south: 10,
      mid: 9,
      north: 8
    }
  };

  // Bestem region basert på breddegrad
  let region = 'south';
  if (lat > 65) region = 'north';
  else if (lat > 60) region = 'mid';
  
  const dailySunHours = sunHoursByLatitude[season][region];
  
  // Solens posisjon gjennom dagen (norske forhold)
  const sunPath = calculateSunPath(lat, season);
  
  // Optimal orientering for ulike rom
  const optimalRoomOrientation = {
    stue: {
      best: ['Sørvest', 'Vest'],
      reason: 'Kveldssol når familien er samlet'
    },
    kjøkken: {
      best: ['Øst', 'Sørøst'],
      reason: 'Morgensol til frokost'
    },
    soverom: {
      best: ['Øst', 'Nord'],
      reason: 'Morgensol eller kjølig for god søvn'
    },
    hjemmekontor: {
      best: ['Nord', 'Nordøst'],
      reason: 'Jevnt lys uten gjenskinn på skjerm'
    },
    terrasse: {
      best: ['Vest', 'Sørvest'],
      reason: 'Maksimal utnyttelse av kveldssol'
    }
  };
  
  // Skyggeanalyse basert på sesong
  const shadowAnalysis = analyzeShadows(lat, season, buildingData);
  
  // Energiberegning
  const solarGain = calculateSolarGain(lat, season, dailySunHours);
  
  return {
    latitude: lat,
    longitude: lon,
    region: region === 'north' ? 'Nord-Norge' : region === 'mid' ? 'Midt-Norge' : 'Sør-Norge',
    isNorthern: isNorthernNorway,
    season: season,
    dailySunHours: dailySunHours,
    sunPath: sunPath,
    optimalRoomOrientation: optimalRoomOrientation,
    shadowAnalysis: shadowAnalysis,
    solarGain: solarGain,
    recommendations: generateSunRecommendations(lat, season, dailySunHours)
  };
}

// Beregn solbane gjennom dagen
function calculateSunPath(lat, season) {
  // Solhøyde ved middagstid (forenklet)
  const winterSolstice = 23.5 - lat;
  const summerSolstice = 70.5 - lat;
  
  let noonElevation;
  switch(season) {
    case 'winter':
      noonElevation = winterSolstice;
      break;
    case 'summer':
      noonElevation = summerSolstice;
      break;
    default:
      noonElevation = (winterSolstice + summerSolstice) / 2;
  }
  
  // Tidspunkter for sol (justert for norske forhold)
  const sunTimes = {
    summer: {
      sunrise: lat > 65 ? 'Midnattssol' : '04:00',
      sunset: lat > 65 ? 'Midnattssol' : '22:30',
      noon: '13:00'
    },
    winter: {
      sunrise: lat > 65 ? 'Mørketid' : '09:00',
      sunset: lat > 65 ? 'Mørketid' : '15:30',
      noon: '12:30'
    },
    spring: {
      sunrise: '06:00',
      sunset: '19:00',
      noon: '13:00'
    },
    autumn: {
      sunrise: '07:30',
      sunset: '17:30',
      noon: '12:30'
    }
  };
  
  return {
    elevation: Math.max(0, noonElevation),
    times: sunTimes[season],
    description: noonElevation > 45 ? 'Høy sol' : noonElevation > 20 ? 'Middels sol' : 'Lav sol'
  };
}

// Analyser skyggeforhold
function analyzeShadows(lat, season, buildingData) {
  const sunElevation = calculateSunPath(lat, season).elevation;
  
  // Grunnleggende skyggelengde (forenklet)
  const shadowLength = sunElevation > 0 ? 1 / Math.tan(sunElevation * Math.PI / 180) : 999;
  
  const analysis = {
    morning: 'Lang skygge østover',
    noon: shadowLength < 1 ? 'Kort skygge' : shadowLength < 3 ? 'Middels skygge' : 'Lang skygge',
    evening: 'Lang skygge vestover',
    critical: []
  };
  
  // Vinteranalyse for Nord-Norge
  if (lat > 65 && season === 'winter') {
    analysis.critical.push('Mørketid - kunstlys nødvendig hele døgnet');
  } else if (sunElevation < 15) {
    analysis.critical.push('Lav sol gir lange skygger - vurder nabobygninger');
  }
  
  return analysis;
}

// Beregn potensiell solenergi
function calculateSolarGain(lat, season, dailySunHours) {
  // Gjennomsnittlig solinnstråling W/m² (forenklet)
  const baseIrradiance = {
    summer: 600,
    spring: 400,
    autumn: 300,
    winter: 150
  };
  
  // Juster for breddegrad
  const latitudeFactor = Math.cos((lat - 59) * Math.PI / 180);
  const irradiance = baseIrradiance[season] * latitudeFactor;
  
  // Daglig energi kWh/m²
  const dailyEnergy = (irradiance * dailySunHours) / 1000;
  
  // Potensial for solceller
  const solarPanelPotential = dailyEnergy * 0.2; // 20% effektivitet
  
  return {
    irradiance: Math.round(irradiance),
    dailyEnergy: dailyEnergy.toFixed(1),
    monthlyEnergy: (dailyEnergy * 30).toFixed(0),
    solarPanelPotential: solarPanelPotential.toFixed(1),
    heatingReduction: `${Math.round(dailyEnergy * 10)}%`,
    description: dailyEnergy > 4 ? 'Høyt solenergi-potensial' : 
                 dailyEnergy > 2 ? 'Moderat solenergi-potensial' : 
                 'Lavt solenergi-potensial'
  };
}

// Generer konkrete anbefalinger
function generateSunRecommendations(lat, season, dailySunHours) {
  const recommendations = [];
  
  // Sesongbaserte tips
  if (season === 'winter' && lat > 60) {
    recommendations.push({
      type: 'lighting',
      text: 'Investér i kvalitetsbelysning for mørke måneder',
      priority: 'high'
    });
  }
  
  if (season === 'summer' && dailySunHours > 18) {
    recommendations.push({
      type: 'shading',
      text: 'Vurder solskjerming for soverom',
      priority: 'medium'
    });
  }
  
  // Energitips
  if (dailySunHours < 6) {
    recommendations.push({
      type: 'energy',
      text: 'Prioriter god isolasjon og effektiv oppvarming',
      priority: 'high'
    });
  } else if (dailySunHours > 12) {
    recommendations.push({
      type: 'energy',
      text: 'Utnytt passiv solvarme - hold gardiner åpne på dagtid',
      priority: 'medium'
    });
  }
  
  // Romspesifikke tips
  recommendations.push({
    type: 'rooms',
    text: 'Plasser oppholdsrom mot vest/sørvest for kveldssol',
    priority: 'medium'
  });
  
  return recommendations;
}

function generateSunDescription(sunConditions) {
  const { dailySunHours, season, region, isNorthern } = sunConditions;
  
  let description = `${region}: `;
  
  if (isNorthern && season === 'summer') {
    description += 'Midnattssol gir 24 timer dagslys. Perfekt for de som elsker lyse kvelder.';
  } else if (isNorthern && season === 'winter') {
    description += 'Mørketid krever god innendørs belysning, men nordlyset kan lyse opp vintermørket.';
  } else {
    description += `${dailySunHours} timer dagslys. `;
    
    if (season === 'summer') {
      description += 'Lange, lyse sommerdager perfekt for uteliv.';
    } else if (season === 'winter') {
      description += 'Utnytt de lyse timene maksimalt.';
    } else {
      description += 'Balansert lysforhold gjennom dagen.';
    }
  }
  
  return description;
}

module.exports = {
  calculateSunConditions,
  generateSunDescription
};