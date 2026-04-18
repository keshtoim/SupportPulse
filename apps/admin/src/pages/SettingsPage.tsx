import { useState, useEffect } from 'react'
import type { TopicDTO, FAQItemDTO } from '@supportpulse/shared'
import { adminApi } from '../api/admin'
import { useAuth } from '../contexts/AuthContext'

// ─── Widget Config ─────────────────────────────────────────────────────────────

function WidgetConfigSection({ tenantId }: { tenantId: string }) {
  const [brandColor, setBrandColor] = useState('#4b94ff')
  const [welcomeMessage, setWelcomeMessage] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!tenantId) return
    adminApi.getWidgetConfig(tenantId)
      .then((c) => {
        setBrandColor(c.brandColor)
        setWelcomeMessage(c.welcomeMessage)
        setLogoUrl(c.logoUrl ?? '')
      })
      .catch(() => {})
  }, [])

  async function save() {
    setSaving(true)
    try {
      await adminApi.updateWidgetConfig({
        brandColor,
        welcomeMessage,
        logoUrl: logoUrl || undefined,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
      <h2 className="text-base font-bold text-gray-800 mb-4">Настройки виджета</h2>

      <div className="flex flex-col gap-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Цвет бренда</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
            />
            <input
              type="text"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Приветственное сообщение</label>
          <textarea
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Здравствуйте! Чем могу помочь?"
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL логотипа (необязательно)</label>
          <input
            type="url"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com/logo.png"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
          />
        </div>

        <button
          className="self-start bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          onClick={save}
          disabled={saving}
        >
          {saved ? '✓ Сохранено' : saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </section>
  )
}

// ─── Topics & FAQ ──────────────────────────────────────────────────────────────

interface TopicWithItems extends TopicDTO {
  items: FAQItemDTO[]
}

function TopicsSection() {
  const [topics, setTopics] = useState<TopicWithItems[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [newTopicTitle, setNewTopicTitle] = useState('')
  const [addingTopic, setAddingTopic] = useState(false)
  const [newFAQ, setNewFAQ] = useState<Record<string, { question: string; answer: string }>>({})

  useEffect(() => {
    adminApi.getTopics()
      .then((list) => setTopics(list.map((t) => ({ ...t, items: [] }))))
      .catch(() => {})
  }, [])

  async function addTopic() {
    if (!newTopicTitle.trim()) return
    setAddingTopic(true)
    try {
      const { topic } = await adminApi.createTopic({ title: newTopicTitle.trim() })
      setTopics((prev) => [...prev, { ...topic, items: [] }])
      setNewTopicTitle('')
    } finally {
      setAddingTopic(false)
    }
  }

  async function deleteTopic(topicId: string) {
    if (!confirm('Удалить тему и все FAQ?')) return
    await adminApi.deleteTopic(topicId)
    setTopics((prev) => prev.filter((t) => t.topicId !== topicId))
  }

  async function addFAQ(topicId: string) {
    const item = newFAQ[topicId]
    if (!item?.question.trim() || !item?.answer.trim()) return
    const { item: created } = await adminApi.createFAQ(topicId, {
      question: item.question.trim(),
      answer: item.answer.trim(),
    })
    setTopics((prev) =>
      prev.map((t) => t.topicId === topicId ? { ...t, items: [...t.items, created] } : t)
    )
    setNewFAQ((prev) => ({ ...prev, [topicId]: { question: '', answer: '' } }))
  }

  async function deleteFAQ(topicId: string, faqId: string) {
    await adminApi.deleteFAQ(faqId)
    setTopics((prev) =>
      prev.map((t) =>
        t.topicId === topicId ? { ...t, items: t.items.filter((i) => i.faqId !== faqId) } : t
      )
    )
  }

  return (
    <section className="bg-white rounded-xl border border-gray-100 p-6">
      <h2 className="text-base font-bold text-gray-800 mb-4">Темы и FAQ</h2>

      {/* Add topic */}
      <div className="flex gap-2 mb-4 max-w-md">
        <input
          type="text"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Название новой темы"
          value={newTopicTitle}
          onChange={(e) => setNewTopicTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addTopic() }}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          onClick={addTopic}
          disabled={addingTopic || !newTopicTitle.trim()}
        >
          + Тема
        </button>
      </div>

      {topics.length === 0 && (
        <p className="text-sm text-gray-400">Тем пока нет</p>
      )}

      <div className="flex flex-col gap-3">
        {topics.map((topic) => (
          <div key={topic.topicId} className="border border-gray-100 rounded-xl overflow-hidden">
            {/* Topic header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
              <button
                className="flex-1 text-left text-sm font-semibold text-gray-800"
                onClick={() => setExpanded((p) => (p === topic.topicId ? null : topic.topicId))}
              >
                {topic.title}
                <span className="ml-2 text-xs text-gray-400 font-normal">
                  {topic.faqCount} FAQ {expanded === topic.topicId ? '▲' : '▼'}
                </span>
              </button>
              <button
                className="text-xs text-red-400 hover:text-red-600"
                onClick={() => deleteTopic(topic.topicId)}
              >
                Удалить
              </button>
            </div>

            {/* FAQ list */}
            {expanded === topic.topicId && (
              <div className="p-4 flex flex-col gap-3">
                {topic.items.map((item) => (
                  <div key={item.faqId} className="flex gap-3 items-start group">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{item.question}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.answer}</p>
                    </div>
                    <button
                      className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 shrink-0"
                      onClick={() => deleteFAQ(topic.topicId, item.faqId)}
                    >
                      ✕
                    </button>
                  </div>
                ))}

                {/* Add FAQ */}
                <div className="border-t border-gray-100 pt-3 flex flex-col gap-2">
                  <input
                    type="text"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Вопрос"
                    value={newFAQ[topic.topicId]?.question ?? ''}
                    onChange={(e) =>
                      setNewFAQ((prev) => ({
                        ...prev,
                        [topic.topicId]: { ...prev[topic.topicId], question: e.target.value },
                      }))
                    }
                  />
                  <input
                    type="text"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ответ"
                    value={newFAQ[topic.topicId]?.answer ?? ''}
                    onChange={(e) =>
                      setNewFAQ((prev) => ({
                        ...prev,
                        [topic.topicId]: { ...prev[topic.topicId], answer: e.target.value },
                      }))
                    }
                  />
                  <button
                    className="self-start text-sm text-blue-600 hover:underline"
                    onClick={() => addFAQ(topic.topicId)}
                  >
                    + Добавить FAQ
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

export function SettingsPage() {
  const { user } = useAuth()
  const tenantId = user?.tenantId ?? ''

  return (
    <div className="flex-1 p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Настройки</h1>
      <WidgetConfigSection tenantId={tenantId} />
      <TopicsSection />
    </div>
  )
}
