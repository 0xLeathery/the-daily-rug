import { createClient } from '@supabase/supabase-js'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#'))
    .map(l => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
    })
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
})

// Image → article mapping (in order of the prompts)
const uploads = [
  { file: '/Users/annon/Downloads/Gemini_Generated_Image_z6e5jfz6e5jfz6e5.png', articleId: '11111111-0000-0000-0000-000000000007' },
  { file: '/Users/annon/Downloads/Gemini_Generated_Image_pn2jb2pn2jb2pn2j.png', articleId: '11111111-0000-0000-0000-000000000008' },
  { file: '/Users/annon/Downloads/Gemini_Generated_Image_5c66gf5c66gf5c66.png', articleId: '11111111-0000-0000-0000-000000000009' },
  { file: '/Users/annon/Downloads/Gemini_Generated_Image_wkgrhiwkgrhiwkgr.png', articleId: '11111111-0000-0000-0000-00000000000a' },
  { file: '/Users/annon/Downloads/Gemini_Generated_Image_nb9onjnb9onjnb9o.png', articleId: '11111111-0000-0000-0000-00000000000b' },
  { file: '/Users/annon/Downloads/Gemini_Generated_Image_gp80htgp80htgp80.png', articleId: '11111111-0000-0000-0000-00000000000c' },
  { file: '/Users/annon/Downloads/Gemini_Generated_Image_q6bpq2q6bpq2q6bp.png', articleId: '11111111-0000-0000-0000-00000000000d' },
  { file: '/Users/annon/Downloads/Gemini_Generated_Image_yq1n1xyq1n1xyq1n.png', articleId: '11111111-0000-0000-0000-00000000000e' },
  { file: '/Users/annon/Downloads/Gemini_Generated_Image_b7db8rb7db8rb7db.png', articleId: '11111111-0000-0000-0000-00000000000f' },
  { file: '/Users/annon/Downloads/Gemini_Generated_Image_tkqh15tkqh15tkqh.png', articleId: '11111111-0000-0000-0000-000000000010' },
]

for (const { file, articleId } of uploads) {
  const filename = file.split('/').pop()
  const key = `covers/${articleId}.png`

  // Upload to R2
  const body = readFileSync(file)
  await r2.send(new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: 'image/png',
  }))

  const publicUrl = `${env.R2_PUBLIC_URL}/${key}`

  // Update article
  const { error } = await supabase
    .from('articles')
    .update({ cover_image_url: publicUrl })
    .eq('id', articleId)

  if (error) {
    console.error(`Failed ${filename}:`, error.message)
  } else {
    console.log(`✓ ${filename} → ${publicUrl}`)
  }
}

console.log('Done.')
