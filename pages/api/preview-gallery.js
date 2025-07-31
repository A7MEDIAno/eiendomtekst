// pages/api/preview-gallery.js
import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  console.log('Received URL:', url);

  if (!url) {
    return res.status(400).json({ 
      error: 'No URL provided',
      received: req.body 
    });
  }

  // Aksepter alle URLs som starter med http/https
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return res.status(400).json({ 
      error: 'Invalid URL format',
      url: url,
      hint: 'URL must start with http:// or https://' 
    });
  }

  // Browserless API key - hent fra environment variable
  const browserlessApiKey = process.env.BROWSERLESS_API_KEY;
  
  if (!browserlessApiKey) {
    console.error('BROWSERLESS_API_KEY not set');
    // Fallback til cheerio hvis ingen Browserless key
    return handleWithCheerio(url, res);
  }

  let browser = null;

  try {
    console.log('Connecting to Browserless...');
    
    // Koble til Browserless
    browser = await puppeteer.connect({
      browserWSEndpoint: `wss://chrome.browserless.io?token=${browserlessApiKey}`,
    });

    const page = await browser.newPage();
    
    // Sett viewport og user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    // Naviger til siden med timeout
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    // Vent på at bilder lastes - forskjellige selectors for forskjellige sider
    await page.waitForSelector('img, [data-src], .gallery-image, .photo, [class*="image"]', {
      timeout: 10000
    }).catch(() => console.log('No images found with selector'));

    // Spesifikk håndtering for pholio.no
    if (url.includes('pholio.no')) {
      // Pholio kan kreve ekstra venting eller klikk
      await page.waitForTimeout(2000);
    }

    // Ekstraher data
    const data = await page.evaluate((pageUrl) => {
      const images = [];
      
      // Generisk bildesøk - prøv flere metoder
      // Metode 1: Alle img tags
      document.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src') || 
                   img.getAttribute('data-src') || 
                   img.getAttribute('data-lazy-src') ||
                   img.getAttribute('data-original');
        
        if (src && !src.includes('logo') && !src.includes('icon') && 
            !src.includes('placeholder') && src.startsWith('http')) {
          // For pholio.no, erstatt thumb med full size
          let fullSizeSrc = src;
          if (pageUrl.includes('pholio.no')) {
            fullSizeSrc = src.replace('/thumb/', '/large/')
                             .replace('_thumb', '')
                             .replace('/small/', '/large/');
          }
          images.push(fullSizeSrc);
        }
      });

      // Metode 2: Background images
      document.querySelectorAll('[style*="background-image"]').forEach(elem => {
        const style = elem.getAttribute('style');
        const match = style.match(/url\(['"]?([^'"]+)['"]?\)/);
        if (match && match[1] && !match[1].includes('logo')) {
          images.push(match[1]);
        }
      });

      // Metode 3: Links til bilder
      document.querySelectorAll('a[href$=".jpg"], a[href$=".jpeg"], a[href$=".png"]').forEach(link => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('http')) {
          images.push(href);
        }
      });

      // Finn tittel - generisk
      const titleElement = document.querySelector('h1, .property-title, .gallery-title, title');
      const title = titleElement ? 
                   (titleElement.textContent || titleElement.innerText || document.title).trim() : 
                   'Eiendomsgalleri';

      // Finn adresse - prøv flere metoder
      let address = '';
      
      // Generiske selectors
      const addressSelectors = [
        '.address', '.property-address', '.location',
        '[class*="address"]', '[class*="location"]',
        'h2', 'h3' // Ofte brukt for adresser
      ];
      
      for (const selector of addressSelectors) {
        const elem = document.querySelector(selector);
        if (elem && elem.textContent.match(/\d{4}/)) { // Inneholder postnummer?
          address = elem.textContent.trim();
          break;
        }
      }

      return {
        images: [...new Set(images)].slice(0, 50), // Øk til 50 bilder for gallerier
        title: title.substring(0, 200), // Begrens lengde
        address: address || 'Adresse ikke funnet',
        imageCount: images.length
      };
    }, url);

    await browser.close();

    console.log(`Found ${data.images.length} images via Browserless`);

    return res.status(200).json({
      ...data,
      url,
      source: 'browserless'
    });

  } catch (error) {
    console.error('Browserless error:', error);
    
    if (browser) {
      await browser.close().catch(console.error);
    }

    // Fallback til cheerio hvis Browserless feiler
    return handleWithCheerio(url, res);
  }
}

// Fallback funksjon med cheerio
async function handleWithCheerio(url, res) {
  try {
    const cheerio = await import('cheerio');
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'no,en;q=0.9'
      }
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);

    const images = [];
    
    // Finn alle bilder - generisk
    $('img').each((i, elem) => {
      if (images.length < 50) {
        const src = $(elem).attr('src') || 
                   $(elem).attr('data-src') || 
                   $(elem).attr('data-lazy-src');
        if (src && src.startsWith('http') && 
            !src.includes('logo') && !src.includes('icon')) {
          images.push(src);
        }
      }
    });

    // Sjekk også background-images
    $('[style*="background-image"]').each((i, elem) => {
      const style = $(elem).attr('style');
      const match = style.match(/url\(['"]?([^'"]+)['"]?\)/);
      if (match && match[1] && images.length < 50) {
        images.push(match[1]);
      }
    });

    const title = $('h1').first().text().trim() || 
                  $('title').text().trim() || 
                  'Eiendomsgalleri';
    
    let address = '';
    // Søk etter adresse i flere elementer
    $('.address, .property-address, .location, h2, h3').each((i, elem) => {
      const text = $(elem).text();
      if (text.match(/\d{4}/) && !address) { // Inneholder postnummer
        address = text.trim();
      }
    });

    return res.status(200).json({
      images: [...new Set(images)],
      title: title.substring(0, 200),
      address: address || 'Adresse ikke funnet',
      url,
      source: 'cheerio-fallback',
      imageCount: images.length
    });
  } catch (error) {
    console.error('Cheerio fallback error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch preview',
      details: error.message 
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
    responseLimit: '4mb',
  },
};