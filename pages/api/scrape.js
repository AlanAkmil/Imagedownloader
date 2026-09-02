import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL wajib diisi' });
  }

  let target;
  try {
    target = new URL(url);
  } catch (e) {
    return res.status(400).json({ error: 'URL gak valid' });
  }

  try {
    const { data: html } = await axios.get(target.href, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      },
      timeout: 15000,
      maxContentLength: 20 * 1024 * 1024,
    });

    const $ = cheerio.load(html);
    const imageSet = new Set();

    const tryAdd = (raw) => {
      if (!raw) return;
      try {
        const abs = new URL(raw.trim(), target).href;
        if (abs.startsWith('http')) imageSet.add(abs);
      } catch (e) {
        // ignore invalid URL
      }
    };

    $('img').each((_, el) => {
      const $el = $(el);
      tryAdd($el.attr('src'));
      tryAdd($el.attr('data-src'));
      tryAdd($el.attr('data-lazy-src'));

      const srcset = $el.attr('srcset');
      if (srcset) {
        srcset.split(',').forEach((part) => {
          const u = part.trim().split(' ')[0];
          tryAdd(u);
        });
      }
    });

    $('[style*="background-image"]').each((_, el) => {
      const style = $(el).attr('style') || '';
      const match = style.match(/url\(['"]?([^'")]+)['"]?\)/);
      if (match) tryAdd(match[1]);
    });

    $('meta[property="og:image"]').each((_, el) => {
      tryAdd($(el).attr('content'));
    });

    const images = Array.from(imageSet);
    return res.status(200).json({ count: images.length, images });
  } catch (err) {
    return res
      .status(500)
      .json({ error: 'Gagal ambil halaman: ' + (err.message || 'unknown error') });
  }
}
