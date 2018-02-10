import { List, Record } from 'immutable'
import State from './State'
import { Action } from '../interfaces'

export const emptyAction = Symbol('fallback-action')
export const undo = Symbol('undo')
export type undo = typeof undo
export const redo = Symbol('redo')
export type redo = typeof redo
export const clearHistory = Symbol('clear-history')
export type clearHistory = typeof clearHistory

const AppHistoryRecord = Record({
  state: new State(),
  list: List<Action>(),
  index: -1,
})

export default class AppHistory extends AppHistoryRecord {
  pop() {
    return this.merge({
      list: this.list.splice(this.index, 1),
      index: this.index - 1,
      state: this.state,
    })
  }

  getLastAction() {
    if (this.index === -1) {
      return emptyAction
    } else {
      return this.list.get(this.index)
    }
  }

  getNextAction() {
    return this.list.get(this.index + 1) || emptyAction
  }

  apply(action: Action | typeof emptyAction) {
    if (action === emptyAction) {
      return this
    } else {
      return this.merge({
        list: this.list.setSize(this.index + 1).push(action),
        index: this.index + 1,
        state: action.next(this.state),
      })
    }
  }

  redo(action: Action | typeof emptyAction) {
    if (action === emptyAction) {
      return this
    } else {
      return this.merge({
        list: this.list,
        index: this.index + 1,
        state: action.next(this.state),
      })
    }
  }

  undo(action: Action | typeof emptyAction) {
    if (action === emptyAction) {
      return this
    } else {
      return this.merge({
        list: this.list,
        index: this.index - 1,
        state: action.prev(this.state),
      })
    }
  }

  clearHistory() {
    return this.merge({
      list: List(),
      index: -1,
      state: this.state,
    })
  }
}
