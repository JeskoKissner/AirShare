import { formatBytes, getAvatarForName } from './utils.js';

export const state = {
    myId: null,
    peers: [],
    transfers: {},
    pendingSelection: null // Text to send
};

const userGrid = document.getElementById('user-grid');
const userCount = document.getElementById('user-count');
const transferOverlay = document.getElementById('transfer-overlay');
const transferList = document.getElementById('transfer-list');
const toastContainer = document.getElementById('toast-container');

export function renderUsers() {
    userGrid.innerHTML = '';
    const otherPeers = state.peers.filter(p => p.id !== state.myId);
    userCount.textContent = otherPeers.length;

    if (otherPeers.length === 0) {
        userGrid.innerHTML = '<p style="grid-column: 1/-1; text-align:center; color: var(--text-muted)">No other users online. Open this page on another device.</p>';
        return;
    }

    otherPeers.forEach(peer => {
        const card = document.createElement('div');
        card.className = 'user-card';
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `Send to ${peer.name}`);
        card.tabIndex = 0;
        
        card.innerHTML = `
            <div class="user-avatar">${getAvatarForName(peer.name)}</div>
            <div class="user-name">${peer.name}</div>
            <div class="user-device">${peer.device} • ${peer.browser}</div>
        `;
        
        card.onclick = () => window.handleUserClick(peer.id);
        userGrid.appendChild(card);
    });
}

export function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

export function createTransferUI(transferId, file, type, direction, onCancel, onRetry) {
    transferOverlay.classList.remove('hidden');
    
    const el = document.createElement('div');
    el.className = 'transfer-item';
    el.id = `t-${transferId}`;
    
    el.innerHTML = `
        <div class="transfer-info">
            <span class="filename" title="${file.name}">${file.name.substring(0,20)}${file.name.length>20?'...':''}</span>
            <span class="status-text">Pending...</span>
        </div>
        <div class="progress-bar"><div class="progress-fill" id="pf-${transferId}"></div></div>
        <div class="transfer-meta">
            <span id="p-${transferId}">0%</span>
            <span id="s-${transferId}">${formatBytes(file.size)}</span>
        </div>
        <div class="transfer-controls" id="tc-${transferId}">
            <button class="btn-cancel">Cancel</button>
        </div>
    `;

    transferList.appendChild(el);
    el.querySelector('.btn-cancel').onclick = () => onCancel(transferId);
    
    return {
        updateProgress: (received, total, speed) => {
            const pct = Math.floor((received / total) * 100);
            document.getElementById(`pf-${transferId}`).style.width = `${pct}%`;
            document.getElementById(`p-${transferId}`).textContent = `${pct}% (${speed}/s)`;
            el.querySelector('.status-text').textContent = direction === 'in' ? 'Receiving...' : 'Sending...';
        },
        complete: (hashMsg) => {
            document.getElementById(`pf-${transferId}`).style.width = `100%`;
            document.getElementById(`pf-${transferId}`).style.background = 'var(--success)';
            el.querySelector('.status-text').textContent = hashMsg ? `Done ✓ ${hashMsg}` : 'Done ✓';
            const tc = document.getElementById(`tc-${transferId}`);
            if (tc) tc.innerHTML = '';
        },
        error: (msg) => {
            document.getElementById(`pf-${transferId}`).style.background = 'var(--danger)';
            el.querySelector('.status-text').textContent = msg;
            const tc = document.getElementById(`tc-${transferId}`);
            if(tc) {
                tc.innerHTML = `<button class="btn-retry">Retry</button>`;
                tc.querySelector('.btn-retry').onclick = () => onRetry(transferId);
            }
        }
    };
}