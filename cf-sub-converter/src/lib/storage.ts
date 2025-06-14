/**
 * Simple in-memory storage for subscription content
 * This is a temporary solution until database is properly configured
 */

interface SubscriptionData {
  content: string
  updatedAt: Date
}

// In-memory storage
const subscriptionStorage = new Map<string, SubscriptionData>()

/**
 * Get subscription content by token
 */
export function getSubscriptionContent(token: string): string {
  const data = subscriptionStorage.get(token)
  return data?.content || ''
}

/**
 * Save subscription content for token
 */
export function saveSubscriptionContent(token: string, content: string): void {
  subscriptionStorage.set(token, {
    content,
    updatedAt: new Date(),
  })
}

/**
 * Check if subscription exists for token
 */
export function hasSubscription(token: string): boolean {
  return subscriptionStorage.has(token)
}

/**
 * Get all stored tokens (for debugging)
 */
export function getAllTokens(): string[] {
  return Array.from(subscriptionStorage.keys())
}

/**
 * Clear all stored data (for debugging)
 */
export function clearAllData(): void {
  subscriptionStorage.clear()
}

/**
 * Get storage stats (for debugging)
 */
export function getStorageStats() {
  return {
    totalTokens: subscriptionStorage.size,
    tokens: Array.from(subscriptionStorage.keys()),
    lastUpdated: Array.from(subscriptionStorage.values())
      .map((data) => data.updatedAt)
      .sort((a, b) => b.getTime() - a.getTime())[0],
  }
}
