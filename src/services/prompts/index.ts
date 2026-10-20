/**
 * Prompt module resolver — returns locale-specific prompt modules.
 * Eager-imports all locale files (only 2 locales, small size).
 */

import type { LocaleId } from '@/services/locale.service'
import type {
  CbtPromptModule,
  LogotherapyPromptModule,
  IfsPromptModule,
  ChatPromptModule,
  PathPromptModule,
} from './types'

import { cbtEn } from './cbt.en'
import { cbtPl } from './cbt.pl'
import { logotherapyEn } from './logotherapy.en'
import { logotherapyPl } from './logotherapy.pl'
import { ifsEn } from './ifs.en'
import { ifsPl } from './ifs.pl'
import { chatEn } from './chat.en'
import { chatPl } from './chat.pl'
import { pathEn } from './path.en'
import { pathPl } from './path.pl'

const cbtModules: Record<LocaleId, CbtPromptModule> = { en: cbtEn, pl: cbtPl }
const logotherapyModules: Record<LocaleId, LogotherapyPromptModule> = {
  en: logotherapyEn,
  pl: logotherapyPl,
}
const ifsModules: Record<LocaleId, IfsPromptModule> = { en: ifsEn, pl: ifsPl }
const chatModules: Record<LocaleId, ChatPromptModule> = { en: chatEn, pl: chatPl }
const pathModules: Record<LocaleId, PathPromptModule> = { en: pathEn, pl: pathPl }

export function getCbtPrompts(locale: LocaleId): CbtPromptModule {
  return cbtModules[locale] ?? cbtEn
}

export function getLogotherapyPrompts(locale: LocaleId): LogotherapyPromptModule {
  return logotherapyModules[locale] ?? logotherapyEn
}

export function getIfsPrompts(locale: LocaleId): IfsPromptModule {
  return ifsModules[locale] ?? ifsEn
}

export function getChatPrompts(locale: LocaleId): ChatPromptModule {
  return chatModules[locale] ?? chatEn
}

export function getPathPrompts(locale: LocaleId): PathPromptModule {
  return pathModules[locale] ?? pathEn
}
