import React, { useState, useMemo } from 'react'
import { useData } from '../context/DataContext'

export function CustomizeAgentPage(): React.JSX.Element {
  const { state, dispatch } = useData()
  const { agentConfig } = state

  const [focusMoreOn, setFocusMoreOn] = useState(agentConfig.focusMoreOn)
  const [focusLessOn, setFocusLessOn] = useState(agentConfig.focusLessOn)
  const [style, setStyle] = useState(agentConfig.style)

  const hasChanges = useMemo(
    () => ({
      focusMoreOn: focusMoreOn !== agentConfig.focusMoreOn,
      focusLessOn: focusLessOn !== agentConfig.focusLessOn,
      style: style !== agentConfig.style
    }),
    [focusMoreOn, focusLessOn, style, agentConfig]
  )

  const handleApply = (field: 'focusMoreOn' | 'focusLessOn' | 'style'): void => {
    const updates: Record<string, string> = {}
    switch (field) {
      case 'focusMoreOn':
        updates.focusMoreOn = focusMoreOn
        break
      case 'focusLessOn':
        updates.focusLessOn = focusLessOn
        break
      case 'style':
        updates.style = style
        break
    }
    dispatch({ type: 'UPDATE_AGENT_CONFIG', payload: updates })
  }

  const handleRevert = (field: 'focusMoreOn' | 'focusLessOn' | 'style'): void => {
    switch (field) {
      case 'focusMoreOn':
        setFocusMoreOn(agentConfig.focusMoreOn)
        break
      case 'focusLessOn':
        setFocusLessOn(agentConfig.focusLessOn)
        break
      case 'style':
        setStyle(agentConfig.style)
        break
    }
  }

  return (
    <div className="content-area">
      <div className="content-header">
        <div className="content-header-left">
          <h1 className="page-title">Customize Agent</h1>
        </div>
      </div>
      <div className="content-body">
        <div className="page">
          <div className="customize-agent-section">
            <h3 className="customize-agent-section-title">Focus More On</h3>
            <p className="customize-agent-section-description">
              Topics, areas, or types of suggestions you want the agent to prioritize.
            </p>
            <div className="customize-agent-textarea-wrapper">
            <textarea
              className="customize-agent-textarea"
              value={focusMoreOn}
              onChange={(e) => setFocusMoreOn(e.target.value)}
              placeholder="e.g., Performance optimization, security best practices, code quality..."
            />
            </div>
            <div className={`customize-agent-actions ${hasChanges.focusMoreOn ? 'visible' : ''}`}>
              <button
                className="customize-agent-btn customize-agent-btn-apply"
                onClick={() => handleApply('focusMoreOn')}
              >
                Apply
              </button>
              <button
                className="customize-agent-btn customize-agent-btn-revert"
                onClick={() => handleRevert('focusMoreOn')}
              >
                Revert
              </button>
            </div>
          </div>

          <div className="customize-agent-section">
            <h3 className="customize-agent-section-title">Focus Less On</h3>
            <p className="customize-agent-section-description">
              Topics or areas you want the agent to de-prioritize in suggestions.
            </p>
            <div className="customize-agent-textarea-wrapper">
            <textarea
              className="customize-agent-textarea"
              value={focusLessOn}
              onChange={(e) => setFocusLessOn(e.target.value)}
              placeholder="e.g., UI styling, documentation, minor refactoring..."
            />
            </div>
            <div className={`customize-agent-actions ${hasChanges.focusLessOn ? 'visible' : ''}`}>
              <button
                className="customize-agent-btn customize-agent-btn-apply"
                onClick={() => handleApply('focusLessOn')}
              >
                Apply
              </button>
              <button
                className="customize-agent-btn customize-agent-btn-revert"
                onClick={() => handleRevert('focusLessOn')}
              >
                Revert
              </button>
            </div>
          </div>

          <div className="customize-agent-section">
            <h3 className="customize-agent-section-title">Communication Style</h3>
            <p className="customize-agent-section-description">
              How you prefer the agent to communicate with you.
            </p>
            <div className="customize-agent-textarea-wrapper">
            <textarea
              className="customize-agent-textarea"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              placeholder="e.g., Concise and technical, detailed explanations, code examples..."
            />
            </div>
            <div className={`customize-agent-actions ${hasChanges.style ? 'visible' : ''}`}>
              <button
                className="customize-agent-btn customize-agent-btn-apply"
                onClick={() => handleApply('style')}
              >
                Apply
              </button>
              <button
                className="customize-agent-btn customize-agent-btn-revert"
                onClick={() => handleRevert('style')}
              >
                Revert
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
