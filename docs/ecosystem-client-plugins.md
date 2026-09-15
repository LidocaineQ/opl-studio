# DSH 通用客户端插件

Studio 的通用能力优先复用 DSH 官方及社区插件。OPL 保留 Codex 对话、文件访问授权及 Framework/App 状态桥；第三方插件负责界面与格式呈现，不另建会话、模型、凭据或 Package 管理器。

当前载体包含：

| 插件 | 固定版本与来源 | 使用方式 |
| --- | --- | --- |
| DSH Client Modules | 与 Studio DSH cohort 同步，MIT | 直接使用官方 `createClientModuleSystem` 装载客户端 factory，React 由 Studio 单实例提供 |
| DSH FilesBody | 与 Studio DSH source ref 同步，MIT | 直接复用官方文件树、store 与 face；通过 canonical thread 文件桥浏览与刷新目录 |
| [dsh-file-viewer](https://github.com/liguobao/dsh-file-viewer) | npm 0.3.3，MIT | 使用未修改的浏览器构建及公开 `registerContentProvider`；Markdown、CSV、图片、PDF 等格式由社区插件呈现 |
| [dsh-settings-search](https://github.com/objectivex666/dsh-settings-search) | npm 1.2.0，GPL-3.0 | 使用仅依赖 slots/locale 的本地设置搜索；查询设置页与已渲染选项 |

设置搜索选择 1.2.0 是明确的功能范围选择。核对的 1.9.0 增加独立模型设置、API Key 存储与直连推理；Studio 尚未提供与唯一模型/凭据 owner 一致的适配，因此不装载那些功能。搜索插件本身及许可证随载体保留，未复制改写其实现。

文件查看器 0.3.3 发布包的可选 DSH peer 范围不接纳 `0.1.6-alpha.1` 预发布版本。Studio 没有覆盖 peer 或假称完整 Node 插件兼容：仅从固定 npm 原包提取未经修改的浏览器文件，保留 npm SRI、逐文件 SHA-256、原 package.json 和许可证；不加载其 Host 半部。同步入口为 `node scripts/ecosystem-client-assets.mjs --sync`，无参数执行字节验证。生成文件位于 `packages/opl-studio-ecosystem/dsh-file-viewer`。

`EcosystemFilePreview` 把插件的 `conversation.view` 接到现有文件面板。`ecosystemWorkspaceProvider` 只识别绑定当前 canonical thread 的 `opl-workspace://` locator；实际目录与字节读取仍经原 workspace bridge，复用 cwd、路径和符号链接校验。插件需要的大窗口由适配器拆成最多 512 KiB 的读取，不引入通用任意路径 RPC。原有外部打开及下载继续可用。

加载器使用显式审阅的随包客户端列表。它不自动扫描、安装或激活任意外部 npm 包，也不替代 Framework 管理的 OPL Package 图。后续插件应先核对许可证、真实注入依赖和 owner 边界，再加入载体并验证真实界面。

客户端静态构建从 `ecosystem/` 加载；`plugins/` 路由由 DSH Host 的插件服务占用。Web 复用已有 ClientModuleSystem，Desktop 仅在需要时初始化官方模块运行时。

社区检索也确认 [AKS1st/dock-git](https://github.com/AKS1st/dock-git) 提供 Git 历史、差异、暂存、提交、推送和分支功能，采用 MIT。它依赖 `dock-base` 的工作台布局和另一组 Cordis/React peer，目前保留为可选适配候选，尚未集成或完成 Studio 运行验收。Git 不需要由 OPL 从头开发，但包存在与可直接安装是两个不同结论。

验证覆盖 workspace provider 的二进制窗口、跨任务/越界拒绝、取消、响应一致性与符号链接。整页 WebUI 在隔离工作区确认官方文件树、社区 Markdown/CSV、PNG 图片和单页 PDF 实际渲染，PDF canvas 非空；浏览器下载与源文件逐字节一致。设置搜索完成更新、诊断和字号跳转，聊天文本和图片附件完成模拟 turn。独立 Markdown 样本还验证了脚本未执行。这些是本地源码运行证据，不替代安装包或发布验收。

## DSH sandbox reuse boundary

At the pinned `0.1.6-alpha.1` source, `dsh-sandbox` defines subprocess
confinement and per-call escalation; `dsh-sandbox-local` supplies platform
backends (macOS Seatbelt, Linux bubblewrap/Landlock, Windows restricted tokens).
These share the host kernel/filesystem and do not replace a container or VM.
Backend availability and full/partial enforcement must be reported as facts.

Studio explicitly packages the sandbox and sandbox-policy peer modules needed
by the DSH cohort. Its Host profile does not mount a sandbox provider or a
second session policy store. Installing the modules does not confine plugins.

The useful next integration is bounded DSH plugin subprocess/file work. Codex
execution remains under App Server sandbox/approval ownership, and Framework
Package/runtime work remains under Framework ownership. An in-process plugin
can access Node APIs directly; only operations routed through a confined
executor receive this protection.

Before enabling a provider, bind each MCP tool call to its canonical thread,
workspace and allowed mode. The current DshToolMcp passes call ID, tool arguments
and cancellation only; an MCP session ID is not a Codex thread identity. Never
infer the workspace from the last selected UI thread or use a global writable
fallback. Resolve escalation through the existing approval owner, scoped to the
single call; do not load the DSH session-backed policy writer as a second store.

Acceptance should prove read-only denial, workspace write success, outside-path
and symlink denial, child-process confinement, cancellation, denied escalation,
and fail-closed unavailable backend behavior. Do not advertise this as active
sandbox enforcement until those tests run against the actual packaged carrier.

Sources: [sandbox contract](https://github.com/deepseek-ai/deepseek-harness/tree/0a15e36e7f82b6ed45af6fa9759f29b40dcd965d/packages/sandbox/sandbox),
[local provider](https://github.com/deepseek-ai/deepseek-harness/tree/0a15e36e7f82b6ed45af6fa9759f29b40dcd965d/packages/sandbox/sandbox-local),
[policy owner](https://github.com/deepseek-ai/deepseek-harness/tree/0a15e36e7f82b6ed45af6fa9759f29b40dcd965d/packages/sandbox/sandbox-policy).

## 计划任务、记忆与数据管理

通用基础组件优先采用固定 DSH cohort 的官方实现。新增面板复用官方
`Button` 和 Settings slot 的 `close` 回调；任务、记忆和清理经现有
`opl-framework-bridge` 读取 `workbench_services` 并派发
`package_contribution_execute`，不新增 renderer RPC、数据库或调度循环。

| 能力 | 实现插件 / owner | 入口与真实范围 |
| --- | --- | --- |
| 用户计划任务 | Framework `opl-workbench-services`；Temporal 官方 SDK / 服务 | Settings → 运行与维护 → 服务状态：单次、每日、每周、间隔，时区、编辑、暂停、恢复、删除、立即运行；Temporal history 保存结果引用 |
| 计划执行 | `opl-codex-native` 的现有 transport | 每次运行新建 canonical thread，显式只读或工作区写权限；结果打开成功后关闭 Settings，失败保留原页面 |
| Memory | Framework `opl-workbench-services` → 当前 `CODEX_HOME/memories` | Settings → 智能体与能力 → 指令：查看现有 Markdown，新增、修改、删除用户纠错建议；主记忆只读，建议交给原记忆系统处理 |
| 领域记忆引用 | Framework `app_operator_drilldown.ref_family_refs.memory_refs` | 同页按需读取；兼容实际包裹层。没有 refs 不等于没有记忆能力 |
| 数据管理 | Framework `opl-workbench-services` 与已有 Package/WebUI inventory | Settings → 工作区 → 数据与存储：App/Codex/Framework 只读用量，所属服务声明的过期日志可预览并清理；不删除源码、产物、凭据、会话或记忆 |

官方 [`dsh-schedule`](https://github.com/deepseek-ai/deepseek-harness/tree/0a15e36e7f82b6ed45af6fa9759f29b40dcd965d/packages/schedule/schedule)
及 [`ui-schedule`](https://github.com/deepseek-ai/deepseek-harness/tree/0a15e36e7f82b6ed45af6fa9759f29b40dcd965d/packages/client/ui-schedule)
在当前固定版本提供会话内提醒和只读提醒目录，执行依赖 DSH root Agent/session。
Studio 的计划任务需要 canonical Codex thread 和持久运行历史，因此不装载第二套
DSH session 来迁就此插件。`cofy-x/dsh-cron`、`squirrel20/dsh-cron` 和
`Whale-Zhang/dsh-cron-tasks` 的后端同样依赖 DSH Agent/session；其整套后端不采用。
这里的 OPL 插件填补适配缺口，调度服务、SDK 和持久状态仍复用已有 Temporal。

计划任务队列按机器和 canonical Codex home 隔离。删除会在 Temporal 中停用并隐藏
任务定义，保留历史；运行中任务不会因删除定义而消失。重叠执行跳过，服务停机
补偿窗口一分钟；App 未运行导致排队超过五分钟的启动跳过。App 需要保持运行，
最小化可继续，退出后不承诺执行。日历采用 IANA 时区和 Temporal 的夏令时语义。
预览有效期五分钟，执行必须匹配原输入并明确确认；同一任务的管理操作由 Temporal workflow 串行化，并复核 revision。

这些能力需要 Framework 的公开 `./cordis-profiles` 导出
`startCordisWorkbenchServicesHost`。旧 Framework 会得到明确的升级提示，普通聊天
不被阻塞；源码接入不代表已发布载体自动具备新导出。测试入口和证据层级见
[Verification](verification.md)，安装包仍须绑定相应 Framework 版本再验收。
