import { sendSignaling } from './websocket.js';
import { state, showToast, createTransferUI } from './ui.js';
import { handleIncomingFile, startSendingChunks } from './transfer.js';
import { playSound } from './sounds/audio.js';

const connections = new Map();

export async function createPeerConnection(peerId, config) {
    if (connections.has(peerId)) return connections.get(peerId);

    const pc = new RTCPeerConnection({
        iceServers: [
            ...config.stunServers.map(urls => ({ urls })),
            ...(config.turnUrl ? [{ urls: config.turnUrl, username: config.turnUsername, credential: config.turnPassword }] : [])
        ]
    });

    connections.set(peerId, pc);

    pc.onicecandidate = (e) => {
        if (e.candidate) {
            sendSignaling({ type: 'candidate', to: peerId, candidate: e.candidate });
        }
    };

    pc.ondatachannel = (e) => {
        const channel = e.channel;
        if (channel.label.startsWith('file-')) {
            handleIncomingFile(channel);
        }
    };

    pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            connections.delete(peerId);
        }
    };

    return pc;
}

export async function handleSignalingMessage(msg, config) {
    const from = msg.from;

    if (msg.type === 'request') {
        playSound('notify');

        // FIX: Store the incoming file metadata in state so the receiver knows what to download
        state.transfers[msg.file.id] = {
            id: msg.file.id,
            file: msg.file,
            peerId: from,
            offset: 0,
            receivedSize: 0,
            cancelled: false,
            ui: createTransferUI(msg.file.id, msg.file, msg.file.type, 'in',
                () => sendSignaling({ type: 'cancel', to: from, fileId: msg.file.id }),
                () => {}
            )
        };

        document.getElementById('modal-backdrop').classList.remove('hidden');
        document.getElementById('modal-request').classList.remove('hidden');
        document.getElementById('request-info').textContent = `${state.peers.find(p=>p.id===from)?.name || 'Unknown'} wants to send: ${msg.file.name}`;

        document.getElementById('btn-accept').onclick = () => {
            document.getElementById('modal-backdrop').classList.add('hidden');
            document.getElementById('modal-request').classList.add('hidden');
            sendSignaling({ type: 'accept', to: from, fileId: msg.file.id });
        };
        document.getElementById('btn-decline').onclick = () => {
            document.getElementById('modal-backdrop').classList.add('hidden');
            document.getElementById('modal-request').classList.add('hidden');
            sendSignaling({ type: 'reject', to: from, fileId: msg.file.id });
        };
    }

    if (msg.type === 'accept') {
        const pc = await createPeerConnection(from, config);
        const channel = pc.createDataChannel(`file-${msg.fileId}`, { ordered: true });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignaling({ type: 'offer', to: from, offer });

        channel.onopen = () => {
            startSendingChunks(msg.fileId, channel);
        };
    }

    if (msg.type === 'reject') {
        showToast('Transfer declined.');
        if (state.transfers[msg.fileId]) {
            state.transfers[msg.fileId].ui.error('Declined');
        }
    }

    if (msg.type === 'cancel') {
        if (state.transfers[msg.fileId]) {
            state.transfers[msg.fileId].ui.error('Cancelled by peer');
            state.transfers[msg.fileId].cancelled = true;
        }
    }

    if (msg.type === 'offer') {
        const pc = await createPeerConnection(from, config);
        await pc.setRemoteDescription(new RTCSessionDescription(msg.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignaling({ type: 'answer', to: from, answer });
    }

    if (msg.type === 'answer') {
        const pc = await createPeerConnection(from, config);
        await pc.setRemoteDescription(new RTCSessionDescription(msg.answer));
    }

    if (msg.type === 'candidate') {
        const pc = await createPeerConnection(from, config);
        await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
    }

    if (msg.type === 'resume-request') {
        const t = state.transfers[msg.fileId];
        if (t && t.receivedChunks) {
            sendSignaling({ type: 'resume-accept', to: from, fileId: msg.fileId, offset: t.receivedSize });
        }
    }

    if (msg.type === 'resume-accept') {
        const t = state.transfers[msg.fileId];
        if (t) {
            t.offset = msg.offset;
            const pc = await createPeerConnection(from, config);
            const channel = pc.createDataChannel(`file-${msg.fileId}`, { ordered: true });
            channel.onopen = () => startSendingChunks(msg.fileId, channel);
        }
    }
}