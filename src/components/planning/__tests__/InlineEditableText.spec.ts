import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/vue'
import InlineEditableText from '../InlineEditableText.vue'

describe('InlineEditableText', () => {
  it('renders the display text', () => {
    render(InlineEditableText, { props: { modelValue: 'Focus Area' } })
    expect(screen.getByText('Focus Area')).toBeInTheDocument()
  })

  it('enters edit mode on click', async () => {
    render(InlineEditableText, { props: { modelValue: 'Focus Area' } })

    await fireEvent.click(screen.getByText('Focus Area'))

    const input = await screen.findByRole('textbox')
    expect(input).toHaveValue('Focus Area')
  })

  it('saves on Enter', async () => {
    const { emitted } = render(InlineEditableText, { props: { modelValue: 'Focus Area' } })

    await fireEvent.click(screen.getByText('Focus Area'))
    const input = await screen.findByRole('textbox')
    await fireEvent.update(input, 'New Name')
    await fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    expect(emitted().save).toBeTruthy()
    expect(emitted().save[0]).toEqual(['New Name'])
  })

  it('saves on blur', async () => {
    const { emitted } = render(InlineEditableText, { props: { modelValue: 'Focus Area' } })

    await fireEvent.click(screen.getByText('Focus Area'))
    const input = await screen.findByRole('textbox')
    await fireEvent.update(input, 'Updated Name')
    await fireEvent.blur(input)

    expect(emitted().save).toBeTruthy()
    expect(emitted().save[0]).toEqual(['Updated Name'])
  })

  it('cancels on Escape', async () => {
    const { emitted } = render(InlineEditableText, { props: { modelValue: 'Focus Area' } })

    await fireEvent.click(screen.getByText('Focus Area'))
    const input = await screen.findByRole('textbox')
    await fireEvent.update(input, 'Should Not Save')
    await fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' })

    expect(emitted().save).toBeFalsy()
    expect(screen.getByText('Focus Area')).toBeInTheDocument()
  })

  it('rejects empty values', async () => {
    const { emitted } = render(InlineEditableText, { props: { modelValue: 'Focus Area' } })

    await fireEvent.click(screen.getByText('Focus Area'))
    const input = await screen.findByRole('textbox')
    await fireEvent.update(input, '   ')
    await fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    expect(emitted().save).toBeFalsy()
    expect(screen.getByText('Name is required')).toBeInTheDocument()
  })
})
