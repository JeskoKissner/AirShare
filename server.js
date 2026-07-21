import express from 'express';
import { WebSocketServer } from 'ws';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Provide client config
app.get('/api/config', (req, res) => {
    res.json({
        appName: config.appName,
        siteTitle: config.siteTitle,
        stunServers: config.stunServers,
        turnUrl: config.turnUrl,
        turnUsername: config.turnUsername,
        turnPassword: config.turnPassword
    });
});

app.use(express.static(path.join(__dirname, 'public')));

// Store connected peers
const peers = new Map();
// Rate limiting per socket
const rateLimits = new WeakMap();

function broadcastUsers() {
    const users = Array.from(peers.values()).map(p => p.info);
    const msg = JSON.stringify({ type: 'users', users });
    peers.forEach(peer => peer.ws.send(msg));
}

wss.on('connection', (ws) => {
    ws.isAlive = true;
    let peerId = null;
    rateLimits.set(ws, { count: 0, lastReset: Date.now() });

    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (message) => {
        // Rate limiting
        const rl = rateLimits.get(ws);
        if (Date.now() - rl.lastReset > 1000) { rl.count = 0; rl.lastReset = Date.now(); }
        rl.count++;
        if (rl.count > 50) return; // Drop if > 50 msgs/sec

        try {
            const data = JSON.parse(message);

            switch (data.type) {
                case 'hello':
                    peerId = data.peerId;
                    // Prevent duplicate IDs safely
                    if (peers.has(peerId)) {
                        peers.get(peerId).ws.terminate();
                    }
                    // Sanitize input
                    const cleanName = String(data.name).substring(0, 30);
                    const cleanDevice = String(data.device).substring(0, 30);
                    const cleanBrowser = String(data.browser).substring(0, 30);

                    peers.set(peerId, {
                        ws,
                        info: { id: peerId, name: cleanName, device: cleanDevice, browser: cleanBrowser }
                    });
                    broadcastUsers();
                    break;

                case 'offer':
                case 'answer':
                case 'candidate':
                case 'request':
                case 'accept':
                case 'reject':
                case 'cancel':
                case 'resume-request':
                case 'resume-accept':
                    if (data.to && peers.has(data.to)) {
                        data.from = peerId;
                        peers.get(data.to).ws.send(JSON.stringify(data));
                    }
                    break;

                default:
                    if (config.logLevel === 'debug') console.log('Unknown message type:', data.type);
            }
        } catch (err) {
            // Drop malformed packets
        }
    });

    ws.on('close', () => {
        if (peerId && peers.has(peerId)) {
            peers.delete(peerId);
            broadcastUsers();
        }
    });
});

// Heartbeat
const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on('close', () => clearInterval(interval));

server.listen(config.port, () => {
    console.log(`🚀 ${config.appName} Signaling Server running on port ${config.port}`);
});