import { describe, test } from 'vitest'

describe('RLS Policies - Articles', () => {
  test.todo('anon can SELECT articles')
  test.todo('anon cannot INSERT articles')
  test.todo('anon cannot UPDATE articles')
  test.todo('anon cannot DELETE articles')
  test.todo('admin can INSERT articles')
  test.todo('admin can UPDATE any article')
  test.todo('admin can DELETE any article')
  test.todo('editor can INSERT article with own author_id and draft status')
  test.todo('editor cannot INSERT article with status published')
  test.todo('editor can UPDATE own draft article')
  test.todo('editor cannot UPDATE another editors article')
  test.todo('editor cannot DELETE articles')
})

describe('RLS Policies - Profiles', () => {
  test.todo('user can SELECT own profile')
  test.todo('user cannot SELECT other profiles')
  test.todo('admin can SELECT all profiles')
  test.todo('user can UPDATE own profile')
  test.todo('admin can UPDATE any profile')
})

describe('RLS Policies - API Keys', () => {
  test.todo('anon cannot read api_keys')
  test.todo('authenticated user cannot read api_keys')
})

describe('RLS Policies - Processed Webhooks', () => {
  test.todo('anon cannot read processed_webhooks')
})
