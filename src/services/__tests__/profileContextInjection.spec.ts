import { beforeEach, describe, expect, it } from 'vitest'
import { profileContextAvailable, withProfileContextSystemPrompt } from '../userContext'
import { approvedProfileRepository } from '@/repositories/approvedProfileRepository'
import { blankProfileContent } from '@/domain/approvedProfile'
import { getTestDatabase } from '@/test/testDatabase'
import { useUserProfileStore } from '@/stores/userProfile.store'
import { createEmptySections, type UserProfile } from '@/domain/userProfile'
beforeEach(async () => {
  for (const table of getTestDatabase().tables) await table.clear()
})
describe('approved profile adapter for existing assistants', () => {
  it('never injects a legacy narrative or a pending proposal', async () => {
    useUserProfileStore().profiles = [
      {
        id: 'old',
        sections: { ...createEmptySections(), summary: 'Unconfirmed portrait' },
      } as UserProfile,
    ]
    await approvedProfileRepository().propose({
      dedupeKey: 'pending',
      operation: 'add',
      targetId: null,
      targetVersion: null,
      content: { ...blankProfileContent(), text: 'Pending interpretation' },
      origin: { kind: 'user', label: 'Test', citations: [] },
      reason: 'Test',
    })
    expect(await withProfileContextSystemPrompt('SYS', { useProfile: true })).toBe('SYS')
    expect(await profileContextAvailable()).toBe(false)
  })
  it('injects only accepted context once and preserves the per-call opt-out', async () => {
    await approvedProfileRepository().save({
      ...blankProfileContent(),
      text: 'I prefer one question at a time.',
    })
    expect(await profileContextAvailable()).toBe(true)
    expect(await withProfileContextSystemPrompt('SYS', { useProfile: false })).toBe('SYS')
    const prompt = await withProfileContextSystemPrompt('SYS', { useProfile: true })
    expect(prompt).toContain('I prefer one question at a time.')
    expect(prompt.match(/User-approved Profile Context/g)).toHaveLength(1)
    expect(prompt.endsWith('SYS')).toBe(true)
  })
  it('honours surface-specific context and ending an item', async () => {
    const repo = approvedProfileRepository(),
      content = {
        ...blankProfileContent(),
        text: 'Ask about positive experiences.',
        scope: 'journal' as const,
      }
    const item = await repo.save(content)
    expect(await withProfileContextSystemPrompt('SYS', { useProfile: true })).toBe('SYS')
    expect(
      await withProfileContextSystemPrompt('SYS', { useProfile: true, scope: 'journal' })
    ).toContain(content.text)
    await repo.save(content, item.id, item.version, 'ended')
    expect(
      await withProfileContextSystemPrompt('SYS', { useProfile: true, scope: 'journal' })
    ).toBe('SYS')
  })
})
