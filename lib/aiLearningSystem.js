// ===== FILE: lib/aiLearningSystem.js - AI LÆRING FRA EKSEMPLER =====

// Analyser stil og mønstre fra brukerens eksempler
export function analyzeWritingStyle(examples) {
  const patterns = {
    sentenceStarters: new Map(),
    commonPhrases: new Map(),
    averageLength: 0,
    vocabularyStyle: new Map(),
    punctuationStyle: {},
    focusAreas: new Map()
  };

  let totalLength = 0;
  let sentenceCount = 0;

  examples.forEach(example => {
    // Analyser setningsstartere
    const firstWords = example.match(/^(\S+\s+\S+)/);
    if (firstWords) {
      const starter = firstWords[1];
      patterns.sentenceStarters.set(starter, (patterns.sentenceStarters.get(starter) || 0) + 1);
    }

    // Tell ord og setninger
    const words = example.split(/\s+/).length;
    totalLength += words;
    sentenceCount += example.split(/[.!?]+/).length - 1;

    // Finn vanlige fraser (2-3 ord kombinasjoner)
    const wordsArray = example.toLowerCase().split(/\s+/);
    for (let i = 0; i < wordsArray.length - 2; i++) {
      const phrase = `${wordsArray[i]} ${wordsArray[i + 1]}`;
      patterns.commonPhrases.set(phrase, (patterns.commonPhrases.get(phrase) || 0) + 1);
    }

    // Analyser fokusområder
    const focusKeywords = {
      størrelse: ['romslig', 'stor', 'kompakt', 'liten', 'raus'],
      lys: ['lys', 'lysinnslipp', 'vinduer', 'dagslys', 'sollys'],
      standard: ['moderne', 'oppgradert', 'renovert', 'original', 'standard'],
      materialer: ['parkett', 'fliser', 'laminat', 'teppe', 'vinyl'],
      komfort: ['gulvvarme', 'varmepumpe', 'komfortabel', 'behagelig']
    };

    Object.entries(focusKeywords).forEach(([category, keywords]) => {
      keywords.forEach(keyword => {
        if (example.toLowerCase().includes(keyword)) {
          patterns.focusAreas.set(category, (patterns.focusAreas.get(category) || 0) + 1);
        }
      });
    });
  });

  patterns.averageLength = Math.round(totalLength / examples.length);
  
  return patterns;
}

// Generer stil-guide basert på analyse
export function generateStyleGuide(patterns) {
  const styleGuide = {
    preferredStarters: Array.from(patterns.sentenceStarters.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(entry => entry[0]),
    
    commonPhrases: Array.from(patterns.commonPhrases.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(entry => entry[0]),
    
    targetLength: patterns.averageLength,
    
    focusPriority: Array.from(patterns.focusAreas.entries())
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]),
    
    styleRules: generateStyleRules(patterns)
  };

  return styleGuide;
}

