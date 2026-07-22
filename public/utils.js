export function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function getDeviceAndBrowser() {
    const ua = navigator.userAgent;

    let browser = "Unknown";
    if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Edg")) browser = "Edge";
    else if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Safari")) browser = "Safari";

    let device = "Desktop";
    if (/Android/i.test(ua)) device = "Android";
    else if (/iPhone|iPad|iPod/i.test(ua)) device = "iOS";
    else if (/Windows/i.test(ua)) device = "Windows";
    else if (/Mac/i.test(ua)) device = "Mac";
    else if (/Linux/i.test(ua)) device = "Linux";

    return {device, browser};
}

/* -------------------------------------------------------------------------- */
/* Animals                                                                     */
/* -------------------------------------------------------------------------- */

const ADJECTIVES = [
    "Swift", "Brave", "Happy", "Lucky", "Quiet", "Gentle", "Wild", "Clever", "Bright", "Golden",
    "Silver", "Crimson", "Azure", "Emerald", "Shadow", "Storm", "Thunder", "Sunny", "Lunar", "Solar",
    "Neon", "Rapid", "Royal", "Ancient", "Magic", "Frozen", "Crystal", "Cosmic", "Silent", "Mighty",
    "Tiny", "Curious", "Fearless", "Playful", "Noble", "Calm", "Glowing", "Daring", "Friendly", "Epic"
];

const ANIMALS = [
    {name: "Panda", emoji: "🐼"},
    {name: "Fox", emoji: "🦊"},
    {name: "Wolf", emoji: "🐺"},
    {name: "Owl", emoji: "🦉"},
    {name: "Tiger", emoji: "🐯"},
    {name: "Bear", emoji: "🐻"},
    {name: "Lion", emoji: "🦁"},
    {name: "Seal", emoji: "🦭"},
    {name: "Koala", emoji: "🐨"},
    {name: "Otter", emoji: "🦦"},
    {name: "Hedgehog", emoji: "🦔"},
    {name: "Raccoon", emoji: "🦝"},
    {name: "Rabbit", emoji: "🐰"},
    {name: "Hamster", emoji: "🐹"},
    {name: "Mouse", emoji: "🐭"},
    {name: "Cat", emoji: "🐱"},
    {name: "Dog", emoji: "🐶"},
    {name: "Monkey", emoji: "🐵"},
    {name: "Frog", emoji: "🐸"},
    {name: "Penguin", emoji: "🐧"},
    {name: "Chicken", emoji: "🐔"},
    {name: "Duck", emoji: "🦆"},
    {name: "Eagle", emoji: "🦅"},
    {name: "Parrot", emoji: "🦜"},
    {name: "Peacock", emoji: "🦚"},
    {name: "Flamingo", emoji: "🦩"},
    {name: "Swan", emoji: "🦢"},
    {name: "Goose", emoji: "🪿"},
    {name: "Turtle", emoji: "🐢"},
    {name: "Crocodile", emoji: "🐊"},
    {name: "Snake", emoji: "🐍"},
    {name: "Lizard", emoji: "🦎"},
    {name: "Octopus", emoji: "🐙"},
    {name: "Crab", emoji: "🦀"},
    {name: "Lobster", emoji: "🦞"},
    {name: "Shrimp", emoji: "🦐"},
    {name: "Fish", emoji: "🐠"},
    {name: "Blowfish", emoji: "🐡"},
    {name: "Dolphin", emoji: "🐬"},
    {name: "Whale", emoji: "🐋"},
    {name: "Shark", emoji: "🦈"},
    {name: "Elephant", emoji: "🐘"},
    {name: "Rhino", emoji: "🦏"},
    {name: "Hippo", emoji: "🦛"},
    {name: "Giraffe", emoji: "🦒"},
    {name: "Zebra", emoji: "🦓"},
    {name: "Deer", emoji: "🦌"},
    {name: "Moose", emoji: "🫎"},
    {name: "Bison", emoji: "🦬"},
    {name: "Camel", emoji: "🐫"},
    {name: "Llama", emoji: "🦙"},
    {name: "Goat", emoji: "🐐"},
    {name: "Sheep", emoji: "🐑"},
    {name: "Cow", emoji: "🐮"},
    {name: "Pig", emoji: "🐷"},
    {name: "Boar", emoji: "🐗"},
    {name: "Horse", emoji: "🐴"},
    {name: "Unicorn", emoji: "🦄"}
];

function random(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

export function generateAnimalName() {
    return `${random(ADJECTIVES)} ${random(ANIMALS).name}`;
}

export function getAvatarForName(name) {
    if (!name) return "🐾";

    const animal = name.trim().split(/\s+/).pop();

    const match = ANIMALS.find(a => a.name === animal);

    return match ? match.emoji : "🐾";
}

export function generateAvatar() {
    return random(ANIMALS).emoji;
}

/* -------------------------------------------------------------------------- */

export async function computeSHA256(blob) {
    try {
        const arrayBuffer = await blob.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
        return "File too large for memory hash";
    }
}

export function getQRCodeSVG(url) {
    return `
    <svg width="150" height="150" viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg">
        <rect width="150" height="150" fill="white"/>
        <text x="75" y="65" font-family="sans-serif" font-size="12" text-anchor="middle" fill="black">
            Scan to Join
        </text>
        <text x="75" y="85" font-family="sans-serif" font-size="10" text-anchor="middle" fill="#4F46E5">
            ${url}
        </text>
    </svg>`;
}