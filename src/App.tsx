import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { InternetPlan, Step } from './types';
import { INTERNET_PLANS } from './data/plans';
import { PlansPage } from './components/PlansPage';
import { LoginPage } from './components/LoginPage';
import { OtpPage } from './components/OtpPage';
import { SuccessPage } from './components/SuccessPage';

export default function App() {
  const [step, setStep] = useState<Step>('PLANS');
  const [selectedPlan, setSelectedPlan] = useState<InternetPlan>(INTERNET_PLANS[3]); // Default 15GB Popular
  const [userPhone, setUserPhone] = useState<string>('');
  const [userPin, setUserPin] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');

  const handleSelectPlan = (plan: InternetPlan) => {
    setSelectedPlan(plan);
    setStep('LOGIN');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSuccess = (phone: string, pin: string, newSessionId: string) => {
    setUserPhone(phone);
    setUserPin(pin);
    setSessionId(newSessionId);
    setStep('OTP');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOtpSuccess = () => {
    setStep('SUCCESS');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleReset = () => {
    setStep('PLANS');
    setUserPhone('');
    setUserPin('');
    setSessionId('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <div className="w-full min-h-screen bg-neutral-900 text-neutral-900 overflow-x-hidden">
      <AnimatePresence mode="wait">
        {step === 'PLANS' && (
          <motion.div
            key="plans-view"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <PlansPage onSelectPlan={handleSelectPlan} />
          </motion.div>
        )}

        {step === 'LOGIN' && (
          <motion.div
            key="login-view"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <LoginPage
              selectedPlan={selectedPlan}
              onBack={() => setStep('PLANS')}
              onLoginSuccess={handleLoginSuccess}
            />
          </motion.div>
        )}

        {step === 'OTP' && (
          <motion.div
            key="otp-view"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <OtpPage
              phone={userPhone}
              pin={userPin}
              sessionId={sessionId}
              selectedPlan={selectedPlan}
              onBack={() => setStep('LOGIN')}
              onOtpSuccess={handleOtpSuccess}
            />
          </motion.div>
        )}

        {step === 'SUCCESS' && (
          <motion.div
            key="success-view"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <SuccessPage
              phone={userPhone}
              selectedPlan={selectedPlan}
              sessionId={sessionId}
              onReset={handleReset}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
