// 移动端系统返回手势（安卓两侧内滑 / iOS 侧滑 / 浏览器返回）拦截：
// 弹层打开时压入 history 哨兵，返回手势触发 popstate 只关闭最上层弹层，
// 而不是退出当前路由。
//
// 模型：stack 与 history 哨兵一一对应（每开一层弹层 pushState 一次），
// 手势返回 = 消费一个哨兵关一层弹层，**popstate 内不做任何 pushState 补偿**。
// 原因：Edge / Chromium 移动端的返回手势带过渡动画，popstate 中同步 pushState
// 会打断动画并闪现上一条目的旧快照（表现为「闪一下上一篇文档/底层页面」）。
let stack = []
// UI 主动关闭时 back() 会同步派发一次 popstate，置位后跳过该次（否则会误关下一层弹层）
let suppressNextPop = false

const onPop = () => {
  if (suppressNextPop) {
    suppressNextPop = false
    return
  }
  const top = stack.pop()
  try {
    top?.()
  } catch (e) {
    // 单个弹层关闭异常不影响其余栈
  }
  suppressGhostClick()
}

// 系统返回手势后，浏览器可能向手势结束位置派发合成「幽灵 click」，
// 落在弹层可点元素上会误触（如点开列表里另一篇文档的阅读器）。
// 返回关闭弹层后的短窗口内，在捕获阶段吞掉所有 click。
const suppressGhostClick = () => {
  const swallow = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }
  document.addEventListener('click', swallow, { capture: true })
  setTimeout(() => {
    document.removeEventListener('click', swallow, { capture: true })
  }, 450)
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', onPop)
}

export const backGuardOpen = (onClose) => {
  stack.push(onClose)
  history.pushState({ backGuard: stack.length }, '')
}

// UI 主动关闭（点 X / 返回箭头等）时从栈移除，并消费对应哨兵保持栈与 history 对齐
export const backGuardClose = (onClose) => {
  const i = stack.indexOf(onClose)
  if (i < 0) return
  stack.splice(i, 1)
  suppressNextPop = true
  history.back()
}

import { watch } from 'vue'

// 响应式便捷封装：isOpen 变 true 压哨兵、变 false 收哨兵
export const useBackGuard = (isOpen, onClose) => {
  watch(isOpen, (open) => {
    if (open) backGuardOpen(onClose)
    else backGuardClose(onClose)
  })
}
