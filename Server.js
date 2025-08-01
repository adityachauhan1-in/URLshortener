import { createServer } from 'http';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// Fix __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3002;
const HTML_FILE = path.join(__dirname, 'public', 'index.html');
const DATA_FILE = path.join(__dirname, 'data', 'links.json');

// Load data
const loadLinks = async () => {
  try {
    const data = await readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 'ENOENT') {
      await writeFile(DATA_FILE, JSON.stringify({}));
      return {};
    }
    throw err;
  }
};

const saveLinks = async (links) => {
  await writeFile(DATA_FILE, JSON.stringify(links));
};

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/") {
    try {
      const html = await readFile(HTML_FILE);
      res.writeHead(200, { "Content-Type": "text/html" });
      return res.end(html);
    } catch {
      res.writeHead(500);
      return res.end("Server Error");
    }
  }

  if (req.method === "GET" && req.url === "/links") {
    const links = await loadLinks();
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(links));
  }

  if (req.method === "POST" && req.url === "/shorten") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", async () => {
      try {
        const { url, shortcode } = JSON.parse(body);
        if (!url || !shortcode) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          return res.end("Missing URL or Shortcode");
        }

        const links = await loadLinks();

        if (links[shortcode]) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          return res.end("Shortcode already exists");
        }

        links[shortcode] = url;
        await saveLinks(links);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, shortcode }));
      } catch {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Invalid data format");
      }
    });
    return;
  }

  // Handle redirection
  if (req.method === "GET") {
    const code = req.url.slice(1);
    const links = await loadLinks();

    if (links[code]) {
      res.writeHead(302, { Location: links[code] });
      return res.end();
    }
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("404 Not Found");
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
