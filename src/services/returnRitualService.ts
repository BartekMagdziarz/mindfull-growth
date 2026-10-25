/**
 * Return ritual — writes. Stage E1 only remembers how a break was handled;
 * applying the ritual's plan (skips, retirements, sweeps) lands in E2.
 *
 * Plan: ideas/html-plans/2026-10-25-return-ritual.html, docs/return-ritual.md.
 */

import {
  RETURN_RITUAL_SETTINGS_KEY,
  serializeReturnRitualSettings,
  type ReturnBreak,
  type ReturnRitualState,
} from '@/domain/returnRitual'
import { userSettingsDexieRepository } from '@/repositories/userSettingsDexieRepository'

async function rememberReturnBreak(
  brk: ReturnBreak,
  state: ReturnRitualState,
  at: string
): Promise<void> {
  await userSettingsDexieRepository.set(
    RETURN_RITUAL_SETTINGS_KEY,
    serializeReturnRitualSettings({ breakStart: brk.breakStart, state, at })
  )
}

/** „Później”: hide the invitation for the rest of today. */
export async function dismissReturnBreak(
  brk: ReturnBreak,
  at: string = new Date().toISOString()
): Promise<void> {
  await rememberReturnBreak(brk, 'dismissed', at)
}

/** The ritual finished: never offer it again for this break. */
export async function markReturnBreakDone(
  brk: ReturnBreak,
  at: string = new Date().toISOString()
): Promise<void> {
  await rememberReturnBreak(brk, 'done', at)
}
