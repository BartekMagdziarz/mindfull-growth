import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import ProgramTaskChoice from '@/components/exercises/ProgramTaskChoice.vue'
import { getProgramDefinition } from '@/data/programCatalog'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'

const SHAME = getProgramDefinition('shame-compassion')!
const task = (key: string) => SHAME.weeklyTasks!.find(candidate => candidate.key === key)!

const stubs = { AppIcon: { template: '<i />' } }

function renderChoice(props: Partial<InstanceType<typeof ProgramTaskChoice>['$props']> = {}) {
  return render(ProgramTaskChoice, {
    props: {
      program: SHAME,
      current: [task('friendTest'), task('stayLonger'), task('repairGuilt')],
      earlier: [task('nameShame'), task('useResponse')],
      modelValue: 'friendTest',
      suggestedKey: 'friendTest',
      ...props,
    },
    global: { stubs },
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
  useUserPreferencesStore().$patch({ locale: 'en' })
})

describe('ProgramTaskChoice', () => {
  it('lists the phase tasks as radios with the suggestion marked, earlier phases collapsed', () => {
    renderChoice()
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)
    expect(radios[0]).toHaveProperty('checked', true)
    expect(screen.getByText(/3 times a week · suggested/)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Earlier tasks \(2\)/ })).toBeTruthy()
    // The "why" follows the selected task.
    expect(screen.getByText(/someone else's demand/)).toBeTruthy()
  })

  it('emits the picked key and shows that task’s why', async () => {
    const { emitted, rerender } = renderChoice()
    await fireEvent.click(screen.getAllByRole('radio')[1]!)
    expect(emitted()['update:modelValue']?.[0]).toEqual(['stayLonger'])
    await rerender({ modelValue: 'stayLonger' })
    expect(screen.getByText(/A minute longer shows nothing happens/)).toBeTruthy()
  })

  it('opens the earlier tasks on demand and keeps them open when the selection lives there', async () => {
    renderChoice()
    await fireEvent.click(screen.getByRole('button', { name: /Earlier tasks/ }))
    expect(screen.getAllByRole('radio')).toHaveLength(5)
    expect(screen.getByRole('button', { name: /Hide earlier tasks/ })).toBeTruthy()
  })

  it('starts expanded when the suggestion is an earlier task (after "stay") and labels it as a repeat', () => {
    renderChoice({ modelValue: 'useResponse', suggestedKey: 'useResponse', repeat: true })
    expect(screen.getAllByRole('radio')).toHaveLength(5)
    expect(screen.getByText(/same task as last time/)).toBeTruthy()
  })
})
