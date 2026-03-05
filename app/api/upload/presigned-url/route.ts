import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB (locked decision: CONTEXT.md)

export async function POST(request: NextRequest) {
  // 1. Auth check -- must be logged in
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Role check -- agents cannot upload images
  // Read user_role from app_metadata set by Custom Access Token Hook.
  // MUST use getUser() result (not getSession()) -- getSession() does not
  // re-validate the JWT and is a security risk for auth decisions.
  const role = user.app_metadata?.user_role as string | undefined
  if (role === 'agent') {
    return NextResponse.json({ error: 'Forbidden: agents cannot upload images' }, { status: 403 })
  }

  // 3. Validate request body
  const body = await request.json()
  const { contentType, extension, fileSize } = body

  if (!contentType || !ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json(
      { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}` },
      { status: 400 }
    )
  }

  // Enforce 10MB size limit (per CONTEXT.md locked decision)
  if (typeof fileSize === 'number' && fileSize > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: 'File too large. Maximum size is 10MB.' },
      { status: 413 }
    )
  }

  // 4. Generate presigned URL
  const key = `covers/${randomUUID()}.${extension}`
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  })

  const presignedUrl = await getSignedUrl(r2, command, { expiresIn: 300 })
  const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`

  return NextResponse.json({ presignedUrl, publicUrl, key })
}
