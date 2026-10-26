---
name: apple-glass-ui
description: 为服务端渲染网站（Thymeleaf/模板 + 少量 JS，无前端构建）套用“苹果风格、毛玻璃、可换极光背景、中英文切换、鼠标跟随与滚动动效”的整套界面方案。当用户要求把页面做得更高级/简约/苹果风、要毛玻璃或渐变背景、字体不好看、要中英文角标切换、要鼠标跟随或滚动反馈、要可选的 WebGL 丝绸背景时使用。
---

# Apple 风毛玻璃界面方案（零框架、零构建）

来自「公司门户一期」的实战：纯 CSS + 一个 `ui.js`，无 Tailwind/无 npm 构建；深色/浅色/自动、5 种背景、中英文、鼠标光斑、可选 WebGL 丝绸。以下是**做法 + 踩过的坑 + 验收方法**。直接可用的代码在 `assets/`。

## 0. 先定原则
- **简约**：一个强调色（Apple 蓝 `#0071e3` / 深色 `#4aa8ff`），渐变只用在品牌字、按钮、色块背景。
- **零依赖**：不引 GSAP/Lenis/框架；动效用 CSS + IntersectionObserver + 少量 rAF。
- **优雅降级**：不支持的浏览器直接显示静态内容；`prefers-reduced-motion` 一律关动画；触屏不开鼠标特效。
- **不记请求正文、不引外网资源**（字体自托管，国内访问稳定）。

## 1. 字体（最影响观感）
问题根因：系统字体栈在苹果设备是苹方（好看），在 Windows 落到微软雅黑（一般）。要跨设备一致就必须自带字体。
- 方案：**Inter（英文数字）+ 思源黑体 Noto Sans SC（中文）**，均 SIL OFL，可自托管商用。
- 中文全量字体 5–20MB，必须 `unicode-range` 分片：用 `scripts/fetch-fonts.sh <static/css 目录>` 从 npm 的 `@fontsource-variable/*` 取官方分片（101 个 woff2，合计约 4.7MB，浏览器只下页面用到的片段），并生成 `fonts.css`。
- `--font: "Inter Variable","Noto Sans SC Variable",-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei UI",system-ui,sans-serif;`
- 微调：`font-feature-settings:"kern","liga","calt","cv11","ss03"`；中文标题字距用 `:lang(zh) h1{letter-spacing:-.01em}`（英文的 -.035em 会让中文挤）；`preload` 一个 Inter latin 文件即可。
- ⚠️ 未采用 HarmonyOS Sans / MiSans：只查到媒体报道“免费商用”，没读到授权原文，嵌入网页分发是否允许需先核对；SF 字体协议不允许在非苹果平台分发。

## 2. 毛玻璃为什么“看不见”
`backdrop-filter` 只会模糊**背后有内容**的东西。纯黑/纯灰背景 = 没东西可模糊 = 看不出毛玻璃。
- 必须配**彩色背景层**（见 §3），再让 `.topbar/.card/下拉` 半透明：`background: color-mix(in srgb, var(--surface) 45~60%, transparent); backdrop-filter: saturate(180%) blur(20px);` + `inset 0 1px 0 var(--glass-hi)` 顶部高光。
- 深色底用**深海军蓝 `#0a0f1f`，不要 `#000`**。

## 3. 可替换背景（极光色块）
- `body::before{position:fixed; inset:-20vmax; z-index:-1}` 叠 4 个 `radial-gradient`（颜色取 `--b1..--b4`），`animation: drift 40s alternate`（只动 transform，便宜）；`body{isolation:isolate}`。
- 预设：`:root[data-bg=aurora|dusk|ocean|mint|plain]` 只改 `--b1..--b4`；深/浅色各一套（浅色色块 alpha≈.25–.45，深色≈.3–.46）。
- 主题：`data-theme=light|dark`，auto 用 `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){…}}`。
- 偏好存 `localStorage`（全部 try/catch），`<head>` 里**内联小脚本**在绘制前套用 `data-theme/data-bg/data-lang`，避免闪烁。

## 4. 中英文切换（轻量，运行时词典）
- 角标 `中 | EN` 注入 `.topbar`，点击 `localStorage.portal.lang` 后 `location.reload()`（简单可靠）。
- 英文时 `ui.js` 拉 `i18n-en.json`：`{exact:{"中文":"English"}, patterns:[{re,to,tr}]}`；遍历文本节点和 `placeholder/title/alt/aria-label`；`MutationObserver` 覆盖 htmx 局部刷新；`<title>` 也翻。`pattern.tr=[n]` 表示第 n 个捕获组再查 exact。
- 防闪烁：英文时 `html[data-lang=en]:not(.i18n-ready) body{opacity:0}`，翻译完加 `i18n-ready`，另设 2 秒兜底。
- **必须配覆盖测试**：扫描模板里所有中文文本/属性，缺词条即测试失败（防止以后新增中文漏翻）。服务端动态消息用 patterns（如“请 N 分钟后再试”）。
- 取舍：管理后台/邮件/短信可保持中文，先写进需求文档的问题清单。

