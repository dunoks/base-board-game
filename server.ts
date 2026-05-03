import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  interface Player {
    id: string;
    x: number;
    y: number;
    score: number;
    address?: string;
  }

  const players: Record<string, Player> = {};

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Send current players to the new connection
    socket.emit("current_players", players);

    socket.on("join_game", (playerData: Partial<Player>) => {
      players[socket.id] = {
        id: socket.id,
        x: playerData.x ?? 0,
        y: playerData.y ?? 0,
        score: playerData.score ?? 0,
        address: playerData.address
      };
      socket.broadcast.emit("player_joined", players[socket.id]);
    });

    socket.on("update_position", (pos: { x: number; y: number }) => {
      if (players[socket.id]) {
        players[socket.id].x = pos.x;
        players[socket.id].y = pos.y;
        socket.broadcast.emit("player_moved", {
          id: socket.id,
          x: pos.x,
          y: pos.y
        });
      }
    });

    socket.on("update_score", (score: number) => {
      if (players[socket.id]) {
        players[socket.id].score = score;
        socket.broadcast.emit("score_updated", {
          id: socket.id,
          score
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      delete players[socket.id];
      io.emit("player_left", socket.id);
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
