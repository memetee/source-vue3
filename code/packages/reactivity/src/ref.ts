import { activeSub } from './effect'
import { link, Link, propagate } from './system'

enum ReactivityFlags {
  IS_REF = '__v_isRef',
}

class RefImpl {
  _value; // ref获取到的值（实际值）

  [ReactivityFlags.IS_REF] = true // 一个标记，表示这个对象是一个ref对象

  /**
   * 订阅者链表的头节点
   */
  subs: Link

  /**
   * 订阅者链表的尾节点
   */
  subsTail: Link

  constructor(value) {
    this._value = value
  }

  /**
   * get 用来收集依赖
   */
  get value() {
    if (activeSub) {
      trackRef(this)
    }
    return this._value
  }

  /**
   * set 用来收集更新
   */
  set value(newVal) {
    this._value = newVal
    triggerRef(this)
  }
}

export function ref(value) {
  return new RefImpl(value)
}

/**
 * 判断一个对象是不是一个ref对象
 * @param value 对象
 * @returns 返回布尔，true表示是一个ref对象，否则是其他
 */
export function isRef(value) {
  return !!(value && value[ReactivityFlags.IS_REF])
}

/**
 * 收集依赖，建立ref和effect之间的链表关系
 * @param dep ref对象
 * @return void
 */
export function trackRef(dep) {
  if (activeSub) {
    link(dep, activeSub)
  }
}

/**
 * 触发更新，遍历链表，执行所有的effect函数
 * @param dep ref对象
 * @return void
 */
export function triggerRef(dep) {
  if (dep.subs) {
    propagate(dep.subs)
  }
}
