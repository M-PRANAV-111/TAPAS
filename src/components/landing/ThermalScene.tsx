'use client'

import { useEffect, useId, useRef, useState, type CSSProperties } from 'react'
import type { EntryRole } from './roles'
import styles from './ThermalScene.module.css'

const TERRAIN = 'M119 362 203 312 278 330 351 275 455 291 527 248 645 278 685 313 797 321 874 382 857 451 781 475 733 530 610 551 531 524 419 567 338 526 241 529 178 480 101 455 128 405 91 385Z'

// A deliberately fictional terrain: fixed geometry keeps the scene identical
// across server rendering, role changes and the separate login route.
function contour(rx: number, ry: number, phase = 0) {
  return Array.from({ length: 81 }, (_, index) => {
    const a = index / 80 * Math.PI * 2
    const ripple = 1 + Math.sin(a * 3 + phase) * .12 + Math.cos(a * 5 - phase) * .055
    const x = 486 + Math.cos(a) * rx * ripple
    const y = 426 + Math.sin(a) * ry * ripple
    return (index === 0 ? 'M' : 'L') + x.toFixed(2) + ' ' + y.toFixed(2)
  }).join(' ') + 'Z'
}

const BLOCKS = Array.from({ length: 66 }, (_, i) => {
  const row = Math.floor(i / 11)
  const column = i % 11
  return { x: 191 + column * 43 + row * 22, y: 368 + row * 25 - column * 8, h: 9 + (i * 17 % 31), w: 10 + i % 7 }
}).filter(({ x, y }) => Math.hypot((x - 487) / 1.4, y - 423) > 49)

function Building({ x, y, h, w }: typeof BLOCKS[number]) {
  const d = w * .55
  return (
    <g>
      <path d={'M' + x + ' ' + y + 'l' + w + ' ' + d + 'v' + -h + 'l' + -w + ' ' + -d + 'Z'} fill="#292823" stroke="#62513e" strokeWidth=".55" />
      <path d={'M' + (x + w) + ' ' + (y + d) + 'l' + w + ' ' + -d + 'v' + -h + 'l' + -w + ' ' + d + 'Z'} fill="#1a201f" stroke="#62513e" strokeWidth=".55" />
      <path d={'M' + x + ' ' + (y - h) + 'l' + w + ' ' + -d + ' ' + w + ' ' + d + ' ' + -w + ' ' + d + 'Z'} fill="#554333" stroke="#9e794e" strokeWidth=".6" />
    </g>
  )
}

function Region({ x, y, scale = 1, id }: { x: number; y: number; scale?: number; id: string }) {
  return (
    <g transform={'translate(' + x + ' ' + y + ') scale(' + scale + ')'}>
      <path d="M-81 9-56-23-13-32 20-18 61-25 89 2 71 29 25 39-9 26-53 32Z" fill={'url(#' + id + '-zone)'} stroke="#d67a3b" strokeWidth=".8" />
      {[1, .76, .53, .31].map((size, i) => (
        <path key={size} d="M-81 9C-83-15-54-25-20-22S24-37 57-20 97 9 65 23 26 36 1 28-65 40-81 9Z" transform={'translate(0 ' + (-i * 5) + ') scale(' + size + ')'} fill="none" stroke={i > 1 ? '#f4ba68' : '#bb6239'} strokeWidth="1.1" opacity={.9 - i * .12} />
      ))}
      <circle r="3" cy="-9" fill="#f2b84b" />
      <path d="M0-12V-39" stroke="#d5a174" strokeWidth=".8" />
      <path d="M-4-41H4M0-45V-37" stroke="#e9c59c" strokeWidth="1.2" />
    </g>
  )
}

