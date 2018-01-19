import * as d3 from 'd3'
import { clamp, identical } from 'ramda'
import xs from 'xstream'
import { MAX_SCALE, MIN_SCALE } from '../constants'
import { InteractionFn } from '../interfaces'
import transition from '../utils/transition'

const zoom: InteractionFn = ({ mouse, mode: mode$, state: state$, transform: transform$ }) => {
  const dragStart$ = mouse.rawDown$
    .when(mode$, identical('idle'))
    .whenNot(mouse.isBusy$)
    .sampleCombine(state$, transform$)
    .map(([rawPos, state, transform]) => {
      const pos = transform.invertPos(rawPos)
      const clickedItems = state.items.filter(item => item.containsPoint(pos))
      if (clickedItems.every(item => item.locked)) {
        return { rawPos, transform }
      }
      return null
    })
    .startWith(null)

  const drag$ = dragStart$
    .checkedFlatMap(dragStart =>
      mouse.rawMove$
        .map(rawPos => {
          const k = dragStart.transform.k
          const dx = rawPos.x - dragStart.rawPos.x
          const dy = rawPos.y - dragStart.rawPos.y
          return dragStart.transform.translate(dx / k, dy / k)
        })
        .endWhen(mouse.up$),
    )
    .filter(Boolean)

  const zoomFromDblclick$ = mouse.rawDblclick$.map(pos => ({ pos, delta: 2, useTransition: true }))
  const zoomFromWheel$ = mouse.rawWheel$.map(({ pos, deltaY }) => ({
    pos,
    delta: 0.95 ** (deltaY / 100),
    useTransition: false,
  }))
  const zoom$ = xs
    .merge(zoomFromDblclick$, zoomFromWheel$)
    .sampleCombine(transform$)
    .map(([{ pos: rawPos, delta, useTransition }, transform]) => {
      const { x, y, k } = transform
      const nextK = clamp(MIN_SCALE, MAX_SCALE, k * delta)
      const factor = nextK / k // 实际的放大率
      const nextX = factor * (x - rawPos.x) + rawPos.x
      const nextY = factor * (y - rawPos.y) + rawPos.y
      if (useTransition && factor !== 1) {
        return transition(250, [x, y, k], [nextX, nextY, nextK])
      } else {
        return xs.of([nextX, nextY, nextK])
      }
    })
    .flatten()
    .map(([x, y, k]) => d3.zoomIdentity.translate(x, y).scale(k))

  return { nextTransform: xs.merge(zoom$, drag$) }
}

export default zoom
