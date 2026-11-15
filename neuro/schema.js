const record = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const types = new Set(['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'])
const keys = new Set(['type', 'properties', 'required', 'items', 'enum', 'const', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'minLength', 'maxLength', 'minItems', 'maxItems', 'additionalProperties', 'description', 'title', 'default'])

/** The supported subset is deliberately explicit: an unsupported constraint never silently disappears. */
export function validateSchema(schema, depth = 0, budget = { left: 512 }) {
  if (!record(schema) || depth > 8 || --budget.left < 0) throw new Error('Unsupported or oversized action schema')
  if (Object.keys(schema).some(key => !keys.has(key))) throw new Error('Unsupported action schema keyword')
  if (schema.type !== undefined && !types.has(schema.type)) throw new Error('Unsupported action schema type')
  if (schema.properties !== undefined) {
    if (!record(schema.properties) || Object.keys(schema.properties).length > 128) throw new Error('Invalid schema properties')
    for (const child of Object.values(schema.properties)) validateSchema(child, depth + 1, budget)
  }
  if (schema.required !== undefined && (!Array.isArray(schema.required) || schema.required.length > 128 || schema.required.some(key => typeof key !== 'string') || new Set(schema.required).size !== schema.required.length)) throw new Error('Invalid required properties')
  if (schema.items !== undefined) validateSchema(schema.items, depth + 1, budget)
  if (schema.enum !== undefined && (!Array.isArray(schema.enum) || !schema.enum.length || schema.enum.length > 128)) throw new Error('Invalid enum')
  for (const key of ['minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum']) {
    if (schema[key] !== undefined && !Number.isFinite(schema[key])) throw new Error('Invalid numeric constraint')
  }
  for (const key of ['minLength', 'maxLength', 'minItems', 'maxItems']) {
    if (schema[key] !== undefined && (!Number.isInteger(schema[key]) || schema[key] < 0)) throw new Error('Invalid size constraint')
  }
  if (schema.additionalProperties !== undefined && typeof schema.additionalProperties !== 'boolean') throw new Error('Unsupported additionalProperties constraint')
}

const equal = (a, b) => {
  if (a === b) return true
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((value, i) => equal(value, b[i]))
  if (record(a) && record(b)) return Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => Object.hasOwn(b, key) && equal(a[key], b[key]))
  return false
}

export function validateData(schema, value, at = 'data') {
  if (schema.enum && !schema.enum.some(option => equal(option, value))) throw new Error(`${at} is outside enum`)
  if (Object.hasOwn(schema, 'const') && !equal(schema.const, value)) throw new Error(`${at} differs from const`)
  const actual = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value
  if (schema.type && !(schema.type === 'integer' ? Number.isInteger(value) : schema.type === actual)) throw new Error(`${at} must be ${schema.type}`)
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`${at} must be finite`)
    if (schema.minimum !== undefined && value < schema.minimum || schema.maximum !== undefined && value > schema.maximum || schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum || schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) throw new Error(`${at} is outside its range`)
  }
  if (typeof value === 'string' && (schema.minLength !== undefined && [...value].length < schema.minLength || schema.maxLength !== undefined && [...value].length > schema.maxLength)) throw new Error(`${at} has an invalid length`)
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems || schema.maxItems !== undefined && value.length > schema.maxItems) throw new Error(`${at} has an invalid item count`)
    if (schema.items) value.forEach((item, i) => validateData(schema.items, item, `${at}[${i}]`))
  }
  if (record(value)) {
    for (const key of schema.required ?? []) if (!Object.hasOwn(value, key)) throw new Error(`${at}.${key} is required`)
    for (const [key, child] of Object.entries(value)) {
      if (schema.properties && Object.hasOwn(schema.properties, key)) validateData(schema.properties[key], child, `${at}.${key}`)
      else if (schema.additionalProperties === false) throw new Error(`${at}.${key} is not allowed`)
    }
  }
}

export { record }
