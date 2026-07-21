import { state, renderUsers, showToast } from './ui.js';
import { handleSignalingMessage } from './webrtc.js';

let ws;
let reconnectTimer;

export function connectWebSocket(config) {
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
        } else {
            handleSignalingMessage(msg, config);
        }
    };

    ws.onclose = () => {
        document.querySelector('.status-dot').classList.remove('green');
        reconnectTimer = setTimeout(() => connectWebSocket(config), 3000);
    };
}

export function sendSignaling(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
    }
}