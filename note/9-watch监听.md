## 基础监听

watch 是基于调度器实现的，也就是 scheduler，他的作用就是当依赖更新的时候，执行传入的调度器，而不是 effect 传入的回调了

(创建)packages\reactivity\src\watch.ts

```ts
import { isRef } from 'vue'
import { ReactiveEffect } from './effect'

export function watch(source, cb, options) {
  let getter
  if (isRef(source)) {
    getter = () => source.value
  }

  let oldVal

  function job() {
    // 执行effect.run 拿到 getter 的返回值，不能直接执行 getter，因为要收集依赖
    const newVal = effect.run()

    // 执行用户回调，把newValue 和 oldValue传进去
    cb(newVal, oldVal)

    // 下一次的 oldValue 就等于这一次的newValue
    oldVal = newVal
  }

  // 这里手动拿到effect创建，而不用effect返回的effect函数的原因是想要拿到run的返回值，但是effect返回的并没有
  const effect = new ReactiveEffect(getter)

  effect.scheduler = job

  // 拿run的原因就是要拿到旧的值
  oldVal = effect.run()

  return () => {}
}
```

watch 接收三个参数

- source 是监听的数据，可能不是一个函数，如果传入的不是函数，而是 ref 的话，把他变成一个函数
- **cb**是监听数据发生变化后执行的回调函数，接收两个参数，一个是 newVal，另一个是 oldVal
- **options**是配置项

在**watch**函数中，需要先创建一个**effect**的实例，因为需要收集依赖，所以通过 **const effect = new ReactiveEffect(getter)** 收集依赖，并且给**effect**加上**scheduler**，也就是说传入的**getter**发生了改变，那么会执行**scheduler**，也就是 job 函数，**job**中可以拿到**oldValue**和**newValue**。首次会调用一下**run**函数，拿到**oldValue**,之后的每次**oldValue**都是上一次的**newValue**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module">
      import {
        reactive,
        ref,
        effect,
        computed,
        watch,
      } from '../dist/reactivity.esm.js'

      const count = ref(0)

      watch(count, (newValue, oldValue) => {
        console.log('count发生了修改', newValue, oldValue)
      })

      setTimeout(() => {
        count.value = 1
      }, 1000)
    </script>
  </body>
</html>
```

![[9-watch监听-0CC38D5547434FF105BF864BCA578B08.png]]

## 停止监听

packages\reactivity\src\effect.ts

```ts
export class ReactiveEffect implements Sub {
  // 表示这个effect是否激活
  active = true
    ...

  run() {
    // 如果当前effect没有被激活，直接执行
    if (!this.active) {
      return this.fn()
    }

        ...
  }


  stop() {
    // 如果当前是激活状态,当调用stop的时候，清理掉所有的依赖，并且把active改成false
    if (this.active) {
      startTrack(this) // 开始追踪
      endTrack(this) // 这里不执行fn，直接结束追踪，清理依赖
      this.active = false // 不激活了
    }
  }
}
```

packages\reactivity\src\watch.ts

```ts
export function watch(source, cb, options) {
    ...

  return () => {
    effect.stop()
  }
}
```

测试代码

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module">
      import {
        reactive,
        ref,
        effect,
        computed,
        watch,
      } from '../dist/reactivity.esm.js'

      const count = ref(0)

      const stop = watch(count, (newValue, oldValue) => {
        console.log('count发生了修改', newValue, oldValue)
      })

      setTimeout(() => {
        count.value = 1
        setTimeout(() => {
          console.log('进入内部')
          stop()
          count.value = 2
        }, 1000)
      }, 1000)
    </script>
  </body>
</html>
```

打印结果
![[9-watch监听-7CF97FD46A337212694F0FD57D646C88.png]]
这里就没打印第二次，因为调用了 stop 函数

这里可以把 stop 优化一下

packages\reactivity\src\watch.ts

```ts
export function watch(source, cb, options) {
	...

  // 把stop封装为一个函数
  function stop() {
    effect.stop()
  }

  return stop
}
```

## optoins 配置

接下来实现 options：

### 实现 immediate

packages\reactivity\src\watch.ts

```ts
export function watch(source, cb, options) {
  const { immediate, once, deep } = options || {}
  let getter
  let oldVal

  function job() {
    const newVal = effect.run()

    cb(newVal, oldVal)

    oldVal = newVal
  }

  if (isRef(source)) {
    getter = () => source.value
  }
  const effect = new ReactiveEffect(getter)

  if (immediate) {
    // 初始的时候需要直接执行run函数，这里通过调用job实现
    job()
  } else {
    // 拿到 oldValue, 并且收集依赖
    oldValue = effect.run()
  }

  effect.scheduler = job

  // 拿run的原因就是要拿到旧的值
  oldValue = effect.run()

  function stop() {
    effect.stop()
  }

  return stop
}
```

