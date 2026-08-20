'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Switch } from '@/components/ui/Switch';
import { copyToClipboard } from '@/lib/utils';
import {
  Settings,
  Save,
  CheckCircle2,
  Loader2,
  Building,
  ShieldCheck,
  KeyRound,
  UserCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  CreditCard,
  Upload,
  Image as ImageIcon,
  Trash2,
  Sparkles,
  QrCode,
  Download,
  Copy,
  Check,
  ShieldAlert,
  Smartphone,
} from 'lucide-react';
import { useBranding } from '@/components/DynamicBrandingProvider';

export default function SettingsPage() {
  const { updateBranding } = useBranding();
  // Organization Branding Form State
  const [formData, setFormData] = useState({
    instituteName: '',
    tagline: '',
    address: '',
    phone: '',
    whatsapp: '',
    email: '',
    logoUrl: '',
    receiptPrefix: 'RC',
    currencySymbol: '₹',
    defaultGraceDays: 0,
    upiId: '',
    upiPayeeName: '',
    upiEnabled: true,
    customQrUrl: '',
  });

  // Admin Profile & Security Form State
  const [adminData, setAdminData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // 2FA State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [setup2faData, setSetup2faData] = useState<{
    secret?: string;
    qrCodeDataUrl?: string;
    recoveryCodes?: string[];
  } | null>(null);
  const [totpInputCode, setTotpInputCode] = useState('');
  const [isSettingUp2fa, setIsSettingUp2fa] = useState(false);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisableModal, setShowDisableModal] = useState(false);

  // Status & Feedback States
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingInstitute, setIsSavingInstitute] = useState(false);
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);

  const [instituteSuccess, setInstituteSuccess] = useState<string | null>(null);
  const [instituteError, setInstituteError] = useState<string | null>(null);

  const [adminSuccess, setAdminSuccess] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

  const [twoFactorSuccess, setTwoFactorSuccess] = useState<string | null>(null);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [settingsRes, meRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/auth/me'),
        ]);

        const settingsJson = await settingsRes.json();
        const meJson = await meRes.json();

        if (settingsJson.success && settingsJson.data) {
          setFormData({
            instituteName: settingsJson.data.instituteName || '',
            tagline: settingsJson.data.tagline || '',
            address: settingsJson.data.address || '',
            phone: settingsJson.data.phone || '',
            whatsapp: settingsJson.data.whatsapp || '',
            email: settingsJson.data.email || '',
            logoUrl: settingsJson.data.logoUrl || '',
            receiptPrefix: settingsJson.data.receiptPrefix || 'RC',
            currencySymbol: settingsJson.data.currencySymbol || '₹',
            defaultGraceDays: settingsJson.data.defaultGraceDays ?? 0,
            upiId: settingsJson.data.upiId || '',
            upiPayeeName: settingsJson.data.upiPayeeName || settingsJson.data.instituteName || '',
            upiEnabled: settingsJson.data.upiEnabled ?? true,
            customQrUrl: settingsJson.data.customQrUrl || '',
          });
        }

        if (meJson.authenticated && meJson.user) {
          setAdminData((prev) => ({
            ...prev,
            name: meJson.user.name || '',
            email: meJson.user.email || '',
          }));
          setTwoFactorEnabled(!!meJson.user.has2fa);
        }
      } catch (err: any) {
        console.error('Failed to load settings data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const handleInstituteChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdminChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAdminData((prev) => ({ ...prev, [name]: value }));
  };

  // Image Upload Handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setInstituteError('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setInstituteError('Logo file size exceeds 2MB limit.');
      return;
    }

    setIsProcessingLogo(true);
    setInstituteError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFormData((prev) => ({ ...prev, logoUrl: base64 }));
      setIsProcessingLogo(false);
    };
    reader.onerror = () => {
      setInstituteError('Failed to read image file.');
      setIsProcessingLogo(false);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, logoUrl: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit Institute Branding Settings
  const handleSaveInstitute = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingInstitute(true);
    setInstituteSuccess(null);
    setInstituteError(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          defaultGraceDays: Number(formData.defaultGraceDays) || 0,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update organization settings');
      }

      updateBranding({
        instituteName: formData.instituteName,
        tagline: formData.tagline,
        logoUrl: formData.logoUrl,
        receiptPrefix: formData.receiptPrefix,
        currencySymbol: formData.currencySymbol,
      });

      setInstituteSuccess('Organization branding & mobile app sync saved successfully!');
      setTimeout(() => setInstituteSuccess(null), 4000);
    } catch (err: any) {
      setInstituteError(err.message || 'An error occurred while saving organization settings');
    } finally {
      setIsSavingInstitute(false);
    }
  };

  // Submit Admin Profile / Password
  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAdmin(true);
    setAdminSuccess(null);
    setAdminError(null);

    if (adminData.newPassword && adminData.newPassword !== adminData.confirmPassword) {
      setAdminError('New passwords do not match');
      setIsSavingAdmin(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: adminData.name,
          email: adminData.email,
          currentPassword: adminData.currentPassword || undefined,
          newPassword: adminData.newPassword || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update admin profile');
      }

      setAdminSuccess('Admin credentials updated successfully!');
      setAdminData((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      setTimeout(() => setAdminSuccess(null), 4000);
    } catch (err: any) {
      setAdminError(err.message || 'An error occurred while updating profile');
    } finally {
      setIsSavingAdmin(false);
    }
  };

  // Initiate 2FA Setup
  const handleStart2faSetup = async () => {
    setTwoFactorLoading(true);
    setTwoFactorError(null);
    setTwoFactorSuccess(null);

    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to initiate 2FA setup');

      setSetup2faData(json);
      setIsSettingUp2fa(true);
    } catch (err: any) {
      setTwoFactorError(err.message);
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // Confirm 2FA Code
  const handleConfirm2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpInputCode.trim() || totpInputCode.trim().length !== 6) {
      setTwoFactorError('Please enter a valid 6-digit code from Google Authenticator.');
      return;
    }

    setTwoFactorLoading(true);
    setTwoFactorError(null);

    try {
      const res = await fetch('/api/auth/2fa/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: totpInputCode.trim() }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Invalid 2FA code. Please try again.');

      setTwoFactorEnabled(true);
      setIsSettingUp2fa(false);
      setTwoFactorSuccess('Google Authenticator 2FA is now active for your account!');
      setTotpInputCode('');
    } catch (err: any) {
      setTwoFactorError(err.message);
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // Disable 2FA
  const handleDisable2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disablePassword) {
      setTwoFactorError('Current password is required to disable 2FA.');
      return;
    }

    setTwoFactorLoading(true);
    setTwoFactorError(null);

    try {
      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: disablePassword }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to disable 2FA');

      setTwoFactorEnabled(false);
      setShowDisableModal(false);
      setDisablePassword('');
      setTwoFactorSuccess('Two-Factor Authentication has been disabled.');
    } catch (err: any) {
      setTwoFactorError(err.message);
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const copySecret = () => {
    if (setup2faData?.secret) {
      copyToClipboard(setup2faData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const downloadRecoveryCodes = () => {
    if (setup2faData?.recoveryCodes) {
      const element = document.createElement('a');
      const file = new Blob([setup2faData.recoveryCodes.join('\n')], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `backup-recovery-codes-${adminData.name.toLowerCase().replace(/\s+/g, '-')}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm text-slate-500 font-medium">Loading organization configuration...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-blue-600" />
          <span>Organization Settings & Security</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Customize institute branding, dynamic PDF receipts, online UPI payments, and Google Authenticator 2FA.
        </p>
      </div>

      {/* Two-Factor Authentication (2FA) Security Card */}
      <Card className="border-indigo-100 bg-gradient-to-br from-white to-indigo-50/30 shadow-sm">
        <CardHeader className="border-b border-indigo-50/80 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <span>Two-Factor Authentication (Google Authenticator)</span>
            </CardTitle>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                twoFactorEnabled
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {twoFactorEnabled ? '2FA Enabled & Protected' : '2FA Disabled'}
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          {twoFactorSuccess && <Alert variant="success">{twoFactorSuccess}</Alert>}
          {twoFactorError && <Alert variant="danger">{twoFactorError}</Alert>}

          {!twoFactorEnabled && !isSettingUp2fa && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-indigo-50/50 border border-indigo-100">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-slate-900">
                  Protect your workspace with Google Authenticator (TOTP)
                </div>
                <div className="text-xs text-slate-500">
                  Adds an extra layer of security. You will be asked for a 6-digit verification code from your phone when signing in.
                </div>
              </div>
              <Button
                type="button"
                onClick={handleStart2faSetup}
                isLoading={twoFactorLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
              >
                <QrCode className="w-4 h-4 mr-2" />
                <span>Enable 2FA</span>
              </Button>
            </div>
          )}

          {/* 2FA Setup Flow */}
          {isSettingUp2fa && setup2faData && (
            <div className="p-5 rounded-2xl bg-white border border-indigo-200 shadow-sm space-y-5">
              <div className="text-sm font-bold text-slate-900">Step 1: Scan QR Code with Authenticator App</div>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {setup2faData.qrCodeDataUrl && (
                  <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={setup2faData.qrCodeDataUrl}
                      alt="TOTP QR Code"
                      className="w-44 h-44 rounded-lg"
                    />
                  </div>
                )}
                <div className="space-y-3 flex-1 text-xs text-slate-600">
                  <p>
                    1. Open <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong>, or <strong>Authy</strong> on your smartphone.
                  </p>
                  <p>2. Tap <strong>+</strong> and scan the QR code shown on the left.</p>
                  <p>
                    3. Or manually enter this secret key:
                  </p>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-100 border border-slate-200 font-mono text-slate-800 text-xs font-bold">
                    <span className="truncate">{setup2faData.secret}</span>
                    <button
                      type="button"
                      onClick={copySecret}
                      className="p-1 text-slate-500 hover:text-indigo-600 ml-auto shrink-0"
                    >
                      {copiedSecret ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Recovery Codes Box */}
              {setup2faData.recoveryCodes && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Step 2: Save Emergency Recovery Codes</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={downloadRecoveryCodes}
                      className="text-xs h-7 border-amber-300 text-amber-900 hover:bg-amber-100"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      <span>Download .txt</span>
                    </Button>
                  </div>
                  <p className="text-[11px] text-amber-700">
                    If you lose access to your authenticator app, each code below can be used once to access your workspace.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs font-bold text-amber-950">
                    {setup2faData.recoveryCodes.map((code, idx) => (
                      <div key={idx} className="p-1.5 bg-white/80 rounded border border-amber-200 text-center">
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Enter 6-digit confirmation code */}
              <form onSubmit={handleConfirm2fa} className="pt-2 border-t border-slate-100 space-y-3">
                <div className="text-sm font-bold text-slate-900">Step 3: Confirm 6-Digit Code</div>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <Input
                    type="text"
                    maxLength={6}
                    value={totpInputCode}
                    onChange={(e) => setTotpInputCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit code (e.g. 123456)"
                    className="max-w-xs font-mono tracking-widest text-center"
                    required
                  />
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      type="submit"
                      isLoading={twoFactorLoading}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      Verify & Activate 2FA
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsSettingUp2fa(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {twoFactorEnabled && (
            <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-100">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-8 h-8 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-sm font-bold text-emerald-900">
                    Two-Factor Authentication is Active
                  </div>
                  <div className="text-xs text-emerald-700">
                    Your account is securely protected with Google Authenticator TOTP verification on every login.
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDisableModal(true)}
                className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                Disable 2FA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disable 2FA Modal */}
      {showDisableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
              <ShieldAlert className="w-5 h-5" />
              <span>Disable Two-Factor Authentication</span>
            </div>
            <p className="text-xs text-slate-600">
              Disabling 2FA will reduce your account security. Please enter your account password to confirm.
            </p>
            <form onSubmit={handleDisable2fa} className="space-y-3">
              <Input
                type="password"
                placeholder="Enter current password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                required
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowDisableModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="danger" isLoading={twoFactorLoading}>
                  Confirm & Disable
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Organization Branding & Contact Settings Card */}
      <form onSubmit={handleSaveInstitute}>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-600" />
              <span>Organization Branding & PDF Customization</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {instituteSuccess && <Alert variant="success">{instituteSuccess}</Alert>}
            {instituteError && <Alert variant="danger">{instituteError}</Alert>}

            {/* Mobile App & APK Branding Synchronization Preview */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-inner">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Personalized Mobile App & Android Icon Sync</span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Live Auto-Sync
                      </span>
                    </h4>
                    <p className="text-xs text-slate-400">
                      When you change your Institute Name or upload a Logo, your individual mobile app icon and launcher title dynamically update.
                    </p>
                  </div>
                </div>
              </div>

              {/* Simulated Phone Screen Icon & Name Preview */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
                <div className="flex items-center gap-4">
                  {/* App Icon Container */}
                  <div className="relative group">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-pink-600 p-0.5 shadow-xl shadow-indigo-500/30 flex items-center justify-center overflow-hidden ring-2 ring-white/20">
                      {formData.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={formData.logoUrl}
                          alt="App Icon"
                          className="w-full h-full object-cover rounded-[14px] bg-slate-950"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-cyan-400 font-bold">
                          <Sparkles className="w-7 h-7" />
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-[10px] font-bold text-white flex items-center justify-center border-2 border-slate-900 shadow">
                      ✓
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                      Mobile App Name
                    </div>
                    <div className="text-base font-extrabold text-white tracking-tight truncate max-w-[280px]">
                      {formData.instituteName || 'Education Manager'}
                    </div>
                    <div className="text-xs text-indigo-300 font-medium truncate max-w-[280px]">
                      {formData.tagline || 'Education & Fee Management SaaS'}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
                  <a
                    href="/Education_Manager.apk"
                    download="Education_Manager.apk"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-500/20"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Education_Manager.apk</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        alert(
                          `📱 Personalized Mobile App Sync:\n\n1. When using the Android APK or Mobile Web, your app title automatically changes to "${formData.instituteName || 'Education Manager'}".\n2. To install this as an icon on your Android home screen: open this link in Chrome on your phone, tap the 3-dots menu (⋮), and tap "Add to Home screen" or "Install App".\n3. Your custom logo will appear on your phone's home screen!`
                        );
                      }
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 transition-colors cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Mobile Sync Info</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Logo Upload Section */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Institute Logo / Crest (Used in Invoices & PDF Receipts)
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-24 h-24 rounded-xl border border-slate-300 bg-white flex items-center justify-center overflow-hidden shadow-inner shrink-0">
                  {formData.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={formData.logoUrl}
                      alt="Logo preview"
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-slate-300" />
                  )}
                </div>
                <div className="space-y-2 flex-1 text-center sm:text-left">
                  <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoUpload}
                      accept="image/png, image/jpeg, image/webp, image/svg+xml"
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessingLogo}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      <span>{formData.logoUrl ? 'Change Logo' : 'Upload Logo'}</span>
                    </Button>
                    {formData.logoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveLogo}
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        <span>Remove</span>
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Recommended: Transparent PNG or SVG, max 2MB.
                  </p>
                </div>
              </div>
            </div>

            {/* Institute Identity Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Institute / Tuition Name"
                name="instituteName"
                value={formData.instituteName}
                onChange={handleInstituteChange}
                placeholder="e.g. DPR Private Tuition"
                required
              />
              <Input
                label="Tagline / Motto"
                name="tagline"
                value={formData.tagline}
                onChange={handleInstituteChange}
                placeholder="e.g. Excellence in Academic Coaching & Guidance"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Official Contact Phone"
                name="phone"
                value={formData.phone}
                onChange={handleInstituteChange}
                placeholder="+91 98765 43210"
              />
              <Input
                label="Official WhatsApp Number"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleInstituteChange}
                placeholder="+91 98765 43210"
              />
              <Input
                label="Official Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInstituteChange}
                placeholder="info@yourinstitute.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Full Physical Address
              </label>
              <textarea
                name="address"
                rows={2}
                value={formData.address}
                onChange={handleInstituteChange}
                placeholder="e.g. Station Road, Near City Center, West Bengal"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* UPI & Payment Settings */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Online UPI Payment Configuration</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Institute UPI ID / VPA"
                  name="upiId"
                  value={formData.upiId}
                  onChange={handleInstituteChange}
                  placeholder="e.g. tuition@okaxis"
                />
                <Input
                  label="Payee Account Holder Name"
                  name="upiPayeeName"
                  value={formData.upiPayeeName}
                  onChange={handleInstituteChange}
                  placeholder="e.g. DPR Private Tuition"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.upiEnabled}
                  onChange={(val: boolean) => setFormData((p) => ({ ...p, upiEnabled: val }))}
                />
                <span className="text-xs text-slate-700 font-medium">
                  Enable dynamic UPI QR code generator on student invoices and WhatsApp payment links
                </span>
              </div>
            </div>

            {/* Financial Prefixes */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Receipt Prefix"
                name="receiptPrefix"
                value={formData.receiptPrefix}
                onChange={handleInstituteChange}
                placeholder="e.g. RC or DPR-RC"
              />
              <Input
                label="Currency Symbol"
                name="currencySymbol"
                value={formData.currencySymbol}
                onChange={handleInstituteChange}
                placeholder="₹"
              />
              <Input
                label="Default Grace Period (Days)"
                name="defaultGraceDays"
                type="number"
                value={formData.defaultGraceDays}
                onChange={handleInstituteChange}
                placeholder="0"
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" isLoading={isSavingInstitute} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Save className="w-4 h-4 mr-2" />
                <span>Save Organization Settings</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Admin Profile & Password Change */}
      <form onSubmit={handleSaveAdmin}>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              <span>Admin Profile & Password</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {adminSuccess && <Alert variant="success">{adminSuccess}</Alert>}
            {adminError && <Alert variant="danger">{adminError}</Alert>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Admin Full Name"
                name="name"
                value={adminData.name}
                onChange={handleAdminChange}
                placeholder="Admin Name"
                required
              />
              <Input
                label="Admin Email"
                name="email"
                type="email"
                value={adminData.email}
                onChange={handleAdminChange}
                placeholder="admin@yourinstitute.com"
                required
              />
            </div>

            <div className="pt-3 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    name="currentPassword"
                    value={adminData.currentPassword}
                    onChange={handleAdminChange}
                    placeholder="Enter to change password"
                    className="w-full px-3 pr-9 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    name="newPassword"
                    value={adminData.newPassword}
                    onChange={handleAdminChange}
                    placeholder="Min 6 characters"
                    className="w-full px-3 pr-9 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm New Password
                </label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={adminData.confirmPassword}
                  onChange={handleAdminChange}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" isLoading={isSavingAdmin} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Save className="w-4 h-4 mr-2" />
                <span>Save Profile Changes</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
