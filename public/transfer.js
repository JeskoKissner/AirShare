import { state, createTransferUI } from './ui.js';
import { sendSignaling } from './websocket.js';
import { formatBytes, computeSHA256 } from './utils.js';
import { playSound } from './sounds/audio.js';

const CHUNK_SIZE = 64 * 1024; // 64 KB

export function initiateTransfer(peerId, file) {
    const fileId = crypto.randomUUID();

    const ui = createTransferUI(fileId, file, file.type, 'out',
        () => cancelTransfer(fileId, peerId),
        () => {}
    );

    state.transfers[fileId] = {
        id: fileId, file, peerId, ui, cancelled: false
    };

    sendSignaling({
        type: 'file-request',
        to: peerId,
        file: { id: fileId, name: file.name, size: file.size, type: file.type }
    });
}

function cancelTransfer(fileId, peerId) {
    const t = state.transfers[fileId];
    if (t) {
        t.cancelled = true;
        t.ui.error('Cancelled');
        sendSignaling({ type: 'file-cancel', to: peerId, fileId });
    }
}

export async function startSendingFile(fileId) {
    const t = state.transfers[fileId];
    if (!t) return;

    const file = t.file;
    let offset = 0;
    const reader = new FileReader();
    let lastTime = Date.now();
    let bytesSinceLast = 0;

    const readNextSlice = () => {
        if (t.cancelled) return;
        const slice = file.slice(offset, offset + CHUNK_SIZE);
        reader.readAsArrayBuffer(slice);
    };

    reader.onload = async (e) => {
        if (t.cancelled) return;
        const buffer = e.target.result;

        // Convert ArrayBuffer to Base64 for safe JSON WebSocket transport
        const base64Chunk = btoa(String.fromCharCode(...new Uint8Array(buffer)));

        sendSignaling({
            type: 'file-chunk',
            to: t.peerId,
            fileId: fileId,
            chunk: base64Chunk
        });

        offset += buffer.byteLength;
        bytesSinceLast += buffer.byteLength;

        const now = Date.now();
        if (now - lastTime > 400) {
            const speed = (bytesSinceLast / ((now - lastTime) / 1000));
            t.ui.updateProgress(offset, file.size, formatBytes(speed));
            bytesSinceLast = 0;
            lastTime = now;
        }

        if (offset < file.size) {
            // Small throttle to prevent flooding socket buffer
            setTimeout(readNextSlice, 5);
        } else {
            t.ui.updateProgress(file.size, file.size, '0 B');
            t.ui.complete();
            playSound('success');
        }
    };

    readNextSlice();
}

export function handleIncomingChunk(msg) {
    const t = state.transfers[msg.fileId];
    if (!t || t.cancelled) return;

    // Convert Base64 back to binary array buffer
    const binaryString = atob(msg.chunk);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    t.receivedChunks.push(bytes.buffer);
    t.receivedSize += bytes.byteLength;

    const pct = Math.floor((t.receivedSize / t.file.size) * 100);
    t.ui.updateProgress(t.receivedSize, t.file.size, 'Relaying...');

    if (t.receivedSize >= t.file.size) {
        finalizeTransfer(t);
    }
}

export function handleTransferControl(msg) {
    if (msg.type === 'file-accept') {
        startSendingFile(msg.fileId);
    }
    if (msg.type === 'file-reject') {
        if (state.transfers[msg.fileId]) state.transfers[msg.fileId].ui.error('Declined');
    }
    if (msg.type === 'file-cancel') {
        if (state.transfers[msg.fileId]) {
            state.transfers[msg.fileId].cancelled = true;
            state.transfers[msg.fileId].ui.error('Cancelled by peer');
        }
    }
}

async function finalizeTransfer(t) {
    const blob = new Blob(t.receivedChunks, { type: t.file.type });
    t.ui.updateProgress(t.file.size, t.file.size, 'Verifying...');

    const hash = await computeSHA256(blob);
    t.ui.complete(`Hash: ${hash.substring(0, 8)}...`);
    playSound('success');

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = t.file.name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}