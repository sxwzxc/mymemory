'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  listApiKeys,
  createApiKey,
  deleteApiKey,
  ApiKeyInfo,
} from '@/lib/api';

interface ApiKeysProps {
  apiHost: string;
  onBack?: () => void;
}

export default function ApiKeys({ apiHost, onBack }: ApiKeysProps) {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setKeys(await listApiKeys());
    } catch (err: any) {
      setError(err.message || '获取 API Key 列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      setError(null);
      const { apiKey } = await createApiKey(newName.trim() || '默认 Key');
      setCreatedSecret(apiKey);
      setCopied(false);
      setNewName('');
      await fetchKeys();
    } catch (err: any) {
      setError(err.message || '创建失败');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该 API Key 吗？删除后无法恢复。')) return;
    try {
      setDeletingId(id);
      await deleteApiKey(id);
      await fetchKeys();
    } catch (err: any) {
      setError(err.message || '删除失败');
    } finally {
      setDeletingId(null);
    }
  };

  const copySecret = async () => {
    if (!createdSecret) return;
    try {
      await navigator.clipboard.writeText(createdSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 忽略剪贴板权限错误
    }
  };

  const formatDate = (s?: string) => {
    if (!s) return '';
    try {
      return new Date(s).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return s;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <header className="sticky top-0 z-20 backdrop-blur-2xl bg-slate-950/60 border-b border-slate-800/60">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="px-3 py-2 bg-slate-800/60 text-slate-300 rounded-xl font-medium hover:bg-slate-700/60 transition text-sm border border-slate-700/40 whitespace-nowrap"
            >
              ← 返回
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-blue-300 bg-clip-text text-transparent truncate">
                API Keys
              </h1>
              <p className="text-slate-500 text-xs">用程序化方式读写你的记忆库</p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-4xl mx-auto px-4 py-6">
      {/* 创建表单 */}
      <div className="mb-6 bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-slate-200 mb-1">创建新的 API Key</h2>
        <p className="text-sm text-slate-500 mb-4">
          创建后可通过 HTTP 接口程序化地读写你的记忆库。请妥善保管，密钥仅显示一次。
        </p>
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="给这个 Key 取个名字（可选）"
            className="flex-1 px-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition"
          />
          <button
            type="submit"
            disabled={creating}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
          >
            {creating ? '创建中...' : '+ 生成 Key'}
          </button>
        </form>
      </div>

      {/* 新创建的密钥展示 */}
      {createdSecret && (
        <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-emerald-300 font-semibold">密钥已生成（请立即复制保存）</h3>
            <button
              onClick={() => setCreatedSecret(null)}
              className="text-slate-400 hover:text-slate-200 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-800"
            >
              ✕
            </button>
          </div>
          <div className="flex gap-2">
            <code className="flex-1 px-4 py-3 bg-slate-950/80 border border-emerald-500/20 rounded-xl text-emerald-200 text-sm font-mono break-all">
              {createdSecret}
            </code>
            <button
              onClick={copySecret}
              className="px-4 py-3 bg-emerald-500/20 text-emerald-200 rounded-xl font-medium hover:bg-emerald-500/30 transition text-sm whitespace-nowrap"
            >
              {copied ? '已复制' : '复制'}
            </button>
          </div>
          <p className="mt-3 text-xs text-emerald-400/70">
            关闭后该密钥将不再显示，如丢失请删除后重新生成。
          </p>
        </div>
      )}

      {/* API 用法说明 */}
      <div className="mb-6 bg-slate-900/50 border border-slate-800/60 rounded-2xl p-6">
        <h3 className="text-slate-300 font-medium mb-3">API 使用方式</h3>
        <div className="space-y-2 text-sm text-slate-400">
          <p>所有请求需在 Header 中携带：<code className="text-purple-300 bg-slate-950/60 px-1.5 py-0.5 rounded">Authorization: Bearer &lt;你的 API Key&gt;</code></p>
          <div className="mt-3 space-y-1.5 font-mono text-xs text-slate-500">
            <p><span className="text-slate-400">GET   </span>{apiHost || '(当前域名)'}/api/memories <span className="text-slate-600">— 列出全部</span></p>
            <p><span className="text-slate-400">GET   </span>{apiHost || '(当前域名)'}/api/memories/get?key=KEY <span className="text-slate-600">— 获取单条</span></p>
            <p><span className="text-slate-400">POST  </span>{apiHost || '(当前域名)'}/api/memories/set <span className="text-slate-600">— 新增/更新（body: {`{key,value,meta}`})</span></p>
            <p><span className="text-slate-400">DELETE</span>{apiHost || '(当前域名)'}/api/memories/delete?key=KEY <span className="text-slate-600">— 删除</span></p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          {error}
        </div>
      )}

      {/* Key 列表 */}
      <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800/60 flex items-center justify-between">
          <h3 className="text-slate-200 font-medium">我的 API Keys</h3>
          <span className="text-xs text-slate-500">{keys.length} 个</span>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 bg-slate-800/60 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : keys.length === 0 ? (
          <div className="p-10 text-center text-slate-600 text-sm">
            还没有 API Key，创建一个开始使用接口吧。
          </div>
        ) : (
          <ul className="divide-y divide-slate-800/60">
            {keys.map((k) => (
              <li
                key={k.id}
                className="px-6 py-4 flex items-center justify-between gap-3 hover:bg-slate-800/30 transition"
              >
                <div className="min-w-0">
                  <div className="text-slate-200 font-medium truncate">{k.name}</div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    创建于 {formatDate(k.createdAt)} · ID: {k.id}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(k.id)}
                  disabled={deletingId === k.id}
                  className="px-3 py-1.5 text-sm text-slate-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition disabled:opacity-50 whitespace-nowrap"
                >
                  {deletingId === k.id ? '删除中...' : '🗑️ 删除'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="text-center py-10 text-slate-700 text-xs">
        <p>API Key 采用 SHA-256 哈希存储 · 仅创建时明文显示一次</p>
      </footer>
      </div>
    </div>
  );
}