如果 immediate 传了的话，那么我直接调用 job，在 job 中调用 run 的时候收集依赖。如果没有传入 immediate 的话，就调用 run 来收集依赖，此时不会调用 cb

### 实现 once

packages\reactivity\src\watch.ts

```ts
export function watch(source, cb, options) {
  const { immediate, once, deep } = options || {}


  if (immediate) {
    job()
  } else {
    oldVal = effect.run()
  }
 
  if (once) {
    // 只调一次的时候，就在第一次调cb的时候往里面偷偷塞个stop，下次就调不到这里了
    const _cb = cb

    cb = (...args) => {
      _cb(...args)
      stop()
    }
  }

    ...

}
```

保存一份 cb，然后把原来的 cb 里面塞一个 stop 用来停止监听

### deep 监听

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module">
      import {
        reactive,
        ref,
        effect,
        computed,
        watch,
      } from '../dist/reactivity.esm.js'

      const state = ref({
        a: {
          b: 1,
        },
      })

      const stop = watch(
        state,
        (newValue, oldValue) => {
          console.log('count发生了修改', newValue, oldValue)
        },
        {
          deep: true,
        },
      )

      setTimeout(() => {
        state.value.a.b = 2
      }, 1000)
    </script>
  </body>
</html>
```

packages\reactivity\src\watch.ts

```ts

export function watch(source, cb, options) {
  const { immediate, once, deep } = options || {}
  	...

  if (isRef(source)) {
    getter = () => source.value
  }

  if (deep) {
    const baseGetter = getter
    getter = () => traverse(baseGetter())
  }
  const effect = new ReactiveEffect(getter)
	...

}

// 递归对象所有的数据
function traverse(value) {
  if (!isObject(value)) {
    return value
  }

  for (const key in value) {
    traverse(value[key])
  }
  return value
}
```

只有这样操作，才能在修改 b 的时候触发更新，否则不会触发 b 的更新，只会触发 a 的更新

## 循环引用

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
  </head>
  <body>
    <script type="module">
      import {
        reactive,
        ref,
        effect,
        computed,
        watch,
      } from '../dist/reactivity.esm.js'
      const state = ref({
        a: {
          b: 1,
        },
      })
      state.value.c = state
      const stop = watch(
        state,
        (newValue, oldValue) => {
          console.log('count发生了修改', newValue, oldValue)
        },
        {
          deep: true,
        },
      )
      setTimeout(() => {
        state.value.a.b = 2
      }, 1000)
    </script>
  </body>
</html>
```

![[9-watch监听-B00EC94153A1076771AEBBD1774A33F3.png]]
上面主要加了一行代码 `state.value.c = state` 这样加了的话，就会出现这种情况

主要原因是因为出现的循环引用，要避免循环引用必须要在 traverse 函数中识别出循环引用后，单独处理一下
packages\reactivity\src\watch.ts

```ts
// 新增一个new Set结构
function traverse(value, seen = new Set()) {
  if (!isObject(value)) {
    return value
  }

  // 判断对象是否已经加入过了，如果已经加入了，直接返回不再处理
  if (seen.has(value)) {
    return value
  }

  seen.add(value)

  for (const key in value) {
    traverse(value[key], seen) // 这里必须传过去
  }
  return value
}
```

通过 new Set 来判断当前是否已经加入过了这个属性，能有效解决了循环引用的问题

以上是 deep 的基础功能就搞定了

## 可配置监听深度

```ts
const state = ref({
  a: {
    b: 1,
    c: {
      d: 1,
    },
  },
})
```

如果要监听这样的数据，并且，只要监听 a 下面的数据变化，但是再深一层就不监听了，也就是说 c 里面的 d 发生变化，不在监听，这个怎么处理呢
在官方的话，可以在 deep 的时候传递一个数字，表示监听哪一层:

```ts
const stop = watch(
  state,
  (newValue, oldValue) => {
    console.log('count发生了修改', newValue, oldValue)
  },
  {
    deep: 2,
  },
)
```

这里传递一个 2，表示只监听两层，那么就是 a 这一层和 b、c 、d 这两层就不监听了。

可以通过控制递归层数来实现，判断 deep 传递的类型

packages\reactivity\src\watch.ts

