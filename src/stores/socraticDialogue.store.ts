/**
 * Socratic Self-Dialogue Store
 *
 * Manages Socratic Self-Dialogue exercises (Logotherapy exercise).
 */

import { defineStore } from 'pinia'
import type {
  SocraticSelfDialogue,
  CreateSocraticDialoguePayload,
  UpdateSocraticDialoguePayload,
} from '@/domain/exercises'
import { socraticDialogueDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCollection } from './_exerciseCollection'

export const useSocraticDialogueStore = defineStore('socraticDialogue', () => {
  const dialogues = useExerciseCollection<
    SocraticSelfDialogue,
    CreateSocraticDialoguePayload,
    UpdateSocraticDialoguePayload
  >({
    repository: socraticDialogueDexieRepository,
    label: 'dialogue',
    scope: 'socraticDialogueStore',
    completionSlug: 'socratic-dialogue',
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
