'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  CheckCircle2,
  X,
  Smartphone,
  FileKey,
  Sparkles,
} from 'lucide-react';

export interface ResetPasswordWith2faModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
  isSuperAdminContext?: boolean;
  onSuccessRedirect?: () => void;
}

export function ResetPasswordWith2faModal({
  isOpen,
  onClose,
  defaultEmail = '',
  isSuperAdminContext = false,
  onSuccessRedirect,
}: ResetPasswordWith2faModalProps) {
  const [step, setStep] = useState<'INITIATE' | 'VERIFY' | 'SUCCESS'>('INITIATE');
  const [email, setEmail] = useState(defaultEmail);
  const [resetToken, setResetToken] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');

  // Step 2 Form State
  const [authMethod, setAuthMethod] = useState<'TOTP' | 'RECOVERY'>('TOTP');
  const [totpCode, setTotpCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your registered User ID (Email).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/2fa/reset-password/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate password reset.');
      }

      setResetToken(data.resetToken);
      setMaskedEmail(data.maskedEmail || email);
      setStep('VERIFY');
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Unable to connect to password reset server.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (authMethod === 'TOTP' && (!totpCode.trim() || totpCode.trim().length !== 6)) {
      setError('Please enter the 6-digit code from Google Authenticator.');
      return;
    }

    if (authMethod === 'RECOVERY' && !recoveryCode.trim()) {
      setError('Please enter your 8-character Backup Recovery Code.');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/2fa/reset-password/verify-and-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resetToken,
          code: authMethod === 'TOTP' ? totpCode.trim() : undefined,
          recoveryCode: authMethod === 'RECOVERY' ? recoveryCode.trim() : undefined,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Verification failed. Please check your code and try again.');
      }

      setSuccessMsg(data.message || 'Password reset successfully!');
      setStep('SUCCESS');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setError(null);
    setSuccessMsg(null);
    setStep('INITIATE');
    setTotpCode('');
    setRecoveryCode('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden text-slate-100"
      >
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleModalClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white">
              {isSuperAdminContext ? 'Master Admin 2FA Reset' : '2FA Self-Service Reset'}
            </h3>
            <p className="text-xs text-slate-400">
              Recover access via Google Authenticator or Backup Code
            </p>
          </div>
        </div>

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* STEP 1: Enter User ID / Email */}
        {step === 'INITIATE' && (
          <form onSubmit={handleInitiate} className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Enter your registered User ID (Email). The system will verify if Two-Factor Authentication (2FA) is configured for your account.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Registered Email / User ID
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@tuition.com"
                  required
                  className="w-full bg-slate-950/70 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-amber-600/25 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Account 2FA...</span>
                  </>
                ) : (
                  <>
                    <span>Continue to 2FA Verification</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Choose Verification Method & Set New Password */}
        {step === 'VERIFY' && (
          <form onSubmit={handleVerifyAndReset} className="space-y-4">
            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs flex items-center justify-between">
              <span className="text-slate-400">Account:</span>
              <span className="font-mono text-amber-400 font-semibold">{maskedEmail}</span>
            </div>

            {/* Auth Method Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setAuthMethod('TOTP')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  authMethod === 'TOTP'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Authenticator Code</span>
              </button>
              <button
                type="button"
                onClick={() => setAuthMethod('RECOVERY')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  authMethod === 'RECOVERY'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileKey className="w-3.5 h-3.5" />
                <span>Backup Code</span>
              </button>
            </div>

            {/* Verification Code Input */}
            {authMethod === 'TOTP' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Google Authenticator 6-Digit Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full bg-slate-950/70 border border-slate-700 rounded-xl py-2.5 px-4 text-center text-lg font-mono tracking-widest text-amber-400 placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  8-Character Backup Recovery Code
                </label>
                <input
                  type="text"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value.toUpperCase())}
                  placeholder="e.g. A1B2-C3D4"
                  className="w-full bg-slate-950/70 border border-slate-700 rounded-xl py-2.5 px-4 text-center text-sm font-mono tracking-widest text-rose-400 placeholder-slate-600 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition"
                />
              </div>
            )}

            {/* New Password Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                New Password (Min 8 Characters)
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full bg-slate-950/70 border border-slate-700 rounded-xl py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="w-full bg-slate-950/70 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep('INITIATE')}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Set New Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Success State */}
        {step === 'SUCCESS' && (
          <div className="text-center space-y-4 py-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h4 className="text-lg font-black text-white">Password Reset Complete!</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {successMsg || 'Your password has been successfully updated in the database. You can now log in using your new password and 2FA code.'}
            </p>

            <div className="pt-3">
              <button
                type="button"
                onClick={() => {
                  handleModalClose();
                  if (onSuccessRedirect) onSuccessRedirect();
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xl shadow-blue-600/25 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
