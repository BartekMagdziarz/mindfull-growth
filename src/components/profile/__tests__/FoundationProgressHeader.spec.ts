import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/vue'
import FoundationProgressHeader from '../FoundationProgressHeader.vue'
import type { FoundationGroupProgress } from '@/services/foundationCompleteness'

function makeGroups(satisfiedCount: number): FoundationGroupProgress[] {
  const groups: FoundationGroupProgress['group'][] = [
    'values',
    'meaning',
    'personality',
    'lifeBalance',
  ]
  return groups.map((group, index) => {
    const satisfied = index < satisfiedCount
    return {
      group,
      total: 3,
      completed: satisfied ? 1 : 0,
      minRequired: 1,
      satisfied,
    }
  })
}

describe('FoundationProgressHeader', () => {
  it('shows the locked keystone and a disabled CTA until every group is covered', () => {
    render(FoundationProgressHeader, {
      props: {
        groups: makeGroups(2),
        unlocked: false,
      },
    })

    expect(screen.getByText('Group coverage: 2/4')).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Complete one exercise in each group to unlock',
      }),
    ).toBeDisabled()
  })

  it('lights the keystone and enables build once unlocked', async () => {
    const { emitted } = render(FoundationProgressHeader, {
      props: {
        groups: makeGroups(4),
        unlocked: true,
      },
    })

    expect(screen.getByText('Unlocked — every group covered')).toBeInTheDocument()

    await fireEvent.click(
      screen.getByRole('button', { name: 'Build my first profile' }),
    )

    expect(emitted().build).toHaveLength(1)
  })
})
