const IDLE_DELAY = 45_000
const LOGO_MEMORY = 'repitma-logo-taps'
const catDrawing = `<svg viewBox="0 0 130 90" aria-hidden="true"><ellipse cx="66" cy="79" rx="53" ry="6" fill="#38453e18"/><g class="egg-cat-body"><path d="M99 69C135 74 121 33 104 48" fill="none" stroke="#bc8060" stroke-width="12" stroke-linecap="round"/><ellipse cx="72" cy="62" rx="38" ry="23" fill="#d8aa80"/><path d="M24 57 20 29 39 39 56 30 62 57" fill="#d8aa80" stroke="#bc8060" stroke-width="2" stroke-linejoin="round"/><path d="m25 37 3 13 7-8m18-4-6 5 7 6" fill="#e8b3a2"/><ellipse cx="41" cy="60" rx="25" ry="20" fill="#dfb88f"/><g class="egg-cat-eyes" fill="none" stroke="#5c493b" stroke-width="2.4" stroke-linecap="round"><path d="M27 57q5 5 10 0m9 0q5 5 10 0"/></g><path d="m38 63 4 3 4-3" fill="#bc8060"/><path d="m22 65-12-2m13 7-12 2m45-7 12-2m-13 7 12 2" stroke="#8e7057" stroke-width="1.5" stroke-linecap="round"/><path d="M72 43q-5 6-3 10m13-7q-4 6-2 11" fill="none" stroke="#bc8060" stroke-width="3" stroke-linecap="round"/></g></svg>`
const gooseDrawing = `<svg viewBox="0 0 110 110" aria-hidden="true"><path d="m41 92-7 10h16m17-10 4 10h13" fill="none" stroke="#d98639" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M31 85C8 72 18 53 39 54L53 59 59 29C59 7 87 8 88 29L87 55C90 82 65 101 31 85Z" fill="#fffdf5" stroke="#7c8d81" stroke-width="2.5"/><path class="egg-goose-wing" d="M52 61C19 36 10 45 33 70q13 12 24 4" fill="#e8eee6" stroke="#7c8d81" stroke-width="2.5" stroke-linejoin="round"/><path d="m85 31 22 8-22 9" fill="#e7a04a" stroke="#b97531" stroke-width="2" stroke-linejoin="round"/><circle cx="77" cy="29" r="3" fill="#38453e"/><path d="m71 20 11 3" stroke="#38453e" stroke-width="3" stroke-linecap="round"/></svg>`

export interface TapSequence { count: number; last: number }
export function nextTap(previous: TapSequence, now: number, required: number): TapSequence & { triggered: boolean } {
  const count = now >= previous.last && now - previous.last <= 1600 ? previous.count + 1 : 1
  return { count: count >= required ? 0 : count, last: now, triggered: count >= required }
}

