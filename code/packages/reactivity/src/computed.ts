import { activeSub, setActiveSub } from './effect'
import { ReactiveFlags } from './ref'
import { Dependency, endTrack, link, Link, Sub, startTrack } from './system'
import { hasChanged, isFunction } from '@vue/shared'

class ComputedRefImpl implements Dependency, Sub {
  [ReactiveFlags.IS_REF] = true

  _value

  subs: Link
  subsTail: Link

  deps: Link | undefined

  depsTail: Link | undefined

  tracking = false

  dirty = true

  constructor(
    public fn,
    private setter,
  ) {}

  get value() {
    if (this.dirty) {
      this.update()
    }
    if (activeSub) {
      link(this, activeSub)
    }
    return this._value
  }

  set value(newValue) {
    if (this.setter) {
      this.setter(newValue)
    } else {
      console.warn('我只读的，你别瞎玩！')
    }
  }

  update() {
    const prevSub = activeSub
    setActiveSub(this)
    startTrack(this)
    try {
      let oldValue = this._value
      this._value = this.fn()
      this.dirty = false

      return hasChanged(this._value, oldValue)
    } finally {
      endTrack(this)
      setActiveSub(prevSub)
    }
  }
}

export function computed(getterOrOptions) {
  let getter
  let setter

  if (isFunction(getterOrOptions)) {
    getter = getterOrOptions
  } else {
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }

  return new ComputedRefImpl(getter, setter)
}
