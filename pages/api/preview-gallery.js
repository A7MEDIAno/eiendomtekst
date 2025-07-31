// ===== FILE: pages/api/preview-gallery.js - KOMPLETT OPPDATERT =====
import { chromium } from 'playwright';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { galleryUrl } = req.body;

  if (!galleryUrl) {
    return res.status(400).json({ error: 'Mangler galleri-URL' });
  }

  let browser;
  
  try {
    console.log('Fetching preview for:', galleryUrl);
    
    // Launch browser
    browser = await Promise.race([
      chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Browser launch timeout')), 10000))
    ]);
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    
    // Navigate to gallery
    await page.goto(galleryUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 20000 
    });
    
    // Wait for content
    await page.waitForTimeout(2000);

    // Extract address if possible
    const addressInfo = await page.evaluate(() => {
      const title = document.title;
      const h1 = document.querySelector('h1')?.textContent;
      const h2 = document.querySelector('h2')?.textContent;
      
      // Try multiple selectors for Pholio galleries
      let address = '';
      
      // Check different possible locations
      const possibleSelectors = [
        'h1',
        'h2', 
        '.property-address',
        '.gallery-title',
        '[class*="address"]',
        '[class*="title"]'
      ];
      
      for (const selector of possibleSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent) {
          const text = element.textContent.trim();
          // Skip if it's just "Pholio" or similar
          if (text && text.length > 10 && !text.match(/^pholio$/i)) {
            address = text;
            break;
          }
        }
      }
      
      // Fallback to title if nothing found
      if (!address) {
        address = title || '';
      }
      
      console.log('Raw address found:', address);
      
      // Clean the address - remove common UI elements
      address = address.replace(/^\d+\s*-\s*/, ''); // Remove number prefix like "300781 -"
      address = address.replace(/\s*\|.*$/, ''); // Remove everything after |
      address = address.replace(/\s*-\s*Pholio.*$/i, ''); // Remove Pholio suffix
      address = address.replace(/^Pholio\s*-\s*/i, ''); // Remove Pholio prefix
      
      // Remove common UI button texts
      address = address.replace(/\s*SE BILDENE\s*/gi, '');
      address = address.replace(/\s*VIS MER\s*/gi, '');
      address = address.replace(/\s*LES MER\s*/gi, '');
      address = address.replace(/\s*SE ALLE\s*/gi, '');
      address = address.replace(/\s*KONTAKT.*$/i, ''); // Remove "KONTAKT MEGLER" etc
      address = address.replace(/\s*BOOK.*$/i, ''); // Remove "BOOK VISNING" etc
      
      address = address.trim();
      
      console.log('Cleaned address:', address);
      
      return address;
    });

    // Collect images
    const images = await page.evaluate(async () => {
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const foundImages = new Set();
      
      const collectImages = () => {
        // Regular img tags
        document.querySelectorAll('img').forEach(img => {
          const srcs = [
            img.src,
            img.getAttribute('src'),
            img.dataset?.src,
            img.dataset?.lazySrc,
            img.dataset?.original,
            img.getAttribute('data-src'),
            img.getAttribute('data-lazy-src'),
            img.getAttribute('data-original')
          ].filter(Boolean);
          
          srcs.forEach(src => {
            if (src && src.startsWith('http')) {
              // Filter out small images and icons
              if (!src.includes('logo') && 
                  !src.includes('icon') && 
                  !src.includes('pixel') &&
                  !src.includes('tracking') &&
                  !src.includes('1x1')) {
                foundImages.add(src);
              }
            }
          });
        });
        
        // Background images
        document.querySelectorAll('[style*="background-image"]').forEach(el => {
          const style = el.getAttribute('style') || '';
          const matches = style.matchAll(/url\(['"]?([^'"]+)['"]?\)/g);
          for (const match of matches) {
            if (match[1] && match[1].startsWith('http')) {
              foundImages.add(match[1]);
            }
          }
        });
        
        // Picture elements
        document.querySelectorAll('picture source').forEach(source => {
          const srcset = source.getAttribute('srcset');
          if (srcset) {
            // Extract URLs from srcset
            const urls = srcset.split(',').map(s => s.trim().split(' ')[0]);
            urls.forEach(url => {
              if (url && url.startsWith('http')) {
                foundImages.add(url);
              }
            });
          }
        });
      };

      // Initial collection
      collectImages();
      console.log(`Initial collection: ${foundImages.size} images`);
      
      // Scroll to trigger lazy loading
      const scrollHeight = document.body.scrollHeight;
      const scrollStep = Math.floor(scrollHeight / 5);
      
      for (let i = 0; i < 5; i++) {
        window.scrollTo(0, scrollStep * i);
        await wait(800);
        collectImages();
        console.log(`After scroll ${i + 1}: ${foundImages.size} images`);
      }
      
      // Scroll to bottom
      window.scrollTo(0, document.body.scrollHeight);
      await wait(1000);
      collectImages();
      
      console.log(`Final collection: ${foundImages.size} images`);
      return Array.from(foundImages);
    });

    // Close browser
    await context.close();
    await browser.close();
    browser = null;

    // Filter and limit images
    const validImages = images
      .filter(src => {
        try {
          const url = new URL(src);
          const path = url.pathname.toLowerCase();
          return src.length > 50 && 
                 !path.includes('pixel') &&
                 !path.includes('avatar');
        } catch (e) {
          return false;
        }
      })
      .slice(0, 20); // Return max 20 for preview

    console.log(`Found ${validImages.length} images for preview`);

    // VIKTIG: Returner med 'images' key, ikke 'imageUrls'
    res.status(200).json({
      images: validImages,
      address: addressInfo,
      totalFound: images.length
    });

  } catch (error) {
    console.error('Preview error:', error.message);
    
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        console.error('Failed to close browser');
      }
    }

    res.status(500).json({ 
      error: 'Kunne ikke hente forhåndsvisning',
      details: error.message
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};