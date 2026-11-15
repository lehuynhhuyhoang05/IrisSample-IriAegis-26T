/* global URL, URLSearchParams, structuredClone */
import fs from 'node:fs'
import YAML from 'yaml'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'

// Preserve both duplicate path nodes. YAML's ordinary object conversion keeps only the last.
const document = YAML.parseDocument(fs.readFileSync(new URL('../openapi.yml', import.meta.url), 'utf8'), { uniqueKeys: false })
if (document.errors.length) throw new Error(document.errors.map(error => error.message).join('\n'))
const paths = document.get('paths').items
export const duplicates = paths.map(pair => pair.key.value).filter((value, index, values) => values.indexOf(value) !== index)
paths.forEach((pair, index) => { pair.key.value += `@@${index}` })
export const spec = document.toJS()
export const operations = new Map()
export const dereference = value => value?.$ref ? value.$ref.split('/').slice(1).reduce((node, key) => node?.[key], spec) : value
for (const [name, pathItem] of Object.entries(spec.paths)) {
  const path = name.split('@@')[0]
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    if (!pathItem[method]) continue
    const operation = pathItem[method]
    const key = `${method.toUpperCase()} ${path}`
    const row = { ...operation, path, method: method.toUpperCase(), parameters: [...(pathItem.parameters || []), ...(operation.parameters || [])].map(dereference) }
    const variants = operations.get(key) || []; variants.push(row); operations.set(key, variants)
  }
}
const ajv = new Ajv({ strict: false, allErrors: true, formats: { float: true, double: true, binary: true } })
addFormats(ajv)
const validators = new Map()
function validate(schema, value, strictFields = false) {
  if (!schema) return [] // Some legacy responses have no schema at all.
  const resolved = structuredClone(dereference(schema))
  if (strictFields && resolved.properties) resolved.additionalProperties = false
  const root = { ...resolved, components: spec.components }
  const key = JSON.stringify(root)
  if (!validators.has(key)) validators.set(key, ajv.compile(root))
  const validator = validators.get(key)
  return validator(value) ? [] : validator.errors.map(error => `${error.instancePath || '/'} ${error.message}${error.params.additionalProperty ? ` (${error.params.additionalProperty})` : ''}`)
}
export function matchOperation(method, pathname) {
  for (const variants of operations.values()) {
    const operation = variants[0]
    const pattern = operation.path.split('/').map(part => part.startsWith('{') ? '[^/]+' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('/')
    if (method === operation.method && new RegExp(`^${pattern}$`).test(pathname)) return operation
  }
  return null
}
export function requestErrors(method, pathname, { query = new URLSearchParams(), body, multipart = false, variant = 0 } = {}) {
  const match = matchOperation(method, pathname)
  if (!match) return [`Endpoint ngoài đặc tả: ${method} ${pathname}`]
  const operation = operations.get(`${method} ${match.path}`)[variant]
  if (!operation) return [`Không có biến thể ${variant} cho ${method} ${match.path}`]
  const errors = []
  const known = operation.parameters.filter(parameter => parameter.in === 'query')
  for (const [key, value] of query) {
    const parameter = known.find(parameter => parameter.name === key)
    if (!parameter) { errors.push(`Query ngoài đặc tả: ${key}`); continue }
    const parsed = parameter.schema?.type === 'integer' || parameter.schema?.type === 'number' ? Number(value) : value
    errors.push(...validate(parameter.schema, parsed).map(error => `query.${key}: ${error}`))
  }
  known.filter(parameter => parameter.required && !query.has(parameter.name)).forEach(parameter => errors.push(`Thiếu query ${parameter.name}`))
  const content = operation.requestBody?.content
  if (content) errors.push(...validate(content[multipart ? 'multipart/form-data' : 'application/json']?.schema, body, true))
  else if (body !== undefined) errors.push('Endpoint không mô tả request body.')
  return errors
}
export function responseErrors(method, pathname, status, body) {
  const operation = matchOperation(method, pathname)
  const response = dereference(operation?.responses?.[String(status)])
  if (!response) return [`Status ${status} chưa mô tả cho ${method} ${operation?.path || pathname}`]
  return validate(response.content?.['application/json']?.schema, body)
}
