import { ReactiveEffect } from './effect'

/**
 * 链表节点
 */
export interface Link {
  // 保存effect
  sub: ReactiveEffect

  // 下一个节点,如果没有就是undefined
  nextSub: Link | undefined

  // 上一个节点,如果没有就是undefined
  prevSub: Link | undefined

  // 订阅者
  dep: Dep

  // 下一个订阅节点
  nextDep: Link | undefined
}

/**
 * 依赖项
 */
interface Dep {
  // 发布者链表的头节点
  subs: Link | undefined

  // 发布者链表的尾节点
  subsTail: Link | undefined
}

// 保存已经清理掉的节点，留着复用
let linkPool: Link

/**
 * 链接ref和effect，建立ref和effect之间的链表关系
 * @param dep ref对象
 * @param sub effect函数（依赖项）
 */
export function link(dep, sub) {
  const currentDep = sub.depsTail
  const nextDep = currentDep === undefined ? sub.deps : currentDep.nextDep
  if (nextDep && nextDep.dep === dep) {
    sub.depsTail = nextDep
    return
  }

  let newLink: Link
  /**
   * 如果linkPool有值，就复用linkPool
   * 如果linkPool没有值，就创建一个新的链表节点
   */
  if (linkPool) {
    newLink = linkPool
    linkPool = linkPool.nextDep
    newLink.nextDep = nextDep
    newLink.dep = dep
    newLink.sub = sub
  } else {
    // 如果activeSub有，那就保存，等更新的时候触发
    newLink = {
      sub,
      dep,
      nextSub: undefined,
      prevSub: undefined,
      nextDep, // 这里的nextDep是复用失败的
    }
  }

  /**
   * 把新的订阅者添加到链表的尾部
   * 1. 如果链表不为空，就把新的订阅者添加到链表的尾部
   * 2. 如果链表为空，就把新的订阅者作为链表的头节点和尾节点
   */
  if (dep.subsTail) {
    dep.subsTail.nextSub = newLink
    newLink.prevSub = dep.subsTail
    dep.subsTail = newLink
  } else {
    dep.subs = newLink
    dep.subsTail = newLink
  }

  /**
   * 将链表节点和sub建立关联关系(这里是单向链表)
   * 把新的依赖项添加到链表的尾部
   1. 如果链表不为空，就把新的依赖项添加到链表的尾部
   2. 如果链表为空，就把新的依赖项作为链表的头节点和尾节点
   */
  if (sub.depsTail) {
    sub.depsTail.nextDep = newLink
    sub.depsTail = newLink
  } else {
    sub.deps = newLink
    sub.depsTail = newLink
  }
}

/**
 * 传播更新
 * @param subs 依赖项
 */
export function propagate(subs) {
  let link = subs
  const queueEffect = []
  while (link) {
    const sub = link.sub;
    if (!sub.tracking) {
      queueEffect.push(link.sub)
    }
    link = link.nextSub
  }
  queueEffect.forEach(effect => effect.notify())
}

export function endTrack(sub) {
  sub.tracking = false // 结束追踪依赖
  const depsTail = sub.depsTail

  if (depsTail) {
    if (depsTail.nextDep) {
      clearTracking(depsTail.nextDep)
      depsTail.nextDep = undefined
    }
  } else if (sub.deps) {
    clearTracking(sub.deps)
    sub.deps = undefined
  }
}

export function startTrack(sub) {
  sub.depsTail = undefined
  sub.tracking = true
}

function clearTracking(link) {
  while (link) {
    const { dep, nextDep, nextSub, prevSub } = link

    if (prevSub) {
      prevSub.nextSub = nextSub
      link.prevSub = undefined
    } else {
      dep.subs = nextSub
    }

    if (nextSub) {
      nextSub.prevSub = prevSub
      link.nextSub = undefined
    } else {
      dep.subsTail = prevSub
    }

    link.dep = link.sub = undefined
    link.nextDep = linkPool

    linkPool = link
    console.log('保存了linkPool', linkPool)
    link = nextDep
  }
}
