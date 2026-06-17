/**
 * E2E 测试全局 Teardown
 * 在所有测试结束后执行，清理测试过程中创建的数据
 */
async function globalTeardown(): Promise<void> {
  console.log("[global-teardown] 开始清理 E2E 测试数据...");

  const baseUrl = "http://localhost:8000";

  try {
    // Step 1: Login to get token
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "teacher",
        password: "Teacher@Local2026!",
      }),
    });

    if (!loginRes.ok) {
      console.log("[global-teardown] 登录失败，跳过数据清理");
      return;
    }

    const loginBody = await loginRes.json();
    const token =
      loginBody?.token?.access_token ||
      loginBody?.data?.token?.access_token ||
      loginBody?.data?.access_token ||
      loginBody?.access_token ||
      "";

    if (!token) {
      console.log("[global-teardown] 未获取到 token，跳过数据清理");
      return;
    }

    const authHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };

    // Step 2: Delete all resources
    try {
      const resourcesRes = await fetch(`${baseUrl}/api/v1/resources?page=1&page_size=100`, {
        headers: authHeaders,
      });
      if (resourcesRes.ok) {
        const resourcesBody = await resourcesRes.json();
        const resources = resourcesBody?.data?.items || resourcesBody?.items || resourcesBody?.data || [];
        for (const resource of resources) {
          const id = resource.id || resource.data?.id;
          if (id) {
            await fetch(`${baseUrl}/api/v1/resources/${id}`, {
              method: "DELETE",
              headers: authHeaders,
            }).catch(() => {});
          }
        }
        console.log(`[global-teardown] 清理了 ${resources.length} 条资源`);
      }
    } catch (e) {
      console.log("[global-teardown] 资源清理失败（可能不存在该API）:", (e as Error).message);
    }

    // Step 3: Delete all lesson plans
    try {
      const plansRes = await fetch(`${baseUrl}/api/v1/lesson-plans?page=1&page_size=100`, {
        headers: authHeaders,
      });
      if (plansRes.ok) {
        const plansBody = await plansRes.json();
        const plans = plansBody?.data?.items || plansBody?.items || plansBody?.data || [];
        for (const plan of plans) {
          const id = plan.id || plan.data?.id;
          if (id) {
            await fetch(`${baseUrl}/api/v1/lesson-plans/${id}`, {
              method: "DELETE",
              headers: authHeaders,
            }).catch(() => {});
          }
        }
        console.log(`[global-teardown] 清理了 ${plans.length} 条教案`);
      }
    } catch (e) {
      console.log("[global-teardown] 教案清理失败（可能不存在该API）:", (e as Error).message);
    }

    // Step 4: Delete all portfolios (dependency of students)
    try {
      const portfoliosRes = await fetch(`${baseUrl}/api/v1/portfolios?page=1&page_size=100`, {
        headers: authHeaders,
      });
      if (portfoliosRes.ok) {
        const portfoliosBody = await portfoliosRes.json();
        const portfolios = portfoliosBody?.data?.items || portfoliosBody?.items || portfoliosBody?.data || [];
        for (const item of portfolios) {
          const id = item.id || item.data?.id;
          if (id) {
            await fetch(`${baseUrl}/api/v1/portfolios/${id}`, {
              method: "DELETE",
              headers: authHeaders,
            }).catch(() => {});
          }
        }
        console.log(`[global-teardown] 清理了 ${portfolios.length} 条档案记录`);
      }
    } catch (e) {
      console.log("[global-teardown] 档案清理失败:", (e as Error).message);
    }

    // Step 5: Delete all students
    try {
      const studentsRes = await fetch(`${baseUrl}/api/v1/students?page=1&page_size=100`, {
        headers: authHeaders,
      });
      if (studentsRes.ok) {
        const studentsBody = await studentsRes.json();
        const students = studentsBody?.data?.items || studentsBody?.items || studentsBody?.data || [];
        for (const student of students) {
          const id = student.id || student.data?.id;
          if (id) {
            await fetch(`${baseUrl}/api/v1/students/${id}`, {
              method: "DELETE",
              headers: authHeaders,
            }).catch(() => {});
          }
        }
        console.log(`[global-teardown] 清理了 ${students.length} 名学生`);
      }
    } catch (e) {
      console.log("[global-teardown] 学生清理失败:", (e as Error).message);
    }

    // Step 6: Delete all courses
    try {
      const coursesRes = await fetch(`${baseUrl}/api/v1/courses?page=1&page_size=100`, {
        headers: authHeaders,
      });
      if (coursesRes.ok) {
        const coursesBody = await coursesRes.json();
        const courses = coursesBody?.data?.items || coursesBody?.items || coursesBody?.data || [];
        for (const course of courses) {
          const id = course.id || course.data?.id;
          if (id) {
            await fetch(`${baseUrl}/api/v1/courses/${id}`, {
              method: "DELETE",
              headers: authHeaders,
            }).catch(() => {});
          }
        }
        console.log(`[global-teardown] 清理了 ${courses.length} 门课程`);
      }
    } catch (e) {
      console.log("[global-teardown] 课程清理失败:", (e as Error).message);
    }

  } catch (e) {
    console.log("[global-teardown] 数据清理过程出现异常:", (e as Error).message);
  }

  console.log("[global-teardown] E2E 测试环境清理完成。");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default globalTeardown;
