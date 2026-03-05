'use client'

import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import Image from 'next/image'

interface CoverImageUploadProps {
  imageUrl: string | null
  onUpload: (url: string) => void
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export default function CoverImageUpload({ imageUrl, onUpload }: CoverImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function validateFile(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Only JPEG, PNG, WebP, and GIF images are allowed'
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must be 10MB or less'
    }
    return null
  }

  async function uploadFile(file: File) {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setUploading(true)

    try {
      const extension = file.name.split('.').pop() ?? 'jpg'

      // Step 1: Get presigned URL
      const presignedRes = await fetch('/api/upload/presigned-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentType: file.type,
          extension,
          fileSize: file.size,
        }),
      })

      if (!presignedRes.ok) {
        const data = await presignedRes.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Failed to get upload URL')
      }

      const { presignedUrl, publicUrl } = (await presignedRes.json()) as {
        presignedUrl: string
        publicUrl: string
        key: string
      }

      // Step 2: PUT file to R2 via presigned URL
      const uploadRes = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
      })

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file to storage')
      }

      // Step 3: Notify parent
      onUpload(publicUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragActive(true)
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragActive(false)
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      void uploadFile(file)
    }
  }

  function handleClick() {
    inputRef.current?.click()
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      void uploadFile(file)
    }
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-display uppercase text-brand-yellow tracking-wide">
        Cover Image
      </label>

      {/* Preview */}
      {imageUrl && (
        <div className="relative w-full h-48 border border-brand-red overflow-hidden">
          <Image
            src={imageUrl}
            alt="Cover image preview"
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-2 p-6 cursor-pointer transition-colors border-2 border-dashed ${
          dragActive
            ? 'border-brand-red bg-brand-red/10 border-solid'
            : 'border-brand-red hover:bg-brand-red/5'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleInputChange}
        />

        {uploading ? (
          <span className="font-display uppercase text-brand-yellow text-sm tracking-wide animate-pulse">
            UPLOADING...
          </span>
        ) : (
          <>
            <span className="font-display uppercase text-brand-white text-sm tracking-wide">
              {imageUrl ? 'CHANGE IMAGE' : 'DROP IMAGE HERE'}
            </span>
            <span className="text-xs text-gray-400 uppercase">
              or click to browse — JPEG, PNG, WebP, GIF — max 10MB
            </span>
          </>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-brand-red text-xs font-display uppercase tracking-wide">
          {error}
        </p>
      )}
    </div>
  )
}
