'use client'

import { useState, useTransition, useRef } from 'react'
import type { Article, UserRole, ArticleStatus } from '@/lib/supabase/types'
import { saveArticle, publishArticle, unpublishArticle } from '@/app/admin/(authenticated)/actions'
import CoverImageUpload from './CoverImageUpload'
import RichTextEditor, { type RichTextEditorRef } from './RichTextEditor'

interface ArticleEditorProps {
  article: Article | null
  userRole: UserRole
}

type SavedArticle = Article

export default function ArticleEditor({ article, userRole }: ArticleEditorProps) {
  const [title, setTitle] = useState(article?.title ?? '')
  const [body, setBody] = useState(article?.body ?? '')
  const [status, setStatus] = useState<ArticleStatus>(article?.status ?? 'draft')
  const [burnPrice, setBurnPrice] = useState<string>(
    article?.burn_price != null ? String(article.burn_price) : ''
  )
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(
    article?.cover_image_url ?? null
  )
  const [factChecked, setFactChecked] = useState(false)

  const [savedArticle, setSavedArticle] = useState<SavedArticle | null>(article)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const [isSaving, startSavingTransition] = useTransition()
  const [isPublishing, startPublishingTransition] = useTransition()
  const [isUnpublishing, startUnpublishingTransition] = useTransition()

  const richTextEditorRef = useRef<RichTextEditorRef>(null)

  // Status options are role-dependent
  const statusOptions: { value: ArticleStatus; label: string }[] =
    userRole === 'admin'
      ? [
          { value: 'draft', label: 'DRAFT' },
          { value: 'pending_review', label: 'PENDING REVIEW' },
          { value: 'published', label: 'PUBLISHED' },
          { value: 'redacted', label: 'REDACTED' },
        ]
      : [
          { value: 'draft', label: 'DRAFT' },
          { value: 'pending_review', label: 'PENDING REVIEW' },
        ]

  // Always show fact-check gate — it's a publish prerequisite users need to see
  const showFactCheckGate = true

  // Publish button conditions
  const burnPriceNum = parseFloat(burnPrice)
  const canPublish =
    factChecked &&
    burnPrice !== '' &&
    !isNaN(burnPriceNum) &&
    burnPriceNum > 0 &&
    savedArticle !== null &&
    savedArticle.id !== undefined

  function handleSave() {
    setSaveError(null)
    setSaveSuccess(false)

    startSavingTransition(async () => {
      try {
        const result = await saveArticle(savedArticle?.id ?? null, {
          title,
          body,
          status,
          burn_price: burnPrice !== '' && !isNaN(burnPriceNum) ? burnPriceNum : null,
          cover_image_url: coverImageUrl,
        })
        setSavedArticle(result)
        setSaveSuccess(true)
        // Clear success message after 3 seconds
        setTimeout(() => setSaveSuccess(false), 3000)
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Save failed')
      }
    })
  }

  function handlePublish() {
    if (!savedArticle?.id || !canPublish) return
    setPublishError(null)

    startPublishingTransition(async () => {
      try {
        const result = await publishArticle(savedArticle.id, burnPriceNum)
        setSavedArticle(result)
      } catch (err) {
        setPublishError(err instanceof Error ? err.message : 'Publish failed')
      }
    })
  }

  function handleUnpublish() {
    if (!savedArticle?.id) return

    startUnpublishingTransition(async () => {
      try {
        const result = await unpublishArticle(savedArticle.id)
        setSavedArticle(result)
        setStatus('draft')
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Unpublish failed')
      }
    })
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Title */}
      <div>
        <label className="block text-xs font-display uppercase text-brand-yellow tracking-wide mb-1">
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ARTICLE HEADLINE..."
          className="font-display text-2xl uppercase bg-brand-black border border-brand-red text-brand-white p-3 w-full focus:outline-none focus:border-brand-yellow placeholder:text-gray-600"
        />
      </div>

      {/* Cover Image */}
      <CoverImageUpload imageUrl={coverImageUrl} onUpload={setCoverImageUrl} />

      {/* Body */}
      <div>
        <label className="block text-xs font-display uppercase text-brand-yellow tracking-wide mb-1">
          Body
        </label>
        <RichTextEditor
          ref={richTextEditorRef}
          content={body}
          onChange={setBody}
        />
      </div>

      {/* Status + Burn Price row */}
      <div className="flex flex-wrap gap-4">
        {/* Status dropdown */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-display uppercase text-brand-yellow tracking-wide mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ArticleStatus)}
            className="bg-brand-black border border-brand-red text-brand-white p-2 w-full font-display uppercase text-sm focus:outline-none focus:border-brand-yellow"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Burn price — hidden for editors */}
        {userRole !== 'editor' && (
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-display uppercase text-brand-yellow tracking-wide mb-1">
              Burn Price (SOL)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={burnPrice}
              onChange={(e) => setBurnPrice(e.target.value)}
              placeholder="0.00"
              className="bg-brand-black border border-brand-red text-brand-white p-2 w-full font-display text-sm focus:outline-none focus:border-brand-yellow placeholder:text-gray-600"
            />
          </div>
        )}
      </div>

      {/* Author display */}
      {savedArticle?.author_id && (
        <div>
          <span className="text-xs font-display uppercase text-gray-500 tracking-wide">
            Author ID: {savedArticle.author_id}
          </span>
        </div>
      )}

      {/* Fact-check gate */}
      {showFactCheckGate && (
        <div className="flex items-start gap-3 p-3 border border-brand-red bg-brand-red/5">
          <input
            type="checkbox"
            id="fact-check"
            checked={factChecked}
            onChange={(e) => setFactChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-brand-red cursor-pointer"
          />
          <label
            htmlFor="fact-check"
            className="text-sm text-brand-white font-display uppercase tracking-wide cursor-pointer"
          >
            I confirm this article has been fact-checked and is ready for publication
          </label>
        </div>
      )}

      {/* Error messages */}
      {saveError && (
        <p className="text-brand-red text-sm font-display uppercase tracking-wide">
          Error: {saveError}
        </p>
      )}
      {publishError && (
        <p className="text-brand-red text-sm font-display uppercase tracking-wide">
          Error: {publishError}
        </p>
      )}
      {saveSuccess && (
        <p className="text-green-400 text-sm font-display uppercase tracking-wide">
          Saved successfully
        </p>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-brand-black border border-brand-red text-brand-white font-display uppercase text-sm tracking-wide hover:bg-brand-red/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'SAVING...' : 'SAVE DRAFT'}
        </button>

        {/* Publish button — admin only */}
        {userRole === 'admin' && savedArticle?.status !== 'published' && (
          <button
            type="button"
            onClick={handlePublish}
            disabled={!canPublish || isPublishing}
            className={`px-6 py-2 font-display uppercase text-sm tracking-wide transition-colors ${
              canPublish && !isPublishing
                ? 'bg-brand-red text-brand-white hover:bg-red-700'
                : 'bg-brand-red/30 text-brand-white/50 opacity-50 cursor-not-allowed'
            }`}
          >
            {isPublishing ? 'PUBLISHING...' : 'PUBLISH'}
          </button>
        )}

        {/* Unpublish button — admin only, when published */}
        {userRole === 'admin' && savedArticle?.status === 'published' && (
          <button
            type="button"
            onClick={handleUnpublish}
            disabled={isUnpublishing}
            className="px-6 py-2 bg-gray-700 text-brand-white font-display uppercase text-sm tracking-wide hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUnpublishing ? 'UNPUBLISHING...' : 'UNPUBLISH'}
          </button>
        )}
      </div>
    </div>
  )
}
