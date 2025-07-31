// ===== FILE: lib/cacheUtils.js - KOMPLETT =====
// In-memory cache for bildeanalyser
const analysisCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 timer

// Generer cache-nøkkel basert på bilde-URL og parametere
export function getCacheKey(imageUrl, imageType, targetGroup) {
  return `${imageUrl}_${imageType}_${targetGroup}`;
}

// Hent fra cache hvis gyldig
export function getFromCache(key) {
  const cached = analysisCache.get(key);
  if (!cached) return null;
  
  // Sjekk om cache er utløpt
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    analysisCache.delete(key);
    return null;
  }
  
  return cached.data;
}

// Lagre i cache
export function saveToCache(key, data) {
  analysisCache.set(key, {
    data,
    timestamp: Date.now()
  });
}

// Tøm cache (for admin-formål)
export function clearCache() {
  analysisCache.clear();
}

// Hent cache-statistikk
export function getCacheStats() {
  let validCount = 0;
  let expiredCount = 0;
  const now = Date.now();
  
  for (const [key, value] of analysisCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      expiredCount++;
    } else {
      validCount++;
    }
  }
  
  return {
    totalEntries: analysisCache.size,
    validEntries: validCount,
    expiredEntries: expiredCount,
    memorySizeEstimate: JSON.stringify([...analysisCache]).length
  };
}

// Browser-side cache utilities
export const browserCache = {
  // Lagre analyseresultater i localStorage
  saveResults: (galleryUrl, results, address, propertyInfo) => {
    try {
      const key = `eiendom_ai_results_${galleryUrl}`;
      const data = {
        results,
        address,
        propertyInfo,
        timestamp: Date.now(),
        version: '1.0'
      };
      localStorage.setItem(key, JSON.stringify(data));
      
      // Rydd opp gamle entries (hold maks 10)
      const allKeys = Object.keys(localStorage).filter(k => k.startsWith('eiendom_ai_results_'));
      if (allKeys.length > 10) {
        // Fjern eldste
        const oldestKey = allKeys.sort()[0];
        localStorage.removeItem(oldestKey);
      }
    } catch (e) {
      console.error('Failed to save to cache:', e);
    }
  },
  
  // Hent resultater fra localStorage
  getResults: (galleryUrl) => {
    try {
      const key = `eiendom_ai_results_${galleryUrl}`;
      const data = localStorage.getItem(key);
      if (!data) return null;
      
      const parsed = JSON.parse(data);
      
      // Sjekk om cache er over 7 dager gammel
      if (Date.now() - parsed.timestamp > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(key);
        return null;
      }
      
      return parsed;
    } catch (e) {
      console.error('Failed to get from cache:', e);
      return null;
    }
  },
  
  // Slett spesifikk cache
  clearResults: (galleryUrl) => {
    const key = `eiendom_ai_results_${galleryUrl}`;
    localStorage.removeItem(key);
  },
  
  // Slett all cache
  clearAll: () => {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('eiendom_ai_'));
    keys.forEach(key => localStorage.removeItem(key));
  }
};