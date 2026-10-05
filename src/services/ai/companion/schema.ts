/** Small validator for the deliberately limited JSON-schema vocabulary used here. */
export interface Schema {
  type?: string | readonly string[]
  properties?: Record<string, Schema>
  required?: readonly string[]
  additionalProperties?: boolean
  items?: Schema
  enum?: readonly unknown[]
  anyOf?: readonly Schema[]
  minItems?: number
  maxItems?: number
  minLength?: number
  maxLength?: number
  minimum?: number
  maximum?: number
  description?: string
}
export function assertSchema(value: unknown, schema: Schema, path = '$'): void {
  const fail = () => {
    throw new Error(`Invalid schema value at ${path}`)
  }
  if (schema.anyOf) {
    if (
      !schema.anyOf.some(s => {
        try {
          assertSchema(value, s, path)
          return true
        } catch {
          return false
        }
      })
    )
      fail()
    return
  }
  const types = Array.isArray(schema.type) ? schema.type : [schema.type]
  const actual = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value
  if (
    !types.includes(actual) &&
    !(actual === 'number' && types.includes('integer') && Number.isInteger(value))
  )
    fail()
  if (schema.enum && !schema.enum.includes(value)) fail()
  if (
    typeof value === 'number' &&
    (!Number.isFinite(value) ||
      value < (schema.minimum ?? -Infinity) ||
      value > (schema.maximum ?? Infinity))
  )
    fail()
  if (
    typeof value === 'string' &&
    (value.length < (schema.minLength ?? 0) || value.length > (schema.maxLength ?? Infinity))
  )
    fail()
  if (Array.isArray(value)) {
    if (value.length < (schema.minItems ?? 0) || value.length > (schema.maxItems ?? Infinity))
      fail()
    value.forEach((v, i) => assertSchema(v, schema.items!, `${path}[${i}]`))
  } else if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (schema.required?.some(k => !Object.hasOwn(obj, k))) fail()
    for (const [k, v] of Object.entries(obj)) {
      if (!Object.hasOwn(schema.properties ?? {}, k)) {
        if (schema.additionalProperties === false) fail()
      } else assertSchema(v, schema.properties![k], `${path}.${k}`)
    }
  }
}
/** OpenAI strict mode requires all keys. Optional E1 fields become nullable. */
export function strictSchema(schema: Schema): Schema {
  if (schema.type === 'object')
    return {
      ...schema,
      additionalProperties: false,
      required: Object.keys(schema.properties ?? {}),
      properties: Object.fromEntries(
        Object.entries(schema.properties ?? {}).map(([key, child]) => [
          key,
          schema.required?.includes(key)
            ? strictSchema(child)
            : { anyOf: [strictSchema(child), { type: 'null' }] },
        ])
      ),
    }
  return schema.items ? { ...schema, items: strictSchema(schema.items) } : { ...schema }
}
/** Only optional nulls are removed; required nulls remain invalid under the E1 schema. */
export function normalizeArguments(value: unknown, schema: Schema): unknown {
  if (Array.isArray(value)) return value.map(v => normalizeArguments(v, schema.items!))
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([k, v]) =>
            v !== null || !Object.hasOwn(schema.properties ?? {}, k) || schema.required?.includes(k)
        )
        .map(([k, v]) => [k, normalizeArguments(v, schema.properties?.[k] ?? {})])
    )
  return value
}
