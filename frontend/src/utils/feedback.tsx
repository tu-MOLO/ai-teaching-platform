import { useEffect } from 'react'
import * as antdStatic from 'antd'

type MessageApi = typeof import('antd').message
type ModalApi = Pick<
  typeof import('antd').Modal,
  'confirm' | 'info' | 'success' | 'error' | 'warning'
>

let contextMessage: MessageApi | null = null
let contextModal: ModalApi | null = null

const noop = () => undefined

/**
 * antd v5 的静态 `message.xxx()` / `Modal.confirm()` 运行在独立的全局 holder
 * 上，不能消费 ConfigProvider / App 上下文，在部分运行时环境下不会渲染出
 * 提示或弹窗。应用挂载后由 <MessageBridge/> 注入 antd `App.useApp()` 的实例
 * （在主 React 树内渲染、可正常显示并继承主题）；在注入完成前（如单测、
 * 启动极早期）回退到 antd 静态方法。
 *
 * 静态实例通过命名空间对象在调用时惰性读取，避免在模块顶层对 antd 具名导出
 * 求值——单测里的 `vi.mock('antd')` 往往只提供部分导出，顶层具名解构会直接
 * 抛错；命名空间访问缺失成员得到 undefined，此时回退为 noop，保证不崩。
 */
function makeProxy<T>(
  getContext: () => T | null,
  getStatic: () => Record<string, unknown> | undefined
): T {
  return new Proxy(
    {},
    {
      get(_target, prop: string) {
        let api: Record<string, unknown> | null | undefined = null
        const ctx = getContext()
        if (ctx) {
          api = ctx as unknown as Record<string, unknown>
        } else {
          try {
            api = getStatic()
          } catch {
            api = null
          }
        }
        const value = api ? api[prop] : undefined
        if (typeof value === 'function') {
          return (value as (...args: unknown[]) => unknown).bind(api)
        }
        return value === undefined ? noop : value
      },
    }
  ) as unknown as T
}

export const message = makeProxy<MessageApi>(
  () => contextMessage,
  () => antdStatic.message as unknown as Record<string, unknown> | undefined
)

export const modal = makeProxy<ModalApi>(
  () => contextModal,
  () => antdStatic.Modal as unknown as Record<string, unknown> | undefined
)

/** 在 antd <App> 内部挂载，把上下文实例注入上面的代理对象。 */
export function MessageBridge(): null {
  const { message: ctxMessage, modal: ctxModal } = (
    antdStatic as unknown as {
      App: { useApp: () => { message: MessageApi; modal: ModalApi } }
    }
  ).App.useApp()
  useEffect(() => {
    contextMessage = ctxMessage
    contextModal = ctxModal
  }, [ctxMessage, ctxModal])
  return null
}
