# AirShare

AirShare is a lightweight, self-hosted web application designed for fast, seamless file sharing between devices. Built with modern web technologies, it features a real-time peer discovery and WebSocket chunk-relay architecture that allows it to work effortlessly behind reverse proxies and Cloudflare Tunnels without requiring complex NAT traversal or a self-hosted TURN server.

---

## Key Features

*   **Zero Firewall Headaches:** By utilizing a high-throughput WebSocket relay system, file transfers bypass strict corporate firewalls, mobile 5G carrier restrictions, and symmetric NAT issues.
*   **Cloudflare Tunnel Ready:** Fully compatible with Cloudflare Zero Trust Tunnels. Handles SSL/TLS termination automatically at Cloudflare's edge.
*   **Dockerized Deployment:** Spin up the entire service locally or on a home server in seconds using Docker Compose.
*   **Drag & Drop UI:** Clean, responsive interface featuring live progress bars, transfer speeds, audio notifications, and multi-device discovery.
*   **Privacy First:** Files are streamed ephemerally through the relay server or connection without being permanently stored on disk.

---

## Architecture Overview

AirShare uses a WebSocket Relay model:
1. **Signaling & Discovery:** Devices connect to the Node.js backend via WebSockets, broadcasting their nickname, device type, and browser info to populate an active peer list.
2. **Chunked Relaying:** When a user initiates a transfer, the file is sliced into 64 KB chunks, converted to Base64, and streamed securely through the WebSocket server to the target device.
3. **No TURN Required:** Because traffic is routed through standard WebSocket connections, it flows smoothly through any HTTPS-capable tunnel or proxy (like Cloudflare) without needing raw UDP port-forwarding or third-party TURN servers.

---

## Getting Started

### Prerequisites
*   Docker and Docker Compose installed on your server or NAS.

### 1. Project Structure
Ensure your project directory contains the following files:
*   `server.js` (Express + WebSocket Relay backend)
*   `config.js` (Environment configuration)
*   `docker-compose.yml`
*   `public/` (Frontend assets: `index.html`, `app.js`, `websocket.js`, `transfer.js`, `ui.js`, `sw.js`, etc.)

### 2. Docker Compose Configuration
Create or update your `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  airshare:
    build:
      context: .
    container_name: airshare
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - APP_NAME=AirShare
      - SITE_TITLE=AirShare - Fast File Transfers
