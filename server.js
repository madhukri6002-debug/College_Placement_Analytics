/**
 * College Placement Analytics — Node.js Static Server
 * =====================================================
 * Serves the frontend files and exposes one API endpoint:
 *   GET /api/summary  →  returns reports/placement_summary.json
 *
 * Usage:
 *   node server.js
 *   Then open: http://localhost:3000
 *
 * No external npm packages needed — uses Node.js built-in modules only.
 */

"use strict";

const http = require("http");
const fs   = require("fs");
const path = require("path");

const PORT        = process.env.PORT || 3000;
const FRONTEND_DIR = path.join(__dirname, "frontend");
const SUMMARY_FILE = path.join(__dirname, "reports", "placement_summary.json");

// ── MIME type map ────────────────────────────────────────────────────────────
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css" : "text/css; charset=utf-8",
  ".js"  : "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico" : "image/x-icon",
  ".png" : "image/png",
  ".svg" : "image/svg+xml",
};

// ── Request handler ──────────────────────────────────────────────────────────
function requestHandler(req, res) {
  const url = req.url.split("?")[0]; // strip query strings

  // ── API endpoint: serve the placement summary JSON ──
  if (url === "/api/summary") {
    if (!fs.existsSync(SUMMARY_FILE)) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({
        error: "reports/placement_summary.json not found. " +
               "Run: py src/analyze.py"
      }));
    }
    const json = fs.readFileSync(SUMMARY_FILE, "utf-8");
    res.writeHead(200, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-cache"
    });
    return res.end(json);
  }

  // ── Static files from /frontend ──
  // Map "/" to "/index.html"
  const filePath = path.join(
    FRONTEND_DIR,
    url === "/" ? "index.html" : url
  );

  // Security: prevent path traversal outside frontend dir
  if (!filePath.startsWith(FRONTEND_DIR)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end(`404 Not Found: ${url}`);
      } else {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal Server Error");
      }
      return;
    }

    const ext  = path.extname(filePath);
    const mime = MIME[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  });
}

// ── Start server ─────────────────────────────────────────────────────────────
const server = http.createServer(requestHandler);

server.listen(PORT, () => {
  console.log("============================================");
  console.log("  College Placement Analytics — Server");
  console.log("============================================");
  console.log(`  Open in browser: http://localhost:${PORT}`);
  console.log("  Press Ctrl+C to stop.\n");
  console.log("  NOTE: Uses SAMPLE DATA only.");
  console.log("        Not real college placement records.");
  console.log("============================================\n");
});

server.on("error", err => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n  ERROR: Port ${PORT} is already in use.`);
    console.error(`  Try: set PORT=3001 && node server.js\n`);
  } else {
    console.error("  Server error:", err.message);
  }
  process.exit(1);
});
