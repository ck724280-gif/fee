'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  Building2,
  BookOpen,
  School,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Loader2,
  Lock,
  Mail,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

const ORG_TYPES = [
  { id: 'PRIVATE_TUITION', label: 'Private Tuition', icon: GraduationCap, desc: 'For independent tutors & batches' },
  { id: 'COACHING', label: 'Coaching Institute', icon: Sparkles, desc: 'For competitive & board coaching' },
  { id: 'SCHOOL', label: 'School', icon: School, desc: 'For K-12 and primary schools' },
  { id: 'TUTORIAL', label: 'Tutorial Centre', icon: BookOpen, desc: 'For subject-wise tutorials' },
  { id: 'EDUCATIONAL_INSTITUTE', label: 'Educational Institute', icon: Building2, desc: 'For multi-branch colleges & academies' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    organizationName: '',
    organizationType: 'PRIVATE_TUITION',
    ownerName: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleOrgTypeSelect = (typeId: string) => {
    setFormData((prev) => ({ ...prev, organizationType: typeId }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!formData.organizationName.trim()) {
      setError('Please enter your Institute or Tuition Name.');
      return;
    }
    if (!formData.ownerName.trim()) {
      setError('Please enter the Administrator / Owner full name.');
      return;
    }
    if (!formData.email.trim()) {
      setError('Please enter a valid email address.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed. Please try again.');
      }

      setSuccessMsg('Workspace created successfully! Redirecting to your dashboard...');
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background Spatial Lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-2xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wide uppercase mb-4 backdrop-blur-md">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            Security-First Multi-Tenant SaaS
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Create Your Institute Workspace
          </h1>
          <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
            Get an isolated database workspace with automated billing, UPI payments, WhatsApp reminders, and PDF receipts.
          </p>
        </motion.div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl px-4 sm:px-0 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900/80 backdrop-blur-xl py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-800/80 relative"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Organization Type Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                1. Select Institution Type
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {ORG_TYPES.map((t) => {
                  const Icon = t.icon;
                  const isSelected = formData.organizationType === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleOrgTypeSelect(t.id)}
                      className={`p-3 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/50'
                          : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800/80 hover:border-slate-600'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                      <div>
                        <div className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                          {t.label}
                        </div>
                        <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{t.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Organization Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                2. Organization / Institute Name
              </label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  name="organizationName"
                  value={formData.organizationName}
                  onChange={handleChange}
                  placeholder="e.g. Apex Coaching Academy or St. Xavier School"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm transition"
                />
              </div>
            </div>

            {/* Step 3: Owner Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Admin / Owner Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    name="ownerName"
                    value={formData.ownerName}
                    onChange={handleChange}
                    placeholder="e.g. Rahul Sharma"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Mobile / WhatsApp (Optional)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500 pointer-events-none" />
                  <input
                    type="tel"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm transition"
                  />
                </div>
              </div>
            </div>

            {/* Step 4: Login Credentials */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Administrator Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500 pointer-events-none" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="admin@yourinstitute.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Master Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min 6 characters"
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-sm transition"
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Success Message */}
            <AnimatePresence>
              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{successMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Isolated Workspace...</span>
                </>
              ) : (
                <>
                  <span>Create Workspace & Start Free</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-400">
            Already have an organization workspace?{' '}
            <Link
              href="/login"
              className="font-semibold text-indigo-400 hover:text-indigo-300 transition underline underline-offset-4"
            >
              Sign In to Your Workspace
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
