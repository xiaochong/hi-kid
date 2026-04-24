import { describe, it, expect, afterAll } from 'vitest'
import { getMainWindow, setMainWindow } from '../services/window'

import type { BrowserWindow } from 'electron'

describe('window', () => {
  afterAll(() => {
    setMainWindow(null)
  })

  it('should return null initially', () => {
    const win = getMainWindow()
    expect(win).toBeNull()
  })

  function mockWin(isDestroyed = false): BrowserWindow {
    return { isDestroyed: () => isDestroyed } as BrowserWindow
  }

  it('should return the window set by setMainWindow', () => {
    const fakeWin = mockWin()
    setMainWindow(fakeWin)
    expect(getMainWindow()).toBe(fakeWin)
  })

  it('should return null after setMainWindow(null)', () => {
    setMainWindow(null)
    expect(getMainWindow()).toBeNull()
  })

  it('should update to the latest window', () => {
    const win1 = mockWin()
    const win2 = mockWin()

    setMainWindow(win1)
    expect(getMainWindow()).toBe(win1)

    setMainWindow(win2)
    expect(getMainWindow()).toBe(win2)
    expect(getMainWindow()).not.toBe(win1)
  })

  it('should return null if the window is destroyed', () => {
    const destroyedWin = mockWin(true)
    setMainWindow(destroyedWin)
    expect(getMainWindow()).toBeNull()
  })
})
