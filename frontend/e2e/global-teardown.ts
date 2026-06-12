/**
 * E2E 测试全局 Teardown
 * 在所有测试结束后执行
 *
 * 测试数据清理由各测试用例通过 api-helper 自行处理，
 * 此文件主要作为未来可能需要的清理逻辑的挂钩点。
 */
async function globalTeardown(): Promise<void> {
  console.log("[global-teardown] E2E 测试环境清理完成。");
}

export default globalTeardown;