# Vue 与 React 包发布

两个包独立管理版本，共用 `.github/workflows/publish.yml`，每次 tag 只选择一个包发布：

| 包 | 目录 | tag | artifact 目录 |
| --- | --- | --- | --- |
| `vue-mathjax-beautiful` | `packages/core` | `vX.Y.Z` | `dist/release/` |
| `react-mathjax-beautiful` | `packages/react` | `react-vX.Y.Z` | `dist/release/react/` |

## 本地验证

使用 Node.js 22.23.2 和 pnpm 9.15.9，在仓库根目录运行：

```sh
pnpm install --frozen-lockfile
pnpm exec vitest run
pnpm type-check
pnpm build:all
pnpm test:package
pnpm test:package:react
```

也可在 Bash 中运行 `bash scripts/publish.sh`，执行相同检查。任何检查失败都会中止。CI 在发布任一包之前都会验证两个消费者，发布任务仅接收 tag 所选包的 tarball 和元数据。

`test:package` 打包真实 tarball，在系统临时目录创建独立消费者并安装该 tarball，没有仓库源码别名或链接。它验证：

- JS、UMD、CSS、类型声明和文档实际进入 npm 包，所有入口均能解析。
- ESM 和 CommonJS 导入、组件、插件及工具 API 可用。
- 新旧 CSS 子路径均可解析。
- TypeScript Bundler 和 NodeNext 模式能编译消费者，且不跳过声明检查。
- Vite 能构建导入组件和样式的消费者。

消费者路径会打印到终端，供失败诊断使用。通过验证的 tarball 和含 SHA-512 integrity 的元数据保留在 `dist/release/`。

类型声明构建使用仅供开发的 `vue-declarations` 别名，固定到 peer dependency 下限 Vue 3.3.0，避免生成依赖新版 Vue 类型参数的声明。该别名不会进入公开声明或运行时依赖；消费者验证覆盖 Vue 3.3.0 / TypeScript 5.3.3 和 Vue 3.5.17 / TypeScript 5.4.5。

`test:package:react` 在两个独立临时目录分别安装 React / React DOM 18.0.0 和 19.0.0，以及对应的类型包。除入口、样式、类型和 Vite 构建外，还检查 peer dependency 树，并通过 ESM 和 CommonJS 入口实际执行组件服务端渲染。

React 发布后，CI 还会执行 `node scripts/verify-react-package.mjs --published`，先核对 registry tarball 与预验证产物的 integrity，再在两个全新消费者中通过 npm 版本号安装并重复验证。该模式依赖 `dist/release/react/package.json` 中保存的预验证元数据。

## 发布步骤

1. 更新目标包的 `package.json` 版本和 `CHANGELOG.md`，验证后将变更合入 `master`。
2. 在该提交上创建并推送一致的稳定版本 tag，例如：

   ```sh
   git tag -a v1.4.2 -m "Release vue-mathjax-beautiful 1.4.2"
   git push origin v1.4.2
   ```

   React 使用独立 tag：

   ```sh
   git tag -a react-v1.0.3 -m "Release react-mathjax-beautiful 1.0.3"
   git push origin react-v1.0.3
   ```

3. `.github/workflows/publish.yml` 重新执行验证，将验证后的 tarball 作为 artifact 传递给发布任务，直接发布该 tarball，不在发布任务重新构建。
4. npm 接收发布后可能仍需几分钟处理。工作流最多等待约 5 分钟，核对 npm 版本、`latest` 和 tarball integrity 后创建 GitHub Release。只有这些步骤成功才算发布完成。

工作流要求 tag 精确匹配所选包版本，且 tag 提交必须已在 `master` 中。发布串行执行，新版本必须高于当前稳定版 `latest`，防止旧版本覆盖最新版本。手动重跑时，工作流运行引用和输入都必须使用同一 tag，保证 provenance 对应实际构建的提交：

```sh
gh workflow run publish.yml --ref v1.4.2 -f tag=v1.4.2
gh workflow run publish.yml --ref react-v1.0.3 -f tag=react-v1.0.3
```

工作流不会自动修改版本或创建 tag。若该版本已存在，仅在 tarball integrity 相同时继续，禁止覆盖不同内容。

## npm 身份验证

分别在两个 npm 包设置中配置 Trusted Publisher：GitHub 用户 `zzq-github`，仓库 `mathjax-beautiful`，工作流文件 `publish.yml`，允许 `npm publish`，不指定 environment。Vue 的连接不会自动授权 React 包。工作流已配置 `id-token: write`，使用 Node 22 和 npm 11.15.0。

也兼容仓库 secret `NPM_TOKEN`。若 npm 尚未配置可信发布且没有有效 token，发布任务会失败，版本不会被宣称已发布。本地 npm 登录不影响 GitHub Actions 的身份验证。

参考：[npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)。
