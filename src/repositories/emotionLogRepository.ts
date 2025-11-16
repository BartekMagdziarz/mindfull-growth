import type { EmotionLog } from '@/domain/emotionLog'

export interface EmotionLogRepository {
  getAll(): Promise<EmotionLog[]>
  getById(id: string): Promise<EmotionLog | undefined>
  create(
    data: Omit<EmotionLog, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<EmotionLog>
  update(log: EmotionLog): Promise<EmotionLog>
  delete(id: string): Promise<void>
}


