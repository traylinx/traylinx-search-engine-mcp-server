# Traylinx Search Engine MCP Server

[![smithery badge](https://smithery.ai/badge/traylinx-search-engine-mcp-server)](https://smithery.ai/server/traylinx-search-engine-mcp-server) <!-- Update URL if you publish -->

A Model Context Protocol (MCP) server that acts as a bridge to the deployed **Agentic Search API**. It allows MCP clients like Claude Desktop and Cursor to utilize intelligent search capabilities with both text summaries and structured data (HTML, images, and more).

## Tools

### `agentic_search`
Performs intelligent searches across the web with advanced capabilities including text extraction, HTML parsing, and media handling.

**Inputs:**
- `query` (string): The search query, question, or URL to process.

## How it Works

1. You configure this MCP server with your Agentic Search API URL and API Key (via environment variables passed by the client config).
2. An MCP client (e.g., Claude) sends a tool call to this server with a `query`.
3. This MCP server makes a request to the Agentic Search API with the query and authorization header.
4. It parses the rich response (text, HTML, search results, media) and returns structured content to the MCP client.

## Installation

### Prerequisites

* Node.js >= 18.0.0
* An API Key from Traylinx.com

### Step 1: Get an API Key from Traylinx

1. Visit [traylinx.com](https://traylinx.com) and sign up for an account
2. Navigate to the developer dashboard/API section
3. Generate your API key for the Agentic Search API
4. Keep this key secure - you'll need it for configuration

### Step 2: Set Up the MCP Server

```bash
# Clone the repository
git clone https://github.com/traylinx/traylinx-search-engine-mcp-server.git
cd traylinx-search-engine-mcp-server

# Install dependencies
npm install

# Build the project
npm run build
```

### Step 3: Configure Your MCP Client

#### For Claude Desktop

Edit your `claude_desktop_config.json` file:

```json
{
  "mcpServers": {
    "traylinx-search-engine-mcp-server": {
      "command": "node",
      "args": ["path/to/traylinx-search-engine-mcp-server/dist/index.js"],
      "env": {
        "AGENTIC_SEARCH_API_KEY": "sk-lf-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "AGENTIC_SEARCH_API_URL": "https://agentic-search-engines-n3n7u.ondigitalocean.app",
        "LOG_LEVEL": "INFO"
      }
    }
  }
}
```

You can access this file at:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

#### For Cursor

Edit your `mcp.json` file:

```json
{
  "traylinx-search-engine-mcp-server": {
    "env": {
      "AGENTIC_SEARCH_API_KEY": "sk-lf-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "AGENTIC_SEARCH_API_URL": "https://agentic-search-engines-n3n7u.ondigitalocean.app",
      "LOG_LEVEL": "INFO"
    },
    "command": "node",
    "args": ["path/to/traylinx-search-engine-mcp-server/dist/index.js"]
  }
}
```

**IMPORTANT: Replace the placeholder API key with your actual key from Traylinx.com**

## Verification

1. After configuring your MCP client, restart it completely.
2. Start a new chat and instruct it to use the tool:
   - "Use agentic_search to find information about quantum computing."
   - "Extract text and HTML from the URL https://traylinx.com"
3. When the client requests permission, grant it.
4. You should receive a response containing both text content and potentially structured data.

## Advanced Usage

The Traylinx Search Engine MCP Server supports multiple response types:

* **Text Content**: Standard markdown text summarizing the search results
* **Embedded HTML**: For URL extractions, the server can return the scraped HTML
* **Search Items**: Structured search results with title, URL, and snippet
* **Media Items**: Images, videos, and other media found during the search

## Features

* **Rich Content Types**: Returns multiple content types beyond just text
* **Secure API Key Handling**: API key stays in environment variables
* **Configurable Endpoint**: Easily switch between API endpoints if needed
* **Full MCP Compliance**: Implements all required MCP server methods

## Troubleshooting

If you encounter issues:

1. Check your API key is correctly set in the configuration
2. Ensure the MCP client has been fully restarted after configuration
3. Verify network connectivity to the Agentic Search API
4. Set `LOG_LEVEL` to `DEBUG` for more detailed logs

For additional support, contact the API provider at support@traylinx.com

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 