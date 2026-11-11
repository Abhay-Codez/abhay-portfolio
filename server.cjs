/* Tiny zero-dependency static server for the SoBra clone.
   Listens on loopback only, for both localhost (IPv6) and 127.0.0.1 (IPv4). */
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".woff2": "font/woff2",
    ".json": "application/json; charset=utf-8",
};

const handler = (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let pathname = decodeURIComponent(url.pathname);

    if (pathname === "/health") {
        res.writeHead(200, { "content-type": "application/json; charset=utf-8" }).end(JSON.stringify({ ok: true }));
        return;
    }

    if (pathname.endsWith("/")) pathname += "index.html";
    const file = path.join(root, pathname);
    if (!file.startsWith(root)) {
        res.writeHead(403).end("Forbidden");
        return;
    }

    fs.readFile(file, (error, data) => {
        if (error) {
            res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not found: " + pathname);
            return;
        }
        res.writeHead(200, {
            "content-type": types[path.extname(file).toLowerCase()] || "application/octet-stream",
            "cache-control": "no-cache",
            "x-content-type-options": "nosniff",
        });
        res.end(data);
    });
};

const listen = (host, label, ipv6Only = false) => {
    const server = http.createServer(handler);
    server.on("error", (error) => {
        if (error.code === "EADDRINUSE") {
            console.error(`Port ${port} is already in use (${label}).`);
        } else {
            console.error(`Could not listen on ${host}:${port} (${label}):`, error.message);
        }
    });
    server.listen({ port, host, ipv6Only }, () => {
        console.log(`Listening on ${label}`);
    });
};

listen("127.0.0.1", `http://127.0.0.1:${port}/`);
listen("::1", `http://[::1]:${port}/`, true);
console.log(`SoBra clone running at http://localhost:${port}/`);
