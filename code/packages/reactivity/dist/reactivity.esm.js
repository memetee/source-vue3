// packages/reactivity/src/system.ts
var linkPool;
function link(dep, sub) {
  const currentDep = sub.depsTail;
  const nextDep = currentDep === void 0 ? sub.deps : currentDep.nextDep;
  if (nextDep && nextDep.dep === dep) {
    sub.depsTail = nextDep;
    return;
  }
  let newLink;
  if (linkPool) {
    newLink = linkPool;
    linkPool = linkPool.nextDep;
    newLink.nextDep = nextDep;
    newLink.dep = dep;
    newLink.sub = sub;
  } else {
    newLink = {
      sub,
      dep,
      nextSub: void 0,
      prevSub: void 0,
      nextDep
      // 这里的nextDep是复用失败的
    };
  }
  if (dep.subsTail) {
    dep.subsTail.nextSub = newLink;
    newLink.prevSub = dep.subsTail;
    dep.subsTail = newLink;
  } else {
    dep.subs = newLink;
    dep.subsTail = newLink;
  }
  if (sub.depsTail) {
    sub.depsTail.nextDep = newLink;
    sub.depsTail = newLink;
  } else {
    sub.deps = newLink;
    sub.depsTail = newLink;
  }
}
function propagate(subs) {
  let link2 = subs;
  const queueEffect = [];
  while (link2) {
    const sub = link2.sub;
    if (!sub.tracking) {
      queueEffect.push(link2.sub);
    }
    link2 = link2.nextSub;
  }
  queueEffect.forEach((effect2) => effect2.notify());
}
function endTrack(sub) {
  sub.tracking = false;
  const depsTail = sub.depsTail;
  if (depsTail) {
    if (depsTail.nextDep) {
      clearTracking(depsTail.nextDep);
      depsTail.nextDep = void 0;
    }
  } else if (sub.deps) {
    clearTracking(sub.deps);
    sub.deps = void 0;
  }
}
function startTrack(sub) {
  sub.depsTail = void 0;
  sub.tracking = true;
}
function clearTracking(link2) {
  while (link2) {
    const { dep, nextDep, nextSub, prevSub } = link2;
    if (prevSub) {
      prevSub.nextSub = nextSub;
      link2.prevSub = void 0;
    } else {
      dep.subs = nextSub;
    }
    if (nextSub) {
      nextSub.prevSub = prevSub;
      link2.nextSub = void 0;
    } else {
      dep.subsTail = prevSub;
    }
    link2.dep = link2.sub = void 0;
    link2.nextDep = linkPool;
    linkPool = link2;
    console.log("\u4FDD\u5B58\u4E86linkPool", linkPool);
    link2 = nextDep;
  }
}

// packages/reactivity/src/effect.ts
var activeSub;
var ReactiveEffect = class {
  /**
   * 依赖链表的头节点
   */
  deps;
  /**
   * 依赖链表的尾节点
   */
  depsTail;
  fn;
  /**
   * 是否被追踪
   */
  tracking = false;
  constructor(fn) {
    this.fn = fn;
  }
  run() {
    const prevSub = activeSub;
    activeSub = this;
    startTrack(this);
    try {
      return this.fn();
    } finally {
      endTrack(this);
      activeSub = prevSub;
    }
  }
  scheduler() {
    this.run();
  }
  notify() {
    this.scheduler();
  }
};
function effect(fn, options) {
  const e = new ReactiveEffect(fn);
  Object.assign(e, options);
  e.run();
  const runner = e.run.bind(e);
  runner.effect = e;
  return runner;
}

// packages/reactivity/src/ref.ts
var RefImpl = class {
  _value;
  // ref获取到的值（实际值）
  ["__v_isRef" /* IS_REF */] = true;
  // 一个标记，表示这个对象是一个ref对象
  /**
   * 订阅者链表的头节点
   */
  subs;
  /**
   * 订阅者链表的尾节点
   */
  subsTail;
  constructor(value) {
    this._value = value;
  }
  /**
   * get 用来收集依赖
   */
  get value() {
    if (activeSub) {
      trackRef(this);
    }
    return this._value;
  }
  /**
   * set 用来收集更新
   */
  set value(newVal) {
    this._value = newVal;
    triggerRef(this);
  }
};
function ref(value) {
  return new RefImpl(value);
}
function isRef(value) {
  return !!(value && value["__v_isRef" /* IS_REF */]);
}
function trackRef(dep) {
  if (activeSub) {
    link(dep, activeSub);
  }
}
function triggerRef(dep) {
  if (dep.subs) {
    propagate(dep.subs);
  }
}
export {
  ReactiveEffect,
  activeSub,
  effect,
  isRef,
  ref,
  trackRef,
  triggerRef
};
//# sourceMappingURL=reactivity.esm.js.map
