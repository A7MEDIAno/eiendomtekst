// ===== FILE: lib/database.js - DATABASE UTILITIES =====
import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma Client
const globalForPrisma = global;

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Hent relevante eksempler fra database
export async function getRelevantExamples(roomType, targetGroup = 'standard', limit = 3) {
  try {
    // Først prøv å finne eksempler for spesifikk målgruppe
    let examples = await prisma.roomExample.findMany({
      where: {
        roomType,
        targetGroup
      },
      orderBy: [
        { rating: 'desc' },
        { usageCount: 'asc' } // Prioriter mindre brukte for variasjon
      ],
      take: limit
    });

    // Hvis ikke nok eksempler, hent fra standard
    if (examples.length < limit && targetGroup !== 'standard') {
      const additional = await prisma.roomExample.findMany({
        where: {
          roomType,
          targetGroup: 'standard'
        },
        orderBy: [
          { rating: 'desc' },
          { usageCount: 'asc' }
        ],
        take: limit - examples.length
      });
      examples = [...examples, ...additional];
    }

    // Oppdater usage count
    if (examples.length > 0) {
      await prisma.roomExample.updateMany({
        where: {
          id: { in: examples.map(e => e.id) }
        },
        data: {
          usageCount: { increment: 1 }
        }
      });
    }

    return examples.map(e => e.description);
  } catch (error) {
    console.error('Database error:', error);
    return [];
  }
}

// Hent sesongbaserte fraser
export async function getSeasonalPhrases(season, roomType) {
  try {
    const phrases = await prisma.seasonalPhrase.findMany({
      where: {
        season,
        roomType
      }
    });
    return phrases.map(p => p.phrase);
  } catch (error) {
    console.error('Database error:', error);
    return [];
  }
}

// Hent fargekombinasjon-forslag
export async function getColorCombinations(roomType) {
  try {
    const combinations = await prisma.colorCombination.findMany({
      where: { roomType },
      orderBy: { popularity: 'desc' },
      take: 5
    });
    return combinations;
  } catch (error) {
    console.error('Database error:', error);
    return [];
  }
}

// Logg analyse for statistikk
export async function logAnalysis(data) {
  try {
    await prisma.analysisLog.create({
      data: {
        imageUrl: data.imageUrl,
        roomType: data.roomType,
        targetGroup: data.targetGroup,
        description: data.description,
        cachedResult: data.cachedResult || false,
        responseTime: data.responseTime || 0
      }
    });
  } catch (error) {
    console.error('Failed to log analysis:', error);
  }
}

// Cache location data
export async function cacheLocationData(address, locationData) {
  try {
    await prisma.locationCache.upsert({
      where: { address },
      update: {
        locationData: JSON.stringify(locationData.amenities || {}),
        sunConditions: JSON.stringify(locationData.sunConditions || {}),
        latitude: locationData.coordinates.lat,
        longitude: locationData.coordinates.lon
      },
      create: {
        address,
        latitude: locationData.coordinates.lat,
        longitude: locationData.coordinates.lon,
        locationData: JSON.stringify(locationData.amenities || {}),
        sunConditions: JSON.stringify(locationData.sunConditions || {})
      }
    });
  } catch (error) {
    console.error('Failed to cache location:', error);
  }
}

// Hent cached location data
export async function getCachedLocation(address) {
  try {
    const cached = await prisma.locationCache.findUnique({
      where: { address }
    });
    
    // Sjekk om cache er over 30 dager gammel
    if (cached) {
      const age = Date.now() - cached.updatedAt.getTime();
      if (age > 30 * 24 * 60 * 60 * 1000) {
        return null; // For gammel cache
      }
      
      // Parse JSON strings tilbake til objekter
      return {
        ...cached,
        locationData: JSON.parse(cached.locationData || '{}'),
        sunConditions: JSON.parse(cached.sunConditions || '{}')
      };
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get cached location:', error);
    return null;
  }
}

// Lagre bruker-eksempel for AI læring
export async function saveUserExample(data) {
  try {
    const example = await prisma.userExample.create({
      data: {
        userId: data.userId || 'anonymous',
        roomType: data.roomType,
        description: data.description,
        imageUrl: data.imageUrl,
        style: JSON.stringify(data.style || {})
      }
    });
    return example;
  } catch (error) {
    console.error('Failed to save user example:', error);
    return null;
  }
}

// Hent populære features for et rom
export async function getPopularFeatures(roomType, limit = 10) {
  try {
    const features = await prisma.feature.findMany({
      where: {
        examples: {
          some: {
            roomType
          }
        }
      },
      include: {
        _count: {
          select: { examples: true }
        }
      },
      orderBy: {
        examples: {
          _count: 'desc'
        }
      },
      take: limit
    });
    
    return features.map(f => ({
      name: f.name,
      category: f.category,
      count: f._count.examples
    }));
  } catch (error) {
    console.error('Failed to get popular features:', error);
    return [];
  }
}

// Søk i eksempler
export async function searchExamples(query, filters = {}) {
  try {
    const where = {
      AND: [
        {
          description: {
            contains: query,
            mode: 'insensitive'
          }
        },
        ...(filters.roomType ? [{ roomType: filters.roomType }] : []),
        ...(filters.targetGroup ? [{ targetGroup: filters.targetGroup }] : []),
        ...(filters.season ? [{ season: filters.season }] : [])
      ]
    };

    const results = await prisma.roomExample.findMany({
      where,
      include: {
        tags: true,
        features: true
      },
      orderBy: { rating: 'desc' },
      take: 20
    });

    return results;
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

// Database statistikk
export async function getDatabaseStats() {
  try {
    const stats = await prisma.$transaction([
      prisma.roomExample.count(),
      prisma.roomExample.groupBy({
        by: ['roomType'],
        _count: true
      }),
      prisma.roomExample.groupBy({
        by: ['targetGroup'],
        _count: true
      }),
      prisma.analysisLog.count(),
      prisma.userExample.count(),
      prisma.locationCache.count()
    ]);

    return {
      totalExamples: stats[0],
      byRoomType: stats[1],
      byTargetGroup: stats[2],
      totalAnalyses: stats[3],
      userExamples: stats[4],
      cachedLocations: stats[5]
    };
  } catch (error) {
    console.error('Stats error:', error);
    return null;
  }
}