import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/vue'
import AssessmentIntroCard from '@/components/assessments/AssessmentIntroCard.vue'
import { getAssessmentDefinition } from '@/services/assessments/registry'

const props = {
  definition: getAssessmentDefinition('scs-sf'),
  hasInProgress: false,
  hasHistory: true,
  retakeEligibleAt: '2026-11-20T10:00:00.000Z',
  latestCompletedAt: '2026-10-23T10:00:00.000Z',
}

describe('AssessmentIntroCard', () => {
  it('shows the lock date and disables retake outside a path', () => {
    render(AssessmentIntroCard, { props: { ...props, canRetake: false } })
    expect(screen.getByText(/Retake available on/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retake Assessment' })).toBeDisabled()
  })

  it('names the path request instead of the lock and lets the retake start', async () => {
    const { emitted } = render(AssessmentIntroCard, {
      props: { ...props, canRetake: true, requestedByPath: true },
    })
    expect(screen.getByText(/Your path asks for a new measurement/)).toBeInTheDocument()
    expect(screen.queryByText(/Retake available on/)).not.toBeInTheDocument()
    await fireEvent.click(screen.getByRole('button', { name: 'Retake Assessment' }))
    expect(emitted().retake).toHaveLength(1)
  })
})
