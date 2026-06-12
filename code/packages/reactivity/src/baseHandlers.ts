import { hasChanged, isObject } from '@vue/shared'
import { isRef } from './ref'
import { reactive } from './reactive'
import { track, trigger } from './dep'

// 只需要创建一次这个对象就行了
export const mutableHandlers = {
  get(target, key, receiver) {
    /**
     * target = {a: 0}
     * 收集依赖，绑定target中某一个key和sub之间的关系
     */
    track(target, key)

    const res = Reflect.get(target, key, receiver)
    if (isRef(res)) {
      // 如果 target.a 是一个ref，那么就直接把值给他，不要让他 .value
      return res.value
    }
    if (isObject(res)) {
      return reactive(res)
    }
    // receiver是用来改变访问器中的this访问对象
    return res
  },

  set(target, key, newValue, receiver) {
    const oldValue = target[key]

    /**
     * 触发更新，set的时候，通知之前收集的依赖，重新执行
     */
    const res = Reflect.set(target, key, newValue, receiver)

    /**
     * 如果 target.a 是一个ref，那么就直接把值给他，不要让他 .value
     * 如果更新了 state.a 它之前是一个 ref, 那么会修改原始的 ref.value 的值 等于 newValue
     * 如果 newValue 是一个ref，那就算了 （ state.a=ref(1) ）
     */
    if (isRef(oldValue) && !isRef(newValue)) {
      /**
       * const a = ref(0)
       * target = {a: a}
       * 更新target.a = 1, 它就等于更新了 a.value
       * a.value = 1
       */
      oldValue.value = newValue
      return res // 这里不用走下面的trigger，因为oldValue是一个ref，它发生了修改会自动触发ref中的set
    }

    /**
     * 如果新值和老值不一样，触发更新
     * 先 set 在通知更新（return）
     */
    if (hasChanged(newValue, oldValue)) {
      trigger(target, key)
    }

    return res
  },
}
