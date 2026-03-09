import { MCPClient } from '@mastra/mcp';

export const notionMCP = new MCPClient({
    id: 'notion-mcp-client',
    servers: {
        notion: {
            command: 'npx',
            args: ['-y', '@notionhq/notion-mcp-server'],
            env: {
                NOTION_TOKEN: process.env.NOTION_API_KEY as string,
            },
        },
    },
});
