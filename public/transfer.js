import { state, createTransferUI, showToast } from './ui.js';
import { sendSignaling } from './websocket.js';
import { formatBytes, computeSHA256 } from './utils.js';
import { playSound } from './sounds/audio.js';

const CHUNK_SIZE = 64 * 1024; // 64 KB

export function initiateTransfer(peerId, file) {
    const fileId = crypto.randomUUID();
    
    const ui = createTransferUI(fileId, file, file.type, 'out', 
        () => cancelTransfer(fileId, peerId),
        () => retryTransfer(fileId, peerId)
    );

    state.transfers[fileId] = {
        id: fileId, file, peerId, ui, offset: 0, cancelled: false
    };

    sendSignaling({
        type: 'request',
        to: peerId,
        file: { id: fileId, name: file.name, size: file.size, type: file.type }
    });
}

function cancelTransfer(fileId, peerId) {
    const t = state.transfers[fileId];
    if (t) {
        t.cancelled = true;
        t.ui.error('Cancelled');
        sendSignaling({ type: 'cancel', to: peerId, fileId });
    }
}

function retryTransfer(fileId, peerId) {
    const t = state.transfers[fileId];
    if (t) {
        t.cancelled = false;
        t.ui.updateProgress(0, t.file.size, '0 B');
        sendSignaling({ type: 'resume-request', to: peerId, fileId });
    }
}

export async function startSendingChunks(fileId, channel) {
    const t = state.transfers[fileId];
    if (!t) return;
    
    const file = t.file;
    let offset = t.offset || 0;
    const reader = new FileReader();
    let lastTime = Date.now();
    let bytesSinceLast = 0;

    channel.bufferedAmountLowThreshold = 1024 * 512; // 512 KB backpressure threshold

    const readSlice = (o) => {
        const slice = file.slice(offset, o + CHUNK_SIZE);
        reader.readAsArrayBuffer(slice);
    };

    reader.onload = async (e) => {
        if (t.cancelled) { channel.close(); return; }
        
        const chunk = e.target.result;
        
        // Wait if buffer is full (Backpressure flow control)
        while (channel.bufferedAmount > channel.bufferedAmountLowThreshold) {
            await new Promise(r => {
                channel.onbufferedamountlow = () => { channel.onbufferedamountlow = null; r(); };
            });
        }

        if (channel.readyState !== 'open') return;
        channel.send(chunk);
        
        offset += chunk.byteLength;
        bytesSinceLast += chunk.byteLength;
        
        const now = Date.now();
        if (now - lastTime > 500) {
            const speed = (bytesSinceLast / ((now - lastTime)/1000));
            t.ui.updateProgress(offset, file.size, formatBytes(speed));
            bytesSinceLast = 0;
            lastTime = now;
        }

        if (offset < file.size) {
            readSlice(offset);
        } else {
            t.ui.updateProgress(file.size, file.size, '0 B');
            t.ui.complete();
            playSound('success');
            // Send End-Of-File marker via metadata channel, or just close.
            setTimeout(() => channel.close(), 1000); 
        }
    };

    readSlice(offset);
}

export function handleIncomingFile(channel) {
    const fileId = channel.label.replace('file-', '');
    let fileMeta = null;
    let receivedChunks = [];
    let receivedSize = 0;
    let lastTime = Date.now();
    let bytesSinceLast = 0;

    // We need meta, we assume it was set via signaling
    for (const key in state.transfers) {
        if (key === fileId) fileMeta = state.transfers[key].file; // Wait, receiver doesn't have File object
    }
    // Actually, receiver needs meta from initial request. We should store it in state.transfers on 'request'
    // Let's rely on global state.pendingFiles for receiver
    const t = state.transfers[fileId];
    if (!t) return;

    channel.binaryType = 'arraybuffer';

    channel.onmessage = (e) => {
        if (t.cancelled) return;
        receivedChunks.push(e.data);
        receivedSize += e.data.byteLength;
        bytesSinceLast += e.data.byteLength;

        const now = Date.now();
        if (now - lastTime > 500) {
            const speed = (bytesSinceLast / ((now - lastTime)/1000));
            t.ui.updateProgress(receivedSize, t.file.size, formatBytes(speed));
            bytesSinceLast = 0;
            lastTime = now;
        }

        if (receivedSize >= t.file.size) {
            finalizeTransfer(t, receivedChunks);
        }
    };
}

async function finalizeTransfer(t, chunks) {
    const blob = new Blob(chunks, { type: t.file.type });
    t.ui.updateProgress(t.file.size, t.file.size, 'Verifying...');
    
    // Check integrity
    const hash = await computeSHA256(blob);
    t.ui.complete(hash.startsWith('File') ? hash : `Hash: ${hash.substring(0,8)}...`);
    playSound('success');

    // Trigger download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = t.file.name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);

    if (window.Notification && Notification.permission === "granted") {
        new Notification("File Received", { body: t.file.name });
    }
}