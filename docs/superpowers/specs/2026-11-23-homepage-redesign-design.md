# 主页重设计：杂志风 + 交互首屏

日期：2026-11-23 · 状态：待批准

## 1. 为什么做

现在的站点是 Academic Pages 模板的默认样子：左侧头像栏，右侧列表。和成千上万个学术主页长得一样，用户觉得"太无聊"。

用户希望访客离开时记住一件事：**Zeyu 研究 AI 和机器人进入生产以后，人在哪里仍然不可替代、什么时候人会成为瓶颈。** 这是他的主方向"Intelligence & Robotics in Manufacturing Operations"里最独特的问题，来自他和导师正在推进、尚未发表的研究：AI 接走执行，人变成介入者（检查、检修、处理突发），需要人的时刻落在哪里决定人会不会成为瓶颈。

## 2. 目标、非目标、反目标

**目标**
- 首屏用一个可以动手玩的小模拟讲清上面这个问题，访客几秒钟内就能自己看到"机器一多、求助一扎堆，人就成了瓶颈"。
- 全站换成当代杂志风，不再像模板。
- 所有现有内容、链接和 GitHub Pages 自动构建保持不变。

**非目标**
- 不新增研究内容，不写博客，不换框架（不迁 Astro），不加 CMS。
- 不改论文、教学、CV 的事实内容，只修现有的格式问题（见 §6.4）。

**反目标（做到了也算失败）**
- 首屏出现未发表模型的任何结果：四象限、替代比例、具体数字、"我们发现"之类的结论。
- 首屏或模拟脚本里出现导师姓名，或者把研究写成别人的想法。（2026-11-23 用户要求：About 介绍里写明导师 Ming Hu 并链接 https://ming.hu；教学条目链接 SJTU 新闻报道。）
- 首屏模拟只是装饰，看不出因果；或者在手机上用不了。
- 看起来仍然像模板，或者带典型的 AI 味：每个标题上的小眉标、全大写字母标签、标题里只有一个词变色、到处圆角卡片和阴影。
- 旧链接失效：`/publication/...`、`/publications/`、`/teaching/...`、`/cv/`、`/about/` 跳转、`/files/cv_zeyulin.pdf`。

## 3. 约束

- 必须能被 GitHub Pages 的 `github-pages` gem 原样构建：不能用自定义 Jekyll 插件，只用已经在 `_config.yml` 里的插件。
- 不引入任何 JS 依赖和构建步骤；首屏模拟是一个原生 JS 文件。
- 外部资源只用 Google Fonts。
- 本机系统 Ruby 是 2.6，没有 Jekyll。本地预览用仓库里已有的 `Dockerfile` / `docker-compose.yaml`，或者装 Homebrew Ruby，由实现方决定。

## 4. 考虑过的做法

| 做法 | 取舍 | 结果 |
|---|---|---|
| **A. 在 Jekyll 里重做** | 内容集合和发布流程完全不动；要清掉 Minimal Mistakes 的旧 include、Sass、JS，工作量中等 | **用户选定** |
| B. 迁到 Astro | 写交互更顺手；但要重建论文集合、换部署、学新工具，用户的日常维护（加 News、加论文）得不到好处 | 放弃 |
| C. 用 hallmark 生成独立 HTML 再拆进 Jekyll | 审查流程最完整；但输出是单个静态页，动态列表要手工对接，容易两边不一致 | 放弃；hallmark 改为材质参考和最终检查工具 |

## 5. 用户已经决定的

1. 风格方向：杂志风（Editorial）+ 交互首屏。
2. 首屏主题：AI 和机器人进入生产以后人的角色，基于执行者/介入者这个想法，不用 Moving Lifelines。
3. 首屏只讲**问题和机制**，不放模型结果。
4. 在现有 Jekyll 里重做。
5. hallmark 已安装（`~/.claude/skills/hallmark`），用来参考和检查。
6. News 改存在 `_data/news.yml`，每条两个字段：`date`（如 `Nov 2026`）和 `text`（Markdown）。首页和 `/news/` 都从这里读取，以后只改这个文件。
7. 上线方式：在当前分支上做完，用 Docker 本地预览整站，满意后一次性合并到 `master`。合并前不推送到 `master`。

