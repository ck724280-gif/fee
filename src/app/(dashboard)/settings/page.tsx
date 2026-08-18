'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Switch } from '@/components/ui/Switch';
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
} from 'lucide-react';

export default function SettingsPage() {
  // Institute Settings Form State
  const [formData, setFormData] = useState({
    instituteName: 'DPR Private Tuition',
    tagline: 'Excellence in Academic Coaching & Guidance',
    address: 'Station Road, Near City Center, West Bengal',
    phone: '+91 98765 43210',
    whatsapp: '+91 98765 43210',
    email: 'info@dprtuition.com',
    logoUrl: '',
    receiptPrefix: 'DPR-RC',
    currencySymbol: '₹',
    defaultGraceDays: 0,
    upiId: 'dprtuition@upi',
    upiPayeeName: 'DPR Private Tuition',
    upiEnabled: true,
    customQrUrl: '',
  });

  // Admin Profile & Security Form State
  const [adminData, setAdminData] = useState({
    name: 'DPR Admin',
    email: 'admin@dprtuition.com',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Status & Feedback States
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingInstitute, setIsSavingInstitute] = useState(false);
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);
  const [isProcessingLogo, setIsProcessingLogo] = useState(false);

  const [instituteSuccess, setInstituteSuccess] = useState<string | null>(null);
  const [instituteError, setInstituteError] = useState<string | null>(null);

  const [adminSuccess, setAdminSuccess] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [settingsRes, adminRes] = await Promise.all([
          fetch('/api/settings'),
          fetch('/api/auth/profile'),
        ]);

        const settingsJson = await settingsRes.json();
        const adminJson = await adminRes.json();

        if (settingsJson.success && settingsJson.data) {
          setFormData({
            instituteName: settingsJson.data.instituteName || 'DPR Private Tuition',
            tagline: settingsJson.data.tagline || '',
            address: settingsJson.data.address || '',
            phone: settingsJson.data.phone || '',
            whatsapp: settingsJson.data.whatsapp || '',
            email: settingsJson.data.email || '',
            logoUrl: settingsJson.data.logoUrl || '',
            receiptPrefix: settingsJson.data.receiptPrefix || 'DPR-RC',
            currencySymbol: settingsJson.data.currencySymbol || '₹',
            defaultGraceDays: settingsJson.data.defaultGraceDays ?? 0,
            upiId: settingsJson.data.upiId || 'dprtuition@upi',
            upiPayeeName: settingsJson.data.upiPayeeName || settingsJson.data.instituteName || 'DPR Private Tuition',
            upiEnabled: settingsJson.data.upiEnabled ?? true,
            customQrUrl: settingsJson.data.customQrUrl || '',
          });
        }

        if (adminJson.success && adminJson.data) {
          setAdminData((prev) => ({
            ...prev,
            name: adminJson.data.name || 'DPR Admin',
            email: adminJson.data.email || 'admin@dprtuition.com',
          }));
        }
      } catch (err: any) {
        setInstituteError('Failed to load settings data');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Image Upload and Optimization Handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setInstituteError('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setInstituteError('Image size should be less than 5MB.');
      return;
    }

    setIsProcessingLogo(true);
    setInstituteError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize and optimize image to max 300x300 for snappy loading
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 300;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const optimizedBase64 = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.9);
          setFormData((prev) => ({ ...prev, logoUrl: optimizedBase64 }));
        }
        setIsProcessingLogo(false);
      };
      img.onerror = () => {
        setIsProcessingLogo(false);
        setInstituteError('Failed to process image. Please try another file.');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData((prev) => ({ ...prev, logoUrl: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handler for Institute Settings
  const handleInstituteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingInstitute(true);
    setInstituteError(null);
    setInstituteSuccess(null);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update institute settings');
      }

      setInstituteSuccess('Institute configuration & logo saved successfully!');
      
      // Dispatch event so Sidebar and Navigation immediately reflect new Logo & Name
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('institute-settings-updated', { detail: json.data }));
      }

      setTimeout(() => setInstituteSuccess(null), 4000);
    } catch (err: any) {
      setInstituteError(err.message || 'Error updating institute settings');
    } finally {
      setIsSavingInstitute(false);
    }
  };

  // Handler for Admin Account & Password Update
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);
    setAdminSuccess(null);

    if (!adminData.currentPassword.trim()) {
      setAdminError('Please enter your Current Password to authorize changes.');
      return;
    }

    if (adminData.newPassword && adminData.newPassword.trim().length > 0) {
      if (adminData.newPassword.trim().length < 6) {
        setAdminError('New password must be at least 6 characters long.');
        return;
      }
      if (adminData.newPassword !== adminData.confirmPassword) {
        setAdminError('New Password and Confirm Password do not match.');
        return;
      }
    }

    setIsSavingAdmin(true);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: adminData.name.trim(),
          email: adminData.email.trim(),
          currentPassword: adminData.currentPassword,
          newPassword: adminData.newPassword ? adminData.newPassword.trim() : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update admin credentials');
      }

      setAdminSuccess(json.message || 'Admin email and security credentials updated successfully!');
      setAdminData((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }));
      setTimeout(() => setAdminSuccess(null), 5000);
    } catch (err: any) {
      setAdminError(err.message || 'Error updating admin credentials');
    } finally {
      setIsSavingAdmin(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-sm font-medium text-slate-500">Loading Institute & Admin Settings...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Settings & Administration
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Manage admin login credentials, password security, institute branding & logo, and fee policies
        </p>
      </div>

      {/* SECTION 1: Admin Account & Security Credentials */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900">Admin Account & Login Security</h2>
        </div>

        {adminSuccess && <Alert variant="success">{adminSuccess}</Alert>}
        {adminError && <Alert variant="danger">{adminError}</Alert>}

        <form onSubmit={handleAdminSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm text-slate-800">
                <KeyRound className="w-4 h-4 text-blue-600" />
                <span>Change Admin Email ID & Password</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Administrator Name"
                  value={adminData.name}
                  onChange={(e) => setAdminData({ ...adminData, name: e.target.value })}
                  placeholder="DPR Admin"
                  required
                />

                <Input
                  label="Admin Login Email ID"
                  type="email"
                  value={adminData.email}
                  onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                  placeholder="admin@dprtuition.com"
                  helperText="This email will be used for future logins"
                  required
                />
              </div>

              <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      New Password (Optional)
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={adminData.newPassword}
                      onChange={(e) => setAdminData({ ...adminData, newPassword: e.target.value })}
                      placeholder="Leave blank to keep current password"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Min 6 characters if changing</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={adminData.confirmPassword}
                    onChange={(e) => setAdminData({ ...adminData, confirmPassword: e.target.value })}
                    placeholder="Repeat new password"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex-1 w-full sm:max-w-md">
                  <label className="block text-xs font-bold text-amber-900 mb-1">
                    Current Password (Required for confirmation) *
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={adminData.currentPassword}
                      onChange={(e) => setAdminData({ ...adminData, currentPassword: e.target.value })}
                      placeholder="Enter current password to save"
                      required
                      className="w-full px-3.5 py-2 bg-white border border-amber-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  variant="primary"
                  type="submit"
                  isLoading={isSavingAdmin}
                  className="w-full sm:w-auto mt-2 sm:mt-5"
                  leftIcon={<ShieldCheck className="w-4 h-4" />}
                >
                  Update Admin Credentials
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>

      {/* SECTION 2: Institute Branding & Defaults */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <Building className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900">Institute Information & Branding</h2>
        </div>

        {instituteSuccess && <Alert variant="success">{instituteSuccess}</Alert>}
        {instituteError && <Alert variant="danger">{instituteError}</Alert>}

        <form onSubmit={handleInstituteSubmit} className="space-y-6">
          {/* Logo Upload & Customization Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <span>Institute Logo & Sidebar Avatar</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 text-white border border-slate-800">
                {/* Live Logo Preview Box (Matching Sidebar Style) */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-pink-500 p-0.5 shadow-xl shadow-indigo-500/30 flex items-center justify-center overflow-hidden ring-2 ring-white/20 relative group">
                    {formData.logoUrl && formData.logoUrl.trim().length > 0 ? (
                      <img
                        src={formData.logoUrl}
                        alt="Institute Logo Preview"
                        className="w-full h-full object-cover rounded-[14px]"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-cyan-300">
                        <Sparkles className="w-7 h-7 text-cyan-400" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    {formData.logoUrl ? 'Custom Logo' : 'Default Icon'}
                  </span>
                </div>

                {/* Upload & Controls */}
                <div className="flex-1 space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Change Institute Logo</span>
                      <span className="text-[10px] font-normal px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full border border-blue-400/30">
                        Appears in Sidebar, Header & Invoices
                      </span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Upload your coaching institute logo or tuition brand icon. (PNG, JPG, WebP, SVG supported).
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-file-upload"
                    />
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      isLoading={isProcessingLogo}
                      leftIcon={<Upload className="w-4 h-4" />}
                    >
                      Choose Image File
                    </Button>

                    {formData.logoUrl && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={handleRemoveLogo}
                        className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border-rose-800/40"
                        leftIcon={<Trash2 className="w-4 h-4" />}
                      >
                        Reset to Default
                      </Button>
                    )}
                  </div>

                  <div className="pt-2">
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      Or Direct Image URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://your-domain.com/logo.png"
                      value={formData.logoUrl}
                      onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Branding & Identification */}
          <Card>
            <CardHeader>
              <CardTitle>Institute Branding & Identification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Institute Name"
                  value={formData.instituteName}
                  onChange={(e) => setFormData({ ...formData, instituteName: e.target.value })}
                  required
                />

                <Input
                  label="Motto / Tagline"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                />
              </div>

              <Input
                label="Official Institute Address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </CardContent>
          </Card>

          {/* Contact & Communication */}
          <Card>
            <CardHeader>
              <CardTitle>Contact & Parental Communication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Official Phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />

                <Input
                  label="Official WhatsApp Support"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                />

                <Input
                  label="Official Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Online UPI Fee Collection & QR Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Zero-Cost Online UPI Payment & Dynamic QR Gateway</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <div>
                  <span className="text-xs font-bold text-emerald-950 block">
                    Accept UPI Payments On Student Invoices
                  </span>
                  <span className="text-[11px] text-emerald-700 block">
                    Enables one-tap UPI app launching (GPay, PhonePe, Paytm) and dynamic QR codes on public fee notices
                  </span>
                </div>
                <Switch
                  checked={formData.upiEnabled}
                  onChange={(val) => setFormData((prev) => ({ ...prev, upiEnabled: val }))}
                  color="emerald"
                  size="md"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Institute UPI ID / VPA *"
                  placeholder="e.g. 7631240967@upi or dprtuition@okaxis"
                  value={formData.upiId}
                  onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                  helperText="Payments from parents will be credited directly to this UPI ID (0% transaction fee)"
                  required={formData.upiEnabled}
                />

                <Input
                  label="UPI Payee Display Name *"
                  placeholder="DPR Private Tuition"
                  value={formData.upiPayeeName}
                  onChange={(e) => setFormData({ ...formData, upiPayeeName: e.target.value })}
                  helperText="Shown in UPI apps when parent opens the payment link"
                  required={formData.upiEnabled}
                />
              </div>

              <Input
                label="Custom Scanner QR Image URL (Optional)"
                placeholder="https://... (e.g. your physical PhonePe/GPay Standee QR image link)"
                value={formData.customQrUrl}
                onChange={(e) => setFormData({ ...formData, customQrUrl: e.target.value })}
                helperText="Leave blank to automatically auto-generate dynamic QR codes for each student invoice"
              />

              {/* Live QR Preview Box */}
              {formData.upiEnabled && (
                <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
                  <div className="bg-white p-2.5 rounded-xl shrink-0 shadow-md">
                    <img
                      src={
                        formData.customQrUrl && formData.customQrUrl.trim().length > 5
                          ? formData.customQrUrl.trim()
                          : `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                              `upi://pay?pa=${encodeURIComponent(
                                formData.upiId || 'dprtuition@upi'
                              )}&pn=${encodeURIComponent(
                                formData.upiPayeeName || 'DPR Private Tuition'
                              )}&cu=INR`
                            )}&format=svg`
                      }
                      alt="Live UPI QR Preview"
                      className="w-24 h-24 sm:w-28 sm:h-28 object-contain"
                    />
                  </div>
                  <div className="space-y-1 text-center sm:text-left">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                      <span>Live Invoice QR Preview</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-100">
                      {formData.upiPayeeName || 'DPR Private Tuition'}
                    </h4>
                    <p className="text-xs font-mono text-emerald-400 font-semibold">
                      {formData.upiId || 'dprtuition@upi'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Parents will scan this QR code or tap the one-tap payment button on their digital invoice to pay fees directly to your bank account.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial & Invoicing Defaults */}
          <Card>
            <CardHeader>
              <CardTitle>Financial & Invoicing Defaults</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Receipt Prefix"
                  value={formData.receiptPrefix}
                  onChange={(e) => setFormData({ ...formData, receiptPrefix: e.target.value })}
                  helperText="e.g. DPR-RC -> DPR-RC-2026-0001"
                  required
                />

                <Input
                  label="Currency Symbol"
                  value={formData.currencySymbol}
                  onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                  required
                />

                <Input
                  label="Default Grace Days"
                  type="number"
                  min="0"
                  value={formData.defaultGraceDays}
                  onChange={(e) =>
                    setFormData({ ...formData, defaultGraceDays: parseInt(e.target.value, 10) || 0 })
                  }
                  helperText="Default days before late fee applies"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="primary"
              size="lg"
              type="submit"
              isLoading={isSavingInstitute}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Institute Settings
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
