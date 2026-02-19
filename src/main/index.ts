import { app, shell, BrowserWindow, ipcMain, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

// Import services and IPC handlers
import { dataStore } from './services/core/dataStore'
import { configService } from './services/core/config'
import { screenCaptureService } from './services/capture/screenCapture'
import { mouseTrackerService } from './services/capture/mouseTracker'
import { pipelineService } from './services/pipeline/pipelineService'
import { evaluationDataService } from '../eval/main'
import { registerAllIpcHandlers } from './ipc'
import { setPopupFunctions, notifyPopupVisibilityChange } from './ipc/popup'

let mainWindow: BrowserWindow | null = null
let popupWindow: BrowserWindow | null = null

// Popup window configuration
const POPUP_WIDTH = 400
const POPUP_HEIGHT = 400
const POPUP_MARGIN = 10
const POPUP_PEEK_OFFSET = 10 // How much peeks out when off-screen
const POPUP_ANIMATION_DURATION = 200 // ms for open animation
const POPUP_CLOSE_ANIMATION_DURATION = 250 // ms for close animation

let isPopupAnimating = false

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
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

function getPopupFinalPosition(_width: number, height: number): { x: number; y: number } {
  const primaryDisplay = screen.getPrimaryDisplay()
  const bounds = primaryDisplay.bounds

  // Final position: bottom-left corner with margin
  return {
    x: bounds.x + POPUP_MARGIN,
    y: bounds.height - height - POPUP_MARGIN
  }
}

function getPopupInitialPosition(width: number, _height: number): { x: number; y: number } {
  const primaryDisplay = screen.getPrimaryDisplay()
  const bounds = primaryDisplay.bounds

  // Initial position: off-screen to bottom-left, with just a peek showing
  // x: mostly off left edge, y: mostly off bottom edge
  return {
    x: bounds.x - width + POPUP_PEEK_OFFSET,
    y: bounds.y + bounds.height - POPUP_PEEK_OFFSET
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function animateBounds(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  duration: number,
  onComplete?: () => void
): void {
  const startTime = Date.now()
  const frameInterval = 16 // ~60fps

  const step = (): void => {
    if (!popupWindow || popupWindow.isDestroyed()) {
      onComplete?.()
      return
    }

    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = easeOutCubic(progress)

    const x = Math.round(fromX + (toX - fromX) * eased)
    const y = Math.round(fromY + (toY - fromY) * eased)

    try {
      popupWindow.setPosition(x, y)
    } catch (e) {
      console.error('setPosition error:', e, { x, y })
    }

    if (progress < 1) {
      setTimeout(step, frameInterval)
    } else {
      onComplete?.()
    }
  }

  step()
}

function animatePopupOpen(onComplete?: () => void): void {
  if (!popupWindow || popupWindow.isDestroyed()) {
    onComplete?.()
    return
  }

  const initialPos = getPopupInitialPosition(POPUP_WIDTH, POPUP_HEIGHT)
  const finalPos = getPopupFinalPosition(POPUP_WIDTH, POPUP_HEIGHT)

  console.log('Animation positions:', { initialPos, finalPos })

  // Set initial position BEFORE showing to prevent flash at old position
  try {
    popupWindow.setPosition(initialPos.x, initialPos.y)
  } catch (e) {
    console.error('Initial setPosition error:', e)
  }

  // Wait a frame for position to apply, then show and animate
  setTimeout(() => {
    if (!popupWindow || popupWindow.isDestroyed()) {
      onComplete?.()
      return
    }

    // Re-apply workspace visibility settings before showing
    // This helps ensure the popup appears on the current Space
    popupWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    popupWindow.setAlwaysOnTop(true, 'screen-saver')

    popupWindow.showInactive()

    // Start animation immediately after showing
    animateBounds(
      initialPos.x,
      initialPos.y,
      finalPos.x,
      finalPos.y,
      POPUP_ANIMATION_DURATION,
      onComplete
    )
  }, 16) // One frame delay to ensure position is applied
}

function animatePopupClose(onComplete?: () => void): void {
  if (!popupWindow || popupWindow.isDestroyed()) {
    onComplete?.()
    return
  }

  const currentPos = popupWindow.getPosition()
  const initialPos = getPopupInitialPosition(POPUP_WIDTH, POPUP_HEIGHT)

  animateBounds(
    currentPos[0],
    currentPos[1],
    initialPos.x,
    initialPos.y,
    POPUP_CLOSE_ANIMATION_DURATION,
    onComplete
  )
}

function createPopupWindow(): Promise<void> {
  return new Promise((resolve) => {
    if (popupWindow && !popupWindow.isDestroyed()) {
      resolve()
      return
    }

    const initialPos = getPopupInitialPosition(POPUP_WIDTH, POPUP_HEIGHT)

    // Create window at initial off-screen position
    popupWindow = new BrowserWindow({
      x: initialPos.x,
      y: initialPos.y,
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

    // Set window level to float above other windows including the Dock
    popupWindow.setAlwaysOnTop(true, 'screen-saver')

    // Make visible on all workspaces including fullscreen apps (macOS)
    popupWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

    popupWindow.on('closed', () => {
      popupWindow = null
      mouseTrackerService.setPopupVisible(false)
    })

    // Resolve when window content is ready
    popupWindow.once('ready-to-show', () => {
      resolve()
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
  })
}

async function showPopupWindow(): Promise<void> {
  // Check if popup is disabled in settings
  const settings = dataStore.getSettings()
  if (settings.disablePopup) {
    return
  }

  // Prevent double-animation
  if (isPopupAnimating) {
    return
  }

  // Check if popup already exists and is visible - nothing to do
  if (popupWindow && !popupWindow.isDestroyed() && popupWindow.isVisible()) {
    return
  }

  isPopupAnimating = true

  // Clear any pending open timers to prevent duplicate triggers
  mouseTrackerService.clearOpenDebounceTimer()

  // Mark as visible immediately to prevent re-triggering
  mouseTrackerService.setPopupVisible(true)

  // Disable auto-close during animation
  mouseTrackerService.disableAutoCloseTemporarily(POPUP_ANIMATION_DURATION + 500)

  if (!popupWindow || popupWindow.isDestroyed()) {
    await createPopupWindow()
  }

  if (popupWindow) {
    const finalPos = getPopupFinalPosition(POPUP_WIDTH, POPUP_HEIGHT)

    // Set bounds for mouse tracker immediately
    mouseTrackerService.setPopupBounds({
      x: finalPos.x,
      y: finalPos.y,
      width: POPUP_WIDTH,
      height: POPUP_HEIGHT
    })

    animatePopupOpen(() => {
      isPopupAnimating = false
      // Notify popup renderer
      notifyPopupVisibilityChange(true)
    })
  } else {
    isPopupAnimating = false
    mouseTrackerService.setPopupVisible(false)
  }
}

function hidePopupWindow(): void {
  if (!popupWindow || popupWindow.isDestroyed()) {
    return
  }

  // Prevent double-animation
  if (isPopupAnimating) {
    return
  }

  isPopupAnimating = true
  mouseTrackerService.setPopupVisible(false)

  animatePopupClose(() => {
    isPopupAnimating = false
    if (popupWindow && !popupWindow.isDestroyed()) {
      // Destroy the window instead of hiding it
      // This ensures a fresh window is created on the current Space next time
      popupWindow.destroy()
      popupWindow = null
    }
    notifyPopupVisibilityChange(false)
  })
}

function resizePopupWindow(width: number, height: number): void {
  console.log('resizePopupWindow called with:', width, height)
  if (popupWindow && !popupWindow.isDestroyed()) {
    const position = getPopupFinalPosition(width, height)
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

  // 0. Initialize config service (load API keys)
  configService.initialize()

  // 1. Initialize data store (load persisted state)
  await dataStore.initialize()
  console.log('Data store initialized')

  // 1.5 Initialize evaluation data service
  await evaluationDataService.initialize()
  console.log('Evaluation data service initialized')

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

  // 4. Initialize pipeline service (frame analysis, suggestion generation, scoring, deduplication)
  await pipelineService.initialize()
  console.log('Pipeline service initialized')

  // 5. Start screen capture if enabled in settings
  const settings = dataStore.getSettings()

  if (settings.recordingEnabled) {
    screenCaptureService.start()
    console.log('Screen capture service started')

    // 6. Start pipeline service (processes screenshots through all 5 steps)
    pipelineService.start()
    console.log('Pipeline service started')
  }

  // 7. Initialize mouse tracker for popup trigger
  initializeMouseTracker()

  // Log pipeline directories for verification
  console.log('\n=== PIPELINE DIRECTORIES ===')
  for (const step of pipelineService.getStatus()) {
    console.log(`${step.step}: ${step.directory}`)
  }
  console.log('============================\n')

  console.log('All services initialized')
}

async function shutdownServices(): Promise<void> {
  console.log('Shutting down services...')

  // Stop services
  pipelineService.stop()
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
