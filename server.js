/**
 * AutoSync Resolve Studio - Ücretsiz OTA Güncelleme Dağıtım Sunucusu
 * 100% Bağımsız (Pure Node.js, sıfır harici paket, sıfır maliyet)
 * Render.com, Vercel, Railway, Fly.io veya yerel/VPS sunucularda ücretsiz çalışır.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = Number(process.env.PORT || 8080);
const DATA_DIR = path.join(__dirname, 'data');
const FILES_DIR = path.join(__dirname, 'files');
const PUBLIC_DIR = path.join(__dirname, 'public');
const ARCHIVE_DIR = path.join(__dirname, 'archive');
const VERSION_FILE = path.join(DATA_DIR, 'version.json');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(FILES_DIR, { recursive: true });
fs.mkdirSync(PUBLIC_DIR, { recursive: true });
fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

function getStats() {
  try {
    if (fs.existsSync(STATS_FILE)) {
      return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
    }
  } catch (_) {}
  return { checkCount: 0, windowsDownloadCount: 0, macosDownloadCount: 0, lastCheckTime: null };
}

function saveStats(stats) {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf8');
  } catch (_) {}
}

function getVersionData(req) {
  let data = {
    version: '3.1.0',
    appName: 'AutoSync Resolve Studio',
    releaseDate: '2026-11-09',
    title: 'AutoSync Resolve Studio v3.1.0',
    changelog: [
      'Birden fazla açık DaVinci Resolve penceresi arasında seçim yapabilme (Instance Selector)',
      'Tek pencere açıkken seçim kutusu olmadan otomatik algılama',
      'Varsayılan olarak "Ayrı yeni timeline oluştur" ve "Aradaki boşlukları kaldır" aktif',
      'Otomatik ve manuel güncelleme takip sistemi (OTA Updater)'
    ],
    windows: {
      version: '3.1.0',
      fileName: 'AutoSync_Resolve_Studio_Windows_Setup.exe',
      downloadUrl: '/download/windows'
    },
    macos: {
      version: '3.1.0',
      fileName: 'AutoSync_Resolve_Studio_macOS_Setup.command',
      downloadUrl: '/download/macos'
    }
  };

  try {
    if (fs.existsSync(VERSION_FILE)) {
      data = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
    }
  } catch (_) {}

  // Resolve absolute download URLs based on current request host
  const host = (req && req.headers && req.headers['host']) || `localhost:${PORT}`;
  const proto = (req && req.headers && req.headers['x-forwarded-proto']) || 'http';
  const baseUrl = `${proto}://${host}`;

  const copy = JSON.parse(JSON.stringify(data));
  if (copy.windows && copy.windows.downloadUrl && copy.windows.downloadUrl.startsWith('/')) {
    copy.windows.downloadUrl = `${baseUrl}${copy.windows.downloadUrl}`;
  }
  if (copy.macos && copy.macos.downloadUrl && copy.macos.downloadUrl.startsWith('/')) {
    copy.macos.downloadUrl = `${baseUrl}${copy.macos.downloadUrl}`;
  }
  return copy;
}

function sendJson(res, statusCode, obj) {
  const body = JSON.stringify(obj, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-cache'
  });
  res.end(body);
}

function parseMultipartFormData(req, targetDir) {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'] || '';
    const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!match) return reject(new Error('Boundary bulunamadı'));
    const boundary = match[1] || match[2];

    const tempFile = path.join(os.tmpdir(), `upload_${Date.now()}.tmp`);
    const writeStream = fs.createWriteStream(tempFile);
    req.pipe(writeStream);

    writeStream.on('finish', () => {
      try {
        const buf = fs.readFileSync(tempFile);
        fs.unlinkSync(tempFile);

        const boundaryBuffer = Buffer.from(`--${boundary}`);
        const parts = [];
        let start = 0;

        while (true) {
          const idx = buf.indexOf(boundaryBuffer, start);
          if (idx === -1) break;
          if (start > 0) parts.push(buf.slice(start, idx));
          start = idx + boundaryBuffer.length;
        }

        const fields = {};
        const files = {};

        for (const p of parts) {
          const headerEnd = p.indexOf(Buffer.from('\r\n\r\n'));
          if (headerEnd === -1) continue;
          const headerStr = p.slice(0, headerEnd).toString('utf8');
          let dataBuf = p.slice(headerEnd + 4);
          if (dataBuf.length >= 2 && dataBuf[dataBuf.length - 2] === 13 && dataBuf[dataBuf.length - 1] === 10) {
            dataBuf = dataBuf.slice(0, dataBuf.length - 2);
          }

          const dispMatch = headerStr.match(/name="([^"]+)"(?:;\s*filename="([^"]+)")?/i);
          if (dispMatch) {
            const fieldName = dispMatch[1];
            const fileName = dispMatch[2];
            if (fileName) {
              const safeName = path.basename(fileName);
              const dest = path.join(targetDir, safeName);
              fs.writeFileSync(dest, dataBuf);
              files[fieldName] = { fileName: safeName, path: dest, size: dataBuf.length };
            } else {
              fields[fieldName] = dataBuf.toString('utf8').trim();
            }
          }
        }
        resolve({ fields, files });
      } catch (err) {
        reject(err);
      }
    });

    writeStream.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = urlObj.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // 1. Client Update Manifest Endpoint (Called by installed apps)
  if (req.method === 'GET' && (pathname === '/version.json' || pathname === '/api/version')) {
    const stats = getStats();
    stats.checkCount++;
    stats.lastCheckTime = new Date().toISOString();
    saveStats(stats);
    return sendJson(res, 200, getVersionData(req));
  }

  // 2. Download Windows Installer
  if (req.method === 'GET' && pathname === '/download/windows') {
    const winExe = path.join(FILES_DIR, 'AutoSync_Resolve_Studio_Windows_Setup.exe');
    if (!fs.existsSync(winExe)) {
      return sendJson(res, 404, { error: 'Windows kurulum dosyası sunucuda henüz yüklenmemiş.' });
    }
    const stats = getStats();
    stats.windowsDownloadCount++;
    saveStats(stats);

    const st = fs.statSync(winExe);
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="AutoSync_Resolve_Studio_Windows_Setup.exe"',
      'Content-Length': st.size
    });
    return fs.createReadStream(winExe).pipe(res);
  }

  // 3. Download macOS Installer
  if (req.method === 'GET' && pathname === '/download/macos') {
    const macCmd = path.join(FILES_DIR, 'AutoSync_Resolve_Studio_macOS_Setup.command');
    if (!fs.existsSync(macCmd)) {
      return sendJson(res, 404, { error: 'macOS kurulum dosyası sunucuda henüz yüklenmemiş.' });
    }
    const stats = getStats();
    stats.macosDownloadCount++;
    saveStats(stats);

    const st = fs.statSync(macCmd);
    res.writeHead(200, {
      'Content-Type': 'application/x-sh',
      'Content-Disposition': 'attachment; filename="AutoSync_Resolve_Studio_macOS_Setup.command"',
      'Content-Length': st.size
    });
    return fs.createReadStream(macCmd).pipe(res);
  }

  // 4. Server Stats API
  if (req.method === 'GET' && pathname === '/api/stats') {
    const st = getStats();
    const ver = getVersionData(req);
    const winExe = path.join(FILES_DIR, 'AutoSync_Resolve_Studio_Windows_Setup.exe');
    const macCmd = path.join(FILES_DIR, 'AutoSync_Resolve_Studio_macOS_Setup.command');

    return sendJson(res, 200, {
      stats: st,
      currentVersion: ver.version,
      releaseDate: ver.releaseDate,
      files: {
        windowsSetupExists: fs.existsSync(winExe),
        windowsSetupSizeMB: fs.existsSync(winExe) ? Number((fs.statSync(winExe).size / (1024 * 1024)).toFixed(1)) : 0,
        macosSetupExists: fs.existsSync(macCmd),
        macosSetupSizeMB: fs.existsSync(macCmd) ? Number((fs.statSync(macCmd).size / (1024 * 1024)).toFixed(1)) : 0
      }
    });
  }

  // 5. Admin Publish Endpoint (Upload new setup and publish new version)
  if (req.method === 'POST' && pathname === '/api/publish') {
    try {
      const contentType = req.headers['content-type'] || '';
      let fields = {};
      let files = {};

      if (contentType.includes('multipart/form-data')) {
        const parsed = await parseMultipartFormData(req, FILES_DIR);
        fields = parsed.fields;
        files = parsed.files;
      } else {
        let rawBody = '';
        await new Promise((resov, rej) => {
          req.on('data', chunk => rawBody += chunk);
          req.on('end', resov);
          req.on('error', rej);
        });
        fields = rawBody ? JSON.parse(rawBody) : {};
      }

      const version = (fields.version || '').trim();
      if (!version) {
        return sendJson(res, 400, { ok: false, error: 'Sürüm numarası zorunludur (örn: 3.2.0)' });
      }

      const rawLogs = fields.changelog || '';
      const changelog = rawLogs.split('\n').map(l => l.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean);

      const currentVerData = getVersionData(req);
      const newVerData = {
        version,
        appName: 'AutoSync Resolve Studio',
        releaseDate: fields.releaseDate || new Date().toISOString().split('T')[0],
        title: fields.title || `AutoSync Resolve Studio v${version}`,
        changelog: changelog.length > 0 ? changelog : ['Genel performans ve kararlılık iyileştirmeleri'],
        windows: {
          version,
          fileName: 'AutoSync_Resolve_Studio_Windows_Setup.exe',
          downloadUrl: '/download/windows'
        },
        macos: {
          version,
          fileName: 'AutoSync_Resolve_Studio_macOS_Setup.command',
          downloadUrl: '/download/macos'
        }
      };

      fs.writeFileSync(VERSION_FILE, JSON.stringify(newVerData, null, 2), 'utf8');

      // Her güncellenen sürüm için yerelde bağımsız arşiv klasörü oluştur
      try {
        const verArchiveDir = path.join(ARCHIVE_DIR, `v${version}`);
        fs.mkdirSync(verArchiveDir, { recursive: true });
        fs.writeFileSync(path.join(verArchiveDir, 'version.json'), JSON.stringify(newVerData, null, 2), 'utf8');
        fs.writeFileSync(path.join(verArchiveDir, 'SURUM_NOTLARI.txt'), changelog.map(c => `• ${c}`).join('\r\n'), 'utf8');

        const winSrc = path.join(FILES_DIR, 'AutoSync_Resolve_Studio_Windows_Setup.exe');
        if (fs.existsSync(winSrc)) {
          fs.copyFileSync(winSrc, path.join(verArchiveDir, `AutoSync_Resolve_Studio_Windows_Setup_v${version}.exe`));
        }
        const macSrc = path.join(FILES_DIR, 'AutoSync_Resolve_Studio_macOS_Setup.command');
        if (fs.existsSync(macSrc)) {
          fs.copyFileSync(macSrc, path.join(verArchiveDir, `AutoSync_Resolve_Studio_macOS_Setup_v${version}.command`));
        }
      } catch (archErr) {
        console.error('Arşivleme uyarısı:', archErr.message);
      }

      return sendJson(res, 200, {
        ok: true,
        message: `v${version} güncellemesi başarıyla yayınlandı ve Surum_Arsivi klasörüne kopyalandı!`,
        versionData: newVerData
      });
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: `Yayınlama hatası: ${err.message}` });
    }
  }

  // 6. Sürüm Arşivi Listesi
  if (req.method === 'GET' && pathname === '/api/archive') {
    const list = [];
    if (fs.existsSync(ARCHIVE_DIR)) {
      const folders = fs.readdirSync(ARCHIVE_DIR);
      for (const f of folders) {
        const vFile = path.join(ARCHIVE_DIR, f, 'version.json');
        if (fs.existsSync(vFile)) {
          try {
            list.push(JSON.parse(fs.readFileSync(vFile, 'utf8')));
          } catch (_) {}
        }
      }
    }
    list.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
    return sendJson(res, 200, { ok: true, archives: list });
  }

  // 6. Serve Admin Dashboard Static HTML
  if (req.method === 'GET' && (pathname === '/' || pathname === '/admin' || pathname === '/index.html')) {
    const adminHtml = path.join(PUBLIC_DIR, 'admin.html');
    if (fs.existsSync(adminHtml)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return fs.createReadStream(adminHtml).pipe(res);
    }
  }

  sendJson(res, 404, { error: 'Sayfa bulunamadı' });
});

server.listen(PORT, () => {
  console.log(`\n============================================================`);
  console.log(`  AUTOSYNC RESOLVE STUDIO - GÜNCELLEME SUNUCUSU (AKTİF)`);
  console.log(`  Yönetim Paneli : http://localhost:${PORT}`);
  console.log(`  Canlı API      : http://localhost:${PORT}/version.json`);
  console.log(`============================================================\n`);
});
