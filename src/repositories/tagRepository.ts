import type { PeopleTag } from '@/domain/tag'
import type { ContextTag } from '@/domain/tag'

export interface PeopleTagRepository {
  getAll(): Promise<PeopleTag[]>
  getById(id: string): Promise<PeopleTag | undefined>
  create(data: { name: string }): Promise<PeopleTag>
  delete(id: string): Promise<void>
}

export interface ContextTagRepository {
  getAll(): Promise<ContextTag[]>
  getById(id: string): Promise<ContextTag | undefined>
  create(data: { name: string }): Promise<ContextTag>
  delete(id: string): Promise<void>
}