## 6. 设计

### 6.1 材质（来自 hallmark 的 Editorial 主题）

- 纸色：暖白 `oklch(97% 0.007 86)`；墨色：带一点冷调的黑；强调色：一种印刷绿 `oklch(49% 0.130 152)`，占一屏不超过 5%，只用在链接悬停、焦点环和首屏模拟里的"人"。
- 标题：Bricolage Grotesque 800，宽度轴 75（窄体），句首大写，不用全大写。
- 正文：Source Serif 4，18px，行高 1.55。
- 标签、导航、日期、图注：Bricolage Grotesque 500，小一号，不加字距。
- 线：每个区块开头一条 4px 墨色粗线，行与行之间 1px 细线。直角，没有阴影，没有纹理。
- 动效：只有状态变化（链接下划线变绿等）。首屏模拟本身是内容，不算装饰性动效。
- token 直接照搬 hallmark `references/themes/editorial.md` 的 `:root` 块。

### 6.2 页面和结构

**首页 `/`**，从上往下：
1. **刊头**：左边名字，右边导航（Research · Papers · Teaching · CV）。没有头像侧栏。
2. **首屏**（见 §6.3）：大标题 + 一两句导语 + 模拟 + 两个控件 + 实时读数。
3. **Research**：粗线开头，一段大号衬线导语讲主方向，下面一段讲其他方向（共享出行、网络竞争、学习增强优化），内容取自现有 `about.md`。
4. **Papers**：粗线开头，"目录式"行列表，每行左边是论文标题（窄体），右边是期刊和状态（如 "Major Revision · Management Science"），最右是年份，整行链接到论文页。数据来自 `_publications`，按现有的三个分类排列。
5. **News**：细线分隔的行，日期在左（窄体、等宽数字），内容在右。
6. **About / Contact**：一张方形头像（加 8% 墨色细描边），旁边是简短简介、邮箱、Google Scholar、SSRN、GitHub。
7. **页脚**：一行。

**论文页 `/publication/...`**：标题、作者、期刊和状态行、摘要正文、按钮（SSRN / 论文链接）、引用格式。

**Publications `/publications/`、Teaching `/teaching/`**：同样的目录式行列表。

**CV `/cv/`**：一句话加 PDF 下载按钮，之后可以扩展。

**404**：一句话加回首页链接。

### 6.3 首屏模拟

**文案**（英文，简洁，不用营销腔；最终措辞由实现方打磨，不能夸大）：
- 标题："When machines do the work, who becomes the bottleneck?"
- 导语："I study how AI and robots change the work people still do — and when the person who checks, repairs, and steps in becomes the constraint."
- 模拟下方一行小字说明这只是示意，比如 "An illustration, not a result."

**画面**：一排机器（方块），一个人（绿色圆点）。
- 机器在工作时是墨色进度条在走。
- 需要人时，机器变成空心并停下，进入队列。
- 人逐个走过去处理，处理时连一条细线。

**控件**：
- "Robots per person" 滑块，1–12，默认 6。
- "When help is needed" 切换：`Scattered`（每台机器各自随机需要人）/ `In bursts`（一次冲击让一批机器同时需要人）。

**实时读数**，一行：`Robots waiting 23% · Person busy 91%`，用滚动平均，数字原地更新。

