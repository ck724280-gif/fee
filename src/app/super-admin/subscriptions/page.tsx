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
} from 'lucide-react';

export default function SubscriptionsManagementPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'SUBSCRIPTIONS' | 'UPI_APPROVALS'>('SUBSCRIPTIONS');
  const [modalOpen, setModalOpen] = useState(false);
  const [upiModalOpen, setUpiModalOpen] = useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [search, setSearch] = useState('');

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
      const [subsRes, orgsRes] = await Promise.all([
        fetch('/api/super-admin/subscriptions'),
        fetch('/api/super-admin/organizations'),
      ]);

      const subsJson = await subsRes.json();
      const orgsJson = await orgsRes.json();

      setSubscriptions(subsJson.subscriptions || []);
      setOrganizations(orgsJson.organizations || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

    const defaultMsg = `🔔 *SaaS Subscription Renewal Notice*\n\nDear *${owner?.name || org?.name || 'Institute Admin'}*,\n\nThis is a friendly subscription reminder for *${org?.name}* from *Education Management SaaS Platform*.\n\n📋 *Plan:* ${sub.plan} Plan\n💰 *Amount Due:* ₹${sub.pricePerCycle.toLocaleString('en-IN')}\n📅 *Expiry Date:* ${expiryDateStr}\n\nKindly complete payment via UPI/Bank Transfer to ensure uninterrupted access for your students & teachers.\n\n*UPI ID for Payment:* admin@upi\n\nThank you,\n*Master Administration*`;

    setWhatsappData({
      phone: cleanPhone,
      orgName: org?.name || '',
      ownerName: owner?.name || '',
      plan: sub.plan || 'BASIC',
      amount: sub.pricePerCycle || 0,
      expiryDate: expiryDateStr,
      message: defaultMsg,
    });
    setError('');
    setWhatsappModalOpen(true);
  };

  const handleSendWhatsAppDirect = () => {
    let cleanPhone = whatsappData.phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }

    const encoded = encodeURIComponent(whatsappData.message);
    const targetUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;

    window.open(targetUrl, '_blank');
    setWhatsappModalOpen(false);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.organizationId) {
      setError('Please select an organization.');
      return;
    }
    if (formData.amount <= 0) {
      setError('Please enter a valid payment amount greater than ₹0.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/super-admin/subscriptions/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to record subscription payment');

      setSuccessMsg(json.message || 'Subscription fee collected and plan expiry extended successfully!');
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveUpi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiFormData.organizationId || !upiFormData.utrNumber.trim()) {
      setError('Please select an organization and enter the UTR Reference Number.');
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

  // Summary Metrics
  const totalRevenue = subscriptions.reduce((sum, s) => {
    const pSum = s.payments?.reduce((subP: number, p: any) => subP + p.amount, 0) || 0;
    return sum + pSum;
  }, 0);

  const activeCount = subscriptions.filter((s) => s.status === 'ACTIVE' && new Date(s.expiryDate) >= new Date()).length;
  const expiredCount = subscriptions.filter((s) => new Date(s.expiryDate) < new Date()).length;

  const allPayments = subscriptions.flatMap((s) =>
    (s.payments || []).map((p: any) => ({
      ...p,
      organization: s.organization,
      plan: s.plan,
    }))
  );

  const filteredSubs = subscriptions.filter((s) =>
    s.organization?.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.organization?.slug?.toLowerCase().includes(search.toLowerCase()) ||
    s.plan?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono font-bold mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>SAAS REVENUE &amp; BILLING ENGINE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Subscription Fee Collection
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Collect SaaS software fees from institutes, approve online UPI UTR payments, and send 1-click WhatsApp reminders.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => {
              setUpiFormData({
                organizationId: organizations[0]?.id || '',
                utrNumber: '',
                amount: 499,
                notes: '',
                extendMonths: 1,
              });
              setUpiModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <QrCode className="w-4 h-4" />
            <span>Approve UPI UTR</span>
          </button>

          <button
            onClick={() => {
              setFormData({
                organizationId: organizations[0]?.id || '',
                amount: 499,
                paymentMethod: 'UPI',
                referenceNumber: '',
                notes: '',
                extendMonths: 1,
              });
              setModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold shadow-xl shadow-rose-600/25 transition flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Collect Subscription Fee</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expired / Due Subscriptions</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-2">{expiredCount}</div>
          <p className="text-[11px] text-rose-400 font-medium mt-1">Action required (Collect fee or send reminder)</p>
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
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
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
          <span>UPI Payments &amp; Receipts History ({allPayments.length})</span>
        </button>
      </div>

      {activeTab === 'SUBSCRIPTIONS' && (
        /* Subscriptions Table */
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
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'UPI_APPROVALS' && (
        /* UPI Payment History & Receipts */
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-2xl shadow-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white">SaaS Payment &amp; UPI Approval History</h2>
              <p className="text-xs text-slate-400">All recorded subscription payments and verified UTR references.</p>
            </div>
          </div>

          {allPayments.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              No subscription payment receipts recorded yet. Click "Collect Subscription Fee" or "Approve UPI UTR" above.
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
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {allPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {new Date(p.paymentDate).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        {p.organization?.name || 'Institute'}
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
                        {p.referenceNumber || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {p.notes || '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          VERIFIED
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
                  <p className="text-[10px] text-slate-400 mt-1">Indian 10-digit number will automatically prefix with +91.</p>
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
                    Amount Collected (₹ INR)
                  </label>
                  <div className="relative">
                    <IndianRupee className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="number"
                      min="1"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                      placeholder="e.g. 499"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                      required
                    />
                  </div>
                  {/* Quick Fill Chips */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Presets:</span>
                    {[120, 199, 299, 499, 999, 1999].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFormData({ ...formData, amount: val })}
                        className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 text-[11px] font-bold border border-slate-700 hover:border-rose-500/30 transition cursor-pointer"
                      >
                        ₹{val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Payment Mode
                    </label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs"
                    >
                      <option value="UPI">UPI / QR Code</option>
                      <option value="CASH">Cash</option>
                      <option value="BANK_TRANSFER">Bank Transfer / IMPS</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="ONLINE">Online Card</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Extend Duration
                    </label>
                    <select
                      value={formData.extendMonths}
                      onChange={(e) => setFormData({ ...formData, extendMonths: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-bold text-emerald-400"
                    >
                      <option value={1}>+1 Month Access</option>
                      <option value={3}>+3 Months Access</option>
                      <option value={6}>+6 Months Access</option>
                      <option value={12}>+1 Year (12 Months)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Transaction ID / Reference
                  </label>
                  <input
                    type="text"
                    value={formData.referenceNumber}
                    onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                    placeholder="e.g. UTR-123456789012"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Recording Receipt...</span>
                      </>
                    ) : (
                      <>
                        <span>Record &amp; Issue Receipt</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* UPI UTR Approval Modal */}
      <AnimatePresence>
        {upiModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-cyan-500/30 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2.5 text-white font-bold text-base">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <span>Approve UPI UTR Transaction</span>
                </div>
                <button
                  onClick={() => setUpiModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleApproveUpi} className="space-y-4 mt-5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Select Organization / Institute
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
                    Bank UTR / UPI Reference Number (12-Digits)
                  </label>
                  <input
                    type="text"
                    required
                    value={upiFormData.utrNumber}
                    onChange={(e) => setUpiFormData({ ...upiFormData, utrNumber: e.target.value })}
                    placeholder="e.g. 324109876543"
                    className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Amount (₹ INR)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={upiFormData.amount}
                      onChange={(e) => setUpiFormData({ ...upiFormData, amount: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Extend Duration
                    </label>
                    <select
                      value={upiFormData.extendMonths}
                      onChange={(e) => setUpiFormData({ ...upiFormData, extendMonths: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-bold text-emerald-400"
                    >
                      <option value={1}>+1 Month Access</option>
                      <option value={3}>+3 Months Access</option>
                      <option value={6}>+6 Months Access</option>
                      <option value={12}>+1 Year (12 Months)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setUpiModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying UTR...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Verify &amp; Approve UPI</span>
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
