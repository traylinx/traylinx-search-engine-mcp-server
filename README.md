# Traylinx Search Engine MCP Server

[![smithery badge](https://smithery.ai/badge/traylinx/traylinx-search-engine-mcp-server)](https://smithery.ai/server/traylinx/traylinx-search-engine-mcp-server)

A Model Context Protocol (MCP) server that acts as a bridge to the deployed **Agentic Search API**. It allows MCP clients like Claude Desktop and Cursor to utilize intelligent search capabilities with both text summaries and structured data (HTML, images, and more).

## Tools

### `search`
Perform a web search using Traylinx's API, which provides detailed and contextually relevant results with citations. By default, no time filtering is applied to search results.

**Inputs:**
- `query` (string): The search query to perform.
- `search_recency_filter` (string, optional): Filter search results by recency. Options: "month", "week", "day", "hour". If not specified, no time filtering is applied.

## How it Works

1. You configure this MCP server with your Agentic Search API URL and API Key (via environment variables passed by the client config).
2. An MCP client (e.g., Claude) sends a tool call to this server with a search query and optional recency filter.
3. This MCP server makes a request to the Agentic Search API with the query and authorization header.
4. It parses the rich response (text, HTML, search results, media, news) and returns structured content to the MCP client.

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
   - "Use the search tool to find information about quantum computing."
   - "Search for the latest news about artificial intelligence and filter by last week."
   - "Extract text and HTML from the URL https://traylinx.com"
3. When the client requests permission, grant it.
4. You should receive a response containing both text content and potentially structured data.

## Advanced Usage

The Traylinx Search Engine MCP Server supports multiple response types:

* **Text Content**: Standard markdown text summarizing the search results
* **Embedded HTML**: For URL extractions, the server can return the scraped HTML
* **Search Items**: Structured search results with title, URL, and snippet
* **Media Items**: Images, videos, and other media found during the search
* **News Articles**: Recent news with thumbnails and metadata
* **Raw API Response**: Complete response data for advanced use cases

### Using the Recency Filter

To filter search results by recency:

```
// Example from Claude Desktop
Use the search tool to find recent news about SpaceX with results from the last day only.

// Example from a custom client
{
  "name": "search",
  "arguments": {
    "query": "SpaceX launches",
    "search_recency_filter": "week"
  }
}
```

## Features

* **Rich Content Types**: Returns multiple content types beyond just text
* **Time Filtering**: Filter results by recency (month, week, day, hour)
* **Secure API Key Handling**: API key stays in environment variables
* **Configurable Endpoint**: Easily switch between API endpoints if needed
* **Full MCP Compliance**: Implements all required MCP server methods

## Deployment

### Smithery.ai Deployment

This MCP server can be deployed to [Smithery.ai](https://smithery.ai):

1. Create/login to your Smithery account
2. Click "Deploy a New MCP Server"
3. Enter ID: `traylinx-search-engine-mcp-server`  
4. Use base directory: `.` (dot for root)
5. Click "Create"

Once deployed, you can reference this server in Claude's web interface by using:
```
Use the traylinx-search-engine-mcp-server to search for [your query]
```

**Note:** You'll need to provide your `AGENTIC_SEARCH_API_KEY` as an environment variable in the Smithery deployment settings.

## Troubleshooting

If you encounter issues:

1. Check your API key is correctly set in the configuration
2. Ensure the MCP client has been fully restarted after configuration
3. Verify network connectivity to the Agentic Search API
4. Set `LOG_LEVEL` to `DEBUG` for more detailed logs

For additional support, contact the API provider at support@traylinx.com

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 