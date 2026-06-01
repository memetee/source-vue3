export function isObject(value: any): value is Record<any, any> {
  return value !== null && typeof value === 'object'
}