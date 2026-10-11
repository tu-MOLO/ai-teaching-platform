# 贡献指南

感谢关注本项目！欢迎提交 Issue、改进文档或参与代码贡献。

## 提交 Issue

- **Bug**：请提供复现步骤、环境信息与关键日志。
- **功能建议**：请描述具体使用场景与期望行为。
- 可直接使用仓库提供的 Issue 模板。

## Pull Request 流程

1. Fork 仓库，并基于 `main` 创建特性分支：`git checkout -b feature/your-feature`
2. 提交前请确保本地检查全部通过：
   - 后端（`backend/`）：`black --check app tests scripts`、`isort --check app tests scripts`、`flake8 app tests scripts`、`mypy app`、`pytest`
   - 前端（`frontend/`）：`npm run lint`、`npx tsc --noEmit`、`npm run test`、`npm run build`
3. 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/)：`feat: ...`、`fix: ...`、`docs: ...`
4. 为新功能补充测试，并在 PR 中说明改动内容与验证方式。
5. 推送分支并发起 Pull Request。

## 代码规范

- 后端：Black + isort + Flake8 + mypy，类型注解齐全。
- 前端：ESLint + Prettier，TypeScript 严格模式。

## 教育数据与合规特别说明

- 请勿在 Issue、PR 或示例数据中提交任何真实学生的个人信息或可识别数据，演示数据一律虚构。
- 本项目不内置受版权或资质保护的正式评估量表；如需对接外部量表，请确认授权后以可选插件方式提供。
