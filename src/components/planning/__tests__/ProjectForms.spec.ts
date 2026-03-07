import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import ProjectForm from '../ProjectForm.vue'
import DraftProjectForm from '../monthly/DraftProjectForm.vue'
import DraftPriorityForm from '../DraftPriorityForm.vue'

const baseStubs = {
  AppCard: { template: '<div><slot /></div>' },
  AppButton: { template: '<button><slot /></button>' },
  LinkedObjectsSection: { template: '<div />' },
  AnimatedStatusPicker: { template: '<div />' },
  CommitmentActionsMenu: { template: '<div />' },
  CommitmentLinkedObjectsCluster: { template: '<div />' },
  InlineDateRangeEditor: { template: '<div />' },
  KeyResultsEditor: {
    props: ['modelValue'],
    template:
      '<div><span>Key Results</span><button type="button" data-testid=\"add-kr\" @click=\"$emit(\'update:modelValue\', [{ id: \'kr-1\', name: \'KR 1\', type: \'count\', cadence: \'weekly\', targetCount: 1, rollup: \'sum\' }])\">Add KR</button></div>',
  },
  IconPicker: {
    props: ['modelValue'],
    template:
      '<button type=\"button\" data-testid=\"icon-picker\" @click=\"$emit(\'update:modelValue\', \'chart\')\">Pick icon</button>',
  },
}

describe('Project forms', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('does not render a key results editor in ProjectForm', () => {
    render(ProjectForm, {
      props: {
        year: 2026,
      },
      global: {
        stubs: baseStubs,
      },
    })

    expect(screen.queryByText('Key Results')).not.toBeInTheDocument()
  })

  it('renders a key results editor in DraftProjectForm', () => {
    render(DraftProjectForm, {
      props: {
        lifeAreas: [],
        priorities: [],
      },
      global: {
        stubs: baseStubs,
      },
    })

    expect(screen.getByText('Key Results')).toBeInTheDocument()
  })

  it('emits project icon from DraftProjectForm saves', async () => {
    const { emitted } = render(DraftProjectForm, {
      props: {
        lifeAreas: [],
        priorities: [],
      },
      global: {
        stubs: baseStubs,
      },
    })

    await fireEvent.click(screen.getByTestId('icon-picker'))
    await fireEvent.update(screen.getByLabelText(/name/i), 'Icon Project')
    await fireEvent.click(screen.getByRole('button', { name: 'Add Project' }))

    const saveCalls = (emitted('save') ?? []) as Array<[Record<string, unknown>]>
    expect(saveCalls.length).toBe(1)
    const payload = saveCalls[0][0]
    expect(payload).toMatchObject({
      name: 'Icon Project',
      icon: 'chart',
    })
  })

  it('emits key results from DraftProjectForm saves', async () => {
    const { emitted } = render(DraftProjectForm, {
      props: {
        lifeAreas: [],
        priorities: [],
      },
      global: {
        stubs: baseStubs,
      },
    })

    await fireEvent.update(screen.getByLabelText(/name/i), 'KR Project')
    await fireEvent.click(screen.getByTestId('add-kr'))
    await fireEvent.click(screen.getByRole('button', { name: 'Add Project' }))

    const saveCalls = (emitted('save') ?? []) as Array<[Record<string, unknown>]>
    expect(saveCalls.length).toBe(1)
    const payload = saveCalls[0][0]
    expect(payload).toMatchObject({
      name: 'KR Project',
      keyResults: [
        expect.objectContaining({
          id: 'kr-1',
          name: 'KR 1',
          type: 'count',
          cadence: 'weekly',
        }),
      ],
    })
  })

  it('emits priority icon from DraftPriorityForm saves', async () => {
    const { emitted } = render(DraftPriorityForm, {
      props: {
        lifeAreas: [],
      },
      global: {
        stubs: baseStubs,
      },
    })

    await fireEvent.click(screen.getByTestId('icon-picker'))
    await fireEvent.update(screen.getByLabelText(/name/i), 'Icon Priority')
    await fireEvent.click(screen.getByRole('button', { name: 'Add' }))

    const saveCalls = (emitted('save') ?? []) as Array<[Record<string, unknown>]>
    expect(saveCalls.length).toBe(1)
    const payload = saveCalls[0][0]
    expect(payload).toMatchObject({
      name: 'Icon Priority',
      icon: 'chart',
    })
  })
})
