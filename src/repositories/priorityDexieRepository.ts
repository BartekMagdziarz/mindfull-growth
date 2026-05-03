import type { CreatePriorityPayload, Goal, Habit, Initiative, Priority, Tracker, UpdatePriorityPayload } from '@/domain/planning'
import { MAX_ACTIVE_PRIORITIES, normalizePriorityPayload } from '@/domain/planning'
import { invalidatePlanningQueryCache } from '@/services/planningQueryCache'
import { getUserDatabase } from '@/services/userDatabase.service'
import type { PriorityRepository } from './priorityRepository'
import { createPlanningRecord, requireRecord, toPlain, updatePlanningRecord } from './planningDexieRepository.shared'

class PriorityDexieRepository implements PriorityRepository {
  private get db() {
    return getUserDatabase()
  }

  async getById(id: string): Promise<Priority | undefined> {
    try {
      return await this.db.priorities.get(id)
    } catch (error) {
      console.error(`Failed to get priority with id ${id}:`, error)
      throw new Error(`Failed to retrieve priority with id ${id}`)
    }
  }

  async listAll(): Promise<Priority[]> {
    try {
      return await this.db.priorities.toArray()
    } catch (error) {
      console.error('Failed to list priorities:', error)
      throw new Error('Failed to retrieve priorities from database')
    }
  }

  async create(data: CreatePriorityPayload): Promise<Priority> {
    try {
      const normalized = normalizePriorityPayload(data)
      await this.assertActivePriorityLimit(normalized)

      const priority = createPlanningRecord<Priority>({
        ...normalized,
        order: normalized.status === 'active'
          ? normalized.order ?? await this.nextActiveOrder()
          : undefined,
      })

      await this.db.transaction('rw', this.db.priorities, async () => {
        await this.db.priorities.add(toPlain(priority))
        await this.normalizeActivePriorityOrders()
      })
      invalidatePlanningQueryCache()
      return requireRecord(await this.db.priorities.get(priority.id), `Priority with id ${priority.id} not found`)
    } catch (error) {
      console.error('Failed to create priority:', error)
      throw new Error('Failed to create priority in database')
    }
  }

  async update(id: string, data: UpdatePriorityPayload): Promise<Priority> {
    try {
      const existing = requireRecord(await this.db.priorities.get(id), `Priority with id ${id} not found`)
      const normalized = normalizePriorityPayload(data, existing)
      await this.assertActivePriorityLimit(normalized, id)

      const updated = updatePlanningRecord(existing, {
        ...normalized,
        order: normalized.status === 'active'
          ? normalized.order ?? await this.nextActiveOrder(id)
          : undefined,
      })

      await this.db.transaction('rw', this.db.priorities, async () => {
        await this.db.priorities.put(toPlain(updated))
        await this.normalizeActivePriorityOrders()
      })
      invalidatePlanningQueryCache()
      return requireRecord(await this.db.priorities.get(id), `Priority with id ${id} not found`)
    } catch (error) {
      console.error(`Failed to update priority with id ${id}:`, error)
      throw new Error(`Failed to update priority with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.transaction(
        'rw',
        [this.db.priorities, this.db.goals, this.db.habits, this.db.trackers, this.db.initiatives],
        async () => {
          await this.db.priorities.delete(id)
          await Promise.all([
            this.unlinkPriorityFromTable<Goal>(this.db.goals, id),
            this.unlinkPriorityFromTable<Habit>(this.db.habits, id),
            this.unlinkPriorityFromTable<Tracker>(this.db.trackers, id),
            this.unlinkPriorityFromTable<Initiative>(this.db.initiatives, id),
          ])
          await this.normalizeActivePriorityOrders()
        },
      )
      invalidatePlanningQueryCache()
    } catch (error) {
      console.error(`Failed to delete priority with id ${id}:`, error)
      throw new Error(`Failed to delete priority with id ${id}`)
    }
  }

  private async assertActivePriorityLimit(
    priority: Omit<Priority, 'id' | 'createdAt' | 'updatedAt'>,
    existingId?: string,
  ): Promise<void> {
    if (priority.status !== 'active') return

    const activePriorities = (await this.db.priorities.toArray()).filter(
      item => item.status === 'active' && item.id !== existingId,
    )
    if (activePriorities.length >= MAX_ACTIVE_PRIORITIES) {
      throw new Error(`At most ${MAX_ACTIVE_PRIORITIES} priorities can be active at the same time`)
    }
  }

  private async nextActiveOrder(existingId?: string): Promise<number> {
    const activePriorities = (await this.db.priorities.toArray()).filter(
      item => item.status === 'active' && item.id !== existingId,
    )
    const maxOrder = activePriorities.reduce((max, item) => Math.max(max, item.order ?? 0), 0)
    return maxOrder + 1
  }

  private async normalizeActivePriorityOrders(): Promise<void> {
    const priorities = await this.db.priorities.toArray()
    const active = priorities
      .filter(item => item.status === 'active')
      .sort((left, right) =>
        (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER) ||
        left.title.localeCompare(right.title) ||
        left.createdAt.localeCompare(right.createdAt)
      )

    await Promise.all(active.map((priority, index) => {
      const order = index + 1
      if (priority.order === order) return Promise.resolve()
      return this.db.priorities.put(toPlain({ ...priority, order, updatedAt: new Date().toISOString() }))
    }))
  }

  private async unlinkPriorityFromTable<T extends { priorityIds: string[]; updatedAt: string }>(
    table: { toArray: () => Promise<T[]>; put: (record: T) => Promise<unknown> },
    priorityId: string,
  ): Promise<void> {
    const records = await table.toArray()
    const now = new Date().toISOString()
    await Promise.all(records.map((record) => {
      if (!record.priorityIds.includes(priorityId)) return Promise.resolve()
      return table.put(toPlain({
        ...record,
        priorityIds: record.priorityIds.filter(id => id !== priorityId),
        updatedAt: now,
      }))
    }))
  }
}

export const priorityDexieRepository = new PriorityDexieRepository()
