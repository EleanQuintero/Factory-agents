import { mastraClient } from '@fabrica/mastra-client'
import { toAISdkV5Messages } from '@mastra/ai-sdk/ui'
import { type UIMessage } from 'ai'
import { NextResponse } from 'next/server'

const THREAD_ID = 'forge-sensei-thread'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params
  const body = await req.json()

  const response = await fetch(`${process.env.MASTRA_API_URL}/chat/${agentId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...body,
      threadId: THREAD_ID,
      resourceId: `${agentId}-chat`,
    }),
  })

  return response
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params
  let messages: UIMessage[] = []

  try {
    const thread = mastraClient.getMemoryThread({ threadId: THREAD_ID, agentId })
    const { messages: threadMessages } = await thread.listMessages()
    messages = toAISdkV5Messages(threadMessages || [])
  } catch {
    console.log(`No previous messages found for agent: ${agentId}`)
  }

  return NextResponse.json(messages)
}
