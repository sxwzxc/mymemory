'use client';

import React, { useState } from 'react';
import { SKILL_TEMPLATES } from '@/lib/api';

interface GuideProps {
  apiHost?: string;
  onBack?: () => void;
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const text = typeof children === 'string' ? children : '';
  return (
    <div className="relative group">
      <pre className="overflow-x-auto rounded-xl bg-slate-950/80 border border-slate-800 p-4 text-xs leading-relaxed text-slate-300 font-mono">
        {children}
      </pre>
      {text && (
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              /* ignore */
            }
          }}
          className="absolute top-2 right-2 px-2 py-1 text-[11px] rounded-md bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition opacity-0 group-hover:opacity-100"
        >
          {copied ? '已复制' : '复制'}
        </button>
      )}
    </div>
  );
}

export default function Guide({ apiHost, onBack }: GuideProps) {
  const host = apiHost || '(当前域名)';
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <header className="sticky top-0 z-20 backdrop-blur-2xl bg-slate-950/60 border-b border-slate-800/60">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {onBack && (
              <button
                onClick={onBack}
                className="px-3 py-2 bg-slate-800/60 text-slate-300 rounded-xl font-medium hover:bg-slate-700/60 transition text-sm border border-slate-700/40 whitespace-nowrap"
              >
                ← 返回
              </button>
            )}
            <div className="min-w-0">
              <h1 className="text-lg font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-blue-300 bg-clip-text text-transparent truncate">
                使用说明
              </h1>
              <p className="text-slate-500 text-xs">如何在 AI 中用好你的记忆库</p>
            </div>
          </div>
        </div>
      </header>

      <div className="relative max-w-3xl mx-auto px-4 py-8 space-y-10">
        {/* 顶部导引 */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
          <p className="text-slate-300 leading-relaxed text-sm">
            AI 记忆库把你的内容分成两类：<span className="text-purple-300 font-medium">记忆</span>（给自己看）和
            <span className="text-amber-300 font-medium"> Skill</span>（给 AI 用）。
            Skill 可以一键复制为提示词，粘贴到 ChatGPT / Claude / Gemini 等任意 AI 中即可生效。
          </p>
        </div>

        {/* 概念区分 */}
        <section id="concept" className="scroll-mt-20">
          <h2 className="text-xl font-semibold text-slate-100 mb-1">记忆 vs Skill</h2>
          <p className="text-slate-500 text-sm mb-4">两种内容类型，用途完全不同。</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-5">
              <div className="text-2xl mb-2">📝</div>
              <h3 className="text-purple-200 font-semibold mb-2">记忆</h3>
              <ul className="text-slate-400 text-sm space-y-1.5 leading-relaxed">
                <li>· 给你自己看的内容</li>
                <li>· 个人笔记、知识点、回忆</li>
                <li>· 不强求结构，自由记录</li>
                <li>· 例如：今天读了某书的要点</li>
              </ul>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
              <div className="text-2xl mb-2">⚡</div>
              <h3 className="text-amber-200 font-semibold mb-2">Skill</h3>
              <ul className="text-slate-400 text-sm space-y-1.5 leading-relaxed">
                <li>· 结构化的 AI 指令</li>
                <li>· 可在 AI 工具中复用的提示词</li>
                <li>· 包含使用场景、示例、分类</li>
                <li>· 例如：中英互译、代码评审</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 在 AI 中复用 */}
        <section id="ai" className="scroll-mt-20">
          <h2 className="text-xl font-semibold text-slate-100 mb-1">在 AI 中复用 Skill</h2>
          <p className="text-slate-500 text-sm mb-4">三步让你的 Skill 在任意 AI 里生效。</p>
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-sm font-semibold">1</span>
              <div>
                <p className="text-slate-200 text-sm font-medium">在 Skill 卡片点击「复制为 AI Prompt」</p>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                  系统会把 Skill 的内容、使用场景、示例整理成结构化提示词并复制到剪贴板。
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-sm font-semibold">2</span>
              <div>
                <p className="text-slate-200 text-sm font-medium">粘贴到 AI 对话框</p>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                  支持 ChatGPT、Claude、Gemini、文心一言、通义千问等任何接受自然语言的 AI。
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-sm font-semibold">3</span>
              <div>
                <p className="text-slate-200 text-sm font-medium">开始对话，AI 即按该 Skill 工作</p>
                <p className="text-slate-500 text-xs mt-1 leading-relaxed">
                  复制后的提示词已包含完整上下文，AI 无需额外配置即可理解并执行。
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-slate-800">
              <p className="text-xs text-slate-500 mb-2">复制后的提示词示例（节选）：</p>
              <CodeBlock>{`# Skill：中英互译助手

## 使用场景
需要将中文翻译为英文，或将英文翻译为中文时调用

## 指令内容
你是一位专业的中英互译助手。请将用户提供的文本...

## 示例
1. 请把这段话翻译成英文：今天天气真好
2. Translate to Chinese: The system is down.`}</CodeBlock>
            </div>
          </div>
        </section>

        {/* 模板 */}
        <section id="templates" className="scroll-mt-20">
          <h2 className="text-xl font-semibold text-slate-100 mb-1">内置 Skill 模板</h2>
          <p className="text-slate-500 text-sm mb-4">在新建 Skill 时可一键套用，省去从零编写。</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {SKILL_TEMPLATES.map((t) => (
              <div key={t.name} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-amber-200 font-medium text-sm">{t.name}</h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400/80 border border-amber-500/20">
                    {t.category}
                  </span>
                </div>
                <p className="text-slate-500 text-xs leading-relaxed">{t.usage}</p>
              </div>
            ))}
          </div>
          <p className="text-slate-600 text-xs mt-3 leading-relaxed">
            提示：模板只是起点，你可以在创建后自由修改内容，打造专属自己的 Skill。
          </p>
        </section>

        {/* API */}
        <section id="api" className="scroll-mt-20">
          <h2 className="text-xl font-semibold text-slate-100 mb-1">API 接口</h2>
          <p className="text-slate-500 text-sm mb-4">用程序化方式读写你的记忆库（先在「API Keys」页创建密钥）。</p>
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 space-y-4">
            <div>
              <p className="text-slate-300 text-sm mb-2">所有请求需在 Header 携带：</p>
              <CodeBlock>{`Authorization: Bearer <你的 API Key>`}</CodeBlock>
            </div>
            <div className="space-y-2">
              {[
                { m: 'GET', p: '/api/memories', d: '列出全部记忆与 Skill' },
                { m: 'GET', p: '/api/memories/get?key=KEY', d: '获取单条' },
                { m: 'POST', p: '/api/memories/set', d: '新增 / 更新（body: {key,value,meta}）' },
                { m: 'DELETE', p: '/api/memories/delete?key=KEY', d: '删除单条' },
              ].map((row) => (
                <div key={row.p} className="flex items-center gap-3 text-sm">
                  <span className="inline-block w-16 text-center px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[11px] font-mono">
                    {row.m}
                  </span>
                  <code className="text-purple-300 font-mono text-xs break-all">{host}{row.p}</code>
                  <span className="text-slate-600 text-xs ml-auto whitespace-nowrap">{row.d}</span>
                </div>
              ))}
            </div>
            <div className="pt-3 border-t border-slate-800">
              <p className="text-xs text-slate-500 mb-2">curl 示例：</p>
              <CodeBlock>{`curl -H "Authorization: Bearer mm_xxxxxxxx" \\
  ${host}/api/memories`}</CodeBlock>
            </div>
          </div>
        </section>

        {/* 存储 */}
        <section id="storage" className="scroll-mt-20">
          <h2 className="text-xl font-semibold text-slate-100 mb-1">数据存储</h2>
          <p className="text-slate-500 text-sm mb-4">你的数据这样被保护与隔离。</p>
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 space-y-2 text-sm text-slate-400 leading-relaxed">
            <p>· 全部数据存储在 <span className="text-slate-200">腾讯云 EdgeOne Pages KV</span> 存储。</p>
            <p>· 每个用户的记忆库完全独立，互不可见，键名以 <code className="text-purple-300">memories_&lt;用户名&gt;</code> 隔离。</p>
            <p>· 密码使用 HMAC-SHA256 + 随机盐哈希存储，明文不可逆推。</p>
            <p>· 会话基于 HttpOnly Cookie，30 天有效。</p>
          </div>
        </section>

        <footer className="text-center py-8 text-slate-700 text-xs">
          AI 记忆库 · 让知识与技能在 AI 时代流动起来
        </footer>
      </div>
    </div>
  );
}