// Generer stil-regler basert på mønstre
function generateStyleRules(patterns) {
  const rules = [];

  // Lengde-regel
  if (patterns.averageLength < 15) {
    rules.push("Foretrekk korte, konsise beskrivelser");
  } else if (patterns.averageLength > 30) {
    rules.push("Bruk lengre, detaljerte beskrivelser");
  } else {
    rules.push("Hold moderat lengde på beskrivelsene");
  }

  // Fokus-regler
  const topFocus = Array.from(patterns.focusAreas.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(entry => entry[0]);

  topFocus.forEach(focus => {
    switch(focus) {
      case 'størrelse':
        rules.push("Vektlegg alltid rommets størrelse og proporsjoner");
        break;
      case 'lys':
        rules.push("Beskriv lysforhold og vindusplassering");
        break;
      case 'standard':
        rules.push("Kommenter standard og oppgraderinger");
        break;
      case 'materialer':
        rules.push("Spesifiser materialer på gulv og vegger");
        break;
      case 'komfort':
        rules.push("Fremhev komfortløsninger som oppvarming");
        break;
    }
  });

  return rules;
}

// Tilpass beskrivelse til lærd stil
export function applyStyleToDescription(description, styleGuide) {
  let styledDescription = description;

  // Sjekk lengde og juster om nødvendig
  const currentLength = description.split(/\s+/).length;
  if (Math.abs(currentLength - styleGuide.targetLength) > 10) {
    // Beskrivelsen avviker mye fra ønsket lengde
    if (currentLength > styleGuide.targetLength) {
      // Forkorte - fjern mindre viktige detaljer
      styledDescription = shortenDescription(description, styleGuide);
    } else {
      // Utvide - legg til relevante detaljer
      styledDescription = expandDescription(description, styleGuide);
    }
  }

  // Sjekk om beskrivelsen starter med en foretrukket frase
  const startsWithPreferred = styleGuide.preferredStarters.some(starter => 
    styledDescription.toLowerCase().startsWith(starter.toLowerCase())
  );

  if (!startsWithPreferred && styleGuide.preferredStarters.length > 0) {
    // Vurder å endre starten
    const randomStarter = styleGuide.preferredStarters[
      Math.floor(Math.random() * Math.min(3, styleGuide.preferredStarters.length))
    ];
    
    // Intelligent erstatning basert på kontekst
    styledDescription = intelligentStarterReplace(styledDescription, randomStarter);
  }

  return styledDescription;
}

// Hjelpefunksjoner for stil-tilpasning
function shortenDescription(description, styleGuide) {
  // Implementer intelligent forkortelse
  const sentences = description.split(/[.!?]+/).filter(s => s.trim());
  
  // Behold setninger som inneholder høyprioriterte fokusområder
  const prioritySentences = sentences.filter(sentence => {
    return styleGuide.focusPriority.slice(0, 2).some(focus => {
      const focusKeywords = getFocusKeywords(focus);
      return focusKeywords.some(keyword => 
        sentence.toLowerCase().includes(keyword)
      );
    });
  });

  // Hvis vi fortsatt har for mange setninger, behold de første
  const targetSentences = Math.ceil(styleGuide.targetLength / 15);
  const kept = prioritySentences.slice(0, targetSentences);
  
  return kept.join('. ') + '.';
}

function expandDescription(description, styleGuide) {
  // Legg til detaljer basert på fokusområder som mangler
  let expanded = description;
  
  styleGuide.focusPriority.slice(0, 2).forEach(focus => {
    const keywords = getFocusKeywords(focus);
    const hasKeyword = keywords.some(kw => description.toLowerCase().includes(kw));
    
    if (!hasKeyword) {
      // Legg til relevant informasjon
      const addition = getStandardAddition(focus);
      if (addition) {
        expanded = expanded.replace(/\.$/, `. ${addition}.`);
      }
    }
  });

  return expanded;
}

function getFocusKeywords(focus) {
  const keywords = {
    størrelse: ['romslig', 'stor', 'kompakt', 'liten', 'raus'],
    lys: ['lys', 'lysinnslipp', 'vinduer', 'dagslys', 'sollys'],
    standard: ['moderne', 'oppgradert', 'renovert', 'original', 'standard'],
    materialer: ['parkett', 'fliser', 'laminat', 'teppe', 'vinyl'],
    komfort: ['gulvvarme', 'varmepumpe', 'komfortabel', 'behagelig']
  };
  return keywords[focus] || [];
}

function getStandardAddition(focus) {
  const additions = {
    størrelse: "God romfølelse",
    lys: "Godt med naturlig lys",
    standard: "Gjennomgående god standard",
    materialer: "Solide overflater",
    komfort: "Behagelig temperatur året rundt"
  };
  return additions[focus];
}

function intelligentStarterReplace(description, newStarter) {
  // Intelligent erstatning som bevarer mening
  const firstSentence = description.split(/[.!?]/)[0];
  const words = firstSentence.split(/\s+/);
  
  // Finn første substantiv eller beskrivende ord
  let contentStart = 0;
  for (let i = 0; i < Math.min(3, words.length); i++) {
    if (words[i].match(/^(med|har|er|i|på|fra)$/i)) {
      contentStart = i + 1;
      break;
    }
  }
  
  // Bygg ny setning med foretrukket starter
  const restOfSentence = words.slice(contentStart).join(' ');
  const newFirst = `${newStarter} ${restOfSentence}`;
  
  // Erstatt første setning
  return description.replace(firstSentence, newFirst);
}

// Eksporter læringsfunksjoner for bruk i API
export default {
  analyzeWritingStyle,
  generateStyleGuide,
  applyStyleToDescription
};