import { DOMSource, h, VNode } from '@cycle/dom'
import { List } from 'immutable'
import xs, { Stream } from 'xstream'
import { AppConfig, Point, State } from '../interfaces'
import { KeyboardSource } from '../makeKeyboardDriver'
import { distanceBetweenPointAndSegment } from '../utils/common'
import Mouse from '../utils/Mouse'

export interface Sources {
  DOM: DOMSource
  state: Stream<State>
  mouse: Mouse
  keyboard: KeyboardSource
  config: Stream<AppConfig>
}

export interface Sinks {
  DOM: Stream<VNode>
  nextVertexInsertIndex: Stream<number>
}

export default function VertexInsertIndicator({
  mouse,
  keyboard,
  state: state$,
  config: config$,
}: Sources): Sinks {
  const verticesAndEditable$ = state$.map(state => {
    const item = state.sitem()
    const vertices = state.vertices()
    const editable = item && !item.locked
    return { editable, vertices }
  })
  const segments$ = verticesAndEditable$.map(({ vertices, editable }) =>
    vertices.isEmpty()
      ? List<[Point, Point]>()
      : vertices
          .butLast()
          .zip(vertices.rest())
          .push([vertices.last(), vertices.first() as Point]),
  )
  const highlightedSegmentIndex$ = xs
    .combine(verticesAndEditable$, config$, mouse.move$, segments$, state$, mouse.vertexIndex$)
    .map(([{ editable }, config, pos, segments, { transform }, vertexIndex]) =>
      vertexIndex === -1 && editable
        ? segments.findIndex(
            seg =>
              distanceBetweenPointAndSegment(pos, seg[0], seg[1]) <=
              config.senseRange / transform.k,
          )
        : -1,
    )
  const highlightedSegment$ = highlightedSegmentIndex$
    .sampleCombine(segments$)
    .map(([i, segs]) => (i === -1 ? null : segs.get(i)))
  const vdom$ = highlightedSegment$.sampleCombine(state$).map(([seg, { transform }]) =>
    seg
      ? h('line', {
          attrs: {
            x1: seg[0].x,
            y1: seg[0].y,
            x2: seg[1].x,
            y2: seg[1].y,
            stroke: '#14e01c',
            'stroke-width': 3 / transform.k,
          },
        })
      : null,
  )
  const nextVertexInsertIndex$ = highlightedSegmentIndex$.map(segIndex =>
    segIndex === -1 ? -1 : segIndex + 1,
  )
  return {
    DOM: vdom$,
    nextVertexInsertIndex: nextVertexInsertIndex$,
  }
}
