// pages/api/preview-gallery.js
import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url || !url.includes('finn.no')) {
    return res.status(400).json({ error: 'Invalid Finn.no URL' });
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
      timeout: 20000 
    });

    // Vent på at bilder lastes
    await page.waitForSelector('img[src*="finncdn.no"], img[data-src*="finncdn.no"]', {
      timeout: 10000
    }).catch(() => console.log('No images found with selector'));

    // Ekstraher data
    const data = await page.evaluate(() => {
      const images = [];
      
      // Finn alle bilder
      document.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('data-src') || img.getAttribute('src');
        if (src && src.includes('finncdn.no')) {
          // Konverter til høy oppløsning
          const highResSrc = src.replace(/\d+x\d+/, '1600x1200');
          images.push(highResSrc);
        }
      });

      // Finn tittel
      const titleElement = document.querySelector('h1');
      const title = titleElement ? titleElement.textContent.trim() : 
                   document.title.split('|')[0].trim();

      // Finn adresse - prøv flere metoder
      let address = '';
      
      // Metode 1: Fra structured data
      const ldJsonScripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of ldJsonScripts) {
        try {
          const data = JSON.parse(script.textContent);
          if (data.address) {
            address = [
              data.address.streetAddress,
              data.address.postalCode,
              data.address.addressLocality
            ].filter(Boolean).join(' ');
            break;
          }
        } catch (e) {}
      }

      // Metode 2: Fra DOM elementer
      if (!address) {
        const addressElement = document.querySelector('[data-testid="address"]') ||
                              document.querySelector('.u-t3') ||
                              document.querySelector('[class*="address"]');
        if (addressElement) {
          address = addressElement.textContent.trim();
        }
      }

      return {
        images: [...new Set(images)].slice(0, 20), // Unike bilder, maks 20
        title,
        address
      };
    });

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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);

    const images = [];
    $('img[src*="finncdn.no"], img[data-src*="finncdn.no"]').each((i, elem) => {
      if (images.length < 20) {
        const src = $(elem).attr('data-src') || $(elem).attr('src');
        if (src) {
          images.push(src.replace(/\d+x\d+/, '1600x1200'));
        }
      }
    });

    const title = $('h1').first().text().trim() || 
                  $('title').text().split('|')[0].trim();
    
    let address = '';
    $('script[type="application/ld+json"]').each((i, elem) => {
      try {
        const data = JSON.parse($(elem).html());
        if (data.address) {
          address = [
            data.address.streetAddress,
            data.address.postalCode,
            data.address.addressLocality
          ].filter(Boolean).join(' ');
        }
      } catch (e) {}
    });

    return res.status(200).json({
      images: [...new Set(images)],
      title,
      address: address || 'Adresse ikke funnet',
      url,
      source: 'cheerio-fallback'
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