import {generateId, getDeviceAndBrowser, generateAnimalName, getQRCodeSVG, getAvatarForName} from './utils.js';
import { state, showToast } from './ui.js';
import { connectWebSocket, sendSignaling } from './websocket.js';
import { initiateTransfer } from './transfer.js';

let appConfig = {};

async function init() {
    const res = await fetch('/api/config');
    appConfig = await res.json();
    
    document.title = appConfig.siteTitle;
    document.getElementById('app-title').textContent = appConfig.appName;

    if (!localStorage.getItem('deviceId')) localStorage.setItem('deviceId', generateId());
    if (!localStorage.getItem('nickname')) localStorage.setItem('nickname', generateAnimalName());

    state.myId = localStorage.getItem('deviceId');
    const { device, browser } = getDeviceAndBrowser();
    state.device = device;
    state.browser = browser;

    document.getElementById('my-name').textContent = localStorage.getItem('nickname') + ' ' + getAvatarForName(localStorage.getItem('nickname'));

    // Request notifications
    if (window.Notification && Notification.permission === "default") {
        Notification.requestPermission();
    }

    connectWebSocket(appConfig);
    setupEventListeners();
    setupPWA();
}

function setupEventListeners() {
    window.handleUserClick = (peerId) => {
        if (state.pendingSelection) {
            // It's a text transfer
            const blob = new Blob([state.pendingSelection], { type: 'text/plain' });
            blob.name = `Message_${Date.now()}.clipboard`;
            initiateTransfer(peerId, blob);
            state.pendingSelection = null;
            showToast('Sending text...');
        } else {
            // Open file picker
            const fi = document.getElementById('file-input');
            fi.onchange = (e) => {
                Array.from(e.target.files).forEach(f => initiateTransfer(peerId, f));
                fi.value = '';
            };
            fi.click();
        }
    };

    // Text transfer UI
    document.getElementById('btn-share-text').onclick = () => {
        document.getElementById('modal-backdrop').classList.remove('hidden');
        document.getElementById('modal-text').classList.remove('hidden');
    };
    document.getElementById('btn-cancel-text').onclick = () => {
        document.getElementById('modal-backdrop').classList.add('hidden');
        document.getElementById('modal-text').classList.add('hidden');
        document.getElementById('text-input').value = '';
    };
    document.getElementById('btn-send-text').onclick = () => {
        const text = document.getElementById('text-input').value;
        if (!text) return;
        state.pendingSelection = text;
        document.getElementById('modal-backdrop').classList.add('hidden');
        document.getElementById('modal-text').classList.add('hidden');
        document.getElementById('text-input').value = '';
        showToast('Select a user to send text');
    };

    // QR Code
    document.getElementById('btn-qr').onclick = () => {
        document.getElementById('modal-backdrop').classList.remove('hidden');
        document.getElementById('modal-qr').classList.remove('hidden');
        document.getElementById('qr-container').innerHTML = getQRCodeSVG(window.location.href);
    };
    document.getElementById('btn-close-qr').onclick = () => {
        document.getElementById('modal-backdrop').classList.add('hidden');
        document.getElementById('modal-qr').classList.add('hidden');
    };

    // Transfers overlay
    document.getElementById('btn-close-transfers').onclick = () => {
        document.getElementById('transfer-overlay').classList.add('hidden');
    };

    // Drag & Drop
    const body = document.body;
    body.addEventListener('dragover', e => { e.preventDefault(); body.classList.add('drag-active'); });
    body.addEventListener('dragleave', e => { e.preventDefault(); body.classList.remove('drag-active'); });
    body.addEventListener('drop', e => {
        e.preventDefault();
        body.classList.remove('drag-active');
        
        // Find dropped peer if any
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const card = el.closest('.user-card');
        if (card) {
            const name = card.querySelector('.user-name').textContent;
            const peer = state.peers.find(p => p.name === name);
            if (peer && e.dataTransfer.files.length > 0) {
                Array.from(e.dataTransfer.files).forEach(f => initiateTransfer(peer.id, f));
            }
        } else {
            showToast('Drop files directly onto a user card');
        }
    });

    // Paste
    document.addEventListener('paste', e => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                blob.name = `Pasted_Image_${Date.now()}.png`;
                showToast('Image pasted! Select a user to send.');
                // Overwrite click behavior temporarily
                const origClick = window.handleUserClick;
                window.handleUserClick = (peerId) => {
                    initiateTransfer(peerId, blob);
                    window.handleUserClick = origClick; // reset
                };
            }
        }
    });

}

function setupPWA() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then(reg => {
            reg.update();
        });
    }
}

init();