/**
 * Repository interface for Life Areas
 */

import type { LifeArea, CreateLifeAreaPayload, UpdateLifeAreaPayload } from '@/domain/lifeArea'

export interface LifeAreaRepository {
  getAll(): Promise<LifeArea[]>
  getById(id: string): Promise<LifeArea | undefined>
  getActive(): Promise<LifeArea[]>
  create(data: CreateLifeAreaPayload): Promise<LifeArea>
  update(id: string, data: UpdateLifeAreaPayload): Promise<LifeArea>
  delete(id: string): Promise<void>
}
