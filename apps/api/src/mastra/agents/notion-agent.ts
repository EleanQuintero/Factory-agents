import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { notionMCP } from "../mcp/notion-mcp";



async function createNotionAgent() {

    const tools = await notionMCP.listTools();

    return new Agent({
        id: 'notion-agent',
        name: 'Notion Agent',
        instructions: {
            role: 'system',
            content: `You are an expert assistant for the Notion ecosystem. You can search pages, create and update pages and databases, add comments, and manage workspace content using the available Notion tools.
            
            When calling post-page or any tool that accepts children, serialize each block object as a JSON string before passing it. Example: pass "[{\"type\":\"paragraph\",...}]" not the raw object.
            `,
        },
        model: 'github-models/openai/gpt-4o',
        tools,
        memory: new Memory(),
    });
}

export const notionAgent = await createNotionAgent();