## 5. 交互动效（便宜、可关）
- 首页入场：子元素 `animation: reveal .8s` 错开 .05/.22/.4s（`opacity+translateY+blur`）；标题渐变 `background-clip:text` + 缓慢 `sheen`。
- 按钮：悬停上抬、`:active scale(.97)`；点击**涟漪**（pointerdown 插入 `.ripple` span，650ms 移除）。
- 表单提交：按钮 `.loading` 转圈 + `form.__busy` 防重复；`pageshow` 恢复（后退缓存）。
- 验证码发送：成功后按钮 60 秒倒计时（监听 `htmx:afterRequest`，请求结果有 `.ok` 才开始）。
- 滚动：`.sr` 元素 `IntersectionObserver(threshold .15)` 加 `.in`（`html.js .sr` 才隐藏，无 JS 时可见）；CSS 滚动驱动动画 `@supports (animation-timeline: scroll())`：顶栏随滚动变实、hero 用 `view()` 渐隐。不支持的浏览器自动忽略。
- 注意：`prefers-reduced-motion` 里用 `animation:none` 会让 `opacity:0` 的入场元素永远不可见 → 同时给这些元素写 `opacity:1!important`。

## 6. 鼠标跟随
**A（默认开，几乎零成本）**：`pointermove` → rAF 缓动 → 写 CSS 变量 `--mx/--my`（光斑 `body::after radial-gradient`）、`--px/--py`（极光用独立的 `translate` 属性做视差，不与 drift 动画的 `transform` 冲突）；卡片内用相对坐标 `--cx/--cy` 做边缘高光。仅 `(pointer:fine) and (hover:hover)` 且非 reduced-motion。
**B（可选，默认关）**：`assets/fabric.js` —— 全屏 WebGL 片元着色器（domain-warp 的“丝绸褶皱” + 鼠标处形变），半分辨率、30fps、标签页隐藏即暂停、`low-power`；颜色取当前背景预设；开启时隐藏 CSS 极光。
- 入口：外观面板的开关；**首页首次访问弹一次提示**“想试试丝绸流动的动态背景吗？[试试][不用了]”，选择存 localStorage，不再打扰；手机/触屏/减少动态/不支持 WebGL 时不提示。
- 只在需要“炫”的页面启用；登录、表单页不建议。

## 7. 验收（Playwright 真浏览器，别只看截图）
检查项：深色 `background-color ≠ rgb(0,0,0)`；`.topbar` 的 `backdropFilter` 含 `blur`；`body::before` 有 `radial-gradient`；`document.fonts` 里 `Inter Variable`/`Noto Sans SC Variable` 为 loaded；切英文后页面无残留中文（`/[㐀-鿿]/`）；主题/背景/语言刷新后保持；鼠标移动后 `--mx` 变化；滚动后 `.sr.in` 出现；WebGL 开关可开可关且刷新持久；控制台无 JS 错误。
- 无头 Chromium 的 WebGL 可用（SwiftShader）；`fullPage` 截图对 `position:fixed` 元素会失真，别据此判断布局。
- 动画刚结束就截图会拍到半透明状态，截图前 `waitForTimeout(400)`。

## 8. 接入步骤（照做）
1. `scripts/fetch-fonts.sh <static/css>`；页面 `<head>` 引 `fonts.css` + `app.css`（`assets/app.css`，按需删减）+ 内联预置脚本 + `ui.js`（`defer`，`data-dict` 指向词典）。
2. 导航栏容器 `.topbar .nav` 存在即可，`ui.js` 自动注入语言角标与外观面板；`fabric.js` 由 `ui.js` 按需懒加载（放在同目录 `/js/fabric.js`）。
3. 写词典 + 覆盖测试；E2E 加 §7 的检查。
4. 若有登录闸门/白名单过滤器，确认 `/css/**`、`/js/**`（含字体）对未登录和“须改密”用户放行。

## 踩过的坑（速查）
- Thymeleaf `~{fragments/layout :: header}` 还会按**标签名**匹配所有 `<header>` → fragment 别叫 header。
- 静态资源改了但页面没变：检查运行的是不是旧 jar（`mvn package` 后重启）。
- 两个同类按钮（首页主按钮+底部按钮）会让 `locator('a.btn-primary')` 严格模式报错 → 测试选择器加范围。
- 深色色块 alpha 太低 → 毛玻璃“看不出来”，先调背景再怪 blur。
