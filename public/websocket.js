import { state, renderUsers, createTransferUI } from './ui.js';
import { handleIncomingChunk, handleTransferControl } from './transfer.js';
import { playSound } from './sounds/audio.js';

let ws;
let reconnectTimer;

export function connectWebSocket() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}`);

    ws.onopen = () => {
        clearTimeout(reconnectTimer);
        document.querySelector('.status-dot').classList.add('green');

        ws.send(JSON.stringify({
            type: 'hello',
            peerId: state.myId,
            name: localStorage.getItem('nickname'),
            device: state.device,
            browser: state.browser
        }));
    };

    ws.onmessage = async (event) => {
        const msg = JSON.parse(event.data);

        if (msg.type === 'users') {
            state.peers = msg.users;
            renderUsers();
        } else if (msg.type === 'file-request') {
            playSound('notify');
            state.transfers[msg.file.id] = {
                id: msg.file.id,
                file: msg.file,
                peerId: msg.from,
                receivedChunks: [],
                receivedSize: 0,
                cancelled: false,
                ui: createTransferUI(msg.file.id, msg.file, msg.file.type, 'in',
                    () => sendSignaling({ type: 'file-cancel', to: msg.from, fileId: msg.file.id }),
                    () => {}
                )
            };

            document.getElementById('modal-backdrop').classList.remove('hidden');
            document.getElementById('modal-request').classList.remove('hidden');
            document.getElementById('request-info').textContent = `${state.peers.find(p=>p.id===msg.from)?.name || 'Unknown'} wants to send: ${msg.file.name}`;

            document.getElementById('btn-accept').onclick = () => {
                document.getElementById('modal-backdrop').classList.add('hidden');
                document.getElementById('modal-request').classList.add('hidden');
                sendSignaling({ type: 'file-accept', to: msg.from, fileId: msg.file.id });
            };
            document.getElementById('btn-decline').onclick = () => {
                document.getElementById('modal-backdrop').classList.add('hidden');
                document.getElementById('modal-request').classList.add('hidden');
                sendSignaling({ type: 'file-reject', to: msg.from, fileId: msg.file.id });
            };
        } else if (msg.type === 'file-chunk') {
            handleIncomingChunk(msg);
        } else {
            handleTransferControl(msg);
        }
    };

    ws.onclose = () => {
        document.querySelector('.status-dot').classList.remove('green');
        reconnectTimer = setTimeout(() => connectWebSocket(), 3000);
    };
}

export function sendSignaling(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
    }
}