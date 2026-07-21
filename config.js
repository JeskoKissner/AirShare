import dotenv from 'dotenv';
dotenv.config();

export const config = {
    port: process.env.PORT || 3000,
    appName: process.env.APP_NAME || 'AirShare',
    siteTitle: process.env.SITE_TITLE || 'AirShare - Fast P2P Transfers',
    logoUrl: process.env.LOGO_URL || '/favicon.svg',
    primaryColor: process.env.PRIMARY_COLOR || '#4F46E5',
    backgroundColor: process.env.BACKGROUND_COLOR || '#0F172A',
    turnUrl: process.env.TURN_URL || '',
    turnUsername: process.env.TURN_USERNAME || '',
    turnPassword: process.env.TURN_PASSWORD || '',
    stunServers: process.env.STUN_SERVERS ? process.env.STUN_SERVERS.split(',') : ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'],
    logLevel: process.env.LOG_LEVEL || 'info',
};