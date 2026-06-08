import { Link } from './system'
import { startTrack, endTrack } from './system'

// 全局变量，用来保存当前正在执行依赖（effect的回调函数）
export let activeSub

export class ReactiveEffect {
  /**
   * 依赖链表的头节点
   */
  deps: Link | undefined

  /**
   * 依赖链表的尾节点
   */
  depsTail: Link | undefined

  fn: Function

  /**
   * 是否被追踪
   */
  tracking = false;

  constructor(fn) {
    this.fn = fn
  }

  run() {
    // 执行run函数之前先把当前的sub保存起来
    const prevSub = activeSub
    activeSub = this

    startTrack(this);
    try {
      return this.fn()
    } finally {
      endTrack(this)

      // 这里恢复之前的effect函数，这样在处理嵌套的逻辑的时候就能正确地收集依赖了
      activeSub = prevSub
    }
  }

  scheduler() {
    this.run()
  }

  notify() {
    this.scheduler()
  }
}

// 依赖收集和触发更新的函数
export function effect(fn, options) {
  const e = new ReactiveEffect(fn)
  Object.assign(e, options)
  e.run()

  const runner = e.run.bind(e)
  /**
   * 把effect实例放到函数属性中
   */
  runner.effect = e
  return runner
}

