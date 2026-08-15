'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
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
    receiptPrefix: 'DPR-RC',
    currencySymbol: '₹',
    defaultGraceDays: 0,
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

  const [instituteSuccess, setInstituteSuccess] = useState<string | null>(null);
  const [instituteError, setInstituteError] = useState<string | null>(null);

  const [adminSuccess, setAdminSuccess] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

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
            receiptPrefix: settingsJson.data.receiptPrefix || 'DPR-RC',
            currencySymbol: settingsJson.data.currencySymbol || '₹',
            defaultGraceDays: settingsJson.data.defaultGraceDays ?? 0,
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

      setInstituteSuccess('Institute configuration saved successfully!');
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
          Manage admin login credentials, password security, institute branding, and fee policies
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
          <h2 className="text-lg font-bold text-slate-900">Institute Information & Invoicing</h2>
        </div>

        {instituteSuccess && <Alert variant="success">{instituteSuccess}</Alert>}
        {instituteError && <Alert variant="danger">{instituteError}</Alert>}

        <form onSubmit={handleInstituteSubmit} className="space-y-6">
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
