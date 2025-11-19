import { defineContract, procedure } from '@webviewrpc/core'
import { z } from 'zod'

/**
 * Shared RPC contract between mobile and web
 *
 * Features demonstrated:
 * - Request-response procedures
 * - Fire-and-forget events
 * - Type-safe schemas with Zod
 * - Bidirectional communication
 */
export const contract = defineContract({
  // Web procedures (called from native → web)
  web: {
    // Show toast notification
    showToast: procedure(z.object({
      message: z.string(),
      duration: z.number().optional(),
    })).returns(z.void()),

    // Update counter value
    updateCounter: procedure(z.object({
      value: z.number(),
    })).returns(z.void()),

    // Events from web
    counterChanged: z.object({
      count: z.number(),
    }),

    themeChanged: z.object({
      theme: z.enum(['light', 'dark']),
    }),
  },

  // Native procedures (called from web → native)
  native: {
    // Navigate to screen
    navigate: procedure(z.object({
      screen: z.string(),
    })).returns(z.void()),

    // Share content
    share: procedure(z.object({
      title: z.string(),
      message: z.string(),
      url: z.string().url().optional(),
    })).returns(z.object({
      success: z.boolean(),
    })),

    // Get device info
    getDeviceInfo: procedure(z.object({})).returns(z.object({
      platform: z.string(),
      version: z.string(),
    })),

    // Events from native
    appStateChanged: z.object({
      state: z.enum(['active', 'background', 'inactive']),
    }),
  },
})

export type Contract = typeof contract
