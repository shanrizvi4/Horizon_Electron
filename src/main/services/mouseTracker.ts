import { screen } from 'electron'

type TriggerCallback = () => void
type ExitCallback = () => void

interface PopupBounds {
  x: number
  y: number
  width: number
  height: number
}

class MouseTrackerService {
  private pollInterval: NodeJS.Timeout | null = null
  private openDebounceTimer: NodeJS.Timeout | null = null
  private closeDebounceTimer: NodeJS.Timeout | null = null

  private onTriggerCallback: TriggerCallback | null = null
  private onExitCallback: ExitCallback | null = null

  private isPopupVisible = false
  private popupBounds: PopupBounds | null = null

  // Tracking for auto-close disable
  private autoCloseDisabled = false
  private autoCloseDisableTimer: NodeJS.Timeout | null = null

  // Configuration matching Swift implementation
  private readonly POLL_INTERVAL_MS = 50
  private readonly OPEN_DEBOUNCE_MS = 100
  private readonly CLOSE_DEBOUNCE_MS = 100
  private readonly CLOSE_MARGIN_PX = 120

  // Trigger zones (matching Swift)
  private readonly VERTICAL_TRIGGER_WIDTH = 5
  private readonly VERTICAL_TRIGGER_HEIGHT = 30
  private readonly HORIZONTAL_TRIGGER_WIDTH = 30
  private readonly HORIZONTAL_TRIGGER_HEIGHT = 5

  start(): void {
    if (this.pollInterval) return

    this.pollInterval = setInterval(() => {
      this.checkCursorPosition()
    }, this.POLL_INTERVAL_MS)

    console.log('Mouse tracker service started')
  }

  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
    this.clearTimers()
    console.log('Mouse tracker service stopped')
  }

  onTrigger(callback: TriggerCallback): void {
    this.onTriggerCallback = callback
  }

  onExit(callback: ExitCallback): void {
    this.onExitCallback = callback
  }

  setPopupVisible(visible: boolean): void {
    this.isPopupVisible = visible
  }

  setPopupBounds(bounds: PopupBounds): void {
    this.popupBounds = bounds
  }

  // Temporarily disable auto-close (e.g., after clicking back button)
  disableAutoCloseTemporarily(durationMs: number = 2000): void {
    this.autoCloseDisabled = true
    if (this.autoCloseDisableTimer) {
      clearTimeout(this.autoCloseDisableTimer)
    }
    this.autoCloseDisableTimer = setTimeout(() => {
      this.autoCloseDisabled = false
      this.autoCloseDisableTimer = null
    }, durationMs)
  }

  // Clear any pending open debounce timer to prevent duplicate triggers
  clearOpenDebounceTimer(): void {
    if (this.openDebounceTimer) {
      clearTimeout(this.openDebounceTimer)
      this.openDebounceTimer = null
    }
  }

  private checkCursorPosition(): void {
    const cursorPoint = screen.getCursorScreenPoint()
    const primaryDisplay = screen.getPrimaryDisplay()
    // Use full display bounds for trigger detection (so it works even with dock)
    const bounds = primaryDisplay.bounds

    const x = cursorPoint.x
    const y = cursorPoint.y

    // Screen bottom-left corner (Electron uses top-left origin, so bottom = large y)
    const screenBottom = bounds.y + bounds.height
    const screenLeft = bounds.x

    // Check if in trigger zone (bottom-left corner of screen)
    // Vertical trigger: narrow strip along left edge near bottom
    const verticalTrigger =
      x >= screenLeft &&
      x < screenLeft + this.VERTICAL_TRIGGER_WIDTH &&
      y > screenBottom - this.VERTICAL_TRIGGER_HEIGHT

    // Horizontal trigger: narrow strip along bottom edge near left
    const horizontalTrigger =
      y > screenBottom - this.HORIZONTAL_TRIGGER_HEIGHT &&
      x >= screenLeft &&
      x < screenLeft + this.HORIZONTAL_TRIGGER_WIDTH

    const isInTriggerArea = verticalTrigger || horizontalTrigger

    if (!this.isPopupVisible) {
      // Popup is hidden - check if we should open it
      if (isInTriggerArea) {
        this.handleTriggerEnter()
      } else {
        this.handleTriggerLeave()
      }
    } else {
      // Popup is visible - check if we should close it
      this.checkAutoClose(x, y)
    }
  }

  private handleTriggerEnter(): void {
    // Clear any pending close timer
    if (this.closeDebounceTimer) {
      clearTimeout(this.closeDebounceTimer)
      this.closeDebounceTimer = null
    }

    // Start open debounce if not already started
    if (!this.openDebounceTimer) {
      this.openDebounceTimer = setTimeout(() => {
        this.openDebounceTimer = null
        if (this.onTriggerCallback) {
          this.onTriggerCallback()
        }
      }, this.OPEN_DEBOUNCE_MS)
    }
  }

  private handleTriggerLeave(): void {
    // Clear pending open timer
    if (this.openDebounceTimer) {
      clearTimeout(this.openDebounceTimer)
      this.openDebounceTimer = null
    }
  }

  private checkAutoClose(cursorX: number, cursorY: number): void {
    if (this.autoCloseDisabled || !this.popupBounds) return

    const { x, y, width, height } = this.popupBounds

    // Check if cursor is outside the popup bounds + margin
    const isOutside =
      cursorX < x - this.CLOSE_MARGIN_PX ||
      cursorX > x + width + this.CLOSE_MARGIN_PX ||
      cursorY < y - this.CLOSE_MARGIN_PX ||
      cursorY > y + height + this.CLOSE_MARGIN_PX

    if (isOutside) {
      // Start close debounce
      if (!this.closeDebounceTimer) {
        this.closeDebounceTimer = setTimeout(() => {
          this.closeDebounceTimer = null
          if (this.onExitCallback) {
            this.onExitCallback()
          }
        }, this.CLOSE_DEBOUNCE_MS)
      }
    } else {
      // Cursor is within bounds, clear close timer
      if (this.closeDebounceTimer) {
        clearTimeout(this.closeDebounceTimer)
        this.closeDebounceTimer = null
      }
    }
  }

  private clearTimers(): void {
    if (this.openDebounceTimer) {
      clearTimeout(this.openDebounceTimer)
      this.openDebounceTimer = null
    }
    if (this.closeDebounceTimer) {
      clearTimeout(this.closeDebounceTimer)
      this.closeDebounceTimer = null
    }
    if (this.autoCloseDisableTimer) {
      clearTimeout(this.autoCloseDisableTimer)
      this.autoCloseDisableTimer = null
    }
  }
}

export const mouseTrackerService = new MouseTrackerService()
