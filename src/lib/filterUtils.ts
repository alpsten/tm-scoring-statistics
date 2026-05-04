export function parseListParam(value: string | null): string[] {
  return value?.split(',').map(v => v.trim()).filter(Boolean) ?? []
}

export function writeListParam(params: URLSearchParams, key: string, values: string[]) {
  if (values.length > 0) params.set(key, values.join(','))
  else params.delete(key)
}
