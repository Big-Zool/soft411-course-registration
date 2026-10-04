// A tiny HTTP server using only Node's built-in modules (no framework),
// so the system under test stays small enough to read in one sitting.

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const reg = require("./registration");

const PORT = Number(process.env.PORT) || 3000;
const ALLOW_TEST_RESET = process.env.ALLOW_TEST_RESET === "true";
const PUBLIC_DIR = path.join(__dirname, "public");

const SECURITY_HEADERS = {
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
};

function send(res, status, body, type = "application/json") {
  res.writeHead(status, { "Content-Type": type, ...SECURITY_HEADERS });
  res.end(type === "application/json" ? JSON.stringify(body) : body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 10_000) reject(new reg.RegistrationError(413, "BODY_TOO_LARGE", "Request body is too large."));
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new reg.RegistrationError(400, "INVALID_JSON", "Request body must be valid JSON."));
      }
    });
  });
}

const STATIC_TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css" };

function serveStatic(req, res) {
  const file = req.url === "/" ? "index.html" : req.url.slice(1);
  const fullPath = path.join(PUBLIC_DIR, file);
  // Refuse anything that escapes the public folder (path traversal).
  if (!fullPath.startsWith(PUBLIC_DIR) || !fs.existsSync(fullPath)) {
    return send(res, 404, { error: "NOT_FOUND", message: "Not found." });
  }
  send(res, 200, fs.readFileSync(fullPath), STATIC_TYPES[path.extname(fullPath)] || "text/plain");
}

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const scheduleMatch = url.pathname.match(/^\/api\/students\/([^/]+)\/schedule$/);

  try {
    if (req.method === "GET" && url.pathname === "/api/health") return send(res, 200, { status: "ok" });
    if (req.method === "GET" && url.pathname === "/api/courses") return send(res, 200, reg.listCourses());
    if (req.method === "GET" && scheduleMatch) return send(res, 200, reg.schedule(scheduleMatch[1]));
    if (req.method === "POST" && url.pathname === "/api/registrations") {
      const { studentId, courseCode } = await readJson(req);
      return send(res, 201, reg.register(studentId, courseCode));
    }
    if (req.method === "DELETE" && url.pathname === "/api/registrations") {
      const { studentId, courseCode } = await readJson(req);
      return send(res, 200, reg.drop(studentId, courseCode));
    }
    if (req.method === "POST" && url.pathname === "/api/test/reset" && ALLOW_TEST_RESET) {
      reg.reset();
      return send(res, 200, { status: "reset" });
    }
    if (req.method === "GET" && !url.pathname.startsWith("/api/")) return serveStatic(req, res);
    return send(res, 404, { error: "NOT_FOUND", message: "Not found." });
  } catch (err) {
    if (err instanceof reg.RegistrationError) return send(res, err.status, { error: err.code, message: err.message });
    console.error(err);
    return send(res, 500, { error: "INTERNAL", message: "Something went wrong." });
  }
}

http.createServer(handle).listen(PORT, () => {
  console.log(`Course registration running on http://localhost:${PORT}`);
});
