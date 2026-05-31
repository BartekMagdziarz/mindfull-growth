import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import { useEditableField } from '@/composables/useEditableField'

function withScope<T>(fn: () => T): { result: T; scope: ReturnType<typeof effectScope> } {
  const scope = effectScope()
  const result = scope.run(fn) as T
  return { result, scope }
}

function mountInputAndFocus(): HTMLInputElement {
  const input = document.createElement('input')
  document.body.appendChild(input)
  input.focus()
  return input
}

describe('useEditableField', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('initializes draft from source via format', () => {
    const source = ref('hello')
    const { result } = withScope(() =>
      useEditableField({
        source: () => source.value,
      }),
    )

    expect(result.value.value).toBe('hello')
  })

  it('formats null/undefined source to empty string by default', () => {
    const source = ref<string | undefined>(undefined)
    const { result } = withScope(() =>
      useEditableField({
        source: () => source.value,
      }),
    )

    expect(result.value.value).toBe('')
  })

  it('syncs draft from source when input is not focused', async () => {
    const source = ref('initial')
    const { result } = withScope(() =>
      useEditableField({
        source: () => source.value,
      }),
    )

    source.value = 'updated'
    await nextTick()

    expect(result.value.value).toBe('updated')
  })

  it('does NOT sync draft from source while input is focused', async () => {
    const source = ref('initial')
    const { result } = withScope(() =>
      useEditableField({
        source: () => source.value,
      }),
    )

    const input = mountInputAndFocus()
    result.inputRef.value = input

    source.value = 'external change'
    await nextTick()

    expect(result.value.value).toBe('initial')
  })

  it('does NOT sync draft from source while a pending commit is in flight', async () => {
    const source = ref('initial')
    const commit = vi.fn()
    const { result } = withScope(() =>
      useEditableField({
        source: () => source.value,
        commit,
        delay: 400,
      }),
    )

    // User edits — pending commit
    result.value.value = 'user typed'
    await nextTick()

    // External source change while pending
    source.value = 'external change'
    await nextTick()

    // Draft must keep user's value, not jump to external
    expect(result.value.value).toBe('user typed')

    // After debounce fires, commit goes with user value
    vi.advanceTimersByTime(400)
    expect(commit).toHaveBeenCalledWith('user typed')
  })

  it('debounces commit by configured delay', async () => {
    const source = ref('initial')
    const commit = vi.fn()
    const { result } = withScope(() =>
      useEditableField({
        source: () => source.value,
        commit,
        delay: 300,
      }),
    )

    result.value.value = 'a'
    await nextTick()
    vi.advanceTimersByTime(299)
    expect(commit).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(commit).toHaveBeenCalledTimes(1)
    expect(commit).toHaveBeenCalledWith('a')
  })

  it('collapses rapid edits into a single commit', async () => {
    const source = ref('')
    const commit = vi.fn()
    const { result } = withScope(() =>
      useEditableField({
        source: () => source.value,
        commit,
        delay: 200,
      }),
    )

    result.value.value = 'a'
    await nextTick()
    vi.advanceTimersByTime(100)
    result.value.value = 'ab'
    await nextTick()
    vi.advanceTimersByTime(100)
    result.value.value = 'abc'
    await nextTick()
    vi.advanceTimersByTime(200)

    expect(commit).toHaveBeenCalledTimes(1)
    expect(commit).toHaveBeenCalledWith('abc')
  })

  it('flush() commits immediately and cancels the timer', async () => {
    const source = ref('initial')
    const commit = vi.fn()
    const { result } = withScope(() =>
      useEditableField({
        source: () => source.value,
        commit,
        delay: 500,
      }),
    )

    result.value.value = 'flushed'
    await nextTick()

    result.flush()
    expect(commit).toHaveBeenCalledWith('flushed')

    // Timer should not fire a second commit
    vi.advanceTimersByTime(1000)
    expect(commit).toHaveBeenCalledTimes(1)
  })

  it('flush() is a no-op when there is no pending commit', () => {
    const source = ref('initial')
    const commit = vi.fn()
    const { result } = withScope(() =>
      useEditableField({
        source: () => source.value,
        commit,
        delay: 100,
      }),
    )

    result.flush()
    expect(commit).not.toHaveBeenCalled()
  })

  it('reverting draft to source value clears the pending commit', async () => {
    const source = ref('initial')
    const commit = vi.fn()
    const { result } = withScope(() =>
      useEditableField({
        source: () => source.value,
        commit,
        delay: 300,
      }),
    )

    result.value.value = 'temp'
    await nextTick()
    result.value.value = 'initial'
    await nextTick()

    vi.advanceTimersByTime(1000)
    expect(commit).not.toHaveBeenCalled()
  })

  it('scope dispose flushes pending commit', async () => {
    const source = ref('initial')
    const commit = vi.fn()
    const { result, scope } = withScope(() =>
      useEditableField({
        source: () => source.value,
        commit,
        delay: 400,
      }),
    )

    result.value.value = 'before unmount'
    await nextTick()

    scope.stop()

    expect(commit).toHaveBeenCalledWith('before unmount')
  })

  it('applies custom format from stored to input value', async () => {
    const source = ref<number | null>(42)
    const { result } = withScope(() =>
      useEditableField<number | null, string>({
        source: () => source.value,
        format: (v) => (v == null ? '' : String(v)),
      }),
    )

    expect(result.value.value).toBe('42')

    source.value = null
    await nextTick()
    expect(result.value.value).toBe('')
  })

  it('uses custom isEqual to detect revert with custom format', async () => {
    const source = ref<number | null>(5)
    const commit = vi.fn()
    const { result } = withScope(() =>
      useEditableField<number | null, string>({
        source: () => source.value,
        format: (v) => (v == null ? '' : String(v)),
        commit,
        delay: 200,
      }),
    )

    // edit to a different value
    result.value.value = '7'
    await nextTick()
    // revert to source-formatted value
    result.value.value = '5'
    await nextTick()

    vi.advanceTimersByTime(500)
    expect(commit).not.toHaveBeenCalled()
  })

  it('respects custom isFocused() override (multiple possible inputs)', async () => {
    const source = ref('initial')
    let externallyFocused = true
    const { result } = withScope(() =>
      useEditableField({
        source: () => source.value,
        isFocused: () => externallyFocused,
      }),
    )

    source.value = 'external'
    await nextTick()
    expect(result.value.value).toBe('initial') // focused → skip sync

    externallyFocused = false
    source.value = 'next'
    await nextTick()
    expect(result.value.value).toBe('next') // not focused → sync
  })

  it('manual mode (no delay) does not auto-commit; flush() commits pending edit', async () => {
    const source = ref('initial')
    const commit = vi.fn()
    const { result } = withScope(() =>
      useEditableField({
        source: () => source.value,
        commit,
        // no delay -> manual mode
      }),
    )

    result.value.value = 'manual draft'
    await nextTick()

    vi.advanceTimersByTime(10_000)
    expect(commit).not.toHaveBeenCalled()

    result.flush()
    expect(commit).toHaveBeenCalledWith('manual draft')
  })

  it('does not commit when source-driven sync changes the draft', async () => {
    const source = ref('a')
    const commit = vi.fn()
    const { result } = withScope(() =>
      useEditableField({
        source: () => source.value,
        commit,
        delay: 100,
      }),
    )

    source.value = 'b'
    await nextTick()
    expect(result.value.value).toBe('b')

    vi.advanceTimersByTime(500)
    expect(commit).not.toHaveBeenCalled()
  })
})
