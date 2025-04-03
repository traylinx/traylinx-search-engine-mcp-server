declare module '@modelcontextprotocol/sdk' {
  export class McpServer {
    constructor(options: { transport: any });
    registerToolsHandler(handler: () => Promise<any[]>): void;
    registerPromptsHandler(handler: () => Promise<any[]>): void;
    registerGetPromptHandler(handler: (promptName: string, args: any) => Promise<any>): void;
    registerCallToolHandler(handler: (toolName: string, params: any) => Promise<any[]>): void;
    start(): void;
  }

  export class McpError extends Error {
    constructor(code: ErrorCode, message: string);
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

  export class StdioTransport {
    constructor();
  }
} 