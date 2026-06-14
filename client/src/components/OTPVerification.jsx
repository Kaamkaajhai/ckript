import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mail, Shield, ArrowLeft, Loader } from 'lucide-react';
import api from '../services/api';

const DEFAULT_RESEND_COOLDOWN_SECONDS = 30;
const DEFAULT_OTP_EXPIRY_SECONDS = 300;
const RESEND_UNTIL_STORAGE_PREFIX = 'otp-resend-until:';

const toPositiveInteger = (value, fallbackValue) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallbackValue;
  }
  return parsed;
};

const formatDurationLabel = (seconds) => {
  const safeSeconds = toPositiveInteger(seconds, DEFAULT_OTP_EXPIRY_SECONDS);

  if (safeSeconds % 60 === 0) {
    const minutes = safeSeconds / 60;
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }

  return `${safeSeconds} second${safeSeconds === 1 ? '' : 's'}`;
};

const getResendStorageKey = (normalizedEmail) => {
  if (!normalizedEmail) return '';
  return `${RESEND_UNTIL_STORAGE_PREFIX}${normalizedEmail}`;
};

const getRemainingCooldownSeconds = (timestampMs) => {
  if (!Number.isFinite(timestampMs) || timestampMs <= Date.now()) {
    return 0;
  }

  return Math.max(0, Math.ceil((timestampMs - Date.now()) / 1000));
};

