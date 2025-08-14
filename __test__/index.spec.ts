import test from 'ava'

import { MicroserviceCache } from '../index'

test('MicroserviceCache basic functionality', (t) => {
  const cache = new MicroserviceCache()

  const success = cache.set('test-key', 'test-value')
  t.true(success)

  const value = cache.get('test-key')
  t.is(value, 'test-value')
})

test('MicroserviceCache with TTL and tags', (t) => {
  const cache = new MicroserviceCache(1000, 3600)

  const success = cache.set('tagged-key', 'tagged-value', 60, ['tag1', 'tag2'])
  t.true(success)

  const value = cache.get('tagged-key')
  t.is(value, 'tagged-value')
})

test('MicroserviceCache delete functionality', (t) => {
  const cache = new MicroserviceCache()

  cache.set('delete-me', 'some-value')
  const deleted = cache.delete('delete-me')
  t.true(deleted)

  const value = cache.get('delete-me')
  t.is(value, null)
})

test('MicroserviceCache get all keys', (t) => {
  const cache = new MicroserviceCache()

  cache.set('key1', 'value1')
  cache.set('key2', 'value2')
  cache.set('key3', 'value3')

  const keys = cache.keys()
  t.true(Array.isArray(keys))
  t.true(keys.includes('key1'))
  t.true(keys.includes('key2'))
  t.true(keys.includes('key3'))
})

test('MicroserviceCache stats and flush', (t) => {
  const cache = new MicroserviceCache()

  cache.set('stat-key1', 'value1')
  cache.set('stat-key2', 'value2')

  const stats = cache.getStats()
  t.true(typeof stats === 'string')

  const flushedCount = cache.flush()
  t.true(typeof flushedCount === 'number')
  t.true(flushedCount >= 0)
})
