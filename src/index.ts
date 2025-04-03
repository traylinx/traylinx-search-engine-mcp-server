#!/usr/bin/env node

// @ts-ignore - Ignore module resolution errors
import {
  McpServer,
  McpError,
  ErrorCode,
  TextContent,
  EmbeddedResource,
  StdioTransport,
} from '@modelcontextprotocol/sdk';
import dotenv from 'dotenv';
import { URL } from 'url';

// Package version
const VERSION = '1.0.0';
const SERVER_NAME = 'Traylinx Search Engine MCP Server';

// Load environment variables from .env file
dotenv.config();

// Setup logging to stderr to avoid interfering with stdio transport
const log = {
  info: (message: string) => console.error(`[INFO] ${message}`),
  warn: (message: string) => console.error(`[WARN] ${message}`),
  error: (message: string) => console.error(`[ERROR] ${message}`),
  critical: (message: string) => console.error(`[CRITICAL] ${message}`),
  debug: (message: string) => console.error(`[DEBUG] ${message}`),
};

// Log startup info
log.info(`${SERVER_NAME} v${VERSION} starting up...`);
log.info(`Node.js Version: ${process.version}`);
log.info(`Current Working Directory: ${process.cwd()}`);

// Environment variables
const AGENTIC_SEARCH_API_KEY = process.env.AGENTIC_SEARCH_API_KEY;
const AGENTIC_SEARCH_API_URL = process.env.AGENTIC_SEARCH_API_URL || 'https://agentic-search-engines-n3n7u.ondigitalocean.app/v1/chat/completions';

// Check essential configuration
log.info(`Config Check: AGENTIC_SEARCH_API_KEY Set: ${Boolean(AGENTIC_SEARCH_API_KEY)}`);
log.info(`Config Check: AGENTIC_SEARCH_API_URL Set: ${Boolean(process.env.AGENTIC_SEARCH_API_URL)}, Value: '${AGENTIC_SEARCH_API_URL}'`);

// Validate environment variables
if (!AGENTIC_SEARCH_API_KEY) {
  log.critical('STARTUP FAILURE: AGENTIC_SEARCH_API_KEY environment variable is not set. Server cannot function.');
  process.exit(1);
}

try {
  new URL(AGENTIC_SEARCH_API_URL);
} catch (error) {
  log.critical(`STARTUP FAILURE: AGENTIC_SEARCH_API_URL ('${AGENTIC_SEARCH_API_URL}') looks invalid.`);
  process.exit(1);
}

// Create MCP server
const server = new McpServer({
  transport: new StdioTransport(),
});

// Register handlers
server.registerToolsHandler(async () => {
  log.info('Handling list_tools request.');
  try {
    // Static definition that must succeed without API key
    return [
      {
        name: 'agentic_search',
        description: 'Performs an intelligent search using the configured Agentic Search API.',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query, question, or URL',
            },
          },
          required: ['query'],
        },
      },
    ];
  } catch (error) {
    log.error(`CRITICAL ERROR in list_tools handler: ${error}`);
    throw new McpError(
      ErrorCode.INTERNAL_ERROR,
      `Server error listing tools: ${error}`
    );
  }
});

server.registerPromptsHandler(async () => {
  log.info('Handling list_prompts request');
  try {
    return [
      {
        name: 'agentic_search',
        description: 'Perform a search using the Agentic Search API',
      },
    ];
  } catch (error) {
    log.error(`Error in list_prompts: ${error}`);
    throw new McpError(
      ErrorCode.INTERNAL_ERROR,
      'Server error listing prompts.'
    );
  }
});

// Define a type for the prompt arguments
interface PromptArgs {
  query?: string;
  [key: string]: any;
}

