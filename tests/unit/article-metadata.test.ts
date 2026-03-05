import { describe, test } from 'vitest'

describe('generateMetadata (article detail page)', () => {
  test.todo('generateMetadata returns article title in og:title for valid slug')
  test.todo('generateMetadata returns default title for missing article')
  test.todo('generateMetadata includes cover_image_url in og:image when present')
  test.todo('generateMetadata omits og:image when no cover_image_url')
})
