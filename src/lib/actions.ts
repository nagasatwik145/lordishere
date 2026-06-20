import { createServerFn } from '@tanstack/react-start'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { conversations, messages, memories } from '@/lib/schema'
import { and, eq, desc } from 'drizzle-orm'

async function getUserId() {
  try {
    const session = await auth.api.getSession()
    if (!session?.user) throw new Error('Unauthorized')
    return session.user.id
  } catch {
    throw new Error('Session not found')
  }
}

// Conversations
export const getConversations = createServerFn().handler(async () => {
  const userId = await getUserId()
  return db
    .select()
    .from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt))
})

export const createConversation = createServerFn()
  .input<{ title: string; description?: string }>()
  .handler(async ({ data }) => {
    const userId = await getUserId()
    const result = await db
      .insert(conversations)
      .values({ userId, title: data.title, description: data.description })
      .returning()
    return result[0]
  })

export const updateConversation = createServerFn()
  .input<{ id: number; title: string; description?: string }>()
  .handler(async ({ data }) => {
    const userId = await getUserId()
    const result = await db
      .update(conversations)
      .set({ title: data.title, description: data.description, updatedAt: new Date() })
      .where(and(eq(conversations.id, data.id), eq(conversations.userId, userId)))
      .returning()
    return result[0]
  })

export const deleteConversation = createServerFn()
  .input<number>()
  .handler(async ({ data: id }) => {
    const userId = await getUserId()
    await db
      .delete(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
  })

// Messages
export const getMessages = createServerFn()
  .input<number>()
  .handler(async ({ data: conversationId }) => {
    const userId = await getUserId()
    return db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.userId, userId)
        )
      )
      .orderBy(messages.createdAt)
  })

export const upsertMessages = createServerFn()
  .input<{ conversationId: number; messageRows: Array<{ id: string; role: 'user' | 'assistant'; content: string }> }>()
  .handler(async ({ data: { conversationId, messageRows } }) => {
    const userId = await getUserId()
    
    for (const row of messageRows) {
      const existing = await db
        .select()
        .from(messages)
        .where(and(eq(messages.id, row.id), eq(messages.userId, userId)))
        .limit(1)

      if (existing.length > 0) {
        await db
          .update(messages)
          .set({
            role: row.role,
            content: row.content,
          })
          .where(eq(messages.id, row.id))
      } else {
        await db
          .insert(messages)
          .values({
            id: row.id,
            conversationId,
            userId,
            role: row.role,
            content: row.content,
          })
      }
    }
  })

// Memories
export const getMemories = createServerFn().handler(async () => {
  const userId = await getUserId()
  return db
    .select()
    .from(memories)
    .where(eq(memories.userId, userId))
    .orderBy(desc(memories.createdAt))
})

export const createMemory = createServerFn()
  .input<{ title: string; content: string; category?: string }>()
  .handler(async ({ data }) => {
    const userId = await getUserId()
    const result = await db
      .insert(memories)
      .values({ userId, title: data.title, content: data.content, category: data.category })
      .returning()
    return result[0]
  })

export const updateMemory = createServerFn()
  .input<{ id: number; title: string; content: string; category?: string }>()
  .handler(async ({ data }) => {
    const userId = await getUserId()
    const result = await db
      .update(memories)
      .set({ title: data.title, content: data.content, category: data.category, updatedAt: new Date() })
      .where(and(eq(memories.id, data.id), eq(memories.userId, userId)))
      .returning()
    return result[0]
  })

export const deleteMemory = createServerFn()
  .input<number>()
  .handler(async ({ data: id }) => {
    const userId = await getUserId()
    await db
      .delete(memories)
      .where(and(eq(memories.id, id), eq(memories.userId, userId)))
  })
