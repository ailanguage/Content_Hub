import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import { jwtVerify } from "jose";

// ── Config ──
const PORT = parseInt(process.env.PORT || "3001", 10);
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production"
);
const INTERNAL_API_KEY = process.env.WS_INTERNAL_API_KEY || "ws-internal-dev-key";

// Allowed origins for CORS
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim());

// ── HTTP server ──
const httpServer = createServer((req, res) => {
  // Health check
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", connections: io.engine.clientsCount }));
    return;
  }

  // Internal emit endpoint — called by Next.js API routes to broadcast events
  if (req.url === "/emit" && req.method === "POST") {
    const apiKey = req.headers["x-api-key"];
    if (apiKey !== INTERNAL_API_KEY) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { room, event, data } = JSON.parse(body);

        if (!room || !event) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "room and event are required" }));
          return;
        }

        io.to(room).emit(event, data);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

// ── Socket.io server ──
const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
  // Optimize for real-time messaging
  pingTimeout: 60000,
  pingInterval: 25000,
});

// ── JWT Authentication middleware ──
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication required"));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: "content-creator-hub",
    });
    // Attach user data to socket
    socket.data.userId = payload.userId as string;
    socket.data.role = payload.role as string;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

// ── Connection handling ──
io.on("connection", (socket) => {
  const { userId, role } = socket.data;
  console.log(`[ws] Connected: ${userId} (${role})`);

  // Auto-join user's personal notification room
  socket.join(`user:${userId}`);

  // Join a channel room
  socket.on("channel:join", (channelSlug: string) => {
    socket.join(`channel:${channelSlug}`);
    console.log(`[ws] ${userId} joined channel:${channelSlug}`);
  });

  // Leave a channel room
  socket.on("channel:leave", (channelSlug: string) => {
    socket.leave(`channel:${channelSlug}`);
    console.log(`[ws] ${userId} left channel:${channelSlug}`);
  });

  socket.on("disconnect", (reason) => {
    console.log(`[ws] Disconnected: ${userId} (${reason})`);
  });
});

// ── Start ──
httpServer.listen(PORT, () => {
  console.log(`[ws] WebSocket server running on port ${PORT}`);
  console.log(`[ws] Allowed origins: ${ALLOWED_ORIGINS.join(", ")}`);
});
