var VueReactivity = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // packages/reactivity/src/index.ts
  var index_exports = {};
  __export(index_exports, {
    effect: () => effect,
    isRef: () => isRef,
    ref: () => ref
  });

  // packages/reactivity/src/ref.ts
  var RefImpl = class {
    _value;
    // ref获取到的值（实际值）
    ["__v_isRef" /* IS_REF */] = true;
    // 一个标记，表示这个对象是一个ref对象
    constructor(value) {
      this._value = value;
    }
    /**
     * get 用来收集依赖
     */
    get value() {
      return this._value;
    }
    /**
     * set 用来收集更新
     */
    set value(newVal) {
      this._value = newVal;
    }
  };
  function ref(value) {
    return new RefImpl(value);
  }
  function isRef(value) {
    return !!(value && value["__v_isRef" /* IS_REF */]);
  }

  // packages/reactivity/src/effect.ts
  function effect(fn) {
    fn();
  }
  return __toCommonJS(index_exports);
})();
//# sourceMappingURL=reactivity.iife.js.map
