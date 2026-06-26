'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  listMemories,
  addMemory,
  updateMemory,
  deleteMemory,
  formatSkillAsPrompt,
  SKILL_TEMPLATES,
  SKILL_CATEGORY_LABELS,
  SkillCategory,
  Memory,
} from '@/lib/api';

interface MemoryPanelProps {
  username?: string | null;
  onLogout?: () => void;
  onShowApiKeys?: () => void;
  onShowGuide?: () => void;
}

type ItemType = 'memory' | 'skill';
type FilterType = 'all' | ItemType;

interface FormData {
  title: string;
  content: string;
  tags: string;
  type: ItemType;
  usage: string;
  examples: string;
  category: SkillCategory | '';
  createdAt?: string;
}

const EMPTY_FORM: FormData = {
  title: '',
  content: '',
  tags: '',
  type: 'memory',
  usage: '',
  examples: '',
  category: '',
};

const CATEGORY_OPTIONS: SkillCategory[] = [
  'translate',
  'summary',
  'writing',
  'code',
  'roleplay',
  'analysis',
  'other',
];

export default function MemoryPanel({
  username,
  onLogout,
  onShowApiKeys,
  onShowGuide,
}: MemoryPanelProps = {}) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 新增/编辑表单
  const [showForm, setShowForm] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  // 搜索 & 筛选
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  // 删除确认
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  // 复制提示词反馈
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchMemories = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await listMemories();
      setMemories(data.items || []);
    } catch (err: any) {
      setError(err.message || '获取记忆失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const openCreateForm = (type: ItemType = 'memory') => {
    setEditingKey(null);
    setForm({ ...EMPTY_FORM, type });
    setShowForm(true);
  };

  const applyTemplate = (idx: number) => {
    const t = SKILL_TEMPLATES[idx];
    if (!t) return;
    setForm({
      ...EMPTY_FORM,
      type: 'skill',
      title: t.title,
      content: t.content,
      usage: t.usage,
      examples: t.examples.join('\n'),
      category: t.category,
      tags: t.category,
    });
  };

  const openEditForm = (mem: Memory) => {
    setEditingKey(mem.key);
    setForm({
      title: mem.meta?.title || '',
      content: mem.value,
      tags: (mem.meta?.tags || []).join(', '),
      type: mem.meta?.type || 'memory',
      usage: mem.meta?.usage || '',
      examples: (mem.meta?.examples || []).join('\n'),
      category: mem.meta?.category || '',
      createdAt: mem.meta?.createdAt,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingKey(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;

    const tags = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const isSkill = form.type === 'skill';
    const examples = form.examples
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      setIsSaving(true);
      if (editingKey) {
        await updateMemory(editingKey, form.content, {
          title: form.title.trim(),
          tags,
          type: form.type,
          usage: isSkill ? form.usage.trim() || undefined : undefined,
          examples: isSkill && examples.length ? examples : undefined,
          category: isSkill && form.category ? (form.category as SkillCategory) : undefined,
          createdAt: form.createdAt,
        });
      } else {
        const key = `${form.type}_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}`;
        await addMemory(key, form.content, {
          title: form.title.trim(),
          tags,
          type: form.type,
          usage: isSkill ? form.usage.trim() || undefined : undefined,
          examples: isSkill && examples.length ? examples : undefined,
          category: isSkill && form.category ? (form.category as SkillCategory) : undefined,
        });
      }
      closeForm();
      await fetchMemories();
    } catch (err: any) {
      setError(err.message || '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (key: string) => {
    try {
      setDeletingKey(key);
      await deleteMemory(key);
      await fetchMemories();
    } catch (err: any) {
      setError(err.message || '删除失败');
    } finally {
      setDeletingKey(null);
    }
  };

  const handleCopyPrompt = async (mem: Memory) => {
    try {
      const text = formatSkillAsPrompt(mem);
      await navigator.clipboard.writeText(text);
      setCopiedKey(mem.key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // 忽略剪贴板权限错误
    }
  };

  // 搜索 + 筛选
  const filteredMemories = useMemo(() => {
    let result = memories;
    if (filter !== 'all') {
      result = result.filter((m) => (m.meta?.type || 'memory') === filter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (m) =>
          (m.meta?.title || '').toLowerCase().includes(q) ||
          m.value.toLowerCase().includes(q) ||
          (m.meta?.tags || []).some((t) => t.toLowerCase().includes(q)) ||
          (m.meta?.usage || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [memories, filter, search]);

  const memoryCount = memories.filter(
    (m) => (m.meta?.type || 'memory') === 'memory'
  ).length;
  const skillCount = memories.filter((m) => m.meta?.type === 'skill').length;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/40 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 max-w-md text-center backdrop-blur-xl">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-300 mb-6 leading-relaxed">{error}</p>
          <button
            onClick={fetchMemories}
            className="px-5 py-2.5 bg-red-500/20 text-red-200 rounded-xl hover:bg-red-500/30 transition font-medium"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950">
      {/* 背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-pink-600/8 rounded-full blur-3xl" />
      </div>

      {/* 顶部导航 */}
      <header className="sticky top-0 z-20 backdrop-blur-2xl bg-slate-950/60 border-b border-slate-800/60">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl shadow-lg shadow-purple-500/30">
                🧠
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-300 via-pink-300 to-blue-300 bg-clip-text text-transparent">
                  AI 记忆库
                </h1>
                <p className="text-slate-500 text-xs mt-0.5">
                  {memoryCount} 条记忆 · {skillCount} 个 Skill
                  {username ? ` · @${username}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {onShowGuide && (
                <button
                  onClick={onShowGuide}
                  className="px-3 py-2.5 bg-slate-800/60 text-slate-300 rounded-xl font-medium hover:bg-slate-700/60 transition text-sm border border-slate-700/40"
                  title="使用说明"
                >
                  📖 说明
                </button>
              )}
              {onShowApiKeys && (
                <button
                  onClick={onShowApiKeys}
                  className="px-3 py-2.5 bg-slate-800/60 text-slate-300 rounded-xl font-medium hover:bg-slate-700/60 transition text-sm border border-slate-700/40"
                  title="API Keys"
                >
                  🔑 API Keys
                </button>
              )}
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="px-3 py-2.5 bg-slate-800/60 text-slate-400 rounded-xl font-medium hover:bg-red-500/15 hover:text-red-300 transition text-sm border border-slate-700/40"
                  title="退出登录"
                >
                  退出
                </button>
              )}
              <button
                onClick={() => openCreateForm('memory')}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/25 text-sm"
              >
                <span className="text-base leading-none">+</span> 新增
              </button>
            </div>
          </div>

          {/* 搜索栏 */}
          <div className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                🔍
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索标题、内容、标签或使用场景..."
                className="w-full pl-9 pr-4 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition"
              />
            </div>
          </div>

          {/* 筛选标签 */}
          <div className="mt-3 flex gap-2">
            {(
              [
                { key: 'all', label: '全部', count: memories.length },
                { key: 'memory', label: '记忆', count: memoryCount },
                { key: 'skill', label: 'Skill', count: skillCount },
              ] as { key: FilterType; label: string; count: number }[]
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filter === tab.key
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'bg-slate-900/40 text-slate-500 border border-slate-800/60 hover:text-slate-400'
                }`}
              >
                {tab.label}
                <span className="ml-1.5 text-xs opacity-70">{tab.count}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="relative max-w-4xl mx-auto px-4 py-6">
        {/* 新增/编辑表单 */}
        {showForm && (
          <div className="mb-6 bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 animate-in fade-in slide-in-from-top-4 shadow-2xl shadow-purple-500/5">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-200">
                {editingKey ? '✏️ 编辑' : '✨ 写下新的'}
              </h2>
              <button
                onClick={closeForm}
                className="text-slate-500 hover:text-slate-300 transition w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              {/* 类型切换 */}
              <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-2">类型</label>
                <div className="flex gap-2">
                  {(
                    [
                      { key: 'memory', label: '📝 记忆', desc: '个人记忆、笔记' },
                      { key: 'skill', label: '⚡ Skill', desc: '技能、提示词' },
                    ] as { key: ItemType; label: string; desc: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setForm({ ...form, type: opt.key })}
                      className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                        form.type === opt.key
                          ? opt.key === 'skill'
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                            : 'bg-purple-500/15 text-purple-300 border-purple-500/40'
                          : 'bg-slate-900/40 text-slate-500 border-slate-800 hover:text-slate-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skill 模板快建 */}
              {form.type === 'skill' && !editingKey && (
                <div className="mb-4 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-amber-300/90 font-medium">
                      🚀 一键套用模板
                    </label>
                    <span className="text-xs text-slate-500">点击后自动填充</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SKILL_TEMPLATES.map((t, i) => (
                      <button
                        key={t.name}
                        type="button"
                        onClick={() => applyTemplate(i)}
                        className="px-3 py-1.5 text-xs rounded-lg bg-slate-900/60 border border-slate-700/60 text-slate-300 hover:bg-amber-500/15 hover:text-amber-200 hover:border-amber-500/40 transition"
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-1.5">标题</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder={
                    form.type === 'skill'
                      ? '给这个 Skill 取个名字...'
                      : '给这段记忆取个名字...'
                  }
                  required
                  className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition"
                />
              </div>

              {/* Skill 专属：使用场景 */}
              {form.type === 'skill' && (
                <div className="mb-4">
                  <label className="block text-sm text-slate-400 mb-1.5">
                    使用场景 <span className="text-slate-600">（告诉 AI 何时调用，可选）</span>
                  </label>
                  <input
                    type="text"
                    value={form.usage}
                    onChange={(e) => setForm({ ...form, usage: e.target.value })}
                    placeholder="例如：需要将中文翻译为英文时调用"
                    className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition"
                  />
                </div>
              )}

              {/* Skill 专属：分类 */}
              {form.type === 'skill' && (
                <div className="mb-4">
                  <label className="block text-sm text-slate-400 mb-1.5">
                    分类 <span className="text-slate-600">（可选）</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, category: '' })}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition ${
                        form.category === ''
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                          : 'bg-slate-900/40 text-slate-500 border-slate-800 hover:text-slate-400'
                      }`}
                    >
                      不指定
                    </button>
                    {CATEGORY_OPTIONS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm({ ...form, category: c })}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition ${
                          form.category === c
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                            : 'bg-slate-900/40 text-slate-500 border-slate-800 hover:text-slate-400'
                        }`}
                      >
                        {SKILL_CATEGORY_LABELS[c]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-1.5">内容</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder={
                    form.type === 'skill'
                      ? '写下 Skill 的提示词或指令内容...'
                      : '写下你想记住的内容...一段回忆、一个知识点、一个想法...'
                  }
                  required
                  rows={6}
                  className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition resize-y font-mono text-sm leading-relaxed"
                />
              </div>

              {/* Skill 专属：示例 */}
              {form.type === 'skill' && (
                <div className="mb-4">
                  <label className="block text-sm text-slate-400 mb-1.5">
                    示例 <span className="text-slate-600">（每行一条，复制为 Prompt 时会附带，可选）</span>
                  </label>
                  <textarea
                    value={form.examples}
                    onChange={(e) => setForm({ ...form, examples: e.target.value })}
                    placeholder={'每行一个示例输入或示例提示词\n例如：请把这段话翻译成英文：今天天气真好'}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition resize-y font-mono text-sm leading-relaxed"
                  />
                </div>
              )}

              <div className="mb-5">
                <label className="block text-sm text-slate-400 mb-1.5">
                  标签（用逗号分隔，可选）
                </label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="例如：personal, coding, prompt"
                  className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-5 py-3 bg-slate-800 text-slate-300 rounded-xl font-medium hover:bg-slate-700 transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20"
                >
                  {isSaving ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      保存中...
                    </span>
                  ) : editingKey ? (
                    '更新'
                  ) : (
                    '保存'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 加载骨架屏 */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 animate-pulse"
              >
                <div className="h-5 bg-slate-800 rounded w-1/3 mb-3" />
                <div className="h-4 bg-slate-800/60 rounded w-full mb-2" />
                <div className="h-4 bg-slate-800/60 rounded w-3/4" />
                <div className="flex gap-2 mt-4">
                  <div className="h-5 bg-slate-800/60 rounded-full w-16" />
                  <div className="h-5 bg-slate-800/60 rounded-full w-20" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 空状态 */}
        {!isLoading && memories.length === 0 && !showForm && (
          <div className="text-center py-24">
            <div className="text-7xl mb-6 animate-in fade-in">🧠</div>
            <h3 className="text-xl font-semibold text-slate-300 mb-2">
              还没有任何记忆
            </h3>
            <p className="text-slate-500 mb-8 max-w-sm mx-auto leading-relaxed">
              把你的所思所想、知识笔记、AI 提示词都存到这里，打造属于你自己的 AI 记忆库。
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => openCreateForm('memory')}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-medium hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-500/25"
              >
                📝 写第一条记忆
              </button>
              <button
                onClick={() => openCreateForm('skill')}
                className="px-6 py-3 bg-slate-800 text-slate-300 rounded-xl font-medium hover:bg-slate-700 transition-all border border-slate-700"
              >
                ⚡ 添加 Skill
              </button>
            </div>
            {onShowGuide && (
              <button
                onClick={onShowGuide}
                className="mt-4 text-sm text-purple-400 hover:text-purple-300 transition"
              >
                不知道怎么开始？查看使用说明 →
              </button>
            )}
          </div>
        )}

        {/* 搜索无结果 */}
        {!isLoading && memories.length > 0 && filteredMemories.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-slate-500">没有找到匹配的内容</p>
            <button
              onClick={() => {
                setSearch('');
                setFilter('all');
              }}
              className="mt-4 text-purple-400 hover:text-purple-300 transition text-sm"
            >
              清除筛选条件
            </button>
          </div>
        )}

        {/* 记忆列表 */}
        {!isLoading && filteredMemories.length > 0 && (
          <div className="space-y-4">
            {filteredMemories.map((mem) => {
              const type = mem.meta?.type || 'memory';
              const isSkill = type === 'skill';
              const categoryLabel = mem.meta?.category
                ? SKILL_CATEGORY_LABELS[mem.meta.category] || mem.meta.category
                : '';
              return (
                <div
                  key={mem.key}
                  className={`group relative bg-slate-900/50 backdrop-blur border rounded-2xl p-6 transition-all hover:shadow-2xl hover:shadow-purple-500/5 hover:-translate-y-0.5 ${
                    isSkill
                      ? 'border-amber-500/20 hover:border-amber-500/40'
                      : 'border-slate-800/60 hover:border-purple-500/40'
                  }`}
                >
                  {/* 类型标识 */}
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md flex-shrink-0 ${
                          isSkill
                            ? 'bg-amber-500/15 text-amber-300'
                            : 'bg-purple-500/15 text-purple-300'
                        }`}
                      >
                        {isSkill ? '⚡ Skill' : '📝 记忆'}
                      </span>
                      {isSkill && categoryLabel && (
                        <span className="inline-flex px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-800/80 text-slate-400 border border-slate-700/60 flex-shrink-0">
                          {categoryLabel}
                        </span>
                      )}
                      <h3 className="text-lg font-semibold text-slate-100 break-words">
                        {mem.meta?.title || '未命名'}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition flex-shrink-0">
                      {isSkill && (
                        <button
                          onClick={() => handleCopyPrompt(mem)}
                          title="复制为 AI Prompt"
                          className="px-2.5 py-1.5 text-xs text-amber-300/90 hover:text-amber-200 hover:bg-amber-500/10 rounded-lg transition"
                        >
                          {copiedKey === mem.key ? '✓ 已复制' : '📋 复制 Prompt'}
                        </button>
                      )}
                      <button
                        onClick={() => openEditForm(mem)}
                        className="px-2.5 py-1.5 text-sm text-slate-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition"
                        title="编辑"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(mem.key)}
                        disabled={deletingKey === mem.key}
                        className="px-2.5 py-1.5 text-sm text-slate-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition disabled:opacity-50"
                        title="删除"
                      >
                        {deletingKey === mem.key ? (
                          <span className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin inline-block" />
                        ) : (
                          '🗑️'
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 使用场景（Skill 专属） */}
                  {isSkill && mem.meta?.usage && (
                    <div className="mb-3 text-xs text-amber-200/70 bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2 leading-relaxed">
                      <span className="text-amber-300/80 font-medium">使用场景：</span>
                      {mem.meta.usage}
                    </div>
                  )}

                  {/* 内容 */}
                  <p className="text-slate-300 leading-7 whitespace-pre-wrap break-words text-[15px]">
                    {mem.value}
                  </p>

                  {/* 示例（Skill 专属，折叠） */}
                  {isSkill && mem.meta?.examples && mem.meta.examples.length > 0 && (
                    <details className="mt-3 group/details">
                      <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-400 transition select-none">
                        示例（{mem.meta.examples.length} 条）· 点击展开
                      </summary>
                      <ul className="mt-2 space-y-1 pl-1">
                        {mem.meta.examples.map((ex, i) => (
                          <li
                            key={i}
                            className="text-xs text-slate-400 leading-relaxed border-l-2 border-amber-500/20 pl-3"
                          >
                            {ex}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  {/* 标签 + 时间 */}
                  <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
                    <div className="flex flex-wrap gap-1.5">
                      {(mem.meta?.tags || []).map((tag, i) => (
                        <span
                          key={i}
                          className={`px-2 py-0.5 text-xs font-medium rounded-full border ${
                            isSkill
                              ? 'bg-amber-500/10 text-amber-400/80 border-amber-500/20'
                              : 'bg-purple-500/10 text-purple-400/80 border-purple-500/20'
                          }`}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <div className="text-xs text-slate-600 flex items-center gap-2">
                      {mem.meta?.updatedAt && (
                        <span>编辑于 {formatDate(mem.meta.updatedAt)}</span>
                      )}
                      {!mem.meta?.updatedAt && mem.meta?.createdAt && (
                        <span>{formatDate(mem.meta.createdAt)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 底部 */}
        <footer className="text-center py-12 text-slate-700 text-xs">
          <p>记忆数据存储在 EdgeOne Pages KV · 命名空间：mymemory</p>
        </footer>
      </div>
    </div>
  );
}
