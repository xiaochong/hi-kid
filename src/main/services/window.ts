import { BrowserWindow } from 'electron'

let _mainWindow: BrowserWindow | null = null

export function setMainWindow(win: BrowserWindow | null): void {
  _mainWindow = win
}

export function getMainWindow(): BrowserWindow | null {
  if (_mainWindow && _mainWindow.isDestroyed()) {
    _mainWindow = null
  }
  return _mainWindow
}