**行为要求**：
- 访客拖到 10 台以上，或切换到 `In bursts`，等待比例要明显上升。这是这个模拟唯一要讲清的事。
- 参数（单件加工时长、介入时长、随机分布）由实现方选，选的标准是上面的效果肉眼可见；不对外宣称任何数字有意义。
- `prefers-reduced-motion` 时不自动播放，显示静态快照加一个"Step"按钮。
- 不支持 JS 时，显示一张静态 SVG 快照，文案照常显示。
- 手机上模拟放在标题和导语下面，控件够大，可以用手指操作。
- 标签页不可见时暂停。
- 可访问性：控件有 label，读数区域用 `aria-live="polite"` 并限流。

**实现**：原生 JS（`assets/js/bottleneck.js`），SVG 或 canvas 由实现方决定；离散事件逻辑和绘制分开，便于以后改模型。

### 6.4 内容处理

- News 第一条（Transportation Science Major Revision）补上日期 `Nov 2026`，和其他条目格式一致。
- 其余文字原样保留，只移动位置。
- 不写入任何未发表模型的结果，不出现导师姓名。
- **首页 News 只显示最近 4 条**，底部加 "All news" 链接到新的 `/news/` 页，那里显示全部条目。原因是 hallmark 的 Floor 规则要求一屏（1440×900）不超过 95 个词，6 条 News 约 180 词。*（实现方的决定，用户可推翻）*
- 论文页保留完整摘要，不缩短。

### 6.5 清理

- 去掉不再使用的模板页面：category / tag / year / collection / page archive、`archive-layout-with-content.md`、HTML 版 `sitemap.md`（XML sitemap 由插件继续生成）、`_drafts`、`_data/comments`。
- 去掉 Minimal Mistakes 的 layouts、includes、`_sass`、`assets/js` 和主题切换，换成新的精简 layout 和一份 CSS。
- `talkmap/`、`talkmap.ipynb`、`talkmap_out.ipynb`、`scrape_talks.yml` workflow、`markdown_generator/` 一并删除（没有 talks 了）。
- 只为旧模板或 talks 功能服务的其他文件也一并删除：`talkmap.py`、`_config.yml` 里的 `talks` 和 `portfolio` 集合及其 defaults、`scripts/`（CV 转 JSON）、`package.json`、`.devcontainer`、`assets/fonts`、`assets/webfonts`、`images/themes`、`_data/ui-text.yml`、`_data/authors.yml`，以及 `_config.yml` 中不再被引用的模板配置项。*（实现方的决定，用户可推翻）*
- 删除前逐个确认没有被引用；所有删除都在 git 里，随时能找回。
- `README.md` 改写成一份简短的维护说明：怎么加 News、怎么加论文、怎么本地预览。

### 6.6 暗色模式

跟随系统 `prefers-color-scheme`，提供一套暗色 token（参考 hallmark `dark-mode.md`）。去掉手动切换按钮。

## 7. 验收

- 在 Docker 里本地构建通过，没有警告；合并到 `master` 后 GitHub Pages 构建成功。
- §2 列出的旧链接全部能打开。
- `sloplint --render` 在 8 种屏宽下检查首页、`/publications/` 和一篇论文页：首页没有 Floor 级问题；论文页和 `/news/` 是阅读页，"一屏词数"这一条按阅读页豁免并写明理由，其他 Floor 级问题照样不能有。Reflex 级问题要么修掉，要么写明理由。
- 手机宽度（375px）没有横向滚动，首屏控件可用。
- 亮色和暗色下对比度都达到 WCAG AA。
- 首屏模拟：拖到 10 台以上或切换到 `In bursts`，等待比例明显上升；reduced-motion 和无 JS 两种情况都能正常显示。
- 页面上没有任何模型结果，也没有导师姓名。

## 8. 交给实现方决定

- 模拟参数和动画细节、SVG 还是 canvas。
- 首屏文案的最终措辞（在 §6.3 的方向和反目标之内）。
- 首页各区块的具体间距和栅格（遵守 hallmark `layout.md`）。
- Docker 预览的具体配置（仓库里已有 `Dockerfile` / `docker-compose.yaml`，本机装有 Docker 和 colima）。
