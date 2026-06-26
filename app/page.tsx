'use client';

import React, { useState, useEffect, useCallback } from 'react';
import MemoryPanel from '@/components/Kv';
import Auth from '@/components/Auth';
import ApiKeys from '@/components/ApiKeys';
import Guide from '@/components/Guide';
import { getAuthStatus, logout, API_HOST } from '@/lib/api';

type AuthState = 'loading' | 'unauthenticated' | 'authenticated';
type View = 'memories' | 'apikeys' | 'guide';

export default function Home() {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [username, setUsername] = useState<string | null>(null);
  const [allowRegister, setAllowRegister] = useState(false);
  const [view, setView] = useState<View>('memories');

  const checkAuth = useCallback(async () => {
    try {
      const status = await getAuthStatus();
      setAllowRegister(status.allowRegister);
      setUsername(status.username);
      setAuthState(status.authenticated ? 'authenticated' : 'unauthenticated');
    } catch {
      setAuthState('unauthenticated');
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleAuthenticated = useCallback(async () => {
    await checkAuth();
    setView('memories');
  }, [checkAuth]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch {
      // 忽略登出请求错误
    }
    setUsername(null);
    setAuthState('unauthenticated');
    setView('memories');
  }, []);

  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/40 to-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  if (authState === 'unauthenticated') {
    return (
      <Auth allowRegister={allowRegister} onAuthenticated={handleAuthenticated} />
    );
  }

  return (
    <>
      {view === 'apikeys' ? (
        <ApiKeys apiHost={API_HOST} />
      ) : view === 'guide' ? (
        <Guide apiHost={API_HOST} onBack={() => setView('memories')} />
      ) : (
        <MemoryPanel
          username={username}
          onLogout={handleLogout}
          onShowApiKeys={() => setView('apikeys')}
          onShowGuide={() => setView('guide')}
        />
      )}
      {view !== 'memories' && view !== 'guide' && (
        <div className="max-w-4xl mx-auto px-4 pb-10 -mt-2">
          <button
            onClick={() => setView('memories')}
            className="text-sm text-purple-400 hover:text-purple-300 transition"
          >
            ← 返回记忆库
          </button>
        </div>
      )}
    </>
  );
}
