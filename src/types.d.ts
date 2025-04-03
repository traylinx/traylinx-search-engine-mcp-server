declare module '@modelcontextprotocol/sdk/server/index.js' {
  export class Server {
    constructor(serverInfo: { name: string; version: string }, options?: { capabilities: any });
    setRequestHandler(schema: any, handler: any): void;
    connect(transport: any): Promise<void>;
    registerToolsHandler(handler: () => Promise<any[]>): void;
    registerPromptsHandler(handler: () => Promise<any[]>): void;
    registerGetPromptHandler(handler: (promptName: string, args: any) => Promise<any>): void;
    registerCallToolHandler(handler: (toolName: string, params: any) => Promise<any[]>): void;
    start(): void;
  }
}

declare module '@modelcontextprotocol/sdk/server/stdio.js' {
  export class StdioServerTransport {
    constructor();
  }
}

declare module '@modelcontextprotocol/sdk/types.js' {
  export class McpError extends Error {
    constructor(code: ErrorCode, message: string);
    code: ErrorCode;
  }

  export enum ErrorCode {
    PARSE_ERROR = -32700,
    INVALID_REQUEST = -32600,
    METHOD_NOT_FOUND = -32601,
    INVALID_PARAMS = -32602,
    INTERNAL_ERROR = -32603,
    UNKNOWN_TOOL = -32000,
    UNKNOWN_PROMPT = -32001,
    TOOL_EXECUTION_ERROR = -32002,
  }

  export class TextContent {
    constructor(text: string);
    type: 'text';
    text: string;
  }

  export class EmbeddedResource {
    constructor(options: { uri: string; title?: string; data: any });
    type: 'embedded_resource';
    uri: string;
    title?: string;
    data: any;
  }

  export interface Tool {
    name: string;
    description: string;
    inputSchema: any;
  }

  export const ListToolsRequestSchema: any;
  export const CallToolRequestSchema: any;
  export const ListPromptsRequestSchema: any;
  export const GetPromptRequestSchema: any;
} 