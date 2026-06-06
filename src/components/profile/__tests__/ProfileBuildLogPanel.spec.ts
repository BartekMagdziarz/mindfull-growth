import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'

// Mock the repository so tests fully control the data flow.
vi.mock('@/repositories/profileBuildLogDexieRepository', () => ({
  profileBuildLogDexieRepository: {
    list: vi.fn(),
    clearAll: vi.fn(),
  },
}))

import ProfileBuildLogPanel from '../ProfileBuildLogPanel.vue'
import { profileBuildLogDexieRepository } from '@/repositories/profileBuildLogDexieRepository'
import type { ProfileBuildLogEntry } from '@/domain/userProfile'

function makeLog(overrides: Partial<ProfileBuildLogEntry> = {}): ProfileBuildLogEntry {
  return {
    id: overrides.id ?? 'log-' + Math.random().toString(36).slice(2, 8),
    timestamp: overrides.timestamp ?? '2026-04-20T10:15:00.000Z',
    scope: overrides.scope ?? {
      dataTypes: ['journal'],
      dateRange: { kind: 'preset', preset: 'last30' },
      includedObjectIds: {},
      approxTokenCount: 200,
      locale: 'en',
      grammaticalGender: 'masculine',
    },
    model: overrides.model ?? 'gpt-test',
    requestBody: overrides.requestBody ?? '{"model":"gpt-test"}',
    responseBody: overrides.responseBody ?? '## Summary\n\nRaw response text.',
    latencyMs: overrides.latencyMs ?? 1234,
    success: overrides.success ?? true,
    errorMessage: overrides.errorMessage,
    resultProfileId: overrides.resultProfileId,
    tokenUsage: overrides.tokenUsage,
    estimateBreakdown: overrides.estimateBreakdown,
    droppedByType: overrides.droppedByType,
  }
}

