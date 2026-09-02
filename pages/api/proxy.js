import axios from 'axios';

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).send('URL wajib diisi');
  }

  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
      timeout: 15000,
      maxContentLength: 20 * 1024 * 1024,
    });

    res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).send(response.data);
  } catch (err) {
    return res.status(500).send('Gagal ambil gambar');
  }
}
