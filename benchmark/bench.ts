import { Bench } from 'tinybench'
import { MicroserviceCache } from '../index.js'

const rustCache = new MicroserviceCache(10000, 3600)

class SimpleJSCache {
  private cache = new Map<string, { value: string; timestamp: number; ttl: number }>()

  set(key: string, value: string, ttl = 3600): boolean {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl * 1000,
    })
    return true
  }

  get(key: string): string | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.value
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  flush(): number {
    const size = this.cache.size
    this.cache.clear()
    return size
  }
}

const jsCache = new SimpleJSCache()

const testKeys = Array.from({ length: 1000 }, (_, i) => `key-${i}`)
const testValues = Array.from({ length: 1000 }, (_, i) => `value-${i}-${'x'.repeat(50)}`)

testKeys.forEach((key, i) => {
  rustCache.set(key, testValues[i])
  jsCache.set(key, testValues[i])
})

const b = new Bench()

b.add('Rust Cache - SET (single)', () => {
  rustCache.set('bench-key', 'bench-value')
})

b.add('JS Cache - SET (single)', () => {
  jsCache.set('bench-key', 'bench-value')
})

b.add('Rust Cache - GET (single)', () => {
  rustCache.get('key-500')
})

b.add('JS Cache - GET (single)', () => {
  jsCache.get('key-500')
})

b.add('Rust Cache - SET with TTL', () => {
  rustCache.set('ttl-key', 'ttl-value', 60)
})

b.add('JS Cache - SET with TTL', () => {
  jsCache.set('ttl-key', 'ttl-value', 60)
})

b.add('Rust Cache - SET with tags', () => {
  rustCache.set('tagged-key', 'tagged-value', 60, ['tag1', 'tag2'])
})

b.add('Rust Cache - DELETE', () => {
  rustCache.set('delete-me', 'value')
  rustCache.delete('delete-me')
})

b.add('JS Cache - DELETE', () => {
  jsCache.set('delete-me', 'value')
  jsCache.delete('delete-me')
})

b.add('Rust Cache - Batch SET (100 items)', () => {
  for (let i = 0; i < 100; i++) {
    rustCache.set(`batch-key-${i}`, `batch-value-${i}`)
  }
})

b.add('JS Cache - Batch SET (100 items)', () => {
  for (let i = 0; i < 100; i++) {
    jsCache.set(`batch-key-${i}`, `batch-value-${i}`)
  }
})

b.add('Rust Cache - Batch GET (100 items)', () => {
  for (let i = 0; i < 100; i++) {
    rustCache.get(`key-${i}`)
  }
})

b.add('JS Cache - Batch GET (100 items)', () => {
  for (let i = 0; i < 100; i++) {
    jsCache.get(`key-${i}`)
  }
})

b.add('Rust Cache - Get Stats', () => {
  rustCache.getStats()
})

b.add('Rust Cache - Get All Keys', () => {
  rustCache.keys()
})

console.log('🚀 Ejecutando benchmarks de MicroserviceCache...\n')

await b.run()

console.log('\n📊 Resultados de rendimiento:')
console.table(b.table())

const rustSetOps = b.tasks.find((t) => t.name === 'Rust Cache - SET (single)')
const jsSetOps = b.tasks.find((t) => t.name === 'JS Cache - SET (single)')
const rustGetOps = b.tasks.find((t) => t.name === 'Rust Cache - GET (single)')
const jsGetOps = b.tasks.find((t) => t.name === 'JS Cache - GET (single)')

if (rustSetOps && jsSetOps && rustGetOps && jsGetOps) {
  console.log('\n🔍 Análisis comparativo:')

  const setSpeedup = (jsSetOps.result?.hz || 0) / (rustSetOps.result?.hz || 1)
  const getSpeedup = (jsGetOps.result?.hz || 0) / (rustGetOps.result?.hz || 1)

  console.log(`SET Operations:`)
  console.log(`  - Rust: ${rustSetOps.result?.hz?.toLocaleString()} ops/sec`)
  console.log(`  - JS: ${jsSetOps.result?.hz?.toLocaleString()} ops/sec`)
  console.log(`  - ${setSpeedup > 1 ? 'JS' : 'Rust'} es ${Math.abs(setSpeedup - 1).toFixed(2)}x más rápido`)

  console.log(`\nGET Operations:`)
  console.log(`  - Rust: ${rustGetOps.result?.throughput.mean?.toLocaleString()} ops/sec`)
  console.log(`  - JS: ${jsGetOps.result?.throughput.mean?.toLocaleString()} ops/sec`)
  console.log(`  - ${getSpeedup > 1 ? 'JS' : 'Rust'} es ${Math.abs(getSpeedup - 1).toFixed(2)}x más rápido`)
}

console.log('\n✅ Benchmarks completados!')
