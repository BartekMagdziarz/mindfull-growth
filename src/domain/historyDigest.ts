import type { ContentBlock, SourceRef } from '@/services/ai/history/contracts'
export interface HistoryDigest {
  id: string
  kind: 'week' | 'conversation'
  subject: string
  signature: string
  algorithm: 'extractive-v1'
  createdAt: string
  locale: 'pl' | 'en'
  timeZone: string
  coverage: {
    permittedSources: number
    representedSources: number
    selectedBlocks: number
    totalBlocks: number
    partial: boolean
  }
  fragments: Array<
    ContentBlock & { ref: SourceRef; version: string; title: string; blockIndex: number }
  >
  note: string
}
