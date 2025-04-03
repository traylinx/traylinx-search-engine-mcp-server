#!/usr/bin/env node

// Use direct file imports with simplified paths
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ErrorCode,
  McpError,
  TextContent,
  EmbeddedResource,
  ListToolsRequestSchema,
  CallToolRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import dotenv from 'dotenv';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
// Use URL constructor directly, don't redeclare it
// const { URL } = require('url');


// --- Constants and Version ---
let version = '1.0.1'; // Default fallback version
try {
    // Use ESM-compatible package.json loading
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const packageJsonPath = resolve(__dirname, '../package.json');
    const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);
    version = packageJson.version;
} catch (e) {
    console.error("[WARN] Could not read version from package.json, using fallback.");
}
const SERVER_NAME = 'traylinx-search-engine-mcp-server'; // Consistent name

// --- Logging Setup (to stderr) ---
const LOG_LEVEL = process.env.LOG_LEVEL?.toUpperCase() || "INFO";
const logLevels: { [key: string]: number } = { DEBUG: 1, INFO: 2, WARN: 3, ERROR: 4, CRITICAL: 5 };
const currentLogLevel = logLevels[LOG_LEVEL] || logLevels.INFO;
const log = {
    debug: (message: string, ...args: any[]) => { if (currentLogLevel <= logLevels.DEBUG) console.error(`[DEBUG] ${new Date().toISOString()} ${SERVER_NAME}: ${message}`, ...args); },
    info: (message: string, ...args: any[]) => { if (currentLogLevel <= logLevels.INFO) console.error(`[INFO] ${new Date().toISOString()} ${SERVER_NAME}: ${message}`, ...args); },
    warn: (message: string, ...args: any[]) => { if (currentLogLevel <= logLevels.WARN) console.error(`[WARN] ${new Date().toISOString()} ${SERVER_NAME}: ${message}`, ...args); },
    error: (message: string, ...args: any[]) => { if (currentLogLevel <= logLevels.ERROR) console.error(`[ERROR] ${new Date().toISOString()} ${SERVER_NAME}: ${message}`, ...args); },
    critical: (message: string, ...args: any[]) => { if (currentLogLevel <= logLevels.CRITICAL) console.error(`[CRITICAL] ${new Date().toISOString()} ${SERVER_NAME}: ${message}`, ...args); },
};

// --- Initial Log Messages & Config Check ---
log.info(`${SERVER_NAME} v${version} starting...`);
log.info(`Node.js Version: ${process.version}`);
log.info(`Log Level: ${LOG_LEVEL}`);
dotenv.config(); // Load .env
log.debug(".env file loaded (if exists).");

const AGENTIC_SEARCH_API_KEY = process.env.AGENTIC_SEARCH_API_KEY;
const AGENTIC_SEARCH_API_URL_DEFAULT = "https://agentic-search-engines-n3n7u.ondigitalocean.app";
const AGENTIC_SEARCH_API_URL_INPUT = process.env.AGENTIC_SEARCH_API_URL;
let AGENTIC_SEARCH_API_URL = AGENTIC_SEARCH_API_URL_INPUT || AGENTIC_SEARCH_API_URL_DEFAULT;
const API_ENDPOINT_PATH = "/v1/chat/completions";

log.info(`API Key Check: ${AGENTIC_SEARCH_API_KEY ? 'Present' : 'MISSING!'}`);
log.info(`API URL Check: Input='${AGENTIC_SEARCH_API_URL_INPUT || 'Not Set'}', Using='${AGENTIC_SEARCH_API_URL}'`);

if (!AGENTIC_SEARCH_API_KEY) {
    log.critical("STARTUP FAILURE: AGENTIC_SEARCH_API_KEY env var is missing.");
    process.exit(1); // Exit immediately
}

let apiBaseUrl = AGENTIC_SEARCH_API_URL;
if (apiBaseUrl.includes(API_ENDPOINT_PATH)) {
    apiBaseUrl = apiBaseUrl.substring(0, apiBaseUrl.indexOf(API_ENDPOINT_PATH));
}
apiBaseUrl = apiBaseUrl.replace(/\/+$/, '');
try {
    new URL(apiBaseUrl);
} catch (error) {
    log.critical(`STARTUP FAILURE: Invalid AGENTIC_SEARCH_API_URL: '${apiBaseUrl}'`);
    process.exit(1); // Exit immediately
}
const FINAL_API_URL = `${apiBaseUrl}${API_ENDPOINT_PATH}`;
log.info(`Final API Endpoint: ${FINAL_API_URL}`);

