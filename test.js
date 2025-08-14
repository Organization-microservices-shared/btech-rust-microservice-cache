const { MicroserviceCache } = require('./index')

class TicketCacheSystem {
  constructor() {
    this.cache = new MicroserviceCache(5000, 3600) // 5000 tickets, TTL 1h
    this.initStats()
  }

  initStats() {
    this.cache.set('_stats:categories', JSON.stringify({}))
    this.cache.set('_stats:tags', JSON.stringify({}))
  }

  // Método mejorado para crear tickets
  createTicket(ticketData) {
    const { id, title, content, category, tags = [], priority = 'medium' } = ticketData
    const ticket = {
      id,
      title,
      content: content || this.generateLoremContent(),
      category,
      tags,
      priority,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'open',
      views: 0,
      comments: [],
    }

    const success = this.cache.set(`ticket:${id}`, JSON.stringify(ticket), null, tags)
    if (success) {
      this.updateCategoryStats(category)
      this.updateTagStats(tags)
    }
    return success
  }

  // Obtener ticket con estadísticas de visitas
  getTicket(id) {
    const ticketKey = `ticket:${id}`
    const ticketStr = this.cache.get(ticketKey)

    if (ticketStr) {
      const ticket = JSON.parse(ticketStr)
      ticket.views += 1
      this.cache.set(ticketKey, JSON.stringify(ticket))
      return ticket
    }
    return null
  }

  // Buscar tickets por categoría o etiqueta
  searchTickets({ category, tag, status }) {
    const allKeys = this.cache.getAllKeys()
    const results = []

    for (const key of allKeys) {
      if (key.startsWith('ticket:')) {
        const ticket = JSON.parse(this.cache.get(key))

        const categoryMatch = !category || ticket.category === category
        const tagMatch = !tag || ticket.tags.includes(tag)
        const statusMatch = !status || ticket.status === status

        if (categoryMatch && tagMatch && statusMatch) {
          results.push(ticket)
        }
      }
    }

    return results.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  }

  // Actualizar estado de un ticket
  updateTicketStatus(id, newStatus) {
    const ticketKey = `ticket:${id}`
    const ticketStr = this.cache.get(ticketKey)

    if (ticketStr) {
      const ticket = JSON.parse(ticketStr)
      ticket.status = newStatus
      ticket.updatedAt = new Date().toISOString()
      this.cache.set(ticketKey, JSON.stringify(ticket))
      return true
    }
    return false
  }

  // Métodos de estadísticas
  updateCategoryStats(category) {
    const statsStr = this.cache.get('_stats:categories')
    const stats = JSON.parse(statsStr)
    stats[category] = (stats[category] || 0) + 1
    this.cache.set('_stats:categories', JSON.stringify(stats))
  }

  updateTagStats(tags) {
    const statsStr = this.cache.get('_stats:tags')
    const stats = JSON.parse(statsStr)

    tags.forEach((tag) => {
      stats[tag] = (stats[tag] || 0) + 1
    })

    this.cache.set('_stats:tags', JSON.stringify(stats))
  }

  generateLoremContent() {
    const lorem =
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' +
      'Nullam euismod, nisl eget aliquam ultricies, nunc nisl aliquet nunc, ' +
      'quis aliquam nisl nunc eu nisl. Nullam euismod, nisl eget aliquam ultricies, ' +
      'nunc nisl aliquet nunc, quis aliquam nisl nunc eu nisl.'

    return lorem
  }

  generateReport() {
    const cacheStats = JSON.parse(this.cache.getStats())
    const categoryStats = JSON.parse(this.cache.get('_stats:categories'))
    const tagStats = JSON.parse(this.cache.get('_stats:tags'))

    return {
      timestamp: new Date().toISOString(),
      cacheStatistics: cacheStats,
      ticketsByCategory: categoryStats,
      ticketsByTag: tagStats,
      mostViewedTickets: this.getMostViewedTickets(5),
    }
  }

  getMostViewedTickets(limit = 5) {
    const allTickets = this.searchTickets({})
    return allTickets
      .sort((a, b) => b.views - a.views)
      .slice(0, limit)
      .map((t) => ({ id: t.id, title: t.title, views: t.views }))
  }
}

// Ejemplo de uso
function runAdvancedTests() {
  console.log('🎟️  Sistema Avanzado de Gestión de Tickets\n')

  const ticketSystem = new TicketCacheSystem()

  const sampleTickets = [
    {
      id: 'T1001',
      title: 'Error en el sistema de login',
      category: 'bugs',
      tags: ['frontend', 'urgent'],
      priority: 'high',
    },
    {
      id: 'T1002',
      title: 'Mejorar rendimiento de consultas',
      category: 'improvement',
      tags: ['backend', 'database'],
      priority: 'medium',
    },
    {
      id: 'T1003',
      title: 'Actualizar documentación API',
      category: 'documentation',
      tags: ['api', 'documentation'],
      priority: 'low',
    },
  ]

  console.log('📝 Creando tickets de ejemplo...')
  sampleTickets.forEach((ticket) => {
    ticketSystem.createTicket(ticket)
    console.log(`Ticket creado: ${ticket.id} - ${ticket.title}`)
  })

  console.log('\n👀 Simulando interacciones con tickets...')
  ticketSystem.getTicket('T1001')
  ticketSystem.getTicket('T1001')
  ticketSystem.getTicket('T1002')
  ticketSystem.updateTicketStatus('T1001', 'in-progress')

  // Buscar tickets
  console.log('\n🔍 Buscando tickets:')
  console.log('Todos los tickets:', ticketSystem.searchTickets({}).length)
  console.log(
    'Tickets de backend:',
    ticketSystem.searchTickets({ tag: 'backend' }).map((t) => t.id),
  )
  console.log(
    'Tickets abiertos:',
    ticketSystem.searchTickets({ status: 'open' }).map((t) => t.id),
  )

  // Generar reporte
  console.log('\n📊 Reporte del sistema:')
  console.log(ticketSystem.generateReport())

  console.log('\n✅ Pruebas completadas!')
}

runAdvancedTests()
