'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Plus,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  X,
  IndianRupee,
  Calendar,
  Building2,
  Clock,
  ShieldCheck,
  Send,
  MessageCircle,
  Receipt,
  ArrowRight,
  Sparkles,
  TrendingUp,
  AlertCircle,
  QrCode,
  Check,
  Phone,
  FileText,
  Search,
  Settings,
  ThumbsUp,
  ThumbsDown,
  Copy,
} from 'lucide-react';

export default function SubscriptionsManagementPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [upiPayments, setUpiPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'SUBSCRIPTIONS' | 'UPI_APPROVALS' | 'UPI_SETTINGS'>('SUBSCRIPTIONS');
  const [modalOpen, setModalOpen] = useState(false);
  const [upiModalOpen, setUpiModalOpen] = useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');

  // Super Admin Platform UPI Settings
  const [platformUpi, setPlatformUpi] = useState({
    upiId: 'admin@dprtuition.com',
    upiPayeeName: 'DPR Tuition Platform',
    upiEnabled: true,
  });
  const [savingUpi, setSavingUpi] = useState(false);

  // Payment Form Data
  const [formData, setFormData] = useState({
    organizationId: '',
    amount: 0,
    paymentMethod: 'UPI',
    referenceNumber: '',
    notes: '',
    extendMonths: 1,
  });

  // UPI UTR Approval Form Data
  const [upiFormData, setUpiFormData] = useState({
    organizationId: '',
    utrNumber: '',
    amount: 0,
    notes: '',
    extendMonths: 1,
  });

  // WhatsApp Dialog Data
  const [whatsappData, setWhatsappData] = useState({
    phone: '',
    orgName: '',
    ownerName: '',
    plan: '',
    amount: 0,
    expiryDate: '',
    message: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subsRes, orgsRes, upiRes, upiSettingsRes] = await Promise.all([
        fetch('/api/super-admin/subscriptions'),
        fetch('/api/super-admin/organizations'),
        fetch('/api/super-admin/subscriptions/upi-approvals'),
        fetch('/api/super-admin/settings/upi'),
      ]);

      const subsJson = await subsRes.json();
      const orgsJson = await orgsRes.json();
      const upiJson = await upiRes.json();
      const upiSettingsJson = await upiSettingsRes.json();

      setSubscriptions(subsJson.subscriptions || []);
      setOrganizations(orgsJson.organizations || []);
      setUpiPayments(upiJson.payments || []);
      if (upiSettingsJson.settings) {
        setPlatformUpi({
          upiId: upiSettingsJson.settings.upiId || 'admin@dprtuition.com',
          upiPayeeName: upiSettingsJson.settings.upiPayeeName || 'DPR Tuition Platform',
          upiEnabled: upiSettingsJson.settings.upiEnabled !== false,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSavePlatformUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformUpi.upiId.trim()) {
      setError('Please enter a valid Platform UPI ID');
      return;
    }

    setSavingUpi(true);
    setError('');

    try {
      const res = await fetch('/api/super-admin/settings/upi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(platformUpi),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save Platform UPI settings');

      setSuccessMsg(json.message || 'Platform UPI ID updated successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingUpi(false);
    }
  };

  const handleApprovePendingPayment = async (paymentId: string, extendMonths: number = 1) => {
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/super-admin/subscriptions/upi-approvals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          action: 'APPROVE',
          extendMonths,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to approve payment');

      setSuccessMsg(json.message || 'Payment approved and membership extended!');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectPendingPayment = async (paymentId: string) => {
    if (!confirm('Are you sure you want to reject this payment submission?')) return;
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/super-admin/subscriptions/upi-approvals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          action: 'REJECT',
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to reject payment');

      setSuccessMsg('Payment submission has been rejected.');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openCollectModalForOrg = (orgId: string, defaultAmount: number = 0) => {
    setFormData({
      organizationId: orgId,
      amount: defaultAmount || 499,
      paymentMethod: 'UPI',
      referenceNumber: '',
      notes: '',
      extendMonths: 1,
    });
    setError('');
    setModalOpen(true);
  };

  const openUpiApprovalForOrg = (orgId: string, defaultAmount: number = 0) => {
    setUpiFormData({
      organizationId: orgId,
      utrNumber: '',
      amount: defaultAmount || 499,
      notes: '',
      extendMonths: 1,
    });
    setError('');
    setUpiModalOpen(true);
  };

  const handleOpenWhatsAppModal = (sub: any) => {
    const org = sub.organization;
    const owner = org?.members?.[0]?.user;
    const phone = owner?.mobile || org?.settings?.phone || '';
    const cleanPhone = phone.replace(/\D/g, '');

    const expiryDateStr = new Date(sub.expiryDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const defaultMsg = `🔔 *SaaS Subscription Renewal Notice*\n\nDear *${owner?.name || org?.name || 'Institute Admin'}*,\n\nThis is a friendly subscription reminder for *${org?.name}* from *Education Management SaaS Platform*.\n\n📋 *Plan:* ${sub.plan} Plan\n💰 *Amount Due:* ₹${sub.pricePerCycle.toLocaleString('en-IN')}\n📅 *Expiry Date:* ${expiryDateStr}\n\nKindly complete payment via UPI to ensure uninterrupted access for your institute.\n\n*UPI ID for Payment:* ${platformUpi.upiId}\n*Payee:* ${platformUpi.upiPayeeName}\n\nThank you,\n*Master Administration*`;

    setWhatsappData({
      phone: cleanPhone,
      orgName: org?.name || '',
      ownerName: owner?.name || '',
      plan: sub.plan,
      amount: sub.pricePerCycle,
      expiryDate: expiryDateStr,
      message: defaultMsg,
    });

    setWhatsappModalOpen(true);
  };

  const handleSendWhatsAppDirect = () => {
    if (!whatsappData.phone) {
      setError('Please provide a valid phone number for the recipient.');
      return;
    }

    let targetPhone = whatsappData.phone;
    if (targetPhone.length === 10) {
      targetPhone = `91${targetPhone}`;
    }

    const encodedMsg = encodeURIComponent(whatsappData.message);
    const url = `https://wa.me/${targetPhone}?text=${encodedMsg}`;
    window.open(url, '_blank');
    setWhatsappModalOpen(false);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.organizationId) {
      setError('Please select an organization.');
      return;
    }
    if (formData.amount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/super-admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to collect subscription fee');

      setSuccessMsg(`Payment of ₹${formData.amount} recorded! Expiry extended.`);
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveUpiUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiFormData.organizationId || !upiFormData.utrNumber.trim()) {
      setError('Please choose organization and enter 12-digit UTR Number.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/super-admin/subscriptions/upi-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(upiFormData),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to approve UPI payment');

      setSuccessMsg(json.message || 'UPI Payment approved successfully!');
      setUpiModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics Calculation
  const totalRevenue = subscriptions.reduce((acc, sub) => {
    const subTotal = sub.payments?.reduce((pAcc: number, p: any) => pAcc + (p.amount || 0), 0) || 0;
    return acc + subTotal;
  }, 0);

  const activeCount = subscriptions.filter(
    (s) => s.status === 'ACTIVE' && new Date(s.expiryDate) > new Date()
  ).length;

  const expiredCount = subscriptions.filter(
    (s) => new Date(s.expiryDate) <= new Date()
  ).length;

  const pendingPayments = upiPayments.filter((p) => p.status === 'PENDING');

  const filteredSubs = subscriptions.filter(
    (s) =>
      s.organization?.name.toLowerCase().includes(search.toLowerCase()) ||
      s.organization?.slug.toLowerCase().includes(search.toLowerCase()) ||
      s.plan.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono font-bold mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>SAAS REVENUE &amp; BILLING ENGINE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Subscription Fees &amp; UPI Approvals
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure Super Admin UPI ID, approve tenant UTR payments, and collect recurring SaaS membership fees.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => openUpiApprovalForOrg('', 499)}
            className="px-4 py-2.5 rounded-2xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-lg active:scale-95"
          >
            <QrCode className="w-4 h-4 text-cyan-400" />
            <span>Approve UPI UTR</span>
          </button>

          <button
            onClick={() => openCollectModalForOrg('', 499)}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold shadow-xl shadow-rose-600/25 transition duration-200 flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Collect Subscription Fee</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total SaaS Revenue</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              ₹
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-2">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-emerald-400 font-medium mt-1">Collected directly from active institutes</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Paid Institutes</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-2">{activeCount}</div>
          <p className="text-[11px] text-cyan-400 font-medium mt-1">Institutes with current active plans</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending UPI Approvals</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-2">{pendingPayments.length}</div>
          <p className="text-[11px] text-amber-400 font-medium mt-1">Institutes waiting for UTR verification</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expired / Due</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-2">{expiredCount}</div>
          <p className="text-[11px] text-rose-400 font-medium mt-1">Action required</p>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs Header */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 flex-wrap">
        <button
          onClick={() => setActiveTab('SUBSCRIPTIONS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'SUBSCRIPTIONS'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Institutes &amp; Subscription Ledgers ({subscriptions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('UPI_APPROVALS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'UPI_APPROVALS'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>
            UPI Payments &amp; Approvals{' '}
            {pendingPayments.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
                {pendingPayments.length} Pending
              </span>
            )}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('UPI_SETTINGS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'UPI_SETTINGS'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4 text-amber-400" />
          <span>Platform Super Admin UPI Settings</span>
        </button>
      </div>

      {/* Tab: SUBSCRIPTIONS */}
      {activeTab === 'SUBSCRIPTIONS' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-2xl shadow-2xl">
          {loading ? (
            <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-rose-500" />
              <span className="text-xs font-semibold">Loading institute subscription ledgers...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-4 px-5">Institute / Organization</th>
                    <th className="py-4 px-4">Plan &amp; Rate</th>
                    <th className="py-4 px-4">Billing Cycle</th>
                    <th className="py-4 px-4">Plan Expiry</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-4">Total Collected</th>
                    <th className="py-4 px-5 text-right">Quick Collection Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredSubs.map((sub) => {
                    const isPastDue = new Date(sub.expiryDate) < new Date();
                    const totalPaid = sub.payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
                    const owner = sub.organization?.members?.[0]?.user;
                    const phone = owner?.mobile || sub.organization?.settings?.phone || 'N/A';

                    return (
                      <tr key={sub.id} className="hover:bg-slate-800/40 transition duration-150">
                        <td className="py-4 px-5">
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-rose-400 shrink-0" />
                            <span>{sub.organization?.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {owner?.name ? `${owner.name} • ${phone}` : `slug: ${sub.organization?.slug}`}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-extrabold text-white text-xs">
                            ₹{sub.pricePerCycle.toLocaleString('en-IN')}
                          </div>
                          <span className="text-[10px] font-bold text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                            {sub.plan}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-300 uppercase text-[10px] font-bold">
                          {sub.billingCycle}
                        </td>
                        <td className="py-4 px-4">
                          <div className={`font-bold ${isPastDue ? 'text-rose-400' : 'text-slate-200'}`}>
                            {new Date(sub.expiryDate).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </div>
                          {isPastDue && (
                            <div className="text-[10px] text-rose-500 font-extrabold flex items-center gap-1 mt-0.5">
                              <AlertCircle className="w-3 h-3" />
                              <span>Payment Due</span>
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                              sub.status === 'ACTIVE' && !isPastDue
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                            }`}
                          >
                            {isPastDue ? 'EXPIRED' : sub.status}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-black text-emerald-400 text-xs">
                            ₹{totalPaid.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {sub.payments?.length || 0} receipt(s)
                          </div>
                        </td>
                        <td className="py-4 px-5 text-right space-x-2">
                          <button
                            onClick={() => openCollectModalForOrg(sub.organizationId, sub.pricePerCycle || 499)}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer inline-flex items-center gap-1.5"
                          >
                            <IndianRupee className="w-3 h-3" />
                            <span>Collect Fee</span>
                          </button>

                          <button
                            onClick={() => handleOpenWhatsAppModal(sub)}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-green-600/20 to-emerald-600/20 hover:bg-green-600/30 text-green-300 border border-green-500/30 font-bold text-xs transition cursor-pointer inline-flex items-center gap-1.5"
                            title="Send 1-Click WhatsApp Payment Reminder"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-green-400" />
                            <span>WhatsApp</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSubs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-500">
                        No subscription ledgers found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: UPI_APPROVALS */}
      {activeTab === 'UPI_APPROVALS' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-2xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white">SaaS Payment &amp; UPI Approval History</h2>
              <p className="text-xs text-slate-400">Review pending UTR submissions from institutes or approve instant renewals.</p>
            </div>
          </div>

          {upiPayments.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              No subscription payment receipts or UTR submissions recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Institute</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4">UTR / Reference</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {upiPayments.map((p) => {
                    const isPending = p.status === 'PENDING';
                    const orgName = p.subscription?.organization?.name || p.organization?.name || 'Institute';

                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {new Date(p.paymentDate || p.createdAt).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">
                          {orgName}
                        </td>
                        <td className="py-3 px-4 font-extrabold text-emerald-400 text-xs">
                          ₹{p.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {p.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-cyan-300">
                          {p.transactionReference || p.referenceNumber || 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                              isPending
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 animate-pulse'
                                : p.status === 'SETTLED'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}
                          >
                            {isPending ? 'PENDING APPROVAL' : p.status === 'SETTLED' ? 'VERIFIED & ACTIVE' : p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          {isPending ? (
                            <>
                              <button
                                disabled={submitting}
                                onClick={() => handleApprovePendingPayment(p.id, 1)}
                                className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <ThumbsUp className="w-3 h-3" />
                                <span>Approve (+1m)</span>
                              </button>
                              <button
                                disabled={submitting}
                                onClick={() => handleRejectPendingPayment(p.id)}
                                className="px-2.5 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs transition inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <ThumbsDown className="w-3 h-3" />
                                <span>Reject</span>
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] text-slate-500 font-mono">Completed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: UPI_SETTINGS */}
      {activeTab === 'UPI_SETTINGS' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl max-w-2xl">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Super Admin Platform UPI Settings</h2>
              <p className="text-xs text-slate-400">
                This UPI ID &amp; Payee Name is used to generate the dynamic QR code on all client institutions' Membership Renewal page.
              </p>
            </div>
          </div>

          <form onSubmit={handleSavePlatformUpi} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Platform Master UPI ID
              </label>
              <input
                type="text"
                required
                value={platformUpi.upiId}
                onChange={(e) => setPlatformUpi({ ...platformUpi, upiId: e.target.value })}
                placeholder="e.g. dprtuition@okaxis or admin@upi"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Any payment sent by institutes will be credited directly to this UPI ID.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                Payee Business / Name
              </label>
              <input
                type="text"
                required
                value={platformUpi.upiPayeeName}
                onChange={(e) => setPlatformUpi({ ...platformUpi, upiPayeeName: e.target.value })}
                placeholder="e.g. DPR Tuition Platform"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <input
                type="checkbox"
                id="upiEnabled"
                checked={platformUpi.upiEnabled}
                onChange={(e) => setPlatformUpi({ ...platformUpi, upiEnabled: e.target.checked })}
                className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-amber-500 cursor-pointer"
              />
              <label htmlFor="upiEnabled" className="text-xs text-slate-300 cursor-pointer select-none font-medium">
                Enable Dynamic UPI QR Code Generation for Institutions
              </label>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-end">
              <button
                type="submit"
                disabled={savingUpi}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-amber-500/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {savingUpi ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Settings...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Platform UPI Settings</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* WhatsApp Modal with Editable Message & Phone */}
      <AnimatePresence>
        {whatsappModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-green-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5 text-white font-bold text-base">
                  <div className="w-8 h-8 rounded-xl bg-green-500/20 text-green-400 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <span>Send WhatsApp Subscription Notice</span>
                </div>
                <button
                  onClick={() => setWhatsappModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Recipient Phone Number (with Country Code)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={whatsappData.phone}
                      onChange={(e) => setWhatsappData({ ...whatsappData, phone: e.target.value })}
                      placeholder="e.g. 9876543210"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Pre-Formatted WhatsApp Message
                  </label>
                  <textarea
                    rows={8}
                    value={whatsappData.message}
                    onChange={(e) => setWhatsappData({ ...whatsappData, message: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setWhatsappModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSendWhatsAppDirect}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold text-xs shadow-lg shadow-green-600/30 transition flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                    <span>Open in WhatsApp</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Collect Fee Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-rose-500/30 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5 text-white font-bold text-base">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <span>Collect Institute Subscription Fee</span>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRecordPayment} className="space-y-4 mt-5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Select Organization / Institute
                  </label>
                  <select
                    value={formData.organizationId}
                    onChange={(e) => {
                      const selOrgId = e.target.value;
                      const selSub = subscriptions.find((s) => s.organizationId === selOrgId);
                      setFormData({
                        ...formData,
                        organizationId: selOrgId,
                        amount: selSub?.pricePerCycle || formData.amount,
                      });
                    }}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                    required
                  >
                    <option value="">-- Choose Institute --</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} ({org.slug})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Amount Collected (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Payment Mode
                    </label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                    >
                      <option value="UPI">UPI / QR Code</option>
                      <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
                      <option value="CASH">Cash in Hand</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Extend Duration
                    </label>
                    <select
                      value={formData.extendMonths}
                      onChange={(e) => setFormData({ ...formData, extendMonths: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                    >
                      <option value="1">+1 Month</option>
                      <option value="3">+3 Months (Quarter)</option>
                      <option value="6">+6 Months (Half Year)</option>
                      <option value="12">+12 Months (Full Year)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Reference / UTR / Transaction ID
                  </label>
                  <input
                    type="text"
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                    placeholder="e.g. UTR-98237198273"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs cursor-pointer font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Recording...</span>
                      </>
                    ) : (
                      <>
                        <IndianRupee className="w-4 h-4" />
                        <span>Record &amp; Extend Plan</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Approve Custom UPI UTR Modal */}
      <AnimatePresence>
        {upiModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5 text-white font-bold text-base">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <span>Approve Custom UPI Payment (UTR)</span>
                </div>
                <button
                  onClick={() => setUpiModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleApproveUpiUtr} className="space-y-4 mt-5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Select Paying Institute
                  </label>
                  <select
                    value={upiFormData.organizationId}
                    onChange={(e) => {
                      const selOrgId = e.target.value;
                      const selSub = subscriptions.find((s) => s.organizationId === selOrgId);
                      setUpiFormData({
                        ...upiFormData,
                        organizationId: selOrgId,
                        amount: selSub?.pricePerCycle || upiFormData.amount,
                      });
                    }}
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    required
                  >
                    <option value="">-- Choose Institute --</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name} ({org.slug})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    12-Digit UPI Transaction Reference / UTR Number
                  </label>
                  <input
                    type="text"
                    required
                    value={upiFormData.utrNumber}
                    onChange={(e) => setUpiFormData({ ...upiFormData, utrNumber: e.target.value.trim() })}
                    placeholder="e.g. 423819283746"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Amount (₹)
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={upiFormData.amount}
                      onChange={(e) => setUpiFormData({ ...upiFormData, amount: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Extend Plan By
                    </label>
                    <select
                      value={upiFormData.extendMonths}
                      onChange={(e) => setUpiFormData({ ...upiFormData, extendMonths: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                    >
                      <option value="1">+1 Month</option>
                      <option value="3">+3 Months (Quarter)</option>
                      <option value="6">+6 Months (Half Year)</option>
                      <option value="12">+12 Months (Full Year)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setUpiModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs cursor-pointer font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying &amp; Approving...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Approve &amp; Activate Plan</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
