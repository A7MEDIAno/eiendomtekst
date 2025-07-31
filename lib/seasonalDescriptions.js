// ===== FILE: lib/seasonalDescriptions.js - SESONG OG VÆRBASERTE BESKRIVELSER =====

// Hent gjeldende sesong basert på måned
export function getCurrentSeason() {
  const month = new Date().getMonth();
  
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

// Sesongbaserte fokuspunkter for hver romtype
export const SEASONAL_FOCUS = {
  spring: {
    terrasse: ['Perfekt for vårpussen', 'Klar for utesesongen', 'Sol fra tidlig vår'],
    balkong: ['Morgensol til frokosten', 'Perfekt for vårblomster', 'Ly for vårregn'],
    hage: ['Klar for hagearbeid', 'Frukttrær blomstrer om våren', 'Grønn oase om få uker'],
    stue: ['Herlig vårlys gjennom vinduene', 'Frisk luft via balkongdør', 'Lys og luftig'],
    fasade: ['Vedlikeholdt før våren', 'Ingen synlige vinterskader', 'Klar for sommeren'],
  },
  
  summer: {
    terrasse: ['Solrik fra morgen til kveld', 'Perfekt for grilling', 'Skjermet for vind'],
    balkong: ['Kveldssol til langt på kveld', 'Uterom nummer to', 'Sommerparadis'],
    hage: ['Frodig og grønn', 'Perfekt for uteliv', 'Barnevennlig lekeplass'],
    stue: ['Svalt inneklima med gjennomtrekk', 'Skjermet for sterk sommersol', 'Luftig sommerrom'],
    utsikt: ['Nyt lange sommerkvelder', 'Solnedgang over vannet', 'Grønn natur så langt øyet rekker'],
    soverom: ['Mørkt og svalt for gode sommernetter', 'Mulighet for gjennomtrekk', 'Blackout-gardiner'],
  },
  
  autumn: {
    stue: ['Koselig med peis på kalde kvelder', 'Varme farger i høstlyset', 'Lunt og innbydende'],
    hage: ['Lite løvarbeid med smarte løsninger', 'Flotte høstfarger', 'Klar for vinteren'],
    terrasse: ['Forlenget utesesong med le', 'Nyt høstsolen', 'Overbygget for høstregn'],
    fasade: ['Godt vedlikeholdt før vinteren', 'Takrenner klargjort', 'Vinterklar'],
    kjøkken: ['Perfekt for høstens hjemmekos', 'Varmt og innbydende', 'Samlingspunkt i mørke kvelder'],
  },
  
  winter: {
    stue: ['Varm og koselig med peis/varmpepumpe', 'Godt isolerte vinduer', 'Lunt tilfluktssted'],
    gang: ['God plass til vinterklær', 'Varme fliser med gulvvarme', 'Praktisk for norske vintre'],
    bad: ['Deilig gulvvarme', 'Aldri kaldt på badet', 'Spa-følelse hjemme'],
    parkering: ['Garasje holder bilen varm', 'Motorvarmer installert', 'Snøfri parkering'],
    fasade: ['Solid konstruksjon tåler vinterværet', 'God drenering', 'Ingen tegn til fuktskader'],
    terrasse: ['Kan måkes for vinterbruk', 'Tak holder snøen unna', 'Vinterhage-potensial'],
  }
};

// Værspesifikke justeringer
export const WEATHER_ADJUSTMENTS = {
  sunny: {
    positive: ['badet i sollys', 'solrik', 'lysfylt', 'solfylt'],
    focus: ['store vinduer', 'sørvest-vendt', 'ingen sjenerende skygge', 'sol hele dagen']
  },
  rainy: {
    positive: ['godt beskyttet', 'tett tak', 'ingen fuktproblemer', 'god drenering'],
    focus: ['overbygget inngang', 'beskyttet balkong', 'vedlikeholdsfrie materialer']
  },
  snowy: {
    positive: ['vinterklar', 'god isolasjon', 'varmt og lunt', 'snøfri adkomst'],
    focus: ['gulvvarme', 'varmepumpe', 'garasje', 'god oppvarming']
  },
  windy: {
    positive: ['godt skjermet', 'le for vind', 'solid konstruksjon', 'lunt'],
    focus: ['levegg', 'innglasset balkong', 'vindtette løsninger']
  }
};

// Solforhold basert på himmelretning og årstid
export const SUN_CONDITIONS = {
  north: {
    summer: 'Kjølig og behagelig på varme sommerdager',
    winter: 'Indirekte lys gir jevn belysning',
    spring: 'Stabilt lys uten sterke kontraster',
    autumn: 'Mykt lys perfekt for hjemmekontor'
  },
  south: {
    summer: 'Maksimal sol gjennom hele dagen',
    winter: 'Verdifull vintersol når solen står lavt',
    spring: 'Tidlig vårsol varmer opp rommet',
    autumn: 'Høstsol langt inn i rommet'
  },
  east: {
    summer: 'Deilig morgensol til frokost',
    winter: 'Morgenens første stråler',
    spring: 'Energigivende morgenlys',
    autumn: 'Vakkert morgenlys i høstfarger'
  },
  west: {
    summer: 'Spektakulære solnedganger',
    winter: 'Ettermiddagssol når du kommer hjem',
    spring: 'Kveldssol på terrassen',
    autumn: 'Gylne kvelder med høstsol'
  },
  southeast: {
    summer: 'Sol fra tidlig morgen til ettermiddag',
    winter: 'Maksimal utnyttelse av vintersol',
    spring: 'Perfekt balanse morgen- og formiddagssol',
    autumn: 'Behagelig høstlys store deler av dagen'
  },
  southwest: {
    summer: 'Sol fra formiddag til sen kveld',
    winter: 'Ettermiddags- og kveldssol',
    spring: 'Lange soldager på terrassen',
    autumn: 'Nyt sene solnedganger'
  }
};

// Generer sesongspesifikk beskrivelse
export function generateSeasonalDescription(roomType, baseDescription, season, weather = null) {
  let seasonalAddition = '';
  
  // Hent sesongfokus for romtypen
  const seasonFocus = SEASONAL_FOCUS[season]?.[roomType];
  if (seasonFocus && seasonFocus.length > 0) {
    const randomFocus = seasonFocus[Math.floor(Math.random() * seasonFocus.length)];
    seasonalAddition = randomFocus;
  }
  
  // Legg til værspesifikke justeringer
  if (weather && WEATHER_ADJUSTMENTS[weather]) {
    const weatherAdj = WEATHER_ADJUSTMENTS[weather];
    const positive = weatherAdj.positive[Math.floor(Math.random() * weatherAdj.positive.length)];
    
    // Sjekk om beskrivelsen allerede inneholder værrelaterte termer
    const hasWeatherTerm = weatherAdj.focus.some(term => 
      baseDescription.toLowerCase().includes(term.toLowerCase())
    );
    
    if (hasWeatherTerm) {
      seasonalAddition = seasonalAddition ? `${seasonalAddition} - ${positive}` : positive;
    }
  }
  
  // Kombiner med basisbeskrivelse
  if (seasonalAddition) {
    return `${baseDescription} ${seasonalAddition}.`;
  }
  
  return baseDescription;
}

// Juster beskrivelse basert på solforhold
export function adjustForSunConditions(description, direction, season, roomType) {
  // Ikke alle rom trenger soljustering
  const sunRelevantRooms = ['stue', 'kjøkken', 'soverom', 'balkong', 'terrasse', 'utsikt'];
  
  if (!sunRelevantRooms.includes(roomType)) {
    return description;
  }
  
  const sunCondition = SUN_CONDITIONS[direction]?.[season];
  if (!sunCondition) {
    return description;
  }
  
  // Sjekk om beskrivelsen allerede nevner sol/lys
  const hasSunReference = /sol|lys|vindu/i.test(description);
  
  if (!hasSunReference) {
    // Legg til solforhold som en ekstra setning
    return `${description} ${sunCondition}.`;
  }
  
  // Hvis sol allerede er nevnt, erstatt med mer spesifikk info
  return description.replace(
    /(godt lysinnslipp|gode lysforhold|sollys|dagslys)/i,
    sunCondition.toLowerCase()
  );
}

// Få sesongspesifikke tips for fotografering
export function getSeasonalPhotoTips(season) {
  const tips = {
    spring: [
      'Ta bilder når frukttrær blomstrer',
      'Vis frem vårblomster på balkong/terrasse',
      'Fremhev det friske, grønne i hagen',
      'Vis morgenlys gjennom vinduer'
    ],
    summer: [
      'Fotografer terrassen med sommermøbler',
      'Vis frodig hage i full blomst',
      'Ta bilder på solrike dager',
      'Fremhev utendørs kvaliteter'
    ],
    autumn: [
      'Bruk varme høstfarger som fordel',
      'Vis koselig interiør med lys',
      'Fremhev peis eller varmepumpe',
      'Ta bilder i "golden hour"'
    ],
    winter: [
      'Vis varm og innbydende atmosfære',
      'Fremhev god belysning innendørs',
      'Vis snøfrie adkomstveier',
      'Fokuser på lune, koselige rom'
    ]
  };
  
  return tips[season] || tips.summer;
}

// Sesongbaserte salgsargumenter
export function getSeasonalSellingPoints(season, propertyFeatures) {
  const sellingPoints = {
    spring: {
      hage: 'Hagen våkner til liv - perfekt tidspunkt for overtakelse',
      balkong: 'Klar for vårpuss og sommerforberedelser',
      terrasse: 'Nyt vårsolen fra første varme dag'
    },
    summer: {
      terrasse: 'Utendørs stue hele sommeren',
      hage: 'Etablert hage klar for sommernytelse',
      balkong: 'Ekstra rom når været tillater'
    },
    autumn: {
      peis: 'Koselige kvelder foran peisen',
      varmepumpe: 'Energieffektiv oppvarming klar for vinteren',
      garasje: 'Ingen skraping av frontruter'
    },
    winter: {
      gulvvarme: 'Aldri kalde gulv om morgenen',
      isolasjon: 'Lave oppvarmingskostnader',
      garasje: 'Varm bil hver morgen'
    }
  };
  
  const points = [];
  Object.entries(propertyFeatures).forEach(([feature, hasFeature]) => {
    if (hasFeature && sellingPoints[season]?.[feature]) {
      points.push(sellingPoints[season][feature]);
    }
  });
  
  return points;
}

export default {
  getCurrentSeason,
  generateSeasonalDescription,
  adjustForSunConditions,
  getSeasonalPhotoTips,
  getSeasonalSellingPoints,
  SEASONAL_FOCUS,
  WEATHER_ADJUSTMENTS,
  SUN_CONDITIONS
};