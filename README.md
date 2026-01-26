# 忆栈MemoryStack - 你的工作第二大脑

一个本地优先、隐私至上的项目与联系人管理桌面应用。

## 功能特性

- **项目管理**：创建、编辑和管理项目，支持活动管理和甘特图导出
- **联系人管理**：管理联系人信息，支持职位、单位、多电话、标签、备注
- **事件记录**：记录工作事件，支持13种事件类型，自动绑定联系人到项目
- **事件提醒**：设置提醒时间，到时发送系统通知，今日提醒置顶显示
- **工作总结**：自动生成日/周/月/年总结，支持自定义时间范围
- **文件管理**：项目文件存储，支持版本管理和全局搜索
- **多语言支持**：支持中文和英文界面切换
- **本地存储**：所有数据安全存储在本地，保护隐私

## 技术栈

- **前端**：React 19 + TypeScript + Vite
- **后端**：Rust + Tauri 2
- **数据库**：SQLite (rusqlite)

## 运行要求

### 1. Node.js (推荐 v18+)
- 下载：https://nodejs.org/
- 验证：`node --version` 和 `npm --version`

### 2. Rust (最新稳定版)
- 安装：https://www.rust-lang.org/tools/install
- 验证：`rustc --version` 和 `cargo --version`

### 3. 系统依赖

**macOS**：
```bash
xcode-select --install
```

**Linux (Ubuntu/Debian)**：
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
```

**Windows**：
- 安装 [Microsoft Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- 安装 [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

## 快速开始

### 1. 进入项目目录

```bash
cd /path/to/mindmirror
```

### 2. 安装前端依赖

```bash
npm install
```

### 3. 运行开发模式

```bash
npm run tauri dev
```

首次启动会编译 Rust 代码，可能需要几分钟。

### 4. 构建生产版本

```bash
npm run tauri build
```

构建产物位置：
- **macOS**: `src-tauri/target/release/bundle/macos/MindMirror.app`
- **Windows**: `src-tauri/target/release/bundle/msi/`
- **Linux**: `src-tauri/target/release/bundle/deb/` 或 `appimage/`

## 可用命令

```bash
# 开发模式（推荐）
npm run tauri dev

# 构建生产版本
npm run tauri build

# 仅运行前端开发服务器
npm run dev

# 仅构建前端
npm run build

# TypeScript 类型检查
npm run build  # tsc && vite build
```

## 项目结构

```
mindmirror/
├── src/                        # React 前端源码
│   ├── components/             # React 组件
│   │   ├── EventForm.tsx       # 事件表单（创建/编辑）
│   │   ├── EventList.tsx       # 事件列表
│   │   ├── ProjectForm.tsx     # 项目表单（创建/编辑）
│   │   ├── ProjectList.tsx     # 项目列表
│   │   ├── ContactForm.tsx     # 联系人表单（创建/编辑）
│   │   ├── ContactList.tsx     # 联系人列表
│   │   ├── ProjectActivities.tsx   # 活动管理弹窗
│   │   ├── ProjectFiles.tsx    # 文件管理弹窗
│   │   ├── ProjectTimeline.tsx # 项目时间线
│   │   ├── ContactTimeline.tsx # 联系人时间线
│   │   ├── FileSearch.tsx      # 全局文件搜索
│   │   ├── Summary.tsx         # 工作总结
│   │   └── shared/             # 共享组件
│   ├── i18n/                   # 国际化配置
│   │   ├── index.ts            # i18n 入口
│   │   ├── zh.ts               # 中文语言包
│   │   └── en.ts               # 英文语言包
│   ├── styles/                 # 样式主题
│   ├── App.tsx                 # 主应用组件
│   └── main.tsx                # 入口文件
├── src-tauri/                  # Rust 后端源码
│   ├── src/
│   │   ├── main.rs             # Tauri 命令定义
│   │   └── db.rs               # 数据库操作
│   ├── Cargo.toml              # Rust 依赖配置
│   └── tauri.conf.json         # Tauri 配置
├── package.json                # Node.js 依赖配置
├── README.md                   # 本文件
└── FEATURES.md                 # 功能详细说明
```

## 数据存储位置

### 数据库文件
- **macOS**: `~/Library/Application Support/mindmirror/mindmirror_local.db`
- **Windows**: `%APPDATA%\mindmirror\mindmirror_local.db`
- **Linux**: `~/.local/share/mindmirror/mindmirror_local.db`

### 项目文件
- **macOS**: `~/Library/Application Support/mindmirror/project_files/`
- **Windows**: `%APPDATA%\mindmirror\project_files\`
- **Linux**: `~/.local/share/mindmirror/project_files/`

## 常见问题

### 问题：`npm run tauri dev` 报错找不到 Rust

**解决方案**：确保已安装 Rust，并重启终端使环境变量生效。

### 问题：编译 Rust 代码时出错

**解决方案**：
```bash
rustup update
cd src-tauri && cargo clean && cd ..
npm run tauri dev
```

### 问题：数据库连接失败

**解决方案**：确保应用有写入系统应用数据目录的权限。

### 问题：Linux 运行报错缺少 webkit2gtk

**解决方案**：
```bash
sudo apt install libwebkit2gtk-4.1-dev
```

## 推荐 IDE 设置

- [VS Code](https://code.visualstudio.com/)
  - [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) 扩展
  - [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) 扩展
  - [TypeScript Vue Plugin](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin) 扩展

## 许可证

MIT License

---

**注意**：所有数据都存储在本地，不会上传到任何服务器。请定期备份数据库文件和项目文件目录。
