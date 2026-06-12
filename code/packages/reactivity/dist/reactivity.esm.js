// packages/shared/src/index.ts
function isObject(value) {
  return value !== null && typeof value === "object";
}
function hasChanged(newVal, oldVal) {
  return !Object.is(newVal, oldVal);
}
function isFunction(value) {
  return typeof value === "function";
}

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
function processComputedUpdate(sub) {
  if (sub.subs && sub.update()) {
    propagate(sub.subs);
  }
}
function propagate(subs) {
  let link2 = subs;
  const queueEffect = [];
  while (link2) {
    const sub = link2.sub;
    if (!sub.tracking && !sub.dirty) {
      sub.dirty = true;
      if ("update" in sub) {
        processComputedUpdate(sub);
      } else {
        queueEffect.push(link2.sub);
      }
    }
    link2 = link2.nextSub;
  }
  queueEffect.forEach((effect2) => effect2.notify());
}
function endTrack(sub) {
  sub.tracking = false;
  sub.dirty = false;
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
    link2 = nextDep;
  }
}

// packages/reactivity/src/effect.ts
var activeSub;
function setActiveSub(sub) {
  activeSub = sub;
}
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
  /**
   * 增加一个标识，标识脏的
   */
  dirty = false;
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

// packages/reactivity/src/dep.ts
var targetMap = /* @__PURE__ */ new WeakMap();
function track(target, key) {
  if (!activeSub) {
    return;
  }
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = /* @__PURE__ */ new Map();
    targetMap.set(target, depsMap);
  }
  let dep = depsMap.get(key);
  if (!dep) {
    dep = new Dep();
    depsMap.set(key, dep);
  }
  link(dep, activeSub);
}
function trigger(target, key) {
  const depsMap = targetMap.get(target);
  if (!depsMap) {
    return;
  }
  const dep = depsMap.get(key);
  if (!dep) {
    return;
  }
  propagate(dep.subs);
}
var Dep = class {
  /**
   * 订阅者链表的头节点
   */
  subs;
  /**
   * 订阅者链表的尾节点
   */
  subsTail;
  constructor() {
  }
};

// packages/reactivity/src/baseHandlers.ts
var mutableHandlers = {
  get(target, key, receiver) {
    track(target, key);
    const res = Reflect.get(target, key, receiver);
    if (isRef(res)) {
      return res.value;
    }
    if (isObject(res)) {
      return reactive(res);
    }
    return res;
  },
  set(target, key, newValue, receiver) {
    const oldValue = target[key];
    const res = Reflect.set(target, key, newValue, receiver);
    if (isRef(oldValue) && !isRef(newValue)) {
      oldValue.value = newValue;
      return res;
    }
    if (hasChanged(newValue, oldValue)) {
      trigger(target, key);
    }
    return res;
  }
};

// packages/reactivity/src/reactive.ts
var reactiveMap = /* @__PURE__ */ new WeakMap();
var reactiveSet = /* @__PURE__ */ new WeakSet();
function reactive(target) {
  return createReactiveObject(target);
}
function createReactiveObject(target) {
  if (!isObject(target)) {
    return target;
  }
  if (isReactive(target)) {
    return target;
  }
  const existingProxy = reactiveMap.get(target);
  if (existingProxy) {
    return existingProxy;
  }
  const proxy = new Proxy(target, mutableHandlers);
  reactiveMap.set(target, proxy);
  reactiveSet.add(proxy);
  return proxy;
}
function isReactive(target) {
  return reactiveSet.has(target);
}

// packages/reactivity/src/ref.ts
var ReactiveFlags = /* @__PURE__ */ ((ReactiveFlags2) => {
  ReactiveFlags2["IS_REF"] = "__v_isRef";
  return ReactiveFlags2;
})(ReactiveFlags || {});
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
    if (hasChanged(newVal, this._value)) {
      this._value = isObject(newVal) ? reactive(newVal) : newVal;
      triggerRef(this);
    }
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

// packages/reactivity/src/computed.ts
var ComputedRefImpl = class {
  constructor(fn, setter) {
    this.fn = fn;
    this.setter = setter;
  }
  fn;
  setter;
  ["__v_isRef" /* IS_REF */] = true;
  _value;
  subs;
  subsTail;
  deps;
  depsTail;
  tracking = false;
  dirty = true;
  get value() {
    if (this.dirty) {
      this.update();
    }
    if (activeSub) {
      link(this, activeSub);
    }
    return this._value;
  }
  set value(newValue) {
    if (this.setter) {
      this.setter(newValue);
    } else {
      console.warn("\u6211\u53EA\u8BFB\u7684\uFF0C\u4F60\u522B\u778E\u73A9\uFF01");
    }
  }
  update() {
    const prevSub = activeSub;
    setActiveSub(this);
    startTrack(this);
    try {
      let oldValue = this._value;
      this._value = this.fn();
      this.dirty = false;
      return hasChanged(this._value, oldValue);
    } finally {
      endTrack(this);
      setActiveSub(prevSub);
    }
  }
};
function computed(getterOrOptions) {
  let getter;
  let setter;
  if (isFunction(getterOrOptions)) {
    getter = getterOrOptions;
  } else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set;
  }
  return new ComputedRefImpl(getter, setter);
}
export {
  ReactiveEffect,
  ReactiveFlags,
  activeSub,
  computed,
  effect,
  isRef,
  reactive,
  ref,
  setActiveSub,
  trackRef,
  triggerRef
};
//# sourceMappingURL=reactivity.esm.js.map
