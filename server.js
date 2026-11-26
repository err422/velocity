const express = require('express');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const ROOT_DIR = __dirname;
const INDEX_HTML_PATH = path.join(ROOT_DIR, 'index.html');

const COMPRESSIBLE_EXTS = new Set(['.js', '.mjs', '.css', '.html', '.json', '.svg', '.txt']);
const ASSET_EXT_RE = /\.(?:js|mjs|css|json|png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf|map|mp3|wav|ogg)$/i;

let bundleCache = null;

function parseScriptManifest(htmlText) {
  const match = htmlText.match(/const\s+SCRIPTS\s*=\s*\[([\s\S]*?)\];/);
  if (!match) return [];
  const out = [];
  const re = /"([^"]+\.js)"/g;
  let m;
  while ((m = re.exec(match[1])) !== null) {
    const rel = m[1].replace(/^\/+/, '');
    if (rel && !rel.includes('..')) out.push(rel);
  }
  return out;
}

function getScriptsBundle() {
  const indexStat = fs.statSync(INDEX_HTML_PATH);
  let manifest;
  if (bundleCache && bundleCache.indexMtime === indexStat.mtimeMs) {
    manifest = bundleCache.manifest;
  } else {
    manifest = parseScriptManifest(fs.readFileSync(INDEX_HTML_PATH, 'utf8'));
  }

  let stamp = String(indexStat.mtimeMs);
  const absPaths = [];
  for (const rel of manifest) {
    const abs = path.join(ROOT_DIR, rel);
    const st = fs.statSync(abs);
    stamp += `|${st.mtimeMs}:${st.size}`;
    absPaths.push({ rel, abs });
  }

  if (bundleCache && bundleCache.stamp === stamp) {
    return bundleCache;
  }

  const scripts = absPaths.map(({ rel, abs }) => ({
    path: rel,
    code: fs.readFileSync(abs, 'utf8')
  }));
  const jsonBuf = Buffer.from(JSON.stringify({ version: stamp.length, scripts }), 'utf8');
  const gzipBuf = zlib.gzipSync(jsonBuf, { level: 6 });
  const etag = `"v-${Buffer.from(stamp).toString('base64url').slice(0, 24)}-${jsonBuf.length}"`;

  bundleCache = {
    indexMtime: indexStat.mtimeMs,
    manifest,
    stamp,
    etag,
    jsonBuf,
    gzipBuf
  };
  return bundleCache;
}

// Single-request compressed script bundle to prevent 43-file sequential waterfalls on mobile/proxy networks
app.get('/api/scripts-bundle.json', (req, res) => {
  try {
    const bundle = getScriptsBundle();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Vary', 'Accept-Encoding');
    res.setHeader('ETag', bundle.etag);

    if (req.headers['if-none-match'] === bundle.etag) {
      res.status(304).end();
      return;
    }

    const acceptEnc = String(req.headers['accept-encoding'] || '');
    if (/\bgzip\b/i.test(acceptEnc)) {
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Content-Length', bundle.gzipBuf.length);
      res.send(bundle.gzipBuf);
    } else {
      res.setHeader('Content-Length', bundle.jsonBuf.length);
      res.send(bundle.jsonBuf);
    }
  } catch (err) {
    console.error('Failed to build scripts bundle:', err);
    res.status(500).json({ error: 'Bundle build failed' });
  }
});

// Lightweight gzip compression for static text assets (JS, CSS, HTML, JSON, SVG)
app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const acceptEnc = String(req.headers['accept-encoding'] || '');
  if (!/\bgzip\b/i.test(acceptEnc)) return next();

  const rawPath = req.path === '/' ? '/index.html' : req.path;
  const ext = path.extname(rawPath).toLowerCase();
  if (!COMPRESSIBLE_EXTS.has(ext)) return next();

  const resolved = path.resolve(ROOT_DIR, '.' + rawPath);
  if (!resolved.startsWith(ROOT_DIR + path.sep) && resolved !== INDEX_HTML_PATH) return next();

  fs.stat(resolved, (err, stat) => {
    if (err || !stat.isFile()) return next();
    const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.setHeader('Vary', 'Accept-Encoding');
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }

    const mimeMap = {
      '.js': 'application/javascript; charset=utf-8',
      '.mjs': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.html': 'text/html; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml; charset=utf-8',
      '.txt': 'text/plain; charset=utf-8'
    };
    res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
    res.setHeader('Content-Encoding', 'gzip');

    if (req.method === 'HEAD') {
      res.status(200).end();
      return;
    }

    const stream = fs.createReadStream(resolved);
    const gz = zlib.createGzip({ level: 6 });
    stream.on('error', () => {
      if (!res.headersSent) res.status(500).end();
    });
    stream.pipe(gz).pipe(res);
  });
});

app.use(express.static(ROOT_DIR));

app.use((req, res) => {
  if (req.path.startsWith('/api/') || ASSET_EXT_RE.test(req.path)) {
    res.status(404).type('text/plain').send('Not Found');
    return;
  }
  res.sendFile(INDEX_HTML_PATH);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`VELOCITY running at http://0.0.0.0:${PORT}`);
});
