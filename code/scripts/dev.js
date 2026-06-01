/**
 * 打包开发环境
 *
 * node scripts/dev.js --format cjs
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import esbuild from "esbuild";
import { createRequire } from 'node:module'

/**
 * 解析命令行参数
 */
const {
  values: { format },
  positionals,
} = parseArgs({
  allowPositionals: true, // 允许位置参数
  options: {
    format: {
      type: "string", // 选项的类型
      short: "f", // 选项的短名称
      default: "esm", // 选项的默认值
    },
  },
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url)

// 如果有获取到要打包的目标，否则默认打包整个 vue
const target = positionals.length ? positionals[0] : "vue";

// 配置入口文件
const entry = resolve(__dirname, `../packages/${target}/src/index.ts`);
const pkg = require(`../packages/${target}/package.json`)

esbuild.context({
  entryPoints: [entry], // 入口文件
  outfile: resolve(
    __dirname,
    `../packages/${target}/dist/${target}.${format}.js`,
  ), // 输出文件
  format, // 输出格式
  platform: format === 'cjs' ? 'node' : 'browser', // 目标平台
  sourcemap: true, // 生成 source map
  bundle: true,  // 打包所有依赖到一个依赖中
  globalName: pkg.buildOptions?.name
}).then(ctx => {
  ctx.watch() // 监听文件变化，自动重新打包
})
