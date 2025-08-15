# btech-rust-microservice-cache

[![CI](https://github.com/Organization-microservices-shared/btech-rust-microservice-cache/workflows/CI/badge.svg)](https://github.com/Organization-microservices-shared/btech-rust-microservice-cache/actions)

Biblioteca de caché de alto rendimiento desarrollada en Rust para aplicaciones Node.js y microservicios.

## Descripción

btech-rust-microservice-cache es una solución de caché en memoria que combina la velocidad de Rust con la facilidad de uso de Node.js. Diseñada específicamente para entornos de microservicios donde el rendimiento y la eficiencia de memoria son críticos.

## Características

- **Alto rendimiento**: Operaciones de caché implementadas en Rust nativo
- **Gestión automática de TTL**: Expiración automática de entradas con configuración flexible
- **Sistema de etiquetas**: Organización y invalidación selectiva de entradas
- **Métricas integradas**: Estadísticas de rendimiento y uso en tiempo real
- **Seguridad de hilos**: Acceso concurrente sin locks externos
- **Gestión de memoria**: Control automático de tamaño con evicción LRU

## Instalación

### Configuración de registro

Para instalar desde GitHub Packages, configure el registro primero:

```bash
npm config set @organization-microservices-shared:registry https://npm.pkg.github.com
npm config set //npm.pkg.github.com/:_authToken YOUR_GITHUB_TOKEN
```

### Instalar el paquete

```bash
npm install @organization-microservices-shared/btech-rust-microservice-cache
```

## Uso básico

### Node.js

```javascript
const { MicroserviceCache } = require('@organization-microservices-shared/btech-rust-microservice-cache');

// Crear instancia del caché
const cache = new MicroserviceCache(1000, 300); // 1000 elementos, 300s TTL por defecto

// Operaciones básicas
cache.set('usuario:123', JSON.stringify({ id: 123, nombre: 'Juan' }));
const usuario = JSON.parse(cache.get('usuario:123') || '{}');

// Con TTL específico
cache.set('session:abc', 'session-data', 1800); // 30 minutos

// Con etiquetas
cache.set('config:api', 'api-config', 3600, ['config', 'api']);

// Obtener estadísticas
const stats = JSON.parse(cache.getStats());
console.log('Hit rate:', stats.hit_rate);
```

### NestJS

```typescript
import { Injectable } from '@nestjs/common';
import { MicroserviceCache } from '@organization-microservices-shared/btech-rust-microservice-cache';

@Injectable()
export class CacheService {
  private cache = new MicroserviceCache(10000, 3600);

  set<T>(key: string, value: T, ttl?: number): boolean {
    return this.cache.set(key, JSON.stringify(value), ttl);
  }

  get<T>(key: string): T | null {
    const value = this.cache.get(key);
    return value ? JSON.parse(value) : null;
  }
}
```

## API

### Constructor

```typescript
new MicroserviceCache(maxSize?: number, defaultTtlSeconds?: number)
```

- `maxSize`: Número máximo de elementos en el caché (por defecto: sin límite)
- `defaultTtlSeconds`: TTL por defecto en segundos (por defecto: sin expiración)

### Métodos

#### set(key, value, ttl?, tags?)

Almacena un valor en el caché.

- `key`: Clave de string
- `value`: Valor de string
- `ttl`: TTL en segundos (opcional)
- `tags`: Array de etiquetas (opcional)
- Retorna: `boolean` indicando éxito

#### get(key)

Recupera un valor del caché.

- `key`: Clave de string
- Retorna: `string | null`

#### delete(key)

Elimina una entrada del caché.

- `key`: Clave de string
- Retorna: `boolean` indicando si se eliminó

#### keys()

Obtiene todas las claves almacenadas.

- Retorna: `Array<string>`

#### getStats()

Obtiene estadísticas del caché en formato JSON.

- Retorna: `string` con métricas de rendimiento

#### flush()

Limpia completamente el caché.

- Retorna: `number` de elementos eliminados

## Casos de uso

### Caché de respuestas de API

```javascript
async function getCachedApiResponse(endpoint) {
  return cache.getOrSet(`api:${endpoint}`, async () => {
    const response = await fetch(endpoint);
    return response.json();
  }, 300); // 5 minutos
}
```

### Gestión de sesiones

```javascript
function storeUserSession(userId, sessionData) {
  cache.set(`session:${userId}`, JSON.stringify(sessionData), 1800); // 30 minutos
}

function getUserSession(userId) {
  const session = cache.get(`session:${userId}`);
  return session ? JSON.parse(session) : null;
}
```

### Rate limiting

```javascript
function checkRateLimit(userId, maxRequests = 100) {
  const key = `rate:${userId}`;
  const current = parseInt(cache.get(key) || '0');
  
  if (current >= maxRequests) {
    return false; // Límite excedido
  }
  
  cache.set(key, (current + 1).toString(), 3600); // 1 hora
  return true;
}
```

## Rendimiento

Benchmarks en una máquina estándar (i7-10700K, 32GB RAM):

- Operaciones SET: ~2-5 nanosegundos
- Operaciones GET: ~1-3 nanosegundos
- Throughput: >10M operaciones/segundo
- Uso de memoria: 50-80% menos que alternativas en JavaScript puro

## Compatibilidad

### Requisitos

- Node.js 16.0.0 o superior
- Uno de los sistemas operativos soportados

### Plataformas soportadas

| Plataforma | Arquitectura | Estado |
|------------|-------------|---------|
| Windows | x64 | Soportado |
| Windows | ARM64 | Soportado |
| macOS | x64 (Intel) | Soportado |
| macOS | ARM64 (Apple Silicon) | Soportado |
| Linux | x64 | Soportado |
| Linux | ARM64 | Soportado |
| Linux | ARM64 (musl) | Soportado |
| Android | ARM64 | Soportado |

## Desarrollo

### Requisitos

- Rust (última versión estable)
- Node.js 16+
- Yarn o npm

### Configuración local

```bash
# Clonar el repositorio
git clone https://github.com/Organization-microservices-shared/btech-rust-microservice-cache.git
cd btech-rust-microservice-cache

# Instalar dependencias
yarn install

# Compilar el addon nativo
yarn build

# Ejecutar tests
yarn test

# Ejecutar linting
yarn lint
```

### Scripts disponibles

- `yarn build`: Compila el addon nativo para la plataforma actual
- `yarn test`: Ejecuta la suite de tests
- `yarn bench`: Ejecuta benchmarks de rendimiento
- `yarn lint`: Ejecuta linting de código
- `yarn format`: Formatea el código fuente

## Licencia

MIT License. Ver archivo [LICENSE](LICENSE) para más detalles.

## Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el repositorio
2. Crea una rama para tu feature
3. Implementa los cambios con tests
4. Asegúrate de que pase el linting
5. Envía un pull request

## Soporte

Para reportar bugs o solicitar nuevas características, usa el [sistema de issues](https://github.com/Organization-microservices-shared/btech-rust-microservice-cache/issues) de GitHub.
