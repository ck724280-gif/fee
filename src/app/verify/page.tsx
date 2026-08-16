'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  Download,
  Loader2,
  Building2,
  Calendar,
  CreditCard,
  Hash,
  User,
  GraduationCap,
  ArrowRight,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function PublicReceiptVerificationPage() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [instituteSettings, setInstituteSettings] = useState<any | null>(null);

  useEffect(() => {
    // Fetch institute branding
    fetch('/api/settings')
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setInstituteSettings(json.data);
      })
      .catch(() => {});

    // Check URL params for quick verification
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q') || params.get('token') || params.get('receipt');
      if (q) {
        setQuery(q);
        performVerification(q);
      }
    }
  }, []);

  const performVerification = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/verify?q=${encodeURIComponent(searchQuery.trim())}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Receipt or Document not found in official registry.');
      }

      setResult(json.data);
    } catch (err: any) {
      setError(err.message || 'Verification check failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performVerification(query);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 py-10 px-4 sm:px-6 flex flex-col justify-between">
      <div className="max-w-2xl mx-auto w-full space-y-8">
        {/* Top Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-600 text-white flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Official Public Document Verification
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Verify authenticity of tuition receipts, fee notices, and student payment proofs issued by{' '}
            <strong className="text-slate-200">
              {instituteSettings?.instituteName || 'DPR Private Tuition'}
            </strong>
          </p>
        </div>

        {/* Verification Search Bar */}
        <form onSubmit={handleSearch} className="relative">
          <div className="flex items-center bg-slate-900 border-2 border-slate-700 focus-within:border-emerald-500 rounded-2xl p-2 shadow-2xl transition-all">
            <Search className="w-5 h-5 text-slate-400 ml-3 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter Receipt No (DPR-RC-...), Token or Student ID..."
              className="w-full px-3 py-2 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-emerald-600/30 cursor-pointer shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Verify</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Verification Unsuccessful</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Verification Success Result Card */}
        {result && (
          <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border-2 border-emerald-500/40 p-6 sm:p-8 space-y-6 shadow-2xl shadow-emerald-500/10 animate-in zoom-in-95">
            {/* Status Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                    Official &amp; Verified
                  </span>
                  <h3 className="text-lg font-bold text-white mt-0.5">
                    Authentic {result.documentType || 'Receipt'} on Record
                  </h3>
                </div>
              </div>
              <div className="text-left sm:text-right font-mono text-xs text-slate-400">
                <span>Timestamp: {result.verifiedAt}</span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 space-y-1">
                <span className="text-slate-400 block font-medium">Student Name (Masked for Privacy)</span>
                <span className="text-sm font-bold text-slate-100 block">{result.maskedStudentName}</span>
                <span className="text-slate-400 block text-[11px]">Class: {result.className}</span>
              </div>

              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 space-y-1">
                <span className="text-slate-400 block font-medium">Receipt / Reference Number</span>
                <span className="text-sm font-mono font-bold text-emerald-400 block">
                  {result.receiptNumber || result.referenceCode}
                </span>
                <span className="text-slate-400 block text-[11px]">
                  Student ID: {result.studentCode}
                </span>
              </div>

              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 space-y-1">
                <span className="text-slate-400 block font-medium">Payment Amount Verified</span>
                <span className="text-base font-mono font-extrabold text-white block">
                  {formatCurrency(result.amount)}
                </span>
                <span className="text-emerald-400 block text-[11px] font-semibold">
                  Mode: {result.paymentMethod || 'UPI'} {result.utrNumber ? `(UTR: ${result.utrNumber})` : ''}
                </span>
              </div>

              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 space-y-1">
                <span className="text-slate-400 block font-medium">Issue Date &amp; Status</span>
                <span className="text-sm font-bold text-slate-100 block">{result.paymentDate}</span>
                <span className="text-emerald-400 block text-[11px] font-bold">
                  Status: 100% SETTLED &amp; RECORDED
                </span>
              </div>
            </div>

            {/* Cryptographic SHA-256 Hash Seal */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-[11px]">
              <div className="flex items-center justify-between text-slate-400 font-mono">
                <span className="flex items-center gap-1 text-slate-300">
                  <Hash className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Digital Cryptographic Signature</span>
                </span>
                <span className="text-emerald-400 font-bold">SHA-256 Valid</span>
              </div>
              <div className="font-mono text-slate-500 break-all select-all text-[10px]">
                {result.signatureHash}
              </div>
            </div>

            {/* Action Links */}
            {result.documentToken && (
              <div className="pt-2 flex justify-center">
                <a
                  href={`/api/documents/download/${result.documentToken}`}
                  className="inline-flex items-center gap-2 py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Verified PDF Document</span>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Verification Info Footer */}
        <div className="pt-6 border-t border-slate-800 text-center text-xs text-slate-500 space-y-2">
          <p>
            Official digital verification portal for {instituteSettings?.instituteName || 'DPR Private Tuition'}.
          </p>
          <p className="text-[11px] text-slate-600">
            Receipts and fee notices issued by the institute carry unique anti-tamper reference signatures.
          </p>
        </div>
      </div>
    </main>
  );
}
