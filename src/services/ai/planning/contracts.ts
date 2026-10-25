import type { PlannerObject, PlanningAssistantDraft } from '@/domain/planningAssistant'
import { MAX_PLANNER_OBJECTS, plannerObjectError } from '@/domain/planningAssistant'
import { assertSchema, normalizeArguments, strictSchema, type Schema } from '../companion/schema'

const text = (maxLength = 2000): Schema => ({ type: 'string', maxLength })
const strings: Schema = { type: 'array', maxItems: 12, items: text(256) }
const fields: Record<string, Schema> = {
  id: { ...text(64), minLength: 1 },
  kind: { type: 'string', enum: ['goal', 'keyResult', 'habit', 'tracker', 'weeklyIntention'] },
  parentId: text(64),
  title: { ...text(200), minLength: 1 },
  description: text(4000),
  selected: { type: 'boolean' },
  entryMode: {
    type: 'string',
    enum: ['completion', 'counter', 'value', 'rating', 'multi-completion'],
  },
  cadence: { type: 'string', enum: ['weekly', 'monthly'] },
  target: { type: 'number' },
  operator: { type: 'string', enum: ['min', 'max'] },
  aggregation: { type: 'string', enum: ['sum', 'average', 'last'] },
  ratingMin: { type: 'integer', minimum: 1, maximum: 100 },
  ratingMax: { type: 'integer', minimum: 2, maximum: 100 },
  multiItems: {
    type: 'array',
    maxItems: 8,
    items: {
      type: 'object',
      additionalProperties: false,
      required: ['id', 'label', 'weight'],
      properties: {
        id: { ...text(64), minLength: 1 },
        label: { ...text(200), minLength: 1 },
        weight: { type: 'integer', minimum: 1, maximum: 100 },
        icon: text(100),
        archived: { type: 'boolean' },
      },
    },
  },
  dailyThreshold: { type: ['number', 'null'], minimum: 1 },
  entryDays: {
    anyOf: [
      { type: 'null' },
      {
        type: 'object',
        additionalProperties: false,
        required: ['operator', 'value'],
        properties: {
          operator: { type: 'string', enum: ['min', 'max'] },
          value: { type: 'integer', minimum: 1, maximum: 31 },
        },
      },
    ],
  },
  startDate: text(10),
  endDate: text(10),
  days: { type: 'array', maxItems: 7, items: { type: 'integer', minimum: 0, maximum: 6 } },
  isPermanent: { type: 'boolean' },
  successDefinition: text(),
  whyMatters: text(),
  confidenceRating: { type: ['number', 'null'], minimum: 1, maximum: 10 },
  achievabilityRationale: text(),
  obstacles: text(),
  resources: text(),
  priorityIds: strings,
  lifeAreaIds: strings,
}
export const PLANNER_OBJECT_SCHEMA: Schema = {
  type: 'object',
  additionalProperties: false,
  required: Object.keys(fields),
  properties: fields,
}
const replySchema: Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['message', 'suggestions', 'objects'],
  properties: {
    message: { ...text(1800), minLength: 1 },
    suggestions: { type: 'array', maxItems: 3, items: text(160) },
    objects: { type: 'array', maxItems: MAX_PLANNER_OBJECTS, items: PLANNER_OBJECT_SCHEMA },
  },
}
export const PLANNER_REPLY_SCHEMA = strictSchema(replySchema)
export interface PlannerReply {
  message: string
  suggestions: string[]
  objects: PlannerObject[]
}
export function parsePlannerReply(value: unknown): PlannerReply {
  const normalized = normalizeArguments(value, replySchema)
  assertSchema(normalized, replySchema)
  const reply = normalized as PlannerReply
  assertSafeIds(reply.objects)
  if (new Set(reply.objects.map(item => item.id)).size !== reply.objects.length)
    throw new Error('Powtórzone identyfikatory propozycji.')
  return reply
}
function assertSafeIds(objects: PlannerObject[]) {
  if (objects.some(item => ['__proto__', 'constructor', 'prototype'].includes(item.id)))
    throw new Error('Nieprawidłowy identyfikator propozycji.')
}
export function assertPlannerObjectShapes(objects: unknown): asserts objects is PlannerObject[] {
  assertSchema(objects, {
    type: 'array',
    maxItems: MAX_PLANNER_OBJECTS,
    items: PLANNER_OBJECT_SCHEMA,
  })
}
export function validatePlannerProposal(objects: PlannerObject[]) {
  assertPlannerObjectShapes(objects)
  if (new Set(objects.map(item => item.id)).size !== objects.length)
    throw new Error('Powtórzone identyfikatory propozycji.')
  for (const item of objects) {
    const error = plannerObjectError(item, objects)
    if (error) throw new Error(error)
  }
}
/** Drafts may contain unfinished user edits, but never arbitrary persisted data. */
export function parsePlanningDraft(raw: string): PlanningAssistantDraft {
  if (raw.length > 300000) throw new Error('Szkic jest zbyt duży.')
  const value = JSON.parse(raw) as PlanningAssistantDraft
  if (
    !value ||
    value.schemaVersion !== 1 ||
    typeof value.id !== 'string' ||
    !value.id ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 0 ||
    !Array.isArray(value.messages) ||
    value.messages.length > 80 ||
    value.messages.some(
      m =>
        !m ||
        typeof m.id !== 'string' ||
        !['user', 'assistant'].includes(m.role) ||
        typeof m.text !== 'string' ||
        m.text.length > 12000
    ) ||
    typeof value.input !== 'string' ||
    value.input.length > 12000 ||
    typeof value.includePlanning !== 'boolean' ||
    !(value.policyRevision === null || typeof value.policyRevision === 'string') ||
    !Number.isFinite(value.spentUsd) ||
    value.spentUsd < 0 ||
    !(value.pendingMessageId === null || typeof value.pendingMessageId === 'string') ||
    !value.lockedFields ||
    typeof value.lockedFields !== 'object' ||
    Array.isArray(value.lockedFields) ||
    Object.entries(value.lockedFields).some(
      ([key, v]) =>
        key.length > 64 ||
        !Array.isArray(v) ||
        v.some(field => typeof field !== 'string' || !Object.hasOwn(fields, field))
    ) ||
    !Array.isArray(value.suggestions) ||
    value.suggestions.length > 3 ||
    value.suggestions.some(s => typeof s !== 'string' || s.length > 160)
  )
    throw new Error('Nie można odczytać szkicu.')
  // Incomplete input is durable too. Strict proposal/commit validation is separate.
  const editableNumber: Schema = { anyOf: [{ type: 'number' }, { type: 'string', enum: [''] }] }
  assertSchema(value.objects, {
    type: 'array',
    maxItems: MAX_PLANNER_OBJECTS,
    items: {
      ...PLANNER_OBJECT_SCHEMA,
      properties: {
        ...fields,
        title: text(200),
        target: editableNumber,
        ratingMin: editableNumber,
        ratingMax: editableNumber,
        confidenceRating: { anyOf: [editableNumber, { type: 'null' }] },
        dailyThreshold: { anyOf: [editableNumber, { type: 'null' }] },
        entryDays: {
          anyOf: [
            { type: 'null' },
            {
              type: 'object',
              additionalProperties: false,
              required: ['operator', 'value'],
              properties: { operator: fields.operator, value: editableNumber },
            },
          ],
        },
        multiItems: {
          ...fields.multiItems,
          items: {
            ...fields.multiItems.items!,
            properties: {
              ...fields.multiItems.items!.properties,
              label: text(200),
              weight: editableNumber,
            },
          },
        },
      },
    },
  })
  assertSafeIds(value.objects)
  if (
    value.receipt !== null &&
    (!value.receipt ||
      value.receipt.batchId !== value.id ||
      !Array.isArray(value.receipt.objects) ||
      value.receipt.objects.length > MAX_PLANNER_OBJECTS ||
      value.receipt.objects.some(
        o =>
          !o ||
          typeof o.id !== 'string' ||
          typeof o.draftId !== 'string' ||
          typeof o.title !== 'string' ||
          !['goal', 'keyResult', 'habit', 'tracker', 'weeklyIntention'].includes(o.kind)
      ))
  )
    throw new Error('Nie można odczytać wyniku zapisu.')
  return value
}
