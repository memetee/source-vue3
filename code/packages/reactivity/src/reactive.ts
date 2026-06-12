import { hasChanged, isObject } from '@vue/shared'
import { mutableHandlers } from './baseHandlers'

const reactiveMap = new WeakMap()
const reactiveSet = new WeakSet();

export function reactive(target) {
  /**
   * 为什么这里要抽离出 createReactiveObject 函数呢？
   * 因为其他地方需要调用这个函数来创建响应式对象，比如shallowReactive
   */
  return createReactiveObject(target)
}

function createReactiveObject(target) {
  // reactive必须接收一个对象
  if (!isObject(target)) {
    // 如果target不是对象，直接返回target
    return target
  }

  if(isReactive(target)) {
    return target;
  }

  const existingProxy = reactiveMap.get(target)
  if (existingProxy) {
    return existingProxy
  }

  const proxy = new Proxy(target, mutableHandlers)
  reactiveMap.set(target, proxy)
  reactiveSet.add(proxy)
  return proxy
}

function isReactive(target) {
  return reactiveSet.has(target);
}