<template>
  <div class="fan-root">
    <!-- 全屏毛玻璃：展开渐显；选择/收起后渐隐，露出切换后的页面 -->
    <Transition name="fan-fade">
      <div v-if="open" class="fan-overlay" @pointerdown.stop="close"></div>
    </Transition>

    <!-- 扇形菜单：以屏幕右上角为圆心，沿弧分布在左下扇区 -->
    <Transition name="fan-fade">
      <div v-if="open" class="fan-stage" :style="stageVars">
        <div
          v-for="(item, i) in items"
          :key="item.to"
          class="fan-item"
          :class="{ 'fan-item--active': i === activeIndex }"
          :style="itemStyle(i)"
          @pointerdown.stop.prevent="select(i)"
        >
          <span class="fan-item__orb">
            <v-icon size="26">{{ item.icon }}</v-icon>
          </span>
          <span class="fan-item__label">{{ item.title }}</span>
        </div>
      </div>
    </Transition>

    <!-- 右上角旋钮：触摸展开，旋转选择 -->
    <button
      class="fan-knob"
      :class="{ 'fan-knob--open': open }"
      @pointerdown.prevent="onKnobDown"
      @pointermove="onKnobMove"
      @pointerup="onKnobUp"
      @pointercancel="onKnobUp"
    >
      <span class="fan-knob__ring" :style="{ transform: `rotate(${knobAngle}deg)` }"></span>
      <span class="fan-knob__icon">
        <v-icon size="22">{{ open ? 'mdi-close' : 'mdi-dots-horizontal' }}</v-icon>
      </span>
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const props = defineProps({
  items: { type: Array, required: true } // [{ title, to, icon }]
})

const route = useRoute()
const router = useRouter()

const open = ref(false)
const activeIndex = ref(-1)
const knobAngle = ref(0)

// 扇形几何：圆心 = 旋钮中心（屏幕右上角），角度为屏幕坐标系（0°右 / 90°下 / 180°左）
const ANGLES = [105, 140, 175]
const RADIUS = 128
const KNOB = 52          // 旋钮直径
const OFFSET = 16        // 距屏幕边缘
const center = () => ({
  x: window.innerWidth - OFFSET - KNOB / 2,
  y: OFFSET + KNOB / 2
})

let dragging = false
let rotated = false
let wasOpen = false
let startX = 0
let startY = 0

const stageVars = computed(() => {
  const c = center()
  return { '--fx': `${c.x}px`, '--fy': `${c.y}px` }
})

const itemStyle = (i) => {
  const c = center()
  const rad = (ANGLES[i] * Math.PI) / 180
  return {
    left: `${c.x + RADIUS * Math.cos(rad)}px`,
    top: `${c.y + RADIUS * Math.sin(rad)}px`
  }
}

const openMenu = () => {
  activeIndex.value = -1 // 展开时各项等大，仅划过/旋转指向时才放大确认
  open.value = true
  document.body.style.overflow = 'hidden'
}

const close = () => {
  open.value = false
  knobAngle.value = 0
  document.body.style.overflow = ''
}

const select = (i) => {
  const item = props.items[i]
  close()
  if (item && route.path !== item.to) router.push(item.to)
}

const onKnobDown = (e) => {
  // 合成 PointerEvent（自动化/无障碍工具）没有 active pointer id，捕获失败不影响主流程
  try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ }
  dragging = true
  rotated = false
  wasOpen = open.value
  startX = e.clientX
  startY = e.clientY
  if (!open.value) openMenu()
}

const onKnobMove = (e) => {
  if (!dragging) return
  if (!rotated) {
    if (Math.hypot(e.clientX - startX, e.clientY - startY) < 12) return
    rotated = true
  }
  const c = center()
  const dx = e.clientX - c.x
  const dy = e.clientY - c.y
  // 旋钮刻度环跟随手指
  knobAngle.value = (Math.atan2(dy, dx) * 180) / Math.PI
  // 最近扇形项高亮放大
  const norm = (knobAngle.value + 360) % 360
  let best = 0
  let bd = 999
  ANGLES.forEach((a, i) => {
    let d = Math.abs(norm - a)
    if (d > 180) d = 360 - d
    if (d < bd) { bd = d; best = i }
  })
  activeIndex.value = best
}