const OTPVerification = ({
  email,
  onSuccess,
  onBack,
  otpExpirySeconds = DEFAULT_OTP_EXPIRY_SECONDS,
  initialResendCooldownSeconds = DEFAULT_RESEND_COOLDOWN_SECONDS,
  startCooldownOnMount = false,
  darkBackground = false,
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const inputRefs = useRef([]);
  const cooldownInitializedForEmailRef = useRef('');

  const normalizedEmail = String(email || '').trim().toLowerCase();
  const resendStorageKey = getResendStorageKey(normalizedEmail);
  const resendCooldownSeconds = toPositiveInteger(
    initialResendCooldownSeconds,
    DEFAULT_RESEND_COOLDOWN_SECONDS
  );
  const otpValidityLabel = formatDurationLabel(otpExpirySeconds);

  const startResendCooldown = (seconds) => {
    const safeSeconds = toPositiveInteger(seconds, resendCooldownSeconds);
    setResendTimer(safeSeconds);

    if (typeof window !== 'undefined' && resendStorageKey) {
      window.localStorage.setItem(resendStorageKey, String(Date.now() + safeSeconds * 1000));
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !resendStorageKey) return;

    const storedUntil = Number(window.localStorage.getItem(resendStorageKey));
    const remaining = getRemainingCooldownSeconds(storedUntil);

    if (remaining > 0) {
      setResendTimer(remaining);
      return;
    }

    window.localStorage.removeItem(resendStorageKey);
  }, [resendStorageKey]);

  useEffect(() => {
    if (!startCooldownOnMount || !normalizedEmail) return;

    if (cooldownInitializedForEmailRef.current === normalizedEmail) return;
    cooldownInitializedForEmailRef.current = normalizedEmail;

    if (resendTimer <= 0) {
      startResendCooldown(resendCooldownSeconds);
    }
  }, [normalizedEmail, resendCooldownSeconds, resendTimer, startCooldownOnMount]);

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer <= 0) {
      if (typeof window !== 'undefined' && resendStorageKey) {
        window.localStorage.removeItem(resendStorageKey);
      }
      return;
    }

    const timer = window.setTimeout(() => {
      setResendTimer((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendTimer, resendStorageKey]);

  const handleChange = (index, value) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');
    setStatusMessage('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    pastedData.split('').forEach((char, index) => {
      if (index < 6) newOtp[index] = char;
    });
    setOtp(newOtp);

    // Focus last filled input or first empty
    const lastIndex = Math.min(pastedData.length, 5);
    inputRefs.current[lastIndex]?.focus();
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    if (!normalizedEmail) {
      setError('Missing email address. Go back and sign up again.');
      return;
    }

    setLoading(true);
    setError('');
    setStatusMessage('');

    try {
      const response = await api.post('/auth/verify-otp', {
        email: normalizedEmail,
        otp: otpString,
      });

      // Store user session in the same shape consumed by AuthContext.
      localStorage.setItem('user', JSON.stringify(response.data));

      // Call success callback
      onSuccess(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resending || resendTimer > 0) {
      return;
    }

    if (!normalizedEmail) {
      setError('Missing email address. Go back and sign up again.');
      return;
    }

    setResending(true);
    setError('');
    setStatusMessage('');

    try {
      const response = await api.post('/auth/resend-otp', { email: normalizedEmail });
      startResendCooldown(response.data?.resendCooldownSeconds);
      setOtp(['', '', '', '', '', '']);
      setStatusMessage('A new verification code has been sent.');
      inputRefs.current[0]?.focus();
    } catch (err) {
      const cooldownRemainingSeconds = Number(err.response?.data?.cooldownRemainingSeconds || 0);
      if (cooldownRemainingSeconds > 0) {
        startResendCooldown(cooldownRemainingSeconds);
      }

      setError(err.response?.data?.message || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center p-4 ${
        darkBackground
          ? "relative overflow-hidden bg-[#080e18]"
          : "bg-gradient-to-br from-blue-50 via-white to-purple-50"
      }`}
    >
      {darkBackground && (
        <>
          <div
            className="absolute inset-0 opacity-[0.035] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "28px 28px",
            }}
          />
          <div className="absolute top-0 left-0 w-[460px] h-[460px] bg-white/[0.03] rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-[360px] h-[360px] bg-white/[0.02] rounded-full blur-3xl translate-x-1/4 translate-y-1/4 pointer-events-none" />
        </>
      )}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
              <Mail className="text-white" size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Email</h2>
            <p className="text-gray-600 text-sm">
              We've sent a 6-digit code to<br />
              <span className="font-semibold text-gray-900">{email}</span>
            </p>
            <p className="text-xs text-gray-500 mt-2">Code expires in {otpValidityLabel}</p>
          </div>

          {/* OTP Input */}
          <div className="mb-6">
            <div className="flex justify-center gap-2 mb-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className={`w-12 h-14 bg-white text-center text-[30px] leading-none font-extrabold border-2 rounded-lg transition-all outline-none caret-blue-700 ${
                    digit
                      ? 'text-gray-900 border-blue-500 ring-1 ring-blue-100'
                      : 'text-gray-700 border-gray-400'
                  } focus:text-gray-900 focus:border-blue-600 focus:ring-2 focus:ring-blue-200`}
                  autoFocus={index === 0}
                />
              ))}
            </div>
            <p className="text-xs font-medium text-gray-600 text-center">Enter the 6-digit code</p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"
            >
              <p className="text-sm text-red-600 text-center">{error}</p>
            </motion.div>
          )}

          {statusMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg"
            >
              <p className="text-sm text-green-700 text-center">{statusMessage}</p>
            </motion.div>
          )}

          {/* Verify Button */}
          <button
            onClick={handleVerify}
            disabled={loading || otp.join('').length !== 6}
            className="w-full bg-blue-700 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4"
          >
            {loading ? (
              <>
                <Loader className="animate-spin" size={20} />
                Verifying...
              </>
            ) : (
              <>
                <Shield size={20} />
                Verify Email
              </>
            )}
          </button>

          {/* Resend Code */}
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Didn't receive the code?</p>
            {resendTimer > 0 ? (
              <p className="text-sm text-gray-500">
                Resend code in <span className="font-semibold">{resendTimer}s</span>
              </p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-sm text-blue-600 font-semibold hover:text-blue-700 disabled:opacity-50"
              >
                {resending ? 'Sending...' : 'Resend Code'}
              </button>
            )}
          </div>

          {/* Back Button */}
          {onBack && (
            <button
              onClick={onBack}
              className="w-full mt-6 text-gray-600 hover:text-gray-900 font-medium flex items-center justify-center gap-2 py-2"
            >
              <ArrowLeft size={16} />
              Back to Sign Up
            </button>
          )}
        </div>

        {/* Tips */}
        <div className="mt-6 text-center">
          <p className={`text-xs ${darkBackground ? "text-[#8ea0b5]" : "text-gray-500"}`}>
             Tip: Check your spam folder if you don't see the email
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default OTPVerification;
