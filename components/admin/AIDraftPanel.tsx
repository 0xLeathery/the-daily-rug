'use client'

import { useState } from 'react'

interface AIDraftPanelProps {
  onDraftGenerated: (html: string) => void
  currentBody: string
}

/** Check if body has meaningful content beyond empty Tiptap paragraphs */
function hasContent(body: string): boolean {
  if (!body || body.trim() === '') return false
  // Remove empty <p></p> and <p> </p> tags — Tiptap default empty state
  const stripped = body
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/<br\s*\/?>/gi, '')
    .trim()
  return stripped.length > 0
}

export default function AIDraftPanel({ onDraftGenerated, currentBody }: AIDraftPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [topic, setTopic] = useState('')
  const [bullets, setBullets] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [streamingPreview, setStreamingPreview] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [dotCount, setDotCount] = useState(0)

  async function handleGenerate() {
    if (!topic.trim()) {
      setError('Please enter a topic headline')
      return
    }

    // Confirmation dialog if body has existing content
    if (hasContent(currentBody)) {
      const confirmed = window.confirm('This will replace the current body. Continue?')
      if (!confirmed) return
    }

    setError(null)
    setIsGenerating(true)
    setStreamingPreview('')

    // Animate dots
    const dotInterval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4)
    }, 400)

    try {
      const response = await fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          bullets: bullets.split('\n').filter(Boolean),
        }),
      })

      if (!response.ok) {
        let errorMessage = 'Draft generation failed — try again'
        try {
          const errJson = await response.json()
          if (response.status === 401) {
            errorMessage = 'Session expired — please refresh the page'
          } else if (errJson.error) {
            errorMessage = errJson.error
          }
        } catch {
          // ignore parse error
        }
        setError(errorMessage)
        return
      }

      // Read streaming response
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let draft = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        draft += chunk
        setStreamingPreview((prev) => prev + chunk)
      }

      // Done — inject into Tiptap editor
      onDraftGenerated(draft)
      setStreamingPreview('')

      // Brief success feedback then collapse
      setTimeout(() => {
        setIsExpanded(false)
        setTopic('')
        setBullets('')
      }, 800)
    } catch {
      setError('Failed to connect to AI service')
    } finally {
      clearInterval(dotInterval)
      setDotCount(0)
      setIsGenerating(false)
    }
  }

  return (
    <div className="border border-brand-yellow/40 bg-brand-black">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-brand-yellow/5 transition-colors"
      >
        <span className="font-display text-brand-yellow uppercase tracking-wide text-sm">
          AI Draft Generator
        </span>
        <span className="text-brand-yellow font-display text-lg leading-none">
          {isExpanded ? '−' : '+'}
        </span>
      </button>

      {/* Collapsible content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-brand-yellow/20">
          {/* Topic input */}
          <div className="pt-3">
            <label className="block text-xs font-display uppercase text-brand-yellow tracking-wide mb-1">
              Topic Headline
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter topic headline..."
              disabled={isGenerating}
              className="bg-brand-black border border-brand-red text-brand-white p-2 w-full font-display text-sm focus:outline-none focus:border-brand-yellow placeholder:text-gray-600 disabled:opacity-50"
            />
          </div>

          {/* Bullets textarea */}
          <div>
            <label className="block text-xs font-display uppercase text-brand-yellow tracking-wide mb-1">
              Key Facts / Angles (optional, one per line)
            </label>
            <textarea
              value={bullets}
              onChange={(e) => setBullets(e.target.value)}
              placeholder="Optional: key facts or angles (one per line)..."
              rows={3}
              disabled={isGenerating}
              className="bg-brand-black border border-brand-red text-brand-white p-2 w-full font-display text-sm focus:outline-none focus:border-brand-yellow placeholder:text-gray-600 resize-none disabled:opacity-50"
            />
          </div>

          {/* Generate button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-brand-red text-brand-white font-display uppercase px-4 py-2 tracking-wide text-sm hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating
              ? `GENERATING${'.'.repeat(dotCount)}`
              : 'GENERATE DRAFT'}
          </button>

          {/* Error message */}
          {error && (
            <p className="text-brand-red text-sm font-display uppercase tracking-wide">
              {error}
            </p>
          )}

          {/* Streaming preview */}
          {streamingPreview && (
            <div
              className="whitespace-pre-wrap text-brand-white/70 text-sm border border-brand-red/30 p-3 max-h-48 overflow-y-auto"
              aria-live="polite"
            >
              {streamingPreview}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
