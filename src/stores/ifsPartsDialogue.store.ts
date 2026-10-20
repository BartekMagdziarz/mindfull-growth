import { defineStore } from 'pinia'
import type {
  IFSPartsDialogue,
  CreateIFSPartsDialoguePayload,
  UpdateIFSPartsDialoguePayload,
} from '@/domain/exercises'
import { ifsPartsDialogueDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCollection } from './_exerciseCollection'

export const useIFSPartsDialogueStore = defineStore('ifsPartsDialogue', () => {
  const dialogues = useExerciseCollection<
    IFSPartsDialogue,
    CreateIFSPartsDialoguePayload,
    UpdateIFSPartsDialoguePayload
  >({
    repository: ifsPartsDialogueDexieRepository,
    label: 'parts dialogue',
    scope: 'iFSPartsDialogueStore',
    completionSlug: 'parts-dialogue',
  })

  return {
    dialogues: dialogues.items,
    isLoading: dialogues.isLoading,
    error: dialogues.error,
    sortedDialogues: dialogues.sorted,
    latestDialogue: dialogues.latest,
    getDialogueById: dialogues.getById,
    loadDialogues: dialogues.loadAll,
    createDialogue: dialogues.create,
    updateDialogue: dialogues.update,
    deleteDialogue: dialogues.remove,
    reset: dialogues.reset,
  }
})
