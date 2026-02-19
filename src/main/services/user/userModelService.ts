import { dataStore } from '../core/dataStore'
import type { UserProposition } from '../../types'

function generateId(): string {
  return `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

class UserModelService {
  getPropositions(): UserProposition[] {
    return dataStore.getPropositions()
  }

  addProposition(text: string): UserProposition {
    const proposition: UserProposition = {
      id: generateId(),
      text: text.trim(),
      editHistory: []
    }
    dataStore.addProposition(proposition)
    return proposition
  }

  updateProposition(id: string, text: string): void {
    dataStore.updateProposition(id, text.trim())
  }

  deleteProposition(id: string): void {
    dataStore.deleteProposition(id)
  }

  getPropositionById(id: string): UserProposition | undefined {
    return dataStore.getPropositions().find((p) => p.id === id)
  }

  // Get propositions formatted for LLM context
  getPropositionsForContext(): string {
    const propositions = this.getPropositions()
    if (propositions.length === 0) {
      return ''
    }

    return propositions.map((p) => `- ${p.text}`).join('\n')
  }

  // Import propositions from an array (useful for initialization)
  importPropositions(propositions: Array<{ text: string }>): void {
    for (const { text } of propositions) {
      this.addProposition(text)
    }
  }

  // Clear all propositions
  clearAll(): void {
    const propositions = this.getPropositions()
    for (const prop of propositions) {
      this.deleteProposition(prop.id)
    }
  }
}

// Singleton instance
export const userModelService = new UserModelService()
