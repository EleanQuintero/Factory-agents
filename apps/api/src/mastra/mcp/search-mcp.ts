import { MCPClient } from '@mastra/mcp';

export const searchMCP = new MCPClient({
    id: 'search-mcp-client',
    servers: {
        tavily: {
            url: new URL(`https://mcp.tavily.com/mcp/?tavilyApiKey=${process.env.TAVILY_API_KEY}`),
        },
    },
});
