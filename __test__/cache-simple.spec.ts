import test, { TestFn } from 'ava'
import { MicroserviceCache } from '../index'

interface TestContext {
  ticketSystem: TicketCacheSystem
}

const testWithContext = test as TestFn<TestContext>

class TicketCacheSystem {
  private cache: MicroserviceCache

  constructor() {
    this.cache = new MicroserviceCache()
  }

  createTicket(ticket: { id: string; title: string; category: string; tags: string[]; priority: string }) {
    const ticketData = {
      ...ticket,
      status: 'open',
      views: 0,
      created: new Date().toISOString(),
      description: this.generateLorem(),
    }

    this.cache.set(ticket.id, JSON.stringify(ticketData))
    this.updateCategoryStats(ticket.category)
    this.updateTagStats(ticket.tags)
    this.updateCacheStats()

    return ticketData
  }

  getTicket(id: string) {
    const ticket = this.cache.get(id)
    if (ticket) {
      const parsedTicket = JSON.parse(ticket)
      parsedTicket.views++
      this.cache.set(id, JSON.stringify(parsedTicket))
      return parsedTicket
    }
    return null
  }

  updateTicketStatus(id: string, status: string) {
    const ticket = this.getTicket(id)
    if (ticket) {
      ticket.status = status
      this.cache.set(id, JSON.stringify(ticket))
      return ticket
    }
    return null
  }

  searchTickets(filters: { tag?: string; status?: string; category?: string }) {
    const allKeys = this.cache.keys()
    const tickets = []

    for (const key of allKeys) {
      if (key.startsWith('_stats:')) continue

      const ticketData = this.cache.get(key)
      if (ticketData) {
        const ticket = JSON.parse(ticketData)

        let matches = true
        if (filters.tag && !ticket.tags.includes(filters.tag)) matches = false
        if (filters.status && ticket.status !== filters.status) matches = false
        if (filters.category && ticket.category !== filters.category) matches = false

        if (matches) tickets.push(ticket)
      }
    }

    return tickets
  }

  private updateCategoryStats(category: string) {
    const stats = this.cache.get('_stats:categories')
    const categoryStats = stats ? JSON.parse(stats) : {}
    categoryStats[category] = (categoryStats[category] || 0) + 1
    this.cache.set('_stats:categories', JSON.stringify(categoryStats))
  }

  private updateTagStats(tags: string[]) {
    const stats = this.cache.get('_stats:tags')
    const tagStats = stats ? JSON.parse(stats) : {}
    tags.forEach((tag) => {
      tagStats[tag] = (tagStats[tag] || 0) + 1
    })
    this.cache.set('_stats:tags', JSON.stringify(tagStats))
  }

  private updateCacheStats() {
    const stats = {
      totalTickets: this.cache.keys().filter((k) => !k.startsWith('_stats:')).length,
      lastUpdated: new Date().toISOString(),
    }
    this.cache.set('_stats:general', JSON.stringify(stats))
  }

  private generateLorem(): string {
    const lorem =
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' +
      'Nullam euismod, nisl eget aliquam ultricies, nunc nisl aliquet nunc, ' +
      'quis aliquam nisl nunc eu nisl. Nullam euismod, nisl eget aliquam ultricies, ' +
      'nunc nisl aliquet nunc, quis aliquam nisl nunc eu nisl.'

    return lorem
  }

