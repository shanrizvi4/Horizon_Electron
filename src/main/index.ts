import { app, shell, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

// Import services and IPC handlers
import { dataStore } from './services/dataStore'
import { suggestionService } from './services/suggestionService'
import { screenCaptureService } from './services/screenCapture'
import { mouseTrackerService } from './services/mouseTracker'
import { registerAllIpcHandlers } from './ipc'
import { setPopupFunctions, notifyPopupVisibilityChange } from './ipc/popup'

let mainWindow: BrowserWindow | null = null
let popupWindow: BrowserWindow | null = null

// Popup window configuration
const POPUP_WIDTH = 400
const POPUP_HEIGHT = 400
const POPUP_MARGIN = 10

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Handle window focus changes for screen capture
  mainWindow.on('focus', () => {
    // App is focused - services may want to pause certain activities
  })

  mainWindow.on('blur', () => {
    // App lost focus - can trigger activity-based captures
    screenCaptureService.onActivity()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function getPopupPosition(_width: number, height: number): { x: number; y: number } {
  const primaryDisplay = screen.getPrimaryDisplay()
  const workArea = primaryDisplay.workArea
  const bounds = primaryDisplay.bounds

  console.log('Display bounds:', bounds)
  console.log('Display workArea:', workArea)
  console.log('Popup height:', height)

  // Position at absolute bottom-left of screen (may overlap dock)
  const position = {
    x: bounds.x + POPUP_MARGIN,
    y: bounds.height - height - POPUP_MARGIN  // 1440 - 400 - 10 = 1030
  }

  console.log('Popup position:', position)
  return position
}

function createPopupWindow(): void {
  if (popupWindow && !popupWindow.isDestroyed()) {
    return
  }

  // Don't set x/y in constructor - we'll position it before showing
  popupWindow = new BrowserWindow({
    width: POPUP_WIDTH,
    height: POPUP_HEIGHT,
    show: false,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: true,
    focusable: true,
    fullscreenable: false,
    hasShadow: true,
    vibrancy: 'under-window',
    visualEffectState: 'active',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Set window level to float above other windows
  popupWindow.setAlwaysOnTop(true, 'pop-up-menu')

  popupWindow.on('closed', () => {
    popupWindow = null
    mouseTrackerService.setPopupVisible(false)
  })

  // Handle focus/blur for auto-close behavior
  popupWindow.on('blur', () => {
    // Window lost focus - might want to close
    // The mouse tracker will handle this via position checking
  })

  // Load the popup renderer - use query param to indicate popup mode
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    const popupUrl = `${process.env['ELECTRON_RENDERER_URL']}?popup=true`
    popupWindow.loadURL(popupUrl)
  } else {
    popupWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      query: { popup: 'true' }
    })
  }
}

function showPopupWindow(): void {
  // Check if popup is disabled in settings
  const settings = dataStore.getSettings()
  if (settings.disablePopup) {
    return
  }

  if (!popupWindow || popupWindow.isDestroyed()) {
    createPopupWindow()
  }

  if (popupWindow) {
    const position = getPopupPosition(POPUP_WIDTH, POPUP_HEIGHT)

    // Show window first (macOS will position it where it wants)
    popupWindow.show()

    // Then immediately force our position
    popupWindow.setPosition(position.x, position.y)

    // Debug
    const actualBounds = popupWindow.getBounds()
    console.log('Final position:', actualBounds)

    // Update mouse tracker
    mouseTrackerService.setPopupVisible(true)
    mouseTrackerService.setPopupBounds({
      x: position.x,
      y: position.y,
      width: POPUP_WIDTH,
      height: POPUP_HEIGHT
    })

    // Notify popup renderer
    notifyPopupVisibilityChange(true)
  }
}

function hidePopupWindow(): void {
  if (popupWindow && !popupWindow.isDestroyed()) {
    popupWindow.destroy()
    popupWindow = null
    mouseTrackerService.setPopupVisible(false)
    notifyPopupVisibilityChange(false)
  }
}

function resizePopupWindow(width: number, height: number): void {
  console.log('resizePopupWindow called with:', width, height)
  if (popupWindow && !popupWindow.isDestroyed()) {
    const position = getPopupPosition(width, height)
    popupWindow.setBounds({
      x: position.x,
      y: position.y,
      width: width,
      height: height
    }, false) // no animation

    // Update mouse tracker bounds
    mouseTrackerService.setPopupBounds({
      x: position.x,
      y: position.y,
      width: width,
      height: height
    })
  }
}

function initializeMouseTracker(): void {
  mouseTrackerService.onTrigger(() => {
    showPopupWindow()
  })

  mouseTrackerService.onExit(() => {
    hidePopupWindow()
  })

  mouseTrackerService.start()
  console.log('Mouse tracker initialized')
}

function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

function getPopupWindow(): BrowserWindow | null {
  return popupWindow
}

async function initializeServices(): Promise<void> {
  console.log('Initializing backend services...')

  // 1. Initialize data store (load persisted state)
  await dataStore.initialize()
  console.log('Data store initialized')

  // 2. Set up popup functions before registering handlers
  setPopupFunctions(
    showPopupWindow,
    hidePopupWindow,
    resizePopupWindow,
    getMainWindow,
    getPopupWindow
  )

  // 3. Register all IPC handlers
  registerAllIpcHandlers()

  // 4. Start suggestion service (mock generation)
  suggestionService.start()
  console.log('Suggestion service started')

  // 5. Start screen capture if enabled in settings
  const settings = dataStore.getSettings()
  if (settings.recordingEnabled) {
    screenCaptureService.start()
    console.log('Screen capture service started')
  }

  // 6. Initialize mouse tracker for popup trigger
  initializeMouseTracker()

  console.log('All services initialized')
}

async function shutdownServices(): Promise<void> {
  console.log('Shutting down services...')

  // Stop services
  suggestionService.stop()
  screenCaptureService.stop()
  mouseTrackerService.stop()

  // Force save state
  await dataStore.forceSave()

  console.log('Services shutdown complete')
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Initialize all backend services
  await initializeServices()

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Handle before-quit to save state
app.on('before-quit', async (event) => {
  event.preventDefault()
  await shutdownServices()
  app.exit(0)
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error)
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason)
})
