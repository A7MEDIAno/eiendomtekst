// lib/addressExtraction.js - KOMPLETT MED REGEX FIX
export function extractAddressFromDOM() {
  // Samle potensielle adressekilder
  const sources = {
    title: document.title,
    h1: document.querySelector('h1')?.textContent,
    h2: document.querySelector('h2')?.textContent,
    ogTitle: document.querySelector('meta[property="og:title"]')?.content,
    addressMicrodata: document.querySelector('[itemprop="address"]')?.textContent,
    schemaAddress: document.querySelector('[itemtype*="schema.org/PostalAddress"]')?.textContent
  };
  
  // Prøv å finne beste kilde
  let address = sources.title || sources.h1 || sources.h2 || sources.ogTitle || '';
  
  // Spesifikke patterns for ulike galleriplattformer
  const platformPatterns = {
    pholio: {
      detect: /pholio\.no/i,
      clean: [
        /^\d+\s*-\s*/, // Fjern ID prefix
        /\s*\|\s*Pholio.*$/i, // Fjern Pholio suffix
        /\s*-\s*Pholio.*$/i
      ]
    },
    notar: {
      detect: /notar\.no/i,
      clean: [
        /\s*-\s*NOTAR.*$/i,
        /\s*\|.*$/
      ]
    },
    finn: {
      detect: /finn\.no/i,
      clean: [
        /\s*-\s*FINN\.no.*$/i,
        /\s*til\s*(salgs|leie).*$/i
      ]
    }
  };
  
  // Finn hvilken plattform vi er på
  const currentUrl = window.location.href.toLowerCase();
  let activePlatform = null;
  
  for (const [platform, config] of Object.entries(platformPatterns)) {
    if (config.detect.test(currentUrl)) {
      activePlatform = platform;
      // Apply platform-specific cleaning
      config.clean.forEach(pattern => {
        address = address.replace(pattern, '');
      });
      break;
    }
  }
  
  // Generell opprydding
  const generalCleanupPatterns = [
    // UI elementer
    /\s*SE BILDENE\s*/gi,
    /\s*VIS MER\s*/gi,
    /\s*LES MER\s*/gi,
    /\s*SE ALLE\s*/gi,
    /\s*KONTAKT.*$/i,
    /\s*BOOK.*$/i,
    /\s*BESTILL.*$/i,
    /\s*VISNING.*$/i,
    
    // Priser og metadata
    /\s*kr\s*[\d\s.,]+.*$/i,
    /\s*solgt\s*/i,
    /\s*SOLGT\s*/i,
    
    // Megler info
    /\s*-\s*[A-Za-z]+\s*[Ee]iendom.*$/,
    /\s*-\s*[A-Za-z]+\s*&\s*[A-Za-z]+.*$/,
    
    // Ekstra whitespace
    /\s+/g, // Erstatt med enkelt mellomrom
    /^\s+|\s+$/g // Trim
  ];
  
  // FIX: Unngå regex comparison warning
  generalCleanupPatterns.forEach((pattern, index) => {
    // Index for /\s+/g pattern er nest siste i arrayen
    address = address.replace(pattern, index === generalCleanupPatterns.length - 2 ? ' ' : '');
  });
  
  // Valider at vi har en fornuftig adresse
  if (address.length < 5 || address.length > 100) {
    console.warn('Suspicious address length:', address);
  }
  
  // Forsøk å ekstrahere komponenter
  const addressComponents = parseNorwegianAddress(address);
  
  return {
    raw: sources,
    cleaned: address,
    platform: activePlatform,
    components: addressComponents,
    confidence: calculateAddressConfidence(address, addressComponents)
  };
}

// Parser for norske adresser
export function parseNorwegianAddress(address) {
  const components = {
    street: null,
    number: null,
    city: null,
    postalCode: null
  };
  
  // Postnummer pattern
  const postalMatch = address.match(/\b(\d{4})\s+([A-ZÆØÅa-zæøå\s]+?)$/);
  if (postalMatch) {
    components.postalCode = postalMatch[1];
    components.city = postalMatch[2].trim();
    address = address.replace(postalMatch[0], '').trim();
  }
  
  // Gate og nummer
  const streetMatch = address.match(/^(.+?)\s+(\d+[A-Za-z]?)(?:\s|,|$)/);
  if (streetMatch) {
    components.street = streetMatch[1].trim();
    components.number = streetMatch[2];
  } else {
    // Prøv uten nummer
    components.street = address.trim();
  }
  
  return components;
}

// Beregn konfidensgrad for adressen
export function calculateAddressConfidence(address, components) {
  let confidence = 0;
  
  // Har vi grunnleggende komponenter?
  if (components.street) confidence += 40;
  if (components.number) confidence += 20;
  if (components.city) confidence += 20;
  if (components.postalCode) confidence += 20;
  
  // Sjekk for typiske adressemønstre
  if (/\d/.test(address)) confidence += 5; // Inneholder tall
  if (/vei|gate|veg|plass|allé/i.test(address)) confidence += 5; // Gatetyper
  
  // Trekk fra for suspekte mønstre
  if (/\|/.test(address)) confidence -= 10; // Fortsatt har separator
  if (address.length < 10) confidence -= 20; // For kort
  if (address.length > 60) confidence -= 10; // For lang
  
  return Math.max(0, Math.min(100, confidence));
}

// Eksporter alle funksjoner
export default {
  extractAddressFromDOM,
  parseNorwegianAddress,
  calculateAddressConfidence
};