  generateReport() {
    const generalStats = this.cache.get('_stats:general')
    const categoryStats = this.cache.get('_stats:categories')
    const tagStats = this.cache.get('_stats:tags')

    return {
      timestamp: new Date().toISOString(),
      generalStatistics: generalStats ? JSON.parse(generalStats) : {},
      ticketsByCategory: categoryStats ? JSON.parse(categoryStats) : {},
      ticketsByTag: tagStats ? JSON.parse(tagStats) : {},
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

// Tests con AVA
testWithContext.beforeEach((t) => {
  t.context.ticketSystem = new TicketCacheSystem()
})

testWithContext('should create a ticket correctly', (t) => {
  const ticketSystem = t.context.ticketSystem

  const ticketData = {
    id: 'T1001',
    title: 'Error en el sistema de login',
    category: 'bugs',
    tags: ['frontend', 'urgent'],
    priority: 'high',
  }

  const createdTicket = ticketSystem.createTicket(ticketData)

  t.is(createdTicket.id, 'T1001')
  t.is(createdTicket.title, 'Error en el sistema de login')
  t.is(createdTicket.status, 'open')
  t.is(createdTicket.views, 0)
  t.truthy(createdTicket.created)
  t.truthy(createdTicket.description)
})

testWithContext('should retrieve and increment views on ticket', (t) => {
  const ticketSystem = t.context.ticketSystem

  const ticketData = {
    id: 'T1002',
    title: 'Mejorar rendimiento',
    category: 'improvement',
    tags: ['backend', 'database'],
    priority: 'medium',
  }

  ticketSystem.createTicket(ticketData)

  const retrievedTicket = ticketSystem.getTicket('T1002')
  t.truthy(retrievedTicket)
  t.is(retrievedTicket!.views, 1)

  // Segunda consulta debe incrementar views
  const retrievedAgain = ticketSystem.getTicket('T1002')
  t.is(retrievedAgain!.views, 2)
})

testWithContext('should update ticket status', (t) => {
  const ticketSystem = t.context.ticketSystem

  const ticketData = {
    id: 'T1003',
    title: 'Actualizar documentación',
    category: 'documentation',
    tags: ['api', 'documentation'],
    priority: 'low',
  }

  ticketSystem.createTicket(ticketData)
  const updatedTicket = ticketSystem.updateTicketStatus('T1003', 'in-progress')

  t.truthy(updatedTicket)
  t.is(updatedTicket!.status, 'in-progress')
})

testWithContext('should search tickets by filters', (t) => {
  const ticketSystem = t.context.ticketSystem

  const tickets = [
    {
      id: 'T1001',
      title: 'Bug frontend',
      category: 'bugs',
      tags: ['frontend', 'urgent'],
      priority: 'high',
    },
    {
      id: 'T1002',
      title: 'Backend improvement',
      category: 'improvement',
      tags: ['backend', 'database'],
      priority: 'medium',
    },
  ]

  tickets.forEach((ticket) => ticketSystem.createTicket(ticket))

  // Buscar por tag
  const frontendTickets = ticketSystem.searchTickets({ tag: 'frontend' })
  t.is(frontendTickets.length, 1)
  t.is(frontendTickets[0].id, 'T1001')

  // Buscar por status
  const openTickets = ticketSystem.searchTickets({ status: 'open' })
  t.is(openTickets.length, 2)

  // Buscar por categoría
  const bugTickets = ticketSystem.searchTickets({ category: 'bugs' })
  t.is(bugTickets.length, 1)
  t.is(bugTickets[0].category, 'bugs')
})

testWithContext('should generate comprehensive report', (t) => {
  const ticketSystem = t.context.ticketSystem

  const sampleTickets = [
    {
      id: 'T1001',
      title: 'Error en login',
      category: 'bugs',
      tags: ['frontend', 'urgent'],
      priority: 'high',
    },
    {
      id: 'T1002',
      title: 'Mejora de rendimiento',
      category: 'improvement',
      tags: ['backend', 'database'],
      priority: 'medium',
    },
  ]

  sampleTickets.forEach((ticket) => ticketSystem.createTicket(ticket))

  // Simular vistas
  ticketSystem.getTicket('T1001')
  ticketSystem.getTicket('T1001')
  ticketSystem.getTicket('T1002')

  const report = ticketSystem.generateReport()

  t.truthy(report.timestamp)
  t.truthy(report.generalStatistics)
  t.is(typeof report.ticketsByCategory, 'object')
  t.is(typeof report.ticketsByTag, 'object')
  t.is(Array.isArray(report.mostViewedTickets), true)

  // Verificar que las estadísticas se generaron
  t.is(report.ticketsByCategory.bugs, 1)
  t.is(report.ticketsByCategory.improvement, 1)
  t.is(report.ticketsByTag.frontend, 1)
  t.is(report.ticketsByTag.backend, 1)
})

testWithContext('should return most viewed tickets correctly', (t) => {
  const ticketSystem = t.context.ticketSystem

  const tickets = [
    { id: 'T1', title: 'Ticket 1', category: 'bugs', tags: ['test'], priority: 'high' },
    { id: 'T2', title: 'Ticket 2', category: 'bugs', tags: ['test'], priority: 'medium' },
    { id: 'T3', title: 'Ticket 3', category: 'bugs', tags: ['test'], priority: 'low' },
  ]

  tickets.forEach((ticket) => ticketSystem.createTicket(ticket))

  // Simular diferentes cantidades de vistas
  ticketSystem.getTicket('T1') // 1 vista
  ticketSystem.getTicket('T2') // 1 vista
  ticketSystem.getTicket('T2') // 2 vistas
  ticketSystem.getTicket('T3') // 1 vista
  ticketSystem.getTicket('T3') // 2 vistas
  ticketSystem.getTicket('T3') // 3 vistas

  const mostViewed = ticketSystem.getMostViewedTickets(2)

  t.is(mostViewed.length, 2)
  t.is(mostViewed[0].id, 'T3') // Más vistas
  t.is(mostViewed[0].views, 3)
  t.is(mostViewed[1].id, 'T2') // Segunda más vistas
  t.is(mostViewed[1].views, 2)
})
