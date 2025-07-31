// ===== FILE: pages/api/database/[...params].js - DATABASE API ENDPOINTS =====
import { prisma } from '../../../lib/database';

export default async function handler(req, res) {
  const { params } = req.query;
  const [resource, action] = params || [];

  // Basic auth check (implementer bedre autentisering senere)
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Room Examples
    if (resource === 'examples') {
      switch (req.method) {
        case 'GET':
          const { roomType, targetGroup, search, limit = 20 } = req.query;
          const where = {};
          
          if (roomType) where.roomType = roomType;
          if (targetGroup) where.targetGroup = targetGroup;
          if (search) {
            where.description = { contains: search, mode: 'insensitive' };
          }

          const examples = await prisma.roomExample.findMany({
            where,
            include: {
              tags: true,
              features: true
            },
            orderBy: { createdAt: 'desc' },
            take: parseInt(limit)
          });

          return res.json({ examples });

        case 'POST':
          const newExample = await prisma.roomExample.create({
            data: {
              roomType: req.body.roomType,
              description: req.body.description,
              targetGroup: req.body.targetGroup || 'standard',
              season: req.body.season,
              quality: req.body.quality || 'neutral',
              tags: {
                connectOrCreate: req.body.tags?.map(tag => ({
                  where: { name: tag },
                  create: { name: tag }
                })) || []
              },
              features: {
                connectOrCreate: req.body.features?.map(feature => ({
                  where: { name: feature },
                  create: { name: feature, category: 'general' }
                })) || []
              }
            },
            include: {
              tags: true,
              features: true
            }
          });

          return res.json({ example: newExample });

        case 'PUT':
          if (!action) return res.status(400).json({ error: 'Missing ID' });
          
          const updated = await prisma.roomExample.update({
            where: { id: parseInt(action) },
            data: {
              description: req.body.description,
              targetGroup: req.body.targetGroup,
              season: req.body.season,
              quality: req.body.quality,
              rating: req.body.rating
            }
          });

          return res.json({ example: updated });

        case 'DELETE':
          if (!action) return res.status(400).json({ error: 'Missing ID' });
          
          await prisma.roomExample.delete({
            where: { id: parseInt(action) }
          });

          return res.json({ success: true });
      }
    }

    // Statistics
    if (resource === 'stats') {
      const stats = await prisma.$transaction([
        prisma.roomExample.count(),
        prisma.roomExample.groupBy({
          by: ['roomType'],
          _count: true,
          orderBy: { _count: { roomType: 'desc' } }
        }),
        prisma.roomExample.groupBy({
          by: ['targetGroup'],
          _count: true
        }),
        prisma.analysisLog.count(),
        prisma.userExample.count(),
        prisma.locationCache.count(),
        // Most used examples
        prisma.roomExample.findMany({
          orderBy: { usageCount: 'desc' },
          take: 10,
          select: {
            id: true,
            roomType: true,
            description: true,
            usageCount: true
          }
        })
      ]);

      return res.json({
        total: stats[0],
        byRoomType: stats[1],
        byTargetGroup: stats[2],
        totalAnalyses: stats[3],
        userExamples: stats[4],
        cachedLocations: stats[5],
        mostUsed: stats[6]
      });
    }

    // Bulk operations
    if (resource === 'bulk') {
      if (req.method === 'POST' && action === 'import') {
        const { examples } = req.body;
        
        const results = await prisma.$transaction(
          examples.map(example => 
            prisma.roomExample.create({
              data: {
                roomType: example.roomType,
                description: example.description,
                targetGroup: example.targetGroup || 'standard',
                season: example.season,
                quality: example.quality || 'neutral'
              }
            })
          )
        );

        return res.json({ 
          success: true, 
          imported: results.length 
        });
      }

      if (req.method === 'POST' && action === 'export') {
        const examples = await prisma.roomExample.findMany({
          include: {
            tags: true,
            features: true
          }
        });

        return res.json({ examples });
      }
    }

    // Search
    if (resource === 'search') {
      const { q, roomType, targetGroup } = req.query;
      
      const results = await prisma.roomExample.findMany({
        where: {
          AND: [
            { description: { contains: q, mode: 'insensitive' } },
            roomType ? { roomType } : {},
            targetGroup ? { targetGroup } : {}
          ]
        },
        include: {
          tags: true,
          features: true
        },
        take: 50
      });

      return res.json({ results });
    }

    // Tags and Features
    if (resource === 'tags') {
      const tags = await prisma.tag.findMany({
        include: {
          _count: { select: { examples: true } }
        },
        orderBy: { name: 'asc' }
      });

      return res.json({ tags });
    }

    if (resource === 'features') {
      const features = await prisma.feature.findMany({
        include: {
          _count: { select: { examples: true } }
        },
        orderBy: { name: 'asc' }
      });

      return res.json({ features });
    }

    // User examples
    if (resource === 'user-examples') {
      if (req.method === 'GET') {
        const examples = await prisma.userExample.findMany({
          orderBy: { createdAt: 'desc' },
          take: 100
        });

        // Parse style JSON for output
        const parsed = examples.map(ex => ({
          ...ex,
          style: ex.style ? JSON.parse(ex.style) : null
        }));

        return res.json({ examples: parsed });
      }

      if (req.method === 'POST') {
        const example = await prisma.userExample.create({
          data: {
            userId: req.body.userId || 'anonymous',
            roomType: req.body.roomType,
            description: req.body.description,
            imageUrl: req.body.imageUrl,
            style: req.body.style ? JSON.stringify(req.body.style) : null
          }
        });

        return res.json({ 
          example: {
            ...example,
            style: example.style ? JSON.parse(example.style) : null
          }
        });
      }
    }

    return res.status(404).json({ error: 'Not found' });

  } catch (error) {
    console.error('Database API error:', error);
    return res.status(500).json({ 
      error: 'Database error',
      details: error.message 
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};