describe('ProfileBuildLogPanel', () => {
  beforeEach(() => {
    // resetAllMocks clears both call history AND queued implementations
    // (mockResolvedValueOnce). clearAllMocks would leak the queue.
    vi.resetAllMocks()
    // Tests run in jsdom; `import.meta.env.DEV` is typically `false` under
    // vitest. Force it true so the panel renders by default.
    vi.stubEnv('DEV', true)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('renders empty state when there are no logs', async () => {
    vi.mocked(profileBuildLogDexieRepository.list).mockResolvedValue([])

    render(ProfileBuildLogPanel)

    await waitFor(() => {
      expect(screen.getByText('No profile builds yet.')).toBeInTheDocument()
    })
    // No "Clear all" button in empty state.
    expect(
      screen.queryByRole('button', { name: 'Clear all' }),
    ).not.toBeInTheDocument()
  })

  it('renders one row per log with model and latency', async () => {
    vi.mocked(profileBuildLogDexieRepository.list).mockResolvedValue([
      makeLog({ id: 'log-a', model: 'model-alpha', latencyMs: 150 }),
      makeLog({ id: 'log-b', model: 'model-beta', latencyMs: 2500 }),
    ])

    const { container } = render(ProfileBuildLogPanel)

    await waitFor(() => {
      expect(screen.getByText('model-alpha')).toBeInTheDocument()
      expect(screen.getByText('model-beta')).toBeInTheDocument()
    })

    const rows = container.querySelectorAll('[data-test-build-log-row]')
    expect(rows).toHaveLength(2)

    // Latency formatting: <1s → ms, ≥1s → seconds with 2 decimals.
    expect(screen.getByText('150 ms')).toBeInTheDocument()
    expect(screen.getByText('2.50 s')).toBeInTheDocument()
  })

  it('expands a row on click and collapses it on a second click', async () => {
    vi.mocked(profileBuildLogDexieRepository.list).mockResolvedValue([
      makeLog({ id: 'log-a', requestBody: '{"a":1}' }),
    ])
    const user = userEvent.setup()
    const { container } = render(ProfileBuildLogPanel)

    await waitFor(() => {
      expect(
        container.querySelector('[data-test-build-log-row="log-a"]'),
      ).toBeInTheDocument()
    })

    const row = container.querySelector(
      '[data-test-build-log-row="log-a"] button',
    ) as HTMLButtonElement
    expect(row).toBeTruthy()

    // Before click: no body
    expect(
      container.querySelector('[data-test-build-log-body="log-a"]'),
    ).toBeNull()

    await user.click(row)
    await waitFor(() => {
      expect(
        container.querySelector('[data-test-build-log-body="log-a"]'),
      ).toBeInTheDocument()
    })

    await user.click(row)
    await waitFor(() => {
      expect(
        container.querySelector('[data-test-build-log-body="log-a"]'),
      ).toBeNull()
    })
  })

  it('only one row is expanded at a time', async () => {
    vi.mocked(profileBuildLogDexieRepository.list).mockResolvedValue([
      makeLog({ id: 'log-a' }),
      makeLog({ id: 'log-b' }),
    ])
    const user = userEvent.setup()
    const { container } = render(ProfileBuildLogPanel)

    await waitFor(() => {
      expect(
        container.querySelector('[data-test-build-log-row="log-a"]'),
      ).toBeInTheDocument()
    })

    const rowA = container.querySelector(
      '[data-test-build-log-row="log-a"] button',
    ) as HTMLButtonElement
    const rowB = container.querySelector(
      '[data-test-build-log-row="log-b"] button',
    ) as HTMLButtonElement

    await user.click(rowA)
    await waitFor(() => {
      expect(
        container.querySelector('[data-test-build-log-body="log-a"]'),
      ).toBeInTheDocument()
    })

    await user.click(rowB)
    await waitFor(() => {
      // #a closed, #b open
      expect(
        container.querySelector('[data-test-build-log-body="log-a"]'),
      ).toBeNull()
      expect(
        container.querySelector('[data-test-build-log-body="log-b"]'),
      ).toBeInTheDocument()
    })
  })

  it('opens confirm dialog and clears logs when Clear is confirmed', async () => {
    // First load: one log. After clearAll + reload: empty.
    vi.mocked(profileBuildLogDexieRepository.list)
      .mockResolvedValueOnce([makeLog({ id: 'log-a' })])
      .mockResolvedValueOnce([])
    vi.mocked(profileBuildLogDexieRepository.clearAll).mockResolvedValue(
      undefined,
    )
    const user = userEvent.setup()
    render(ProfileBuildLogPanel)

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Clear all' }),
      ).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Clear all' }))

    // AppDialog renders the `confirmText` / `cancelText` as buttons inside
    // a transition. `findByRole` polls until the Confirm button appears.
    const confirmBtn = await screen.findByRole('button', { name: 'Clear' })
    await user.click(confirmBtn)

    await waitFor(() => {
      expect(profileBuildLogDexieRepository.clearAll).toHaveBeenCalledTimes(1)
    })
    // list() called once on mount, once on reload-after-clear.
    expect(profileBuildLogDexieRepository.list).toHaveBeenCalledTimes(2)

    await waitFor(() => {
      expect(screen.getByText('No profile builds yet.')).toBeInTheDocument()
    })
  })

  it('renders a red "fail" pill and an Error block for failed builds', async () => {
    vi.mocked(profileBuildLogDexieRepository.list).mockResolvedValue([
      makeLog({
        id: 'log-a',
        success: false,
        errorMessage: 'API key invalid',
      }),
    ])
    const user = userEvent.setup()
    const { container } = render(ProfileBuildLogPanel)

    await waitFor(() => {
      expect(
        container.querySelector('[data-test-build-log-status="fail"]'),
      ).toBeInTheDocument()
    })

    const row = container.querySelector(
      '[data-test-build-log-row="log-a"] button',
    ) as HTMLButtonElement

    await user.click(row)

    await waitFor(() => {
      const errorBlock = container.querySelector(
        '[data-test-build-log-error]',
      )
      expect(errorBlock?.textContent).toContain('API key invalid')
    })
  })

  it('truncates resultProfileId to the first 8 chars and keeps the full id in title', async () => {
    const fullId = 'abcdef1234567890'
    vi.mocked(profileBuildLogDexieRepository.list).mockResolvedValue([
      makeLog({ id: 'log-a', resultProfileId: fullId }),
    ])
    const { container } = render(ProfileBuildLogPanel)

    await waitFor(() => {
      const link = container.querySelector(
        '[data-test-build-log-profile-link]',
      ) as HTMLElement
      expect(link).toBeInTheDocument()
      expect(link.textContent).toContain('abcdef12')
      expect(link.textContent).toContain('…')
      expect(link.getAttribute('title')).toBe(fullId)
    })
  })

  it('pretty-prints JSON request bodies and falls back to raw for non-JSON', async () => {
    vi.mocked(profileBuildLogDexieRepository.list).mockResolvedValue([
      makeLog({ id: 'log-json', requestBody: '{"a":1,"b":"x"}' }),
      makeLog({ id: 'log-raw', requestBody: 'not json at all' }),
    ])
    const user = userEvent.setup()
    const { container } = render(ProfileBuildLogPanel)

    await waitFor(() => {
      expect(
        container.querySelector('[data-test-build-log-row="log-json"]'),
      ).toBeInTheDocument()
    })

    // Expand JSON row → expect newline-separated pretty-printed output.
    await user.click(
      container.querySelector(
        '[data-test-build-log-row="log-json"] button',
      ) as HTMLButtonElement,
    )
    await waitFor(() => {
      const req = container.querySelector(
        '[data-test-build-log-row="log-json"] [data-test-build-log-request]',
      )
      expect(req?.textContent).toContain('\n')
      expect(req?.textContent).toContain('"a": 1')
    })

    // Collapse the first row, expand the raw row.
    await user.click(
      container.querySelector(
        '[data-test-build-log-row="log-json"] button',
      ) as HTMLButtonElement,
    )
    await user.click(
      container.querySelector(
        '[data-test-build-log-row="log-raw"] button',
      ) as HTMLButtonElement,
    )
    await waitFor(() => {
      const req = container.querySelector(
        '[data-test-build-log-row="log-raw"] [data-test-build-log-request]',
      )
      expect(req?.textContent).toBe('not json at all')
    })
  })

  it('renders the estimate breakdown (per-type × age) for an expanded row', async () => {
    vi.mocked(profileBuildLogDexieRepository.list).mockResolvedValue([
      makeLog({
        id: 'log-a',
        estimateBreakdown: {
          approxTokens: 9300,
          tokensByType: { journal: 9100, emotionLogs: 200 },
          tokensByAge: {
            '0-30d': 3400,
            '31-90d': 0,
            '91-365d': 5900,
            '365d+': 0,
            undated: 0,
          },
        },
      }),
    ])
    const user = userEvent.setup()
    const { container } = render(ProfileBuildLogPanel)

    await waitFor(() => {
      expect(
        container.querySelector('[data-test-build-log-row="log-a"]'),
      ).toBeInTheDocument()
    })

    await user.click(
      container.querySelector(
        '[data-test-build-log-row="log-a"] button',
      ) as HTMLButtonElement,
    )

    await waitFor(() => {
      const block = container.querySelector('[data-test-estimate-breakdown]')
      expect(block).toBeInTheDocument()
      expect(block?.textContent).toContain('9300')
      expect(block?.textContent).toContain('journal')
      expect(block?.textContent).toContain('0-30d')
      expect(block?.textContent).toContain('91-365d')
      // Zero-cost buckets are dropped.
      expect(block?.textContent).not.toContain('31-90d')
    })
  })

  it('renders the trimmed-to-fit sub-block for an expanded row', async () => {
    vi.mocked(profileBuildLogDexieRepository.list).mockResolvedValue([
      makeLog({ id: 'log-a', droppedByType: { journal: 40, emotionLogs: 0 } }),
    ])
    const user = userEvent.setup()
    const { container } = render(ProfileBuildLogPanel)

    await waitFor(() => {
      expect(
        container.querySelector('[data-test-build-log-row="log-a"]'),
      ).toBeInTheDocument()
    })

    await user.click(
      container.querySelector(
        '[data-test-build-log-row="log-a"] button',
      ) as HTMLButtonElement,
    )

    await waitFor(() => {
      const block = container.querySelector('[data-test-dropped-by-type]')
      expect(block).toBeInTheDocument()
      expect(block?.textContent).toContain('journal')
      expect(block?.textContent).toContain('40')
      // Zero-count types are pruned.
      expect(block?.textContent).not.toContain('emotionLogs')
    })
  })

  it('is hidden when import.meta.env.DEV is false', async () => {
    vi.unstubAllEnvs()
    vi.stubEnv('DEV', false)
    vi.mocked(profileBuildLogDexieRepository.list).mockResolvedValue([
      makeLog({ id: 'log-a' }),
    ])

    render(ProfileBuildLogPanel)

    // Panel root has data-test-build-log-panel only when rendered.
    expect(
      document.querySelector('[data-test-build-log-panel]'),
    ).toBeNull()
    expect(screen.queryByText(/Dev: Profile Build Logs/)).toBeNull()
  })
})
