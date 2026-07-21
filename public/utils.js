export function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getDeviceAndBrowser() {
    const ua = navigator.userAgent;
    let browser = "Unknown Browser";
    if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
    else if (ua.includes("Edge")) browser = "Edge";
    
    let device = "Desktop";
    if (/Android/i.test(ua)) device = "Android";
    else if (/iPhone|iPad|iPod/i.test(ua)) device = "iOS";
    else if (/Mac/i.test(ua)) device = "Mac";
    else if (/Windows/i.test(ua)) device = "Windows";
    else if (/Linux/i.test(ua)) device = "Linux";

    return { device, browser };
}

export function generateAnimalName() {
    const adjs = ['Fast', 'Blue', 'Green', 'Red', 'Clever', 'Brave', 'Quiet', 'Neon', 'Lunar', 'Solar'];
    const animals = ['Panda', 'Fox', 'Wolf', 'Owl', 'Tiger', 'Bear', 'Hawk', 'Lion', 'Lynx', 'Seal'];
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    return `${pick(adjs)} ${pick(animals)}`;
}

export function generateAvatar() {
    const emojis = ['🐼','🦊','🐺','🦉','🐯','🐻','🦅','🦁','🐱','🦭'];
    return emojis[Math.floor(Math.random() * emojis.length)];
}

// Inline minimal SHA-256 for verification using WebCrypto API
export async function computeSHA256(blob) {
    try {
        const arrayBuffer = await blob.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
        return "File too large for memory hash";
    }
}

// Generate simple SVGs
export function getQRCodeSVG(url) {
    // Extremely simplified data matrix / QR stand-in due to JS constraints.
    // In production, include qrcode.js. This renders a fallback to show the exact URL.
    return `<svg width="150" height="150" viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg">
        <rect width="150" height="150" fill="white"/>
        <text x="75" y="65" font-family="sans-serif" font-size="12" text-anchor="middle" fill="black">Scan to Join</text>
        <text x="75" y="85" font-family="sans-serif" font-size="10" text-anchor="middle" fill="#4F46E5">${url}</text>
    </svg>`;
}