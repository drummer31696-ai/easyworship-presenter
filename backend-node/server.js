const { WebSocketServer } = require('ws');
const http = require('http');
const https = require('https');
const url = require('url');

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Lyrics Proxy to bypass CORS
  if (parsedUrl.pathname === '/proxy/lyrics') {
    const { artist, title } = parsedUrl.query;
    if (!artist || !title) {
      res.writeHead(400);
      res.end('Missing artist or title');
      return;
    }

    // 1. Check Local DB first
    let localDb = {};
    try {
      localDb = require('./local_db.json');
      const key = `${artist} - ${title}`;
      if (localDb[key]) {
        console.log(`Found in Local DB: ${key}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ lyrics: localDb[key] }));
        return;
      }
    } catch (e) {
      console.log('Local DB not found or error reading it');
    }

    // 2. Fallback to API
    const apiUrl = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
    https.get(apiUrl, (apiRes) => {
      let data = '';
      apiRes.on('data', (chunk) => data += chunk);
      apiRes.on('end', () => {
        res.writeHead(apiRes.statusCode, { 'Content-Type': 'application/json' });
        res.end(data);
      });
    }).on('error', (err) => {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('New client connected');
  ws.on('message', (data) => {
    const message = data.toString();
    wss.clients.forEach((client) => {
      if (client.readyState === 1) client.send(message);
    });
  });
});

server.listen(8080, () => {
  console.log('EasyWorship Node Backend (Proxy + WS) started on port 8080');
});