export function ThermalScene({ role, mode = 'explore', paused = false }: {
  role: EntryRole
  mode?: 'explore' | 'access'
  paused?: boolean
}) {
  const id = 'thermal-' + useId().replace(/:/g, '')
  const host = useRef<HTMLDivElement>(null)
  const [inactive, setInactive] = useState(false)

  useEffect(() => {
    const element = host.current
    if (!element) return
    let visible = true
    let frame = 0
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const precise = window.matchMedia('(hover: hover) and (pointer: fine)')
    const reset = () => {
      cancelAnimationFrame(frame)
      element.style.setProperty('--pointer-x', '0px')
      element.style.setProperty('--pointer-y', '0px')
    }
    const sync = () => {
      setInactive(!visible || document.hidden || reduced.matches)
      if (!visible || document.hidden || reduced.matches || !precise.matches || paused) reset()
    }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync() }, { threshold: .05 })
    observer.observe(element)
    const move = (event: PointerEvent) => {
      if (paused || reduced.matches || !precise.matches || !visible || document.hidden) return
      const bounds = element.getBoundingClientRect()
      const x = ((event.clientX - bounds.left) / bounds.width - .5) * 12
      const y = ((event.clientY - bounds.top) / bounds.height - .5) * 8
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        element.style.setProperty('--pointer-x', x.toFixed(2) + 'px')
        element.style.setProperty('--pointer-y', y.toFixed(2) + 'px')
      })
    }
    element.addEventListener('pointermove', move)
    element.addEventListener('pointerleave', reset)
    document.addEventListener('visibilitychange', sync)
    reduced.addEventListener('change', sync)
    precise.addEventListener('change', sync)
    sync()
    return () => {
      observer.disconnect()
      reset()
      element.removeEventListener('pointermove', move)
      element.removeEventListener('pointerleave', reset)
      document.removeEventListener('visibilitychange', sync)
      reduced.removeEventListener('change', sync)
      precise.removeEventListener('change', sync)
    }
  }, [paused])

  return (
    <div ref={host} className={styles.scene} data-role={role} data-mode={mode} data-paused={paused || inactive} data-testid="thermal-scene" aria-hidden="true">
      <div className={styles.atmosphere} />
      <svg viewBox="0 0 1000 740" className={styles.drawing} focusable="false">
        <defs>
          <linearGradient id={id + '-ground'} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#232c2b" /><stop offset=".6" stopColor="#171d1d" /><stop offset="1" stopColor="#101819" />
          </linearGradient>
          <linearGradient id={id + '-edge'} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#4c3930" /><stop offset="1" stopColor="#101619" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={id + '-heat'} x1=".1" y1=".1" x2=".8" y2="1">
            <stop stopColor="#f2b84b" stopOpacity=".05" /><stop offset=".42" stopColor="#f28c28" stopOpacity=".2" /><stop offset=".8" stopColor="#d84232" stopOpacity=".35" /><stop offset="1" stopColor="#b92f2f" stopOpacity=".08" />
          </linearGradient>
          <radialGradient id={id + '-zone'}>
            <stop stopColor="#f28c28" stopOpacity=".38" /><stop offset=".55" stopColor="#d84232" stopOpacity=".16" /><stop offset="1" stopColor="#b92f2f" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={id + '-body'} x1=".2" y1="0" x2=".65" y2="1">
            <stop stopColor="#ffe0a1" /><stop offset=".23" stopColor="#f2b84b" /><stop offset=".49" stopColor="#f05a32" /><stop offset=".69" stopColor="#ce3e2d" /><stop offset="1" stopColor="#f2a84b" stopOpacity=".6" />
          </linearGradient>
          <linearGradient id={id + '-plume'} x1="0" y1="1" x2=".1" y2="0">
            <stop stopColor="#d84232" stopOpacity=".38" /><stop offset=".65" stopColor="#f28c28" stopOpacity=".1" /><stop offset="1" stopColor="#f2b84b" stopOpacity="0" />
          </linearGradient>
          <pattern id={id + '-grid'} width="54" height="30" patternUnits="userSpaceOnUse" patternTransform="matrix(1 .26 -.8 .5 0 205)">
            <path d="M54 0H0V30" fill="none" stroke="#72857d" strokeOpacity=".22" strokeWidth="1" />
          </pattern>
          <clipPath id={id + '-land'}><path d={TERRAIN} /></clipPath>
          <clipPath id={id + '-human'}><path d="M-10-158C-15-153-17-141-18-129L-31-85Q-33-78-28-76Q-23-74-20-82L-9-114-10-74-19-14Q-20-6-13-5Q-7-5-6-13L2-62 8-13Q9-5 15-5Q22-6 20-14L13-75 12-114 24-82Q27-74 32-77Q37-79 34-87L21-133Q19-151 11-157Q0-161-10-158Z" /></clipPath>
        </defs>

        <g className={styles.camera}>
          <g className={styles.parallax}>
            <ellipse cx="498" cy="540" rx="342" ry="69" fill="#030708" opacity=".6" />
            <g className={styles.terrain}>
              {[24, 16, 8].map((depth) => <path key={depth} d={TERRAIN} transform={'translate(0 ' + depth + ')'} fill={'url(#' + id + '-edge)'} stroke="#69503b" strokeOpacity={.06 + (24 - depth) * .006} />)}
              <path d={TERRAIN} fill={'url(#' + id + '-ground)'} stroke="#736049" strokeWidth="1" />
              <g clipPath={'url(#' + id + '-land)'}>
                <rect x="80" y="240" width="820" height="340" fill={'url(#' + id + '-grid)'} />
                <path d="M84 395 244 375 354 421 490 395 628 436 790 396 916 427M273 256 328 349 416 387 403 453 490 563M623 259 603 348 681 392 636 451 706 549" fill="none" stroke="#c3a079" strokeOpacity=".29" strokeWidth="3" />
                <path d="M89 421 262 414 360 468 451 452 600 491 815 456 901 471" fill="none" stroke="#7a9a91" strokeOpacity=".25" strokeWidth="5" />
                <g className={styles.buildings}>{BLOCKS.map((block, index) => <Building key={index} {...block} />)}</g>
              </g>
              <path d={contour(252, 107)} fill={'url(#' + id + '-zone)'} />
              <g className={styles.groundContours}>
                {[1, .85, .67, .5, .33].map((size, index) => <path key={size} d={contour(246 * size, 102 * size, index * .17)} fill="none" stroke={index > 2 ? '#edb064' : '#c96539'} strokeWidth={index > 2 ? '1.3' : '.8'} opacity={.4 + index * .1} />)}
              </g>
            </g>

            <g className={styles.regional}>
              <path d="M216 388 298 339 396 356 453 329 550 365 539 446 472 481 371 496 307 457 226 451Z" fill="none" stroke="#e5c799" strokeOpacity=".7" strokeDasharray="5 6" strokeWidth=".9" />
              <Region x={296} y={394} scale={.72} id={id} />
              <Region x={629} y={366} scale={.9} id={id} />
              <Region x={622} y={489} scale={.64} id={id} />
            </g>
            <g className={styles.district}>
              <path d="M191 333 272 413 339 451 379 531M465 299 455 346 560 398 548 525M685 313 632 391 712 466 733 530" fill="none" stroke="#d2b58d" strokeOpacity=".55" strokeDasharray="4 6" />
              <path d="M214 429 390 475 630 371 785 415M390 475 623 493 785 415" fill="none" stroke="#91a69a" strokeOpacity=".6" strokeWidth="1" />
              <Region x={217} y={445} scale={.53} id={id} />
              <Region x={789} y={410} scale={.74} id={id} />
              <Region x={396} y={501} scale={.5} id={id} />
              {[[350, 366], [705, 462], [528, 315]].map(([x, y]) => <g key={x} transform={'translate(' + x + ' ' + y + ')'} stroke="#cad1b9" fill="#192522"><path d="M-7 0 0-4 7 0 0 4Z" /><path d="M0-4V-28M-4-23H4M0-27V-19" /><circle r="2" fill="#c5c9af" /></g>)}
            </g>

            <g className={styles.heatField}>
              <g className={styles.laminar}>
                {[0, 1, 2, 3, 4, 5, 6].map((layer) => <path key={layer} d={contour(210 - layer * 13, 86 - layer * 6, layer * .12)} transform={'translate(' + layer * 2 + ' ' + (-layer * 17 - 12) + ')'} fill={'url(#' + id + '-heat)'} fillOpacity={.48} stroke={layer > 3 ? '#eaaa5e' : '#dc693b'} strokeWidth=".8" strokeOpacity={.57 - layer * .035} />)}
              </g>
              <g className={styles.plume}>
                <path d="M319 430C291 373 350 341 332 283S356 225 375 203C334 280 390 302 365 356S385 409 373 441Z" fill={'url(#' + id + '-plume)'} />
                <path d="M570 435C536 381 588 357 564 297S591 230 599 202C600 277 630 294 607 350S631 410 614 440Z" fill={'url(#' + id + '-plume)'} />
                <path d="M363 431C359 391 384 368 373 337M599 426C584 398 610 359 598 327" fill="none" stroke="#e7b66c" strokeWidth="1.4" strokeOpacity=".4" />
              </g>
            </g>

            <g className={styles.human}>
              <g transform="translate(487 442)">
                <ellipse cy="-1" rx="35" ry="11" fill={'url(#' + id + '-zone)'} />
                <ellipse cy="-1" rx="29" ry="9" fill="none" stroke="#e3a251" strokeWidth=".8" />
                <ellipse cy="-1" rx="42" ry="13" fill="none" stroke="#d96e36" strokeWidth=".6" opacity=".5" />
                <ellipse cx="1" cy="-181" rx="13" ry="17" fill={'url(#' + id + '-body)'} stroke="#f7c477" strokeWidth=".9" />
                <path d="M-10-158C-15-153-17-141-18-129L-31-85Q-33-78-28-76Q-23-74-20-82L-9-114-10-74-19-14Q-20-6-13-5Q-7-5-6-13L2-62 8-13Q9-5 15-5Q22-6 20-14L13-75 12-114 24-82Q27-74 32-77Q37-79 34-87L21-133Q19-151 11-157Q0-161-10-158Z" fill={'url(#' + id + '-body)'} fillOpacity=".92" stroke="#ffc98a" strokeWidth=".9" />
                <g clipPath={'url(#' + id + '-human)'} fill="none" stroke="#ffd398" strokeOpacity=".42" strokeWidth=".8">
                  {Array.from({ length: 14 }, (_, i) => <ellipse key={i} cx="2" cy={-135 + i * 5} rx={9 + i * 3} ry={7 + i * 6} />)}
                  <path d="M2-160V-58M-13-133 2-122 16-133M-10-83 2-90 13-83" />
                </g>
                <path d="M26-132H75L99-149H155" stroke="#d9b780" strokeWidth=".7" fill="none" opacity=".75" />
                <circle cx="26" cy="-132" r="2.5" fill="#f2b84b" />
                <text x="104" y="-157" fill="#e7c795" fontSize="8" letterSpacing="1.8" fontFamily="monospace">HUMAN EXPOSURE</text>
              </g>
            </g>

            <g className={styles.particles} fill="#edb577">
              {Array.from({ length: 24 }, (_, i) => <circle key={i} className={styles.particle} cx={287 + (i * 71 % 420)} cy={222 + (i * 43 % 215)} r={i % 3 === 0 ? 1.7 : 1} style={{ '--delay': (-i * .7) + 's', '--duration': (5 + i % 5) + 's' } as CSSProperties} />)}
            </g>
            <g className={styles.measurements} fill="none" stroke="#b6a085" strokeWidth=".65" opacity=".5">
              <path d="M140 523 320 587 650 602M145 518 135 528M315 582 325 592M645 597 655 607" />
              <path d="M836 313V265H716M830 313H842M716 259V271" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  )
}