const onKnobUp = () => {
  if (!dragging) return
  dragging = false
  if (rotated) {
    if (activeIndex.value >= 0) select(activeIndex.value)
  } else if (wasOpen) {
    // 轻点旋钮切换展开/收起；首次触摸展开后保持，等旋转或点选
    close()
  }
}

const onKeydown = (e) => {
  if (e.key === 'Escape' && open.value) close()
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.fan-root {
  position: fixed;
  inset: 0;
  z-index: 2000;
  pointer-events: none;
}

/* 毛玻璃背景（与 ComposeEditor 背景 blur 22px 同基准） */
.fan-overlay {
  position: absolute;
  inset: 0;
  pointer-events: auto;
  touch-action: none;
  background: rgba(240, 244, 248, 0.55);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
}

.fan-stage {
  position: absolute;
  inset: 0;
  pointer-events: none; /* 菜单项自身再开启，保证点空白处落到 overlay */
}

/* 扇形菜单项：挂载时从旋钮中心弹出（keyframes 覆盖 left/top） */
.fan-item {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  transform: translate(-50%, -50%);
  transform-origin: center;
  transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
  animation: fan-pop 0.42s cubic-bezier(0.3, 1.4, 0.45, 1) backwards;
  pointer-events: auto;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  cursor: pointer;
}
.fan-item:nth-child(2) { animation-delay: 0.03s; }
.fan-item:nth-child(3) { animation-delay: 0.06s; }
@keyframes fan-pop {
  from {
    left: var(--fx);
    top: var(--fy);
    transform: translate(-50%, -50%) scale(0.2);
    opacity: 0;
  }
}
/* 划过/指向时轻微放大——确认感，不做常态大小分级 */
.fan-item--active {
  transform: translate(-50%, -50%) scale(1.08);
}

.fan-item__orb {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.78);
  border: 1.5px solid rgba(207, 216, 222, 0.9);
  box-shadow: 0 4px 14px rgba(38, 50, 66, 0.14);
  color: #546e7a;
  transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease;
}
.fan-item--active .fan-item__orb {
  background: rgba(255, 255, 255, 0.95);
  border-color: #1976d2;
  color: #1976d2;
  box-shadow: 0 6px 22px rgba(25, 118, 210, 0.45);
}

.fan-item__label {
  font-size: 12px;
  font-weight: 600;
  color: #546e7a;
  white-space: nowrap;
  transition: color 0.25s ease;
}
.fan-item--active .fan-item__label {
  color: #1976d2;
}

/* 右上角旋钮 */
.fan-knob {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  padding: 0;
  pointer-events: auto;
  touch-action: none;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 4px 16px rgba(38, 50, 66, 0.22);
  transition: background 0.3s ease, box-shadow 0.3s ease;
}
.fan-knob--open {
  background: rgba(25, 118, 210, 0.92);
  box-shadow: 0 6px 24px rgba(25, 118, 210, 0.5);
}
/* 刻度环：跟随手指旋转，展开时显现 */
.fan-knob__ring {
  position: absolute;
  inset: 5px;
  border-radius: 50%;
  border: 1.5px dashed rgba(84, 110, 122, 0.5);
  opacity: 0;
  transition: opacity 0.3s ease, transform 0.08s linear;
}
.fan-knob--open .fan-knob__ring {
  opacity: 1;
  border-color: rgba(255, 255, 255, 0.85);
}
.fan-knob__icon {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #37474f;
  transition: color 0.3s ease;
}
.fan-knob--open .fan-knob__icon {
  color: #fff;
}

/* 渐显渐隐 */
.fan-fade-enter-active,
.fan-fade-leave-active {
  transition: opacity 0.45s ease;
}
.fan-fade-enter-from,
.fan-fade-leave-to {
  opacity: 0;
}
</style>
