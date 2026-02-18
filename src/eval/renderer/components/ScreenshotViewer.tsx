import React, { useState } from 'react'

interface ScreenshotViewerProps {
  src: string
  alt: string
}

export function ScreenshotViewer({ src, alt }: ScreenshotViewerProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <>
      <div className="eval-screenshot-container" onClick={() => setIsExpanded(true)}>
        <img src={src} alt={alt} className="eval-screenshot-thumbnail" />
        <div className="eval-screenshot-overlay">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15 3l2.3 2.3-2.89 2.87 1.42 1.42L18.7 6.7 21 9V3h-6zM3 9l2.3-2.3 2.87 2.89 1.42-1.42L6.7 5.3 9 3H3v6zm6 12l-2.3-2.3 2.89-2.87-1.42-1.42L5.3 17.3 3 15v6h6zm12-6l-2.3 2.3-2.87-2.89-1.42 1.42 2.89 2.87L15 21h6v-6z" />
          </svg>
          <span>Click to expand</span>
        </div>
      </div>

      {isExpanded && (
        <div className="eval-screenshot-modal" onClick={() => setIsExpanded(false)}>
          <div className="eval-screenshot-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="eval-screenshot-close" onClick={() => setIsExpanded(false)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
            <img src={src} alt={alt} className="eval-screenshot-full" />
          </div>
        </div>
      )}
    </>
  )
}
