import { mastraClient } from '@fabrica/mastra-client'
import { toAISdkV5Messages } from '@mastra/ai-sdk/ui'
import { type UIMessage } from 'ai'
import { NextResponse } from 'next/server'

const THREAD_ID = 'example-user-id'

export async function POST(req: Request) {
    const params = await req.json()

    const response = await fetch(`${process.env.MASTRA_API_URL}/chat/search`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            ...params,
            threadId: THREAD_ID,
            resourceId: 'search-chat',
        }),
    })

    return response
}

export async function GET() {
    let messages: UIMessage[] = []
    try {
        const thread = mastraClient.getMemoryThread({ threadId: THREAD_ID, agentId: 'search-agent' })
        const { messages: threadMessages } = await thread.listMessages()
        messages = toAISdkV5Messages(threadMessages || [])
    } catch {
        console.log('No previous messages found.')
    }

    return NextResponse.json(messages)
}