```ts

export function watch(source, cb, options) {

    ...

  if (deep) {
    const baseGetter = getter
    const depth = deep === true ? Infinity : deep
    getter = () => traverse(baseGetter(), depth) // 传入层级
  }

	...

}
```

根据 depth 传递来每一次递归的时候重新计算 depth 的值，等到 depth 为 0 的时候，就不在递归，也就是不再绑定了，就可以实现不再监听身材对象

packages\reactivity\src\watch.ts

```ts
function traverse(value, depth = Infinity, seen = new Set()) {
  // 不是一个对象，或者层级到了，就跳出去
  if (!isObject(value) || depth <= 0) {
    return value
  }

  // 如果之前访问过，那直接返回，防止循环引用栈溢出
  if (seen.has(value)) {
    return value
  }

  // 层级-1
  depth--

  // 记录绑定到的信息
  seen.add(value)

  for (const key in value) {
    // 递归，触发getter
    traverse(value[key], depth, seen)
  }
  return value
}
```

这样就能实现 deep 的时候只监听传入层数的对象了。

当然还有一些地方需要补充，比如传入的是 reactive，或者是一个函数的时候，也是需要特殊处理的

```ts
export function watch(source, cb, options) {
    ...

  if (isRef(source)) {
    // 如果是一个ref，就返回 .value
    getter = () => source.value
  } else if (isReactive(source)) {
    // 如果是一个reactive，那么就把deep改成true，如果传了，以传了的为准
    getter = () => source
    if (!deep) {
      deep = true
    }
  } else if (isFunction(source)) {
    // 如果 source 是一个函数，那么 source 就是一个 gtter
    getter = source
  }

    ...
}
```

reactive，默认是 deep 的

## 依赖清理

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
    <style>
      body {
        padding: 150px;
      }
      #app,
      #dv {
        width: 100px;
        height: 100px;
        background: red;
      }
      #dv {
        background: #000;
      }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <div id="dv"></div>
    <button id="btn">切换</button>
    <script type="module">
      // 我们自己的
      // import {
      //   reactive,
      //   ref,
      //   effect,
      //   computed,
      //   watch,
      // } from '../dist/reactivity.esm.js'

      // 官方的
      import {
        reactive,
        effect,
        ref,
        computed,
        watch,
      } from '../../../node_modules/vue/dist/vue.esm-browser.prod.js'

      const flag = ref(true)

      watch(
        flag,
        (newValue, oldValue, onCleanup) => {
          const dom = newValue ? app : dv
          function handler() {
            console.log(newValue ? '点击了app' : '点击了dv')
          }
          dom.addEventListener('click', handler)

          onCleanup(() => {
            dom.removeEventListener('click', handler)
          })
        },
        {
          immediate: true,
        },
      )

      btn.onclick = () => {
        flag.value = !flag.value
      }
    </script>
  </body>
</html>
```

这个案例中，页面有两个区域，当 flag 为 true 的时候，红色添加点击事件，当 flag 为 flase 的时候，黑色区域添加点击事件，这里用的是官方的，会发现，点击红色的时候有事件，点击黑色的就没事件了，反之也是。这就是因为事件被清理了。当然，目前我们的代码还不行，我们也需要在切换的时候，去清理依赖

packages\reactivity\src\watch.ts

```ts
export function watch(source, cb, options) {
  let { immediate, once, deep } = options || {}
  let getter
  let oldVal
  let cleanup = null

  // 供用户调用
  function onCleanup(cb) {
    cleanup = cb
  }

  function job() {
    if (cleanup) {
      // 看一下要不要清理上一次的副作用，如果有就执行，执行完了再置空
      cleanup()
      cleanup = null
    }
    const newVal = effect.run()

    // 执行用户回调，把newValue 和 oldValue传进去
    cb(newVal, oldVal, onCleanup)

    oldVal = newVal
  }

  if (isRef(source)) {
    getter = () => source.value
  } else if (isReactive(source)) {
    getter = () => source
    if (!deep) {
      deep = true
    }
  } else if (isFunction(source)) {
    getter = source
  }

  if (deep) {
    const baseGetter = getter
    const depth = deep === true ? Infinity : deep
    getter = () => traverse(baseGetter(), depth)
  }
  const effect = new ReactiveEffect(getter)

  if (immediate) {
    job()
  } else {
    oldVal = effect.run()
  }

  if (once) {
    const _cb = cb

    cb = (...args) => {
      _cb(...args)
      stop()
    }
  }

  effect.scheduler = job
  oldVal = effect.run()

  function stop() {
    effect.stop()
  }
  return stop
}
```

这样就可以做到当分支发生变化的时候，先把之前的事件给取消掉。
