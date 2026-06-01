var VueReactivity = (() => {
  // packages/shared/src/index.ts
  function isObject(value) {
    return value !== null && typeof value === "object";
  }

  // packages/reactivity/src/index.ts
  console.log(123, isObject({}));
})();
//# sourceMappingURL=reactivity.iife.js.map
