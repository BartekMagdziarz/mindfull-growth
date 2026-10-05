import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/vue'
import ProfileContextToggle from '../ProfileContextToggle.vue'
import { approvedProfileRepository } from '@/repositories/approvedProfileRepository'
import { blankProfileContent } from '@/domain/approvedProfile'
import { getTestDatabase } from '@/test/testDatabase'
beforeEach(async () => {
  for (const table of getTestDatabase().tables) await table.clear()
})
describe('ProfileContextToggle', () => {
  it('appears after an approved profile is saved and disappears after it is ended', async () => {
    const { container } = render(ProfileContextToggle, { props: { modelValue: true, scope: 'journal' } })
    expect(container.querySelector('button')).toBeNull()
    const repo = approvedProfileRepository(),
      content = { ...blankProfileContent(), text: 'Lubię konkretne pytania.', scope: 'journal' as const }
    const item = await repo.save(content)
    expect(await screen.findByRole('button')).toHaveAttribute('aria-pressed', 'true')
    await repo.save(content, item.id, item.version, 'ended')
    await waitFor(() => expect(container.querySelector('button')).toBeNull())
  })
  it.each([true, false])('emits the inverse of %s without modifying the profile', async enabled => {
    await approvedProfileRepository().save({ ...blankProfileContent(), text: 'Mój profil' })
    const { emitted } = render(ProfileContextToggle, { props: { modelValue: enabled } })
    await fireEvent.click(await screen.findByRole('button'))
    expect(emitted('update:modelValue')![0]).toEqual([!enabled])
    expect((await approvedProfileRepository().snapshot()).items).toHaveLength(1)
  })
})
