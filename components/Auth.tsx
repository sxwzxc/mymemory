'use client';

import React, { useState } from 'react';
import { login, register } from '@/lib/api';

interface AuthProps {
  allowRegister: boolean;
  onAuthenticated: () => void;
}

export default function Auth({ allowRegister, onAuthenticated }: AuthProps) {
  const [mode, setMode] = useState<'login' | 'register'>(
    allowRegister ? 'register' : 'login'
  );
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    try {
      setSubmitting(true);
      setError(null);
      if (mode === 'register') {
        await register(username.trim(), password);
      }
      await login(username.trim(), password);
      onAuthenticated();
    } catch (err: any) {
      setError(err.message || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/40 to-slate-950 flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl shadow-lg shadow-purple-500/30">
            🧠
          </div>
          <h1 className="mt-4 text-2xl font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-blue-300 bg-clip-text text-transparent">
            AI 记忆库
          </h1>
          <p className="mt-2 text-slate-500 text-sm">
            {mode === 'login' ? '登录以访问你的专属记忆库' : '创建账号，开启你的私密记忆空间'}
          </p>
        </div>

        <div className="bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl">
          {allowRegister && (
            <div className="flex gap-2 mb-5 p-1 bg-slate-950/60 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === 'login'
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'text-slate-500 hover:text-slate-400'
                }`}
              >
                登录
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === 'register'
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'text-slate-500 hover:text-slate-400'
                }`}
              >
                注册
              </button>
            </div>
          )}

          {!allowRegister && mode === 'register' && (
            <div className="mb-5 text-sm text-amber-300/80 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              管理员当前已关闭注册功能，仅可登录。
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-1.5">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="字母/数字/_-.，3-32 位"
                required
                autoComplete="username"
                className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition"
              />
            </div>
            <div className="mb-5">
              <label className="block text-sm text-slate-400 mb-1.5">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? '至少 6 位' : '请输入密码'}
                required
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition"
              />
            </div>

            {error && (
              <div className="mb-4 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  处理中...
                </span>
              ) : mode === 'login' ? (
                '登录'
              ) : (
                '注册并登录'
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-xs text-slate-700">
          记忆数据存储在 EdgeOne Pages KV · 每个用户独立隔离
        </p>
      </div>
    </div>
  );
}
