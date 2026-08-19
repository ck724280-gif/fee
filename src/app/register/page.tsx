'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShieldAlert, ArrowRight, Building2, Lock, Sparkles, LogIn } from 'lucide-react';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-blue-500 selection:text-white relative overflow-hidden">
      {/* Background glow orbs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center space-y-6"
      >
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-rose-500/20 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-xl shadow-amber-500/10">
          <Lock className="w-8 h-8 text-amber-400" />
        </div>

        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold mb-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>DIRECT REGISTRATION DISABLED</span>
          </div>
          <h1 className="text-2xl font-black text-white">Private Platform Access</h1>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Self-service public registration is disabled on this platform. All Institute workspaces and accounts are created exclusively by the <strong>Master Super Administrator</strong>.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 text-left text-xs text-slate-300 space-y-2">
          <p className="font-semibold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            <span>Already have credentials?</span>
          </p>
          <p className="text-[11px] text-slate-400">
            Please log in using the User ID (Email) and Password provided by your platform Super Administrator.
          </p>
        </div>

        <Link
          href="/login"
          className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs shadow-xl shadow-indigo-600/25 transition duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
        >
          <LogIn className="w-4 h-4" />
          <span>Proceed to Institute Login</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>
    </div>
  );
}
