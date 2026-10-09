import { useEffect, useState } from 'react'

/**
 * 返回一个延迟更新的值，常用于搜索输入防抖。
 * 输入停止变化 delay 毫秒后，返回值才会更新，避免高频请求。
 */
function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}

export default useDebouncedValue
