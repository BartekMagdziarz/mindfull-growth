import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/vue'
import ProfileTabAccount from '../ProfileTabAccount.vue'
import { createUserBackup, parseUserBackup, restoreUserBackup } from '@/services/userBackup.service'

vi.mock('@/services/userBackup.service', () => ({
  MAX_BACKUP_BYTES: 50 * 1024 * 1024,
  createUserBackup: vi.fn(),
  parseUserBackup: vi.fn(),
  restoreUserBackup: vi.fn(),
}))
const backup = {
  format: 'mindfull-growth-backup',
  version: 1,
  databaseVersion: 34,
  exportedAt: '2026-10-02T12:00:00Z',
  tables: {},
} as const
beforeEach(() => vi.clearAllMocks())
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
describe('account backup controls', () => {
  it('downloads a JSON backup from the export button', async () => {
    const OriginalURL = globalThis.URL
    const createObjectURL = vi.fn(() => 'blob:backup')
    vi.stubGlobal(
      'URL',
      class extends OriginalURL {
        static createObjectURL = createObjectURL
        static revokeObjectURL = vi.fn()
      }
    )
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    vi.mocked(createUserBackup).mockResolvedValue(backup)
    const feedback = vi.fn()
    render(ProfileTabAccount, { props: { showSnackbar: feedback } })
    await fireEvent.click(screen.getByRole('button', { name: 'Export data' }))
    await waitFor(() => expect(click).toHaveBeenCalledTimes(1))
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(feedback).toHaveBeenCalledWith('Backup downloaded.')
  })
  it('requires confirmation before replacing any data', async () => {
    vi.mocked(parseUserBackup).mockReturnValue(backup)
    // Simulate a storage failure to verify reporting without reloading jsdom.
    vi.mocked(restoreUserBackup).mockRejectedValue(new Error('disk full'))
    const feedback = vi.fn()
    render(ProfileTabAccount, { props: { showSnackbar: feedback } })
    const file = new File(['{}'], 'backup.json', { type: 'application/json' })
    Object.defineProperty(file, 'text', { value: async () => '{}' })
    await fireEvent.change(screen.getByLabelText('Restore backup'), { target: { files: [file] } })
    await screen.findByRole('button', { name: 'Replace and restore' })
    expect(restoreUserBackup).not.toHaveBeenCalled()
    await fireEvent.click(screen.getByRole('button', { name: 'Replace and restore' }))
    await waitFor(() => expect(restoreUserBackup).toHaveBeenCalledWith(backup))
    expect(feedback).toHaveBeenCalledWith(
      'Could not export or restore this backup. Check the file and try again.'
    )
  })
})
