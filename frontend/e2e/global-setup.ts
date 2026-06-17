/**
 * E2E 测试全局 Setup
 * 在所有测试开始前执行，等待后端和前端服务就绪，并初始化下拉选项数据
 */
async function globalSetup(): Promise<void> {
  console.log("[global-setup] 开始 E2E 测试环境准备...");

  const backendUrl = "http://localhost:8000/health";
  const frontendUrl = "http://localhost:5173/";
  const backendTimeoutMs = 60_000;
  const frontendTimeoutMs = 30_000;
  const pollIntervalMs = 2_000;

  // 等待后端健康检查通过
  console.log(`[global-setup] 等待后端就绪: ${backendUrl}`);
  await waitForService(backendUrl, backendTimeoutMs, pollIntervalMs, "后端");

  // 等待前端可访问
  console.log(`[global-setup] 等待前端就绪: ${frontendUrl}`);
  await waitForService(frontendUrl, frontendTimeoutMs, pollIntervalMs, "前端");

  // 初始化下拉选项数据（ConfigurableSelect 需要这些选项才能工作）
  console.log("[global-setup] 初始化下拉选项数据...");
  await seedDropdownOptions();

  console.log("[global-setup] E2E 测试环境准备完成！");
}

/**
 * 通过 API 创建默认下拉选项
 * 这确保了 ConfigurableSelect 组件有可选的数据
 */
async function seedDropdownOptions(): Promise<void> {
  const baseUrl = "http://localhost:8000";
  const defaults: Record<string, Array<[string, string]>> = {
    student_gender: [["男", "male"], ["女", "female"]],
    student_grade: [
      ["培智一年级", "培智一年级"],
      ["培智二年级", "培智二年级"],
      ["培智三年级", "培智三年级"],
      ["培智四年级", "培智四年级"],
      ["培智五年级", "培智五年级"],
      ["培智六年级", "培智六年级"],
    ],
    student_class: [["1班", "1班"], ["2班", "2班"], ["3班", "3班"]],
    student_status: [["在读", "active"], ["已离校", "inactive"]],
    course_subject: [
      ["语文", "语文"],
      ["数学", "数学"],
      ["英语", "英语"],
      ["美术", "美术"],
      ["音乐", "音乐"],
      ["体育", "体育"],
      ["生活适应", "生活适应"],
      ["语言训练", "语言训练"],
    ],
    course_grade: [
      ["培智一年级", "培智一年级"],
      ["培智二年级", "培智二年级"],
      ["培智三年级", "培智三年级"],
      ["培智四年级", "培智四年级"],
      ["培智五年级", "培智五年级"],
      ["培智六年级", "培智六年级"],
    ],
    course_status: [["进行中", "active"], ["已结束", "inactive"]],
    lesson_plan_subject: [
      ["语文", "语文"],
      ["数学", "数学"],
      ["美术", "美术"],
      ["音乐", "音乐"],
      ["体育", "体育"],
      ["生活适应", "生活适应"],
    ],
    lesson_plan_grade: [
      ["培智一年级", "培智一年级"],
      ["培智二年级", "培智二年级"],
      ["培智三年级", "培智三年级"],
      ["培智四年级", "培智四年级"],
      ["培智五年级", "培智五年级"],
      ["培智六年级", "培智六年级"],
    ],
    portfolio_record_type: [
      ["作品", "work"],
      ["评价", "evaluation"],
      ["观察记录", "observation"],
      ["里程碑", "milestone"],
    ],
    resource_tag: [
      ["教案", "教案"],
      ["视频", "视频"],
      ["图片", "图片"],
      ["文档", "文档"],
      ["模板", "模板"],
      ["培智教育", "培智教育"],
      ["生活技能", "生活技能"],
      ["认知训练", "认知训练"],
    ],
  };

  // Step 1: Login as teacher to get token
  const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "teacher",
      password: "Teacher@Local2026!",
    }),
  });

  if (!loginRes.ok) {
    console.error("[global-setup] 登录失败，无法初始化下拉选项");
    return;
  }

  const loginBody = await loginRes.json();
  console.log("[global-setup] 登录响应:", JSON.stringify(loginBody).slice(0, 200));
  // Backend LoginResponse shape: { token: { access_token: '...', ... }, user: {...} }
  // Also handle DataResponse wrapper: { data: { token: {...} } }
  const token =
    loginBody?.token?.access_token ||
    loginBody?.data?.token?.access_token ||
    loginBody?.data?.access_token ||
    loginBody?.access_token ||
    "";
  console.log("[global-setup] Token found:", token ? "yes" : "no");
  if (!token) {
    console.error("[global-setup] 未获取到 token，无法初始化下拉选项");
    return;
  }

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // Step 2: Create options for each group (skip if already exists)
  for (const [groupKey, items] of Object.entries(defaults)) {
    // Check existing options
    const listRes = await fetch(
      `${baseUrl}/api/v1/dropdown-options?group_key=${groupKey}&active_only=false`,
      { headers: authHeaders }
    );
    if (!listRes.ok) continue;
    const listBody = await listRes.json();
    const existingItems = listBody?.data || listBody?.items || [];

    // 清除与目标值不匹配的旧选项（确保 seed 值始终正确）
    const targetValues = new Set(items.map(([, value]) => value));
    for (const item of existingItems) {
      const value = item.value || item.data?.value;
      if (value && !targetValues.has(value)) {
        const id = item.id || item.data?.id;
        if (id) {
          await fetch(`${baseUrl}/api/v1/dropdown-options/${id}`, {
            method: "DELETE",
            headers: authHeaders,
          }).catch(() => {});
          console.log(`[global-setup] 删除旧选项 ${groupKey}: ${item.label} (value=${value})`);
        }
      }
    }

    // 重新计算现有选项（删除后）
    const refreshRes = await fetch(
      `${baseUrl}/api/v1/dropdown-options?group_key=${groupKey}&active_only=false`,
      { headers: authHeaders }
    );
    const refreshBody = refreshRes.ok ? await refreshRes.json() : listBody;
    const refreshedItems = refreshBody?.data || refreshBody?.items || [];
    const existingValues = new Set(
      refreshedItems.map((item: any) => item.value)
    );

    for (const [label, value] of items) {
      if (existingValues.has(value)) continue;

      const createRes = await fetch(`${baseUrl}/api/v1/dropdown-options`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          group_key: groupKey,
          label,
          value,
          sort_order: refreshedItems.length,
          is_active: true,
        }),
      });

      if (createRes.ok) {
        console.log(`[global-setup] 创建选项 ${groupKey}: ${label}=${value}`);
      }
    }
  }
}

async function waitForService(
  url: string,
  timeoutMs: number,
  intervalMs: number,
  name: string
): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`[global-setup] ${name} 已就绪 (${Date.now() - start}ms)`);
        return;
      }
    } catch {
      // 服务尚未就绪，静默重试
    }

    await sleep(intervalMs);
  }

  throw new Error(
    `[global-setup] ${name} 在 ${timeoutMs / 1000}s 内未能就绪，请确认本地服务已启动 (后端: http://localhost:8000, 前端: http://localhost:5173)`
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default globalSetup;
