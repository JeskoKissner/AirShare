# AirShare - Self-Hosted P2P File Transfer

AirShare is a production-ready, AirDrop-like web application. It uses WebRTC DataChannels for fully peer-to-peer, encrypted file transfers. The server acts **only** as a signaling mechanism. Files are never sent through or stored on the server.

## Architecture & WebRTC Flow
1. **Signaling**: WebSockets connect to the Express server to announce presence and exchange connection info.
2. **Negotiation**: Peers exchange WebRTC `offer`, `answer`, and `ICE candidates` via the signaling server.
3. **Data Channel**: A direct P2P `RTCDataChannel` is established. 
4. **Chunking Protocol**: Files are split into 64KB chunks. The client implements flow control, tracking `bufferedAmount` to prevent memory overflow, ensuring stable transfers of files of any size.
5. **Integrity**: Received files are verified against a generated SHA-256 hash.

## Deployment with Docker Compose
1. Ensure Docker and Docker Compose are installed.
2. Run `docker-compose up -d`.
3. The app is available at `http://localhost:3000`.

## Reverse Proxy & HTTPS (Required)
WebRTC and Service Workers **require** HTTPS to function correctly (except on `localhost`).
You must place this app behind a reverse proxy handling SSL termination.

**Traefik Example**:
Add these labels to `docker-compose.yml`:
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.airshare.rule=Host(`share.example.com`)"
  - "traefik.http.routers.airshare.entrypoints=websecure"
  - "traefik.http.routers.airshare.tls.certresolver=myresolver"