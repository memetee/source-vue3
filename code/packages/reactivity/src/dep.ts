import { activeSub } from './effect'
import { link, propagate, Link } from './system'

/**
 * 绑定 target 的 key 关联的所有的 dep
 * obj = { a: 0 }
 * targetMap = {
 *  [obj]: {
 *    a: Dep,
 *    b: Dep
 *  }
 * }
 */
const targetMap = new WeakMap()

export function track(target, key) {
  if (!activeSub) {
    return
  }

  /**
   * 找depsMap = {
   *  a: Dep,
   *  b: Dep
   * }
   */
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    /**
     * 没有depsMap, 就是之前没有收集过这个对象的任何key做关联关系
     * 那就创建一个新的，保存target和depsMap之间的关联关系
     */
    depsMap = new Map()
    targetMap.set(target, depsMap)
  }

  let dep = depsMap.get(key)
  if (!dep) {
    /**
     * 第一次手机这个对象，没找到，创建一个新的，并且保存到depsMap中
     */
    dep = new Dep()
    depsMap.set(key, dep)
  }

  /**
   * 绑定 dep 和 sub 之间的关联关系
   */
  link(dep, activeSub)
}

export function trigger(target, key) {
  /**
   * 找depsMap = {
   *  a: Dep,
   *  b: Dep
   * }
   */
  const depsMap = targetMap.get(target)

  if (!depsMap) {
    /**
     * depsMap 没有，表示这个对象，从来没有任何属性在sub中访问过
     */
    return
  }

  /**
   * 找到 key 对应的Dep
   * key =》 Dep
   */
  const dep = depsMap.get(key)
  if (!dep) {
    // dep 不存在，表示这个key没有在sub中访问过
    return
  }

  /**
   * 找到 dep 的 subs 通知他们重新执行
   */
  propagate(dep.subs)
}

class Dep {
  /**
   * 订阅者链表的头节点
   */
  subs: Link

  /**
   * 订阅者链表的尾节点
   */
  subsTail: Link
  constructor() {}
}