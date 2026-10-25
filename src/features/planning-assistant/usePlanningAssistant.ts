import { computed, onBeforeUnmount, ref } from 'vue'
import {
  mergePlannerObjects,
  plannerSelectionErrors,
  selectPlannerObject,
  type PlannerObject,
  type PlanningAssistantDraft,
} from '@/domain/planningAssistant'
import {
  planningAssistantDraftRepository as repository,
  PlanningDraftConflict,
} from '@/repositories/planningAssistantDraftRepository'
import {
  requestPlannerReply,
  PlannerRequestError,
} from '@/services/ai/planning/planningAssistantService'
import { commitPlanningAssistantDraft } from '@/services/planningAssistantCommitService'
import { captureUserSession } from '@/services/userSessionScope'

const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value))
export function usePlanningAssistant() {
  const session = captureUserSession()
  const draft = ref<PlanningAssistantDraft | null>(null)
  const loading = ref(true),
    busy = ref(false),
    saving = ref(false),
    conflict = ref(false)
  const pendingWrites = ref(0)
  const error = ref(''),
    persistenceError = ref(''),
    notice = ref(''),
    attemptedSave = ref(false)
  const selected = computed(() => draft.value?.objects.filter(item => item.selected) ?? [])
  const errors = computed(() => plannerSelectionErrors(draft.value?.objects ?? []))
  let queue: Promise<boolean> = Promise.resolve(true)
  let controller: AbortController | null = null,
    disposed = false
  let observed: PlannerObject[] = []
  const unsubscribe = session.onInvalidate(() => {
    controller?.abort()
    conflict.value = true
    draft.value = null
    error.value = 'Zmieniono konto. Otwórz pomocnika ponownie.'
  })
  function observe() {
    observed = plain(draft.value?.objects ?? [])
  }
  async function load() {
    if (busy.value || saving.value) return
    loading.value = true
    try {
      await queue
      const value = await session.wait(repository.open())
      if (disposed) return
      draft.value = value
      conflict.value = false
      persistenceError.value = ''
      error.value = ''
      observe()
      if (value.pendingMessageId && !value.receipt) {
        const interrupted = value.messages.find(item => item.id === value.pendingMessageId)
        if (interrupted && !value.input) value.input = interrupted.text
        value.messages = value.messages.filter(item => item.id !== value.pendingMessageId)
        value.pendingMessageId = null
        error.value = 'Poprzednia odpowiedź została przerwana. Możesz wysłać wiadomość ponownie.'
        await persist()
      }
    } catch {
      if (session.isCurrent() && !disposed)
        error.value = 'Nie udało się odczytać szkicu. Spróbuj ponownie.'
    } finally {
      loading.value = false
    }
  }
  function persist(): Promise<boolean> {
    if (!draft.value || draft.value.receipt || conflict.value || !session.isCurrent())
      return Promise.resolve(false)
    const snapshot = plain(draft.value)
    pendingWrites.value++
    queue = queue
      .then(async () => {
        if (conflict.value || !session.isCurrent() || draft.value?.id !== snapshot.id) return false
        try {
          const revision = await session.wait(repository.save(snapshot, draft.value.revision))
          if (draft.value?.id === snapshot.id) draft.value.revision = revision
          persistenceError.value = ''
          return true
        } catch (cause) {
          if (cause instanceof PlanningDraftConflict) conflict.value = true
          persistenceError.value =
            cause instanceof PlanningDraftConflict
              ? cause.message
              : 'Nie udało się zachować ostatniej zmiany. Uzupełnij pola i spróbuj ponownie.'
          return false
        }
      })
      .finally(() => {
        pendingWrites.value--
      })
    return queue
  }
  function changed() {
    void persist()
  }
  function lockChanges(id: string) {
    if (!draft.value) return
    const item = draft.value.objects.find(item => item.id === id),
      previous = observed.find(item => item.id === id)
    if (item && previous)
      for (const key of Object.keys(item) as Array<keyof PlannerObject>) {
        if (JSON.stringify(item[key]) !== JSON.stringify(previous[key])) {
          const locks = (draft.value.lockedFields[id] ??= [])
          if (!locks.includes(key)) locks.push(key)
        }
      }
  }
  function edited(id: string) {
    lockChanges(id)
    observe()
    error.value = ''
    changed()
  }
  function select(id: string, value: boolean) {
    if (!draft.value) return
    notice.value = selectPlannerObject(draft.value.objects, id, value) ?? ''
    // Cascading parent/child choices are manual choices too.
    for (const item of draft.value.objects) lockChanges(item.id)
    observe()
    error.value = ''
    changed()
  }
  async function send(text?: string) {
    if (!draft.value || busy.value || saving.value || conflict.value || draft.value.receipt) return
    const message = (text ?? draft.value.input).trim()
    if (!message) return
    busy.value = true
    error.value = ''
    notice.value = ''
    const snapshot = plain(draft.value),
      messageId = crypto.randomUUID()
    draft.value.messages.push({ id: messageId, role: 'user', text: message })
    draft.value.pendingMessageId = messageId
    draft.value.input = ''
    draft.value.suggestions = []
    const active = new AbortController()
    controller = active
    try {
      if (!(await persist())) throw new Error('Zachowaj szkic przed wysłaniem wiadomości.')
      const result = await requestPlannerReply(snapshot, message, {
        signal: active.signal,
        beforeRequest: async (spentUsd, policyRevision) => {
          if (disposed || !draft.value || active.signal.aborted)
            throw new Error('Przerwano odpowiedź.')
          draft.value.spentUsd = spentUsd
          draft.value.policyRevision = policyRevision
          if (!(await persist())) throw new Error('Zachowaj szkic przed wysłaniem wiadomości.')
        },
      })
      session.assertCurrent()
      if (disposed || draft.value.id !== snapshot.id) return
      draft.value.spentUsd = result.spentUsd
      if (active.signal.aborted)
        throw new PlannerRequestError('Przerwano odpowiedź.', result.spentUsd)
      // Manual edits made while waiting always win, including selection.
      draft.value.objects = mergePlannerObjects(
        plain(draft.value.objects),
        result.reply.objects,
        plain(draft.value.lockedFields)
      )
      draft.value.messages.push({
        id: crypto.randomUUID(),
        role: 'assistant',
        text: result.reply.message,
      })
      draft.value.suggestions = result.reply.suggestions
      draft.value.policyRevision = result.policyRevision
      draft.value.pendingMessageId = null
      observe()
      notice.value = result.reply.objects.length ? 'Szkic został zaktualizowany.' : ''
    } catch (cause) {
      if (!session.isCurrent() || disposed || draft.value?.id !== snapshot.id) return
      if (cause instanceof PlannerRequestError) draft.value.spentUsd = cause.spentUsd
      draft.value.messages = draft.value.messages.filter(item => item.id !== messageId)
      draft.value.pendingMessageId = null
      if (!draft.value.input) draft.value.input = message
      error.value = active.signal.aborted
        ? 'Przerwano odpowiedź. Możesz spróbować ponownie.'
        : cause instanceof Error
          ? cause.message
          : 'Nie udało się przygotować odpowiedzi.'
    } finally {
      if (session.isCurrent() && !disposed) {
        busy.value = false
        controller = null
        await persist()
      }
    }
  }
  function cancel() {
    controller?.abort()
  }
  async function save() {
    if (!draft.value || busy.value || saving.value || conflict.value || draft.value.receipt) return
    attemptedSave.value = true
    if (errors.value.length) return
    saving.value = true
    error.value = ''
    try {
      if (!(await persist())) return
      const receipt = await session.wait(
        commitPlanningAssistantDraft(draft.value.id, draft.value.revision)
      )
      draft.value.receipt = receipt
      draft.value.revision++
      notice.value = 'Plan dodany.'
    } catch (cause) {
      if (cause instanceof PlanningDraftConflict) conflict.value = true
      if (session.isCurrent())
        error.value =
          cause instanceof Error ? cause.message : 'Nie udało się dodać planu. Szkic jest tutaj.'
    } finally {
      saving.value = false
    }
  }
  async function reset() {
    if (!draft.value || busy.value || saving.value || conflict.value) return false
    saving.value = true
    try {
      if (!draft.value.receipt && !(await persist())) return false
      draft.value = await session.wait(repository.reset(draft.value.id, draft.value.revision))
      observe()
      attemptedSave.value = false
      error.value = ''
      notice.value = ''
      return true
    } catch (cause) {
      if (cause instanceof PlanningDraftConflict) conflict.value = true
      error.value =
        cause instanceof Error ? cause.message : 'Nie udało się rozpocząć nowego szkicu.'
      return false
    } finally {
      saving.value = false
    }
  }
  void load()
  onBeforeUnmount(() => {
    cancel()
    if (!busy.value) void persist()
    disposed = true
    unsubscribe()
  })
  return {
    draft,
    loading,
    busy,
    saving,
    conflict,
    error,
    persistenceError,
    pendingWrites,
    notice,
    attemptedSave,
    selected,
    errors,
    load,
    persist,
    changed,
    edited,
    select,
    send,
    cancel,
    save,
    reset,
  }
}