export function mountEasterEggs(): void {
  if (document.querySelector('.easter-eggs')) return
  const layer = document.createElement('div')
  layer.className = 'easter-eggs'
  document.body.append(layer)
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let idleTimer = 0
  let catTimer = 0
  let gooseTimer = 0
  let rainTimer = 0
  let frame = 0
  let cat: HTMLButtonElement | null = null
  let goose: HTMLElement | null = null
  let rain: HTMLElement | null = null
  let gooseControls: HTMLElement | null = null
  let logoTaps: TapSequence = { count: 0, last: 0 }
  let footerTaps: TapSequence = { count: 0, last: 0 }
  let pointer = { x: innerWidth / 2, y: innerHeight / 2 }

  function removeCat(): void {
    window.clearTimeout(catTimer)
    cat?.remove()
    cat = null
  }

  function hideGoose(): void {
    window.cancelAnimationFrame(frame)
    window.clearTimeout(gooseTimer)
    goose?.remove()
    gooseControls?.remove()
    goose = null
    gooseControls = null
  }

  function hideRain(): void {
    window.clearTimeout(rainTimer)
    rain?.remove()
    rain = null
  }

  function planNap(): void {
    window.clearTimeout(idleTimer)
    if (document.hidden) return
    idleTimer = window.setTimeout(() => {
      if (goose || document.querySelector('dialog[open]') || document.activeElement?.matches('input, textarea, select, [contenteditable="true"]')) {
        planNap()
        return
      }
      if (cat) return
      cat = document.createElement('button')
      cat.type = 'button'
      cat.className = 'egg-cat'
      cat.setAttribute('aria-label', 'Погладить спящего кота')
      cat.title = 'Тихо… кот уснул. Можно погладить!'
      cat.innerHTML = `${catDrawing}<span class="egg-cat-dream" aria-hidden="true">z z Z</span>`
      cat.addEventListener('click', () => {
        if (!cat || cat.classList.contains('is-awake')) return
        cat.classList.add('is-awake')
        cat.setAttribute('aria-label', 'Кот мурчит')
        cat.querySelector('.egg-cat-dream')!.textContent = 'Мур ♥'
        catTimer = window.setTimeout(removeCat, 2200)
        planNap()
      })
      layer.append(cat)
    }, IDLE_DELAY)
  }

  function showGoose(): void {
    hideGoose()
    removeCat()
    goose = document.createElement('div')
    goose.className = 'egg-goose'
    goose.setAttribute('aria-hidden', 'true')
    goose.innerHTML = gooseDrawing
    gooseControls = document.createElement('div')
    gooseControls.className = 'egg-goose-controls'
    gooseControls.innerHTML = '<button type="button" aria-label="Отпустить гуся">✕</button>'
    gooseControls.querySelector('button')!.addEventListener('click', () => { hideGoose(); planNap() })
    layer.append(goose, gooseControls)
    let x = Math.max(0, innerWidth - 120)
    let y = Math.max(0, innerHeight - 155)
    let lastFrame = 0
    let direction = -1
    function chase(now: number): void {
      if (!goose) return
      const dt = lastFrame ? Math.min((now - lastFrame) / 1000, .05) : 0
      lastFrame = now
      const maxX = Math.max(0, innerWidth - 100)
      const maxY = Math.max(0, innerHeight - 110)
      const targetX = Math.max(0, Math.min(maxX, pointer.x - 50))
      const targetY = Math.max(0, Math.min(maxY, pointer.y - 50))
      const dx = targetX - x
      const dy = targetY - y
      const distance = Math.hypot(dx, dy)
      if (Math.abs(dx) > 3) direction = dx > 0 ? 1 : -1
      if (!reducedMotion.matches && distance > 12) {
        const step = Math.min(distance, dt * 190)
        x += dx / distance * step
        y += dy / distance * step
      }
      x = Math.max(0, Math.min(maxX, x))
      y = Math.max(0, Math.min(maxY, y))
      goose.style.transform = `translate3d(${x}px, ${y}px, 0)`
      goose.style.setProperty('--goose-direction', String(direction))
      goose.classList.toggle('is-fighting', distance < 65)
      frame = window.requestAnimationFrame(chase)
    }
    frame = window.requestAnimationFrame(chase)
    gooseTimer = window.setTimeout(() => { hideGoose(); planNap() }, 25_000)
  }

  function mathRain(): void {
    hideRain()
    rain = document.createElement('div')
    rain.className = 'egg-math-rain'
    rain.setAttribute('aria-hidden', 'true')
    const symbols = ['π', '∞', '∑', '√', 'x²', '42', '♥', '≈']
    for (let i = 0; i < 24; i++) {
      const symbol = document.createElement('span')
      symbol.textContent = symbols[i % symbols.length]
      symbol.style.setProperty('--left', `${3 + Math.random() * 91}%`)
      symbol.style.setProperty('--delay', `${Math.random() * 1.5}s`)
      symbol.style.setProperty('--tilt', `${Math.random() * 100 - 50}deg`)
      symbol.style.setProperty('--color', ['#2d604e', '#d9785f', '#9a741f', '#577aac'][i % 4])
      rain.append(symbol)
    }
    layer.append(rain)
    rainTimer = window.setTimeout(hideRain, 5000)
  }

  document.addEventListener('click', event => {
    if (!(event.target instanceof Element) || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    const logo = event.target.closest<HTMLAnchorElement>('.site-header .logo, footer .logo')
    if (logo) {
      try {
        const saved: unknown = JSON.parse(sessionStorage.getItem(LOGO_MEMORY) || 'null')
        if (saved && typeof saved === 'object' && 'count' in saved && 'last' in saved && typeof saved.count === 'number' && saved.count >= 0 && saved.count < 5 && typeof saved.last === 'number') logoTaps = { count: saved.count, last: saved.last }
      } catch { /* A blocked storage must not affect the normal logo link. */ }
      const taps = nextTap(logoTaps, Date.now(), 5)
      logoTaps = { count: taps.count, last: taps.last }
      try { sessionStorage.setItem(LOGO_MEMORY, JSON.stringify(logoTaps)) } catch { /* Session-only fallback. */ }
      if (taps.triggered) {
        event.preventDefault()
        showGoose()
      } else if (location.pathname === '/') {
        event.preventDefault()
        if (taps.count === 1) window.scrollTo({ top: 0, behavior: 'auto' })
      }
    }
    if (event.target.closest('[data-math-party]')) {
      const taps = nextTap(footerTaps, Date.now(), 3)
      footerTaps = { count: taps.count, last: taps.last }
      if (taps.triggered) mathRain()
    }
  })
  document.addEventListener('pointermove', event => { pointer = { x: event.clientX, y: event.clientY }; planNap() }, { passive: true })
  document.addEventListener('pointerdown', event => {
    pointer = { x: event.clientX, y: event.clientY }
    if (!(event.target instanceof Element) || !event.target.closest('.egg-cat')) removeCat()
    planNap()
  }, { passive: true })
  document.addEventListener('keydown', planNap)
  window.addEventListener('scroll', () => { removeCat(); planNap() }, { passive: true })
  const rest = () => { window.clearTimeout(idleTimer); removeCat(); hideGoose(); hideRain() }
  document.addEventListener('visibilitychange', () => { if (document.hidden) rest(); else planNap() })
  window.addEventListener('pagehide', rest)
  window.addEventListener('pageshow', planNap)
  planNap()
}
