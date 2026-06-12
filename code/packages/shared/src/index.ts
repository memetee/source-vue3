export function isObject(value: any): value is Record<any, any> {
  return value !== null && typeof value === 'object'
}

export function hasChanged(newVal, oldVal) {
  return !Object.is(newVal, oldVal);
}
/**
 * 判断一个数据是不是函数
 * @param value 需要判断的数据
 * @returns 传入的是函数，就返回true，否则返回false
 */
export function isFunction(value) {
  return typeof value === 'function'
}