'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { Article, Profile } from '@/lib/supabase/types'

type ArticleWithAuthor = Article & {
  profiles: Pick<Profile, 'display_name'> | null
}

type FilterTab = 'all' | 'draft' | 'pending_review' | 'published'

interface ArticleTableProps {
  articles: ArticleWithAuthor[]
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
  draft: 'bg-gray-700 text-gray-200',
  pending_review: 'bg-yellow-800 text-brand-yellow',
  published: 'bg-green-800 text-green-200',
  redacted: 'bg-brand-red text-brand-white',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'DRAFT',
  pending_review: 'PENDING',
  published: 'PUBLISHED',
  redacted: 'REDACTED',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function ArticleTable({ articles }: ArticleTableProps) {
  const router = useRouter()
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')

  const totalCount = articles.length
  const pendingCount = articles.filter((a) => a.status === 'pending_review').length

  const filteredArticles =
    activeFilter === 'all'
      ? articles
      : articles.filter((a) => a.status === activeFilter)

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'ALL' },
    { key: 'draft', label: 'DRAFTS' },
    { key: 'pending_review', label: 'PENDING REVIEW' },
    { key: 'published', label: 'PUBLISHED' },
  ]

  return (
    <div>
      {/* Quick stats */}
      <div className="flex gap-6 mb-4">
        <span className="font-display text-brand-yellow uppercase text-sm tracking-wide">
          TOTAL: {totalCount}
        </span>
        <span className="font-display text-brand-yellow uppercase text-sm tracking-wide">
          PENDING REVIEW: {pendingCount}
        </span>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`px-3 py-1.5 text-sm font-display uppercase tracking-wide border transition-colors ${
              activeFilter === tab.key
                ? 'bg-brand-red text-brand-white border-brand-red'
                : 'bg-brand-black text-brand-white border-brand-red hover:bg-brand-red/20'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {filteredArticles.length === 0 ? (
        <p className="text-brand-white text-sm py-8 text-center">No articles found</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-red">
                <th className="text-left py-2 px-3 font-display text-brand-yellow uppercase text-xs tracking-wide">
                  Title
                </th>
                <th className="text-left py-2 px-3 font-display text-brand-yellow uppercase text-xs tracking-wide">
                  Status
                </th>
                <th className="text-left py-2 px-3 font-display text-brand-yellow uppercase text-xs tracking-wide">
                  Author
                </th>
                <th className="text-left py-2 px-3 font-display text-brand-yellow uppercase text-xs tracking-wide">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredArticles.map((article) => (
                <tr
                  key={article.id}
                  onClick={() => router.push(`/admin/articles/${article.id}`)}
                  className="border-b border-gray-800 hover:bg-gray-900/50 transition-colors cursor-pointer"
                >
                  <td className="py-2 px-3">
                    <span className="text-brand-white hover:text-brand-yellow transition-colors font-medium">
                      {article.title || '(untitled)'}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 text-xs font-display uppercase tracking-wide ${
                        STATUS_BADGE_CLASSES[article.status] ?? 'bg-gray-700 text-gray-200'
                      }`}
                    >
                      {STATUS_LABELS[article.status] ?? article.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-brand-white">
                    {article.profiles?.display_name ?? 'Unknown'}
                  </td>
                  <td className="py-2 px-3 text-brand-white">
                    {formatDate(article.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