server.registerGetPromptHandler(async (promptName: string, args?: PromptArgs) => {
  log.info(`Handling get_prompt for '${promptName}'`);
  try {
    if (promptName !== 'agentic_search') {
      throw new McpError(
        ErrorCode.UNKNOWN_PROMPT,
        `Unknown prompt: ${promptName}`
      );
    }
    
    const query = args?.query;
    if (!query) {
      throw new McpError(
        ErrorCode.INVALID_PARAMS,
        "Missing 'query' argument for prompt."
      );
    }
    
    return {
      name: 'agentic_search',
      description: `Search the web for: ${query}`,
      template: `Use 'agentic_search' tool for: {{query}}`,
      inputVariables: ['query'],
    };
  } catch (error) {
    if (error instanceof McpError) throw error;
    
    log.error(`Error in get_prompt: ${error}`);
    throw new McpError(
      ErrorCode.INTERNAL_ERROR,
      'Server error getting prompt.'
    );
  }
});

// Define interfaces for API response and return types
interface SearchItem {
  title?: string;
  snippet?: string;
  url?: string;
  [key: string]: any;
}

interface ApiResponse {
  mainContent: string;
  items: SearchItem[] | null;
  media: Record<string, any> | null;
}

// API Calling Function
async function callAgenticSearchApi(query: string): Promise<ApiResponse> {
  log.debug(`Inside callAgenticSearchApi for query: '${query.substring(0, 50)}...'`);
  const apiKey = process.env.AGENTIC_SEARCH_API_KEY;
  
  // Default API endpoint (no trailing slash)
  const defaultApiEndpoint = 'https://agentic-search-engines-n3n7u.ondigitalocean.app';
  
  // Get user-provided URL or use default, stripping any trailing slashes
  let baseUrl = process.env.AGENTIC_SEARCH_API_URL;
  if (!baseUrl) {
    baseUrl = defaultApiEndpoint;
  } else {
    // If provided, make sure it doesn't have trailing slashes
    baseUrl = baseUrl.replace(/\/+$/, '');
    
    // If the URL contains the full endpoint already, use it as-is
    if (baseUrl.includes('/v1/chat/completions')) {
      log.debug('Using complete API URL as provided in environment variable');
    } else {
      // Otherwise, ensure we're using the right base URL 
      // (in case user provided just a domain)
      log.debug('Appending endpoint path to provided base URL');
      baseUrl = baseUrl + '/v1/chat/completions';
    }
  }

  // Config check
  if (!apiKey) {
    log.critical('FATAL: AGENTIC_SEARCH_API_KEY is missing in environment during API call!');
    throw new Error('Server configuration error: Missing API Key.');
  }
  
  if (!baseUrl || !(baseUrl.startsWith('http'))) {
    log.critical(`FATAL: Invalid AGENTIC_SEARCH_API_URL: '${baseUrl}'`);
    throw new Error('Server configuration error: Invalid API URL.');
  }

  const url = baseUrl;
  log.debug(`Final API URL: ${url}`);
  
  const payload = {
    model: 'agentic-search',
    messages: [{ role: 'user', content: query }],
  };
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  log.info(`Making POST request to ${url}`);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload),
    });

    log.info(`API Response Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      log.error(`API error (${response.status}): ${errorText}`);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    log.debug('Successfully parsed API response.');

    // Extract Data
    let mainContent = '';
    const choices = data.choices || [];
    if (choices.length > 0) {
      mainContent = choices[0]?.message?.content || '';
    }
    
    const citations = data.citations;
    const items = Array.isArray(data.items) ? data.items : null;
    const media = typeof data.media === 'object' ? data.media : null;

    // Format results
    if (citations && Array.isArray(citations)) {
      const formattedCitations = "\n\n**Sources:**\n" + 
        citations.map((cUrl: string) => `- <${cUrl}>`).join('\n');
      if (mainContent) {
        mainContent += formattedCitations;
      }
    }
    
    if (!mainContent.trim() && items) {
      const formattedItems = "**Search Results:**\n" + 
        items.map((item: SearchItem) => 
          `- **${item.title || 'N/A'}**: ${item.snippet || 'N/A'}\n  <${item.url || 'N/A'}>\n`
        ).join('\n');
      mainContent = formattedItems.trim();
    }

    return { mainContent: mainContent.trim(), items, media };
    
  } catch (error) {
    if (error instanceof Error) {
      log.error(`Error during API call: ${error.name}: ${error.message}`);
    } else {
      log.error(`Unexpected error during API call: ${error}`);
    }
    throw error; // Re-throw for handling in callTool
  }
}

// Define types for tool parameters
interface CallToolParams {
  query?: string;
  [key: string]: any;
}

server.registerCallToolHandler(async (toolName: string, params: CallToolParams) => {
  log.info(`Handling call_tool request: name='${toolName}'`);
  try {
    if (toolName !== 'agentic_search') {
      throw new McpError(
        ErrorCode.UNKNOWN_TOOL,
        `Tool not found: ${toolName}`
      );
    }

    // Validate required parameters
    const { query } = params;
    if (!query || typeof query !== 'string') {
      throw new McpError(
        ErrorCode.INVALID_PARAMS,
        "Missing 'query' argument."
      );
    }

    // Call API and handle errors
    try {
      const { mainContent, items, media } = await callAgenticSearchApi(query);
      
      // Process results
      const mcpResponseParts = [];
      
      if (mainContent) {
        mcpResponseParts.push(new TextContent(mainContent));
      }
      
      if (items) {
        mcpResponseParts.push(
          new EmbeddedResource({
            uri: 'mcp://search/results',
            title: 'Search Results',
            data: { results: items },
          })
        );
      }
      
      if (media) {
        for (const [mediaType, mediaData] of Object.entries(media)) {
          if (mediaData && (Array.isArray(mediaData) || typeof mediaData === 'string')) {
            const uri = mediaType !== 'html' ? `mcp://media/${mediaType}` : 'mcp://scraped/html';
            const desc = mediaType === 'html' ? `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} Content` 
                                             : `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} Results`;
            
            mcpResponseParts.push(
              new EmbeddedResource({
                uri: uri,
                title: desc,
                data: { [mediaType]: mediaData },
              })
            );
          }
        }
      }
      
      if (mcpResponseParts.length === 0) {
        return [new TextContent('Agentic Search completed but returned no usable results.')];
      }
      
      log.info(`Tool call successful, returning ${mcpResponseParts.length} parts.`);
      return mcpResponseParts;
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('Server configuration error')) {
        throw new McpError(
          ErrorCode.INVALID_PARAMS,
          `Server Config Error: ${error.message}`
        );
      } else if (error instanceof Error && error.message.startsWith('HTTP')) {
        throw new McpError(
          ErrorCode.INTERNAL_ERROR,
          `API request failed (${error.message}). Check server logs.`
        );
      } else if (error instanceof Error && 
                (error.name === 'TypeError' || error.name === 'NetworkError')) {
        throw new McpError(
          ErrorCode.INTERNAL_ERROR,
          `API connection error (${error.name}).`
        );
      } else if (error instanceof Error && error.name === 'AbortError') {
        throw new McpError(
          ErrorCode.INTERNAL_ERROR,
          'API request timed out.'
        );
      } else if (error instanceof SyntaxError) {
        throw new McpError(
          ErrorCode.INTERNAL_ERROR,
          'Error parsing API response.'
        );
      } else {
        throw new McpError(
          ErrorCode.INTERNAL_ERROR,
          `Error executing search: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  } catch (error) {
    if (error instanceof McpError) throw error;
    
    log.error(`Unexpected error processing call_tool: ${error}`);
    throw new McpError(
      ErrorCode.INTERNAL_ERROR,
      'An unexpected server error occurred.'
    );
  }
});

// Start server
log.info(`Starting ${SERVER_NAME}...`);
try {
  server.start();
  log.info(`${SERVER_NAME} started`);
} catch (error) {
  log.critical(`Failed to start server: ${error}`);
  process.exit(1);
} 