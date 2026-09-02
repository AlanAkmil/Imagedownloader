import { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export default function Home() {
  const [url, setUrl] = useState('');
  const [images, setImages] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  const handleScrape = async () => {
    if (!url) return;
    setLoading(true);
    setError('');
    setImages([]);
    setSelected(new Set());
    try {
      const res = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else if (data.images.length === 0) {
        setError('Gak nemu gambar di web itu');
      } else {
        setImages(data.images);
        setSelected(new Set(data.images));
      }
    } catch (e) {
      setError('Gagal konek ke server');
    }
    setLoading(false);
  };

  const toggleSelect = (img) => {
    const next = new Set(selected);
    if (next.has(img)) next.delete(img);
    else next.add(img);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === images.length) setSelected(new Set());
    else setSelected(new Set(images));
  };

  const downloadZip = async () => {
    if (selected.size === 0) return;
    setDownloading(true);
    setProgress(0);
    const zip = new JSZip();
    const list = Array.from(selected);
    let done = 0;

    await Promise.all(
      list.map(async (imgUrl, i) => {
        try {
          const res = await fetch(`/api/proxy?url=${encodeURIComponent(imgUrl)}`);
          const blob = await res.blob();
          const cleanPath = imgUrl.split('?')[0];
          let ext = cleanPath.split('.').pop();
          if (!ext || ext.length > 5 || ext.includes('/')) ext = 'jpg';
          zip.file(`image-${i + 1}.${ext}`, blob);
        } catch (e) {
          // skip gambar yang gagal
        }
        done++;
        setProgress(Math.round((done / list.length) * 100));
      })
    );

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'images.zip');
    setDownloading(false);
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>🖼️ Image Sedot</h1>
        <p style={styles.subtitle}>
          Masukin URL web, sedot semua gambarnya, download sekaligus jadi ZIP.
        </p>

        <div style={styles.inputRow}>
          <input
            style={styles.input}
            type="text"
            placeholder="https://contoh.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
          />
          <button style={styles.button} onClick={handleScrape} disabled={loading}>
            {loading ? 'Nyari...' : 'Cari Gambar'}
          </button>
        </div>

        {error && <p style={styles.error}>{error}</p>}

        {images.length > 0 && (
          <>
            <div style={styles.toolbar}>
              <span>
                {images.length} gambar ketemu, {selected.size} dipilih
              </span>
              <button style={styles.smallButton} onClick={toggleAll}>
                {selected.size === images.length ? 'Batal Semua' : 'Pilih Semua'}
              </button>
            </div>

            <div style={styles.grid}>
              {images.map((img, i) => (
                <div
                  key={i}
                  style={{
                    ...styles.thumb,
                    outline: selected.has(img) ? '3px solid #111' : '3px solid transparent',
                  }}
                  onClick={() => toggleSelect(img)}
                >
                  <img src={img} alt="" style={styles.thumbImg} loading="lazy" />
                </div>
              ))}
            </div>

            <button
              style={styles.downloadButton}
              onClick={downloadZip}
              disabled={downloading || selected.size === 0}
            >
              {downloading ? `Download... ${progress}%` : `Download ${selected.size} Gambar (ZIP)`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f5f0e8',
    fontFamily: "'Courier New', monospace",
    padding: '20px',
  },
  container: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 900,
    margin: '0 0 8px',
  },
  subtitle: {
    color: '#555',
    marginBottom: '20px',
  },
  inputRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  input: {
    flex: 1,
    minWidth: '200px',
    padding: '12px',
    border: '3px solid #111',
    fontSize: '1rem',
    background: '#fff',
  },
  button: {
    padding: '12px 20px',
    border: '3px solid #111',
    background: '#ffd23f',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '4px 4px 0 #111',
  },
  error: {
    color: '#c1121f',
    marginTop: '10px',
    fontWeight: 700,
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: '20px 0 10px',
    fontWeight: 700,
  },
  smallButton: {
    padding: '6px 12px',
    border: '2px solid #111',
    background: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: '10px',
    marginBottom: '20px',
  },
  thumb: {
    aspectRatio: '1',
    border: '2px solid #111',
    overflow: 'hidden',
    cursor: 'pointer',
    background: '#fff',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  downloadButton: {
    width: '100%',
    padding: '16px',
    border: '3px solid #111',
    background: '#06d6a0',
    fontWeight: 900,
    fontSize: '1.1rem',
    cursor: 'pointer',
    boxShadow: '4px 4px 0 #111',
    marginBottom: '30px',
  },
};
