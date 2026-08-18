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
} from 'lucide-react';

export default function SubscriptionsManagementPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Payment Form Data
  const [formData, setFormData] = useState({
    organizationId: '',
    amount: 0,
    paymentMethod: 'UPI',
    referenceNumber: '',
    notes: '',
    extendMonths: 1,
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
      const res = await fetch('/api/super-admin/subscriptions/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to record subscription payment');

      setSuccessMsg('Subscription payment recorded and plan expiry extended successfully!');
      setModalOpen(false);
      setFormData({
        organizationId: '',
        amount: 0,
        paymentMethod: 'UPI',
        referenceNumber: '',
        notes: '',
        extendMonths: 1,
      });
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Subscriptions & Billing
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Platform billing cycles, custom pricing plans, and offline SaaS subscription payment settlements.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 transition flex items-center gap-2 cursor-pointer w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Record Subscription Payment</span>
        </button>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Subscriptions Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl">
        {loading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
            <span className="text-xs">Loading subscriptions...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Organization</th>
                  <th className="py-3.5 px-4">Plan</th>
                  <th className="py-3.5 px-4">Pricing</th>
                  <th className="py-3.5 px-4">Cycle</th>
                  <th className="py-3.5 px-4">Expiry Date</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Payments Recorded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {subscriptions.map((sub) => {
                  const isPastDue = new Date(sub.expiryDate) < new Date();
                  const totalPaid = sub.payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;

                  return (
                    <tr key={sub.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">{sub.organization?.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{sub.organization?.slug}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs font-bold text-rose-300">{sub.plan}</span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        ₹{sub.pricePerCycle.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 uppercase text-[10px] font-bold">
                        {sub.billingCycle}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className={`font-medium ${isPastDue ? 'text-rose-400' : 'text-slate-200'}`}>
                          {new Date(sub.expiryDate).toLocaleDateString('en-IN')}
                        </div>
                        {isPastDue && (
                          <div className="text-[10px] text-rose-500 font-semibold">Expired</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                            sub.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="font-bold text-emerald-400">
                          ₹{totalPaid.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {sub.payments?.length || 0} transaction(s)
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2 text-white font-bold text-base">
                  <CreditCard className="w-5 h-5 text-rose-500" />
                  <span>Record SaaS Subscription Payment</span>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRecordPayment} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Select Organization
                  </label>
                  <select
                    required
                    value={formData.organizationId}
                    onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                  >
                    <option value="">-- Choose Tenant Organization --</option>
                    {organizations.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.slug})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                      Amount Received (₹)
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                      placeholder="e.g. 999"
                      className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                    >
                      <option value="UPI">UPI</option>
                      <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                      <option value="CASH">Cash</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                      Reference / UTR ID
                    </label>
                    <input
                      type="text"
                      value={formData.referenceNumber}
                      onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                      placeholder="e.g. UPI-987654321"
                      className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                      Extend Expiry By
                    </label>
                    <select
                      value={formData.extendMonths}
                      onChange={(e) => setFormData({ ...formData, extendMonths: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                    >
                      <option value={1}>+1 Month</option>
                      <option value={3}>+3 Months</option>
                      <option value={6}>+6 Months</option>
                      <option value={12}>+1 Year (12 Months)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Notes / Remarks
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="e.g. Annual renewal settlement"
                    className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Recording...</span>
                      </>
                    ) : (
                      <span>Record Payment</span>
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