// --- Tool Definition (Static) ---
const AGENTIC_SEARCH_TOOL = {
    name: "search",
    description: "Perform a web search using Traylinx's API, which provides detailed and contextually relevant results with citations. By default, no time filtering is applied to search results.",
    inputSchema: {
        type: "object",
        properties: { 
            query: { 
                type: "string", 
                description: "The search query to perform"
            },
            search_recency_filter: {
                type: "string",
                description: "Filter search results by recency (options: month, week, day, hour). If not specified, no time filtering is applied.",
                enum: ["month", "week", "day", "hour"]
            }
        },
        required: ["query"],
    },
};

// --- API Calling Function ---
interface SearchItem { title?: string; snippet?: string; url?: string; [key: string]: any; }
interface ApiResponse { 
    mainContent: string; 
    items: SearchItem[] | null; 
    media: Record<string, any> | null;
    citations: string[] | null;
    news?: any[] | null;
    id?: string;
    model?: string;
    created?: number;
    usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
    };
}

async function callAgenticSearchApi(query: string, recencyFilter?: string): Promise<ApiResponse> {
    // API Key & URL checked at startup, assumed valid here
    const payload = { 
        model: "agentic-search", 
        messages: [{ role: "user", content: query }],
        options: recencyFilter ? { recency_filter: recencyFilter } : undefined
    };
    const headers = {
        "Authorization": `Bearer ${AGENTIC_SEARCH_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
    };
    log.info(`Calling API: ${FINAL_API_URL}`);
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 90000);
        const response = await fetch(FINAL_API_URL, {
            method: "POST", headers, body: JSON.stringify(payload), signal: controller.signal,
        });
        clearTimeout(timeoutId);

        log.info(`API Status: ${response.status}`);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        const data = await response.json() as any;
        log.debug("Parsed API response.");

        // Extract all possible fields
        let mainContent = data?.choices?.[0]?.message?.content || "";
        const citations = data?.citations as string[] | undefined;
        const items = Array.isArray(data?.items) ? data.items : null;
        const media = typeof data?.media === 'object' && data.media !== null ? data.media : null;
        
        // Use more data fields from the response
        const news = media?.news || null;
        const id = data?.id;
        const model = data?.model;
        const created = data?.created;
        const usage = data?.usage;

        // Format citations if present but not already in mainContent
        if (citations?.length && !mainContent.includes("**Sources:**")) {
            const formattedCitations = "\n\n**Sources:**\n" + citations.map(c => `- <${c}>`).join("\n");
            if (mainContent) mainContent += formattedCitations;
        }
        
        // If no main content but we have items, format them
        if (!mainContent.trim() && items) {
             const formattedItems = "**Search Results:**\n" + items.map((item: SearchItem) => `- **${item.title || 'N/A'}**: ${item.snippet || 'N/A'}\n  <${item.url || 'N/A'}>\n`).join("");
             mainContent = formattedItems.trim();
        }
        
        // Return complete response with all fields
        return { 
            mainContent: mainContent.trim(), 
            items, 
            media,
            citations: citations || null,
            news,
            id,
            model,
            created,
            usage
        };
    } catch (error: any) {
        log.error(`Error in callAgenticSearchApi: ${error.name}: ${error.message}`);
        if (error.name === 'AbortError') throw new Error("API request timed out.");
        throw error;
    }
}

// --- MCP Server Setup (Following Perplexity pattern) ---
try {
    log.info("Initializing MCP Server...");
    
    // Create server with name, version, and capabilities (matching Perplexity pattern)
    const server = new Server(
        { 
            name: SERVER_NAME, 
            version: version 
        },
        {
            capabilities: {
                tools: {},
            }
        }
    );
    log.info("MCP Server instance created.");

    // --- Define request handlers using schemas ---

    // List Tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        log.info("Handling listTools request.");
        try {
            return { tools: [AGENTIC_SEARCH_TOOL] };
        } catch (e: any) {
             log.error(`FATAL ERROR during listTools handler: ${e.message}`);
             throw new McpError(ErrorCode.INTERNAL_ERROR, `Server error listing tools: ${e.message}`);
        }
    });
    log.debug("listTools handler registered.");

    // Call Tool
    server.setRequestHandler(CallToolRequestSchema, async (request: { params: { name: string; arguments: any } }) => {
        const { name, arguments: args } = request.params;
        log.info(`Handling callTool request: name='${name}'`);
        
        try {
            if (name !== AGENTIC_SEARCH_TOOL.name) {
                return {
                    content: [{ type: "text", text: `Unknown tool: ${name}` }],
                    isError: true,
                };
            }
            
            const query = args?.query;
            const recencyFilter = args?.search_recency_filter;
            
            if (typeof query !== 'string' || !query) {
                return {
                    content: [{ type: "text", text: "Missing or invalid 'query' argument." }],
                    isError: true,
                };
            }

            if (recencyFilter && !["month", "week", "day", "hour"].includes(recencyFilter)) {
                return {
                    content: [{ type: "text", text: "Invalid search_recency_filter value. Must be one of: month, week, day, hour" }],
                    isError: true,
                };
            }

            const response = await callAgenticSearchApi(query, recencyFilter);
            const { 
                mainContent, 
                items, 
                media, 
                citations, 
                news, 
                id, 
                model, 
                created, 
                usage 
            } = response;

            const responseParts = [];
            
            // Add main text content
            if (mainContent) responseParts.push({ type: "text", text: mainContent });
            
            // Create a comprehensive search results object that includes everything
            const completeSearchData = {
                metadata: {
                    id,
                    model,
                    created,
                    usage
                },
                results: items || [],
                citations: citations || [],
                news: news || []
            };
            
            // Add the comprehensive data as a single embedded resource
            responseParts.push({ 
                type: "embedded_resource", 
                uri: "mcp://search/complete_results", 
                title: "Complete Search Results", 
                data: completeSearchData
            });
            
            // Also add each component separately for clients that support it
            
            // Add search results as embedded resource
            if (items && items.length > 0) {
                responseParts.push({ 
                    type: "embedded_resource", 
                    uri: "mcp://search/results", 
                    title: "Search Results", 
                    data: { results: items }
                });
            }
            
            // Add citations as a specific resource
            if (citations && citations.length > 0) {
                responseParts.push({ 
                    type: "embedded_resource", 
                    uri: "mcp://search/citations", 
                    title: "Citations", 
                    data: { citations }
                });
            }
            
            // Add news as a specific resource type with proper structure
            if (news && news.length) {
                responseParts.push({ 
                    type: "embedded_resource", 
                    uri: "mcp://search/news", 
                    title: "News Results", 
                    data: { news }
                });
            }
            
            // Process other media types 
            if (media) {
                for (const [mediaType, mediaData] of Object.entries(media)) {
                    // Skip news since we already handled it
                    if (mediaType === 'news') continue;
                    
                    if (mediaData && (Array.isArray(mediaData) || typeof mediaData === 'string' || typeof mediaData === 'object')) {
                        const uri = mediaType === "html" ? "mcp://scraped/html" : `mcp://media/${mediaType}`;
                        const desc = mediaType === "html" ? "Scraped HTML" : `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} Results`;
                        responseParts.push({ 
                            type: "embedded_resource",
                            uri, 
                            title: desc, 
                            data: { [mediaType]: mediaData }
                        });
                    }
                }
            }
            
            // Add the raw API response as a special resource for debugging and full access
            responseParts.push({ 
                type: "embedded_resource", 
                uri: "mcp://search/raw_response", 
                title: "Raw API Response", 
                data: response 
            });
            
            if (responseParts.length === 0) {
                responseParts.push({ type: "text", text: "Agentic Search completed but returned no results." });
            }

            log.info(`callTool successful, returning ${responseParts.length} parts.`);
            return { content: responseParts, isError: false };

        } catch (error: any) {
            log.error(`Error processing callTool '${name}': ${error.message || error}`);
            return {
                content: [{ 
                    type: "text", 
                    text: `Error: ${error instanceof Error ? error.message : String(error)}` 
                }],
                isError: true,
            };
        }
    });
    log.debug("callTool handler registered.");

    // --- Run Server Using Async Function ---
    async function runServer() {
        try {
            const transport = new StdioServerTransport();
            await server.connect(transport);
            log.info(`${SERVER_NAME} successfully connected via stdio and running.`);
        } catch (error: any) {
            log.critical(`Failed to connect server transport: ${error.message || error}`);
            process.exit(1);
        }
    }

    // Start the server
    runServer().catch((error) => {
        log.critical(`Unhandled error during server run: ${error.message || error}`);
        process.exit(1);
    });

} catch (e: any) {
    // Catch synchronous startup errors
    log.critical(`Synchronous startup error: ${e.message || e}`);
    process.exit(1);
} 
