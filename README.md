# My Cookbook / 我的菜谱

个人菜谱管理应用，用来收集、整理和查看自己的菜谱。项目包含 React 前端、Express API、SQLite 本地数据库，并支持从平台链接解析菜谱内容。

A personal cookbook app for collecting, organizing, and viewing recipes. It includes a React frontend, an Express API, a local SQLite database, and recipe parsing workflows for supported platform links.

## Features / 功能

- 菜谱列表、搜索、标签筛选、分页和详情页。
- 手动创建菜谱，支持封面上传、标签、简介、食材和步骤富文本编辑。
- 支持从抖音和小红书相关流程解析菜谱内容，并将结构化结果带入创建页面。
- 本地 SQLite 存储菜谱数据，菜谱图片保存在 `src/assets/recipes`。
- Includes Vitest coverage for API behavior, parsing services, and key UI flows.

## Tech Stack / 技术栈

- Frontend: React 19, React Router, Vite, TypeScript, Tailwind CSS, TipTap
- Backend: Express 5, better-sqlite3
- Tooling: Vitest, Testing Library, tsx, concurrently
- Storage: local SQLite database in `data.db`

## Quick Start / 快速开始

```bash
npm install
npm run dev
```

默认开发地址：

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`

Vite 会把 `/api` 和 `/assets/recipes` 代理到后端服务。

Default development URLs:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`

Vite proxies `/api` and `/assets/recipes` to the backend server.

## Scripts / 脚本

- `npm run dev`: 同时启动前端、后端和小红书 downloader 开发服务。
- `npm run dev:client`: 启动 Vite 前端。
- `npm run dev:server`: 启动 Express API。
- `npm run dev:xhs-downloader`: 启动小红书 downloader 开发辅助服务。
- `npm run seed:recipes`: 写入示例菜谱数据。
- `npm run build`: 运行 TypeScript 检查并构建前端产物。
- `npm run test`: 运行 Vitest 测试。
- `npm run preview`: 预览 Vite 构建产物。

## Environment / 环境变量

项目会从 `.env` 或当前 shell 环境读取配置。不要提交真实密钥。

The app reads configuration from `.env` or the current shell environment. Do not commit real secrets.

常用变量：

- `ALIYUN_BAILIAN_API_KEY` or `DASHSCOPE_API_KEY`: 阿里云百炼/DashScope API key。
- `ALIYUN_BAILIAN_BASE_URL`: 文本模型 API base URL。
- `ALIYUN_BAILIAN_MODEL`: 菜谱结构化文本模型，默认 `qwen-plus`。
- `ALIYUN_BAILIAN_IMAGE_BASE_URL`: 图片生成 API endpoint。
- `ALIYUN_BAILIAN_IMAGE_MODEL`: 封面图生成模型，默认 `qwen-image-2.0-pro`。
- `ALIYUN_BAILIAN_IMAGE_SIZE`: 生成图片尺寸。
- `ALIYUN_BAILIAN_VIDEO_MODEL`: 视频理解模型。
- `ALIYUN_BAILIAN_VISION_MODEL`: 视觉理解模型。
- `ALIYUN_BAILIAN_RETRY_ATTEMPTS`: 模型请求重试次数。
- `ALIYUN_BAILIAN_RETRY_BASE_DELAY_MS`: 模型请求重试基础延迟。
- `DOUYIN_CLI_PROJECT_ROOT`: 抖音 CLI 项目根目录。
- `DOUYIN_CLI_OUTPUT_DIR`: 抖音 CLI 输出目录。
- `DOUYIN_CLI_PYTHON_COMMAND`: 抖音 CLI 使用的 Python 命令。
- `DOUYIN_CLI_UV_COMMAND`: 抖音 CLI 使用的 uv 命令。
- `DOUYIN_CLI_TIMEOUT_MS`: 抖音 CLI 超时时间。
- `XHS_DOWNLOADER_API_BASE_URL`: 小红书 downloader API 地址。
- `XHS_DOWNLOADER_PROJECT_ROOT`: 小红书 downloader 项目根目录。
- `XHS_DOWNLOADER_COOKIE`: 小红书请求 cookie。
- `XHS_DOWNLOADER_PROXY`: 小红书 downloader 代理。
- `XHS_DOWNLOADER_TIMEOUT_MS`: 小红书 downloader 超时时间。
- `FFMPEG_COMMAND`: ffmpeg 命令路径或名称。

## Data and Generated Files / 数据与生成文件

- `data.db`: 本地 SQLite 数据库，已被 `.gitignore` 忽略。
- `src/assets/recipes`: 菜谱封面和上传图片目录。
- `.douyin-output`: 抖音解析输出目录，已被 `.gitignore` 忽略。
- `.xhs-downloader-dev-status.json`: 小红书 downloader 开发状态文件，已被 `.gitignore` 忽略。
- `dist`, `node_modules`, `.env`, and log files are local-only and ignored.

## Project Structure / 项目结构

```text
src/
  api/                     Express route handlers for recipes and uploads
  app/                     React route definitions
  assets/                  Static images and recipe assets
  components/              Shared UI components
  db/                      SQLite connection and schema initialization
  domain/                  Shared domain rules
  features/parsing/        Platform parsing handlers, services, and providers
  features/recipeStructuring/
                           Model-backed recipe structuring services
  pages/                   Route-level React pages
  scripts/                 Local development and seed scripts
  test/                    Test setup
```

## Development Notes / 开发说明

- 后端固定监听 `3001`，前端开发服务由 Vite 分配，通常是 `5173`。
- 数据库 schema 会在启动后端时自动初始化。
- 新增或修改解析逻辑后，请至少运行 `npm run test`。
- 发布前建议运行 `npm run build`，同时覆盖 TypeScript 检查和 Vite 构建。

