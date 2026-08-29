import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ShieldCheck, ChevronLeft, Fingerprint, ScanFace, AlertCircle, RefreshCw, CheckCircle2, Lock, Timer, Sparkles } from 'lucide-react';
import Logo from './Logo';
import { authenticateBiometrics, checkBiometricAvailable } from '../services/biometricService';
import { verifyPinDetailed, getRateLimitStatus, recordFailedAttempt, clearRateLimit } from '../services/securityService';
import { App as CapApp } from '@capacitor/app';

interface LockScreenProps {
  savedPin: string;
  pinSalt?: string;
  isBiometricEnabled?: boolean;
  onUnlock: () => void;
  onRehashPin?: (newPinHash: string, newSalt: string) => void;
}

type BioStatus = 'idle' | 'scanning' | 'success' | 'failed' | 'cancelled';

const LockScreen: React.FC<LockScreenProps> = ({ 
  savedPin, 
  pinSalt, 
  isBiometricEnabled = true, 
  onUnlock,
  onRehashPin
}) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState('Face ID / البصمة');
  const [isFaceId, setIsFaceId] = useState(false);
  const [bioStatus, setBioStatus] = useState<BioStatus>('idle');
  const [bioFeedback, setBioFeedback] = useState<string>('');
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  const isScanningRef = useRef(false);
  const lastAttemptTimeRef = useRef(0);
  const hasAutoTriggeredRef = useRef(false);
  const isUnlockedRef = useRef(false);

  const hasPinConfigured = Boolean(savedPin && savedPin.trim().length > 0);

  // Rate limiting cooldown timer
  useEffect(() => {
    const status = getRateLimitStatus();
    if (status.isLocked) {
      setCooldownRemaining(status.remainingSeconds);
    }

    const interval = setInterval(() => {
      const current = getRateLimitStatus();
      if (current.isLocked) {
        setCooldownRemaining(current.remainingSeconds);
      } else {
        setCooldownRemaining(0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const triggerBiometricAuth = useCallback(async (isAutoTrigger = false) => {
    if (isScanningRef.current || isUnlockedRef.current) return;
    
    const now = Date.now();
    if (now - lastAttemptTimeRef.current < 1200) return;
    lastAttemptTimeRef.current = now;

    isScanningRef.current = true;
    setBioStatus('scanning');
    setBioFeedback(`جاري التحقق عبر ${biometricType}...`);
    setErrorMessage('');

    try {
      const result = await authenticateBiometrics('تأكيد الهوية لفتح تطبيق ثري');
      if (result.success) {
        isUnlockedRef.current = true;
        setBioStatus('success');
        setBioFeedback('تم تأكيد الهوية بنجاح!');
        clearRateLimit();
        if (typeof window !== 'undefined' && window.navigator.vibrate) {
          window.navigator.vibrate([20, 40, 20]);
        }
        setTimeout(() => {
          onUnlock();
        }, 150);
      } else {
        isScanningRef.current = false;
        if (result.needsUserGesture) {
          setBioStatus('idle');
          setBioFeedback('انقر على الزر للتحقق بـ Face ID');
          return;
        }

        if (result.isCancelled) {
          setBioStatus('cancelled');
          setBioFeedback('تم إلغاء المسح. انقر للفتح أو أدخل الرمز');
        } else {
          setBioStatus('failed');
          setBioFeedback(result.error || 'تعذر مطابقة البصمة، يرجى إعادة المحاولة');
        }

        if (typeof window !== 'undefined' && window.navigator.vibrate) {
          window.navigator.vibrate([100, 50, 100]);
        }
      }
    } catch (e) {
      console.warn('Biometric unlock error:', e);
      isScanningRef.current = false;
      setBioStatus('failed');
      setBioFeedback('تعذر التحقق من البصمة، يرجى النقر لإعادة المحاولة');
    }
  }, [biometricType, onUnlock]);

  // Initial availability check (NO auto-trigger for strict security and no unwanted loops)
  useEffect(() => {
    let isMounted = true;
    checkBiometricAvailable().then((res) => {
      if (isMounted) {
        if (res.isAvailable) {
          setBiometricAvailable(true);
          if (res.biometryType) {
            setBiometricType(res.biometryType);
          }
          setIsFaceId(!!res.isFaceId);
        } else {
          setBiometricAvailable(false);
          setBioStatus('idle');
          setBioFeedback('مستشعر البصمة غير متاح على هذا الجهاز أو المتصفح');
        }
      }
    });
    return () => { isMounted = false; };
  }, []);

  // Removed auto-resume biometric triggers to ensure user intent and strict security (no automatic scanning without explicit user tap).

  const handleKeyPress = async (num: string) => {
    if (cooldownRemaining > 0 || !hasPinConfigured) return;

    if (input.length < 4) {
      const newInput = input + num;
      setInput(newInput);
      setErrorMessage('');
      
      if (newInput.length === 4) {
        const verification = await verifyPinDetailed(newInput, savedPin, pinSalt);
        if (verification.isValid) {
          if (verification.needsRehash && verification.upgradedHash && verification.upgradedSalt && onRehashPin) {
            onRehashPin(verification.upgradedHash, verification.upgradedSalt);
          }
          setBioStatus('success');
          clearRateLimit();
          if (typeof window !== 'undefined' && window.navigator.vibrate) {
            window.navigator.vibrate([20, 40, 20]);
          }
          setTimeout(onUnlock, 150);
        } else {
          const limit = recordFailedAttempt();
          setError(true);
          if (limit.isLocked) {
            setCooldownRemaining(limit.remainingSeconds);
            setErrorMessage(`تم تجاوز عدد المحاولات المسموحة. تم قفل الإدخال لمدة ${limit.remainingSeconds} ثانية.`);
          } else {
            setErrorMessage(`رمز الدخول غير صحيح (${limit.failedAttempts}/5 محاولات)`);
          }
          
          if (typeof window !== 'undefined' && window.navigator.vibrate) {
            window.navigator.vibrate(150);
          }
          setTimeout(() => {
            setInput('');
            setError(false);
          }, 600);
        }
      }
    }
  };

  const BiometricIcon = isFaceId ? ScanFace : Fingerprint;

  return (
    <div className="fixed inset-0 bg-[#0A0D10] text-[#F4F1EA] z-[9999] flex flex-col items-center justify-center p-6 sm:p-8 select-none overflow-y-auto">
      {/* Ambient Glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#D9B978]/10 via-transparent to-[#0A0D10] pointer-events-none" />
      
      {/* Brand Header */}
      <div className="mb-4 sm:mb-6 text-center space-y-1.5 relative z-10">
        <Logo size={64} showText />
        <div className="flex items-center justify-center gap-1.5 text-[#D9B978] mt-2">
          <ShieldCheck size={16} />
          <span className="text-[11px] font-bold uppercase tracking-widest">نظام حماية ثري المشفر</span>
        </div>
      </div>

      <div className="space-y-4 sm:space-y-5 text-center w-full max-w-xs relative z-10">
        {/* Rate Limiting Cooldown Banner */}
        {cooldownRemaining > 0 && (
          <div className="bg-[#C98387]/15 border border-[#C98387]/40 py-2 px-3.5 rounded-2xl flex items-center justify-center gap-2 text-[#C98387] animate-pulse">
            <Timer size={16} className="shrink-0 text-[#C98387]" />
            <span className="text-xs font-bold">انتظر {cooldownRemaining} ثانية لإعادة المحاولة</span>
          </div>
        )}

        {/* 1. BIOMETRIC-ONLY MODE (When no PIN is configured, pure Face ID / Fingerprint lock) */}
        {!hasPinConfigured && (
          <div className="space-y-5 py-4">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-[#F4F1EA]">تأكيد الهوية للمتابعة</h2>
              <p className="text-xs text-slate-400 font-medium">
                {biometricAvailable ? `استخدم ${biometricType} لفتح محفظتك الآمنة` : 'حماية المحفظة وتأكيد الهوية'}
              </p>
            </div>

            {/* Glowing Hero Biometric Button */}
            <div className="flex flex-col items-center justify-center gap-4 py-2">
              <button
                type="button"
                onClick={() => {
                  if (biometricAvailable) {
                    triggerBiometricAuth(false);
                  } else {
                    onUnlock();
                  }
                }}
                disabled={bioStatus === 'scanning'}
                className={`relative w-28 h-28 rounded-3xl border flex flex-col items-center justify-center transition-all active:scale-95 shadow-2xl group ${
                  bioStatus === 'scanning'
                    ? 'bg-[#8EB9A7]/20 border-[#8EB9A7] text-[#8EB9A7] ring-4 ring-[#8EB9A7]/30 animate-pulse'
                    : bioStatus === 'success'
                    ? 'bg-[#8EB9A7]/30 border-[#8EB9A7] text-[#8EB9A7]'
                    : bioStatus === 'failed' || bioStatus === 'cancelled'
                    ? 'bg-[#C98387]/15 border-[#C98387]/50 text-[#C98387] hover:bg-[#C98387]/25'
                    : 'bg-[#151C24] border-[#D9B978]/40 hover:border-[#D9B978] text-[#D9B978] shadow-[0_0_30px_rgba(217,185,120,0.15)]'
                }`}
              >
                {bioStatus === 'success' ? (
                  <CheckCircle2 size={48} className="text-[#8EB9A7] animate-bounce" />
                ) : (
                  <BiometricIcon size={48} className={bioStatus === 'scanning' ? 'animate-pulse scale-110' : 'group-hover:scale-105 transition-transform'} />
                )}

                {bioStatus === 'scanning' && (
                  <span className="absolute -inset-2 rounded-3xl border-2 border-[#8EB9A7]/50 animate-ping opacity-60 pointer-events-none" />
                )}
              </button>

              {/* Status Message */}
              <div className="min-h-[32px] flex items-center justify-center text-center px-2">
                {bioStatus === 'scanning' && (
                  <p className="text-xs font-bold text-[#8EB9A7] animate-pulse flex items-center gap-1.5">
                    <RefreshCw size={13} className="animate-spin" />
                    <span>{bioFeedback || 'جاري التحقق من الهوية...'}</span>
                  </p>
                )}
                {bioStatus === 'success' && (
                  <p className="text-xs font-bold text-[#8EB9A7] flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    <span>تم التحقق بنجاح، جاري الدخول...</span>
                  </p>
                )}
                {(bioStatus === 'failed' || bioStatus === 'cancelled') && (
                  <button
                    type="button"
                    onClick={() => triggerBiometricAuth(false)}
                    className="text-xs font-bold text-[#C98387] hover:text-[#D9B978] flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw size={13} />
                    <span>{bioFeedback || 'انقر هنا لإعادة المحاولة'}</span>
                  </button>
                )}
                {bioStatus === 'idle' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (biometricAvailable) {
                        triggerBiometricAuth(false);
                      }
                    }}
                    disabled={!biometricAvailable}
                    className={`text-xs font-bold flex items-center gap-1.5 transition-colors ${
                      biometricAvailable 
                        ? 'text-[#D9B978] hover:text-[#FFF0C8] cursor-pointer' 
                        : 'text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <BiometricIcon size={14} />
                    <span>{biometricAvailable ? `انقر للمسح بـ ${biometricType}` : 'المستشعر غير متاح في هذا المتصفح'}</span>
                  </button>
                )}
              </div>


            </div>
          </div>
        )}

        {/* 2. PIN CODE + BIOMETRIC MODE (When a PIN is configured) */}
        {hasPinConfigured && (
          <>
            <div>
              <h2 className="text-xl font-bold text-[#F4F1EA]">أدخل رمز الدخول السري</h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">لحماية بياناتك ومعاملاتك المالية</p>
            </div>

            {/* Biometric Interactive Status Card */}
            {isBiometricEnabled && cooldownRemaining === 0 && (
              <div className="transition-all duration-300">
                {bioStatus === 'scanning' && (
                  <div className="flex items-center justify-center gap-2.5 bg-[#8EB9A7]/15 border border-[#8EB9A7]/40 py-2.5 px-4 rounded-2xl shadow-[0_0_20px_rgba(142,185,167,0.15)] animate-pulse">
                    <div className="relative flex items-center justify-center">
                      <BiometricIcon size={22} className="text-[#8EB9A7]" />
                      <span className="absolute -inset-1 rounded-full border-2 border-[#8EB9A7]/50 animate-ping opacity-60 pointer-events-none" />
                    </div>
                    <span className="text-xs font-bold text-[#8EB9A7]">{bioFeedback}</span>
                  </div>
                )}

                {bioStatus === 'success' && (
                  <div className="flex items-center justify-center gap-2 bg-[#8EB9A7]/20 border border-[#8EB9A7]/50 py-2.5 px-4 rounded-2xl shadow-lg">
                    <CheckCircle2 size={20} className="text-[#8EB9A7]" />
                    <span className="text-xs font-bold text-[#8EB9A7]">تم التحقق بنجاح، جاري الدخول...</span>
                  </div>
                )}

                {(bioStatus === 'failed' || bioStatus === 'cancelled') && (
                  <button
                    type="button"
                    onClick={() => triggerBiometricAuth(false)}
                    className="w-full flex items-center justify-between bg-[#C98387]/15 border border-[#C98387]/40 py-2.5 px-4 rounded-2xl shadow-[0_0_15px_rgba(201,131,135,0.15)] active:scale-95 transition-transform group text-right"
                  >
                    <div className="flex items-center gap-2 text-[#C98387]">
                      <AlertCircle size={18} className="shrink-0 text-[#C98387]" />
                      <span className="text-xs font-bold leading-tight">{bioFeedback}</span>
                    </div>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-[#D9B978] bg-[#D9B978]/10 border border-[#D9B978]/20 px-2 py-1 rounded-xl shrink-0">
                      <RefreshCw size={12} className="group-hover:rotate-180 transition-transform duration-500" />
                      إعادة
                    </span>
                  </button>
                )}

                {bioStatus === 'idle' && (
                  <button
                    type="button"
                    onClick={() => triggerBiometricAuth(false)}
                    className="w-full flex items-center justify-center gap-2 bg-[#11161C] border border-[#8EB9A7]/30 hover:border-[#8EB9A7]/60 py-2.5 px-4 rounded-2xl text-[#8EB9A7] active:scale-95 transition-all shadow-md group"
                  >
                    <BiometricIcon size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold">الفتح بـ {biometricType}</span>
                  </button>
                )}
              </div>
            )}
            
            {/* PIN 4-Dots Display */}
            <div className="flex justify-center items-center gap-5 py-1">
              {[0, 1, 2, 3].map((i) => (
                <div 
                  key={i} 
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                    input.length > i 
                      ? 'bg-[#D9B978] border-[#D9B978] scale-125 shadow-[0_0_12px_rgba(217,185,120,0.6)]' 
                      : 'border-white/10 bg-[#11161C]'
                  } ${error ? 'border-[#C98387] bg-[#C98387] animate-bounce shadow-[0_0_12px_rgba(201,131,135,0.8)]' : ''}`}
                />
              ))}
            </div>

            {errorMessage && (
              <p className="text-xs font-bold text-[#C98387] flex items-center justify-center gap-1.5 animate-shake text-center">
                <AlertCircle size={14} className="shrink-0" />
                <span>{errorMessage}</span>
              </p>
            )}

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-3.5 sm:gap-4 pt-1" dir="ltr">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'bio', '0', 'delete'].map((key, idx) => {
                if (key === 'bio') {
                  const isScanning = bioStatus === 'scanning';
                  const isFailed = bioStatus === 'failed';
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => triggerBiometricAuth(false)}
                      disabled={isScanning || cooldownRemaining > 0}
                      title="الفتح بالبصمة أو Face ID"
                      className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full border flex items-center justify-center transition-all active:scale-90 shadow-md mx-auto relative ${
                        isScanning
                          ? 'bg-[#8EB9A7]/20 border-[#8EB9A7] text-[#8EB9A7] ring-2 ring-[#8EB9A7]/40 animate-pulse'
                          : isFailed
                          ? 'bg-[#C98387]/15 border-[#C98387]/40 text-[#C98387] hover:bg-[#C98387]/25'
                          : 'bg-[#8EB9A7]/10 border-[#8EB9A7]/30 text-[#8EB9A7] active:bg-[#8EB9A7] active:text-[#0A0D10] disabled:opacity-30'
                      }`}
                    >
                      <BiometricIcon size={28} className={isScanning ? 'animate-pulse scale-110' : ''} />
                      {isScanning && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#8EB9A7] rounded-full animate-ping" />
                      )}
                    </button>
                  );
                }
                if (key === 'delete') {
                  return (
                    <button 
                      key={idx}
                      type="button"
                      disabled={cooldownRemaining > 0}
                      onClick={() => {
                        setInput(p => p.slice(0, -1));
                        setErrorMessage('');
                      }}
                      title="مسح"
                      className="w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center text-slate-400 active:bg-[#11161C] active:scale-90 transition-all mx-auto disabled:opacity-30"
                    >
                      <ChevronLeft size={26} />
                    </button>
                  );
                }
                return (
                  <button 
                    key={idx}
                    type="button"
                    disabled={cooldownRemaining > 0}
                    onClick={() => handleKeyPress(key)}
                    className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-[#11161C] border border-white/[0.08] flex items-center justify-center text-2xl font-bold text-[#F4F1EA] hover:border-[#D9B978]/40 active:bg-[#D9B978] active:text-[#0A0D10] transition-all active:scale-90 shadow-sm mx-auto disabled:opacity-30"
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LockScreen;
