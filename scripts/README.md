# MCP Bridge Scripts

This directory contains bridge scripts that enable external MCP clients (like Claude Desktop) to communicate with the Obsidian MCP plugin.

## obsidian-mcp-bridge.js

This is the main bridge script that:

1. **Implements the MCP protocol** - Handles JSON-RPC communication via stdin/stdout
2. **Communicates with Obsidian** - Makes HTTP requests to the plugin's local server
3. **Handles authentication** - Uses API keys for secure communication
4. **Provides error handling** - Gracefully handles connection and protocol errors

### How it works

1. MCP clients (like Claude Desktop) start this script as a subprocess
2. The script connects to the Obsidian plugin's HTTP server (default port 28734)
3. MCP protocol messages are translated to HTTP API calls
4. Results are returned to the MCP client in the correct format

### Environment Variables

The script requires these environment variables:

- `OBSIDIAN_API_KEY` - API key configured in the plugin settings
- `OBSIDIAN_VAULT_PATH` - Path to your Obsidian vault
- `OBSIDIAN_SERVER_PORT` - HTTP server port (default: 28734)
- `OBSIDIAN_SERVER_HOST` - HTTP server host (default: localhost)

### Usage

The script is automatically configured when you use the plugin's settings to generate MCP client configuration. You don't need to modify this script directly.

For manual setup:

```bash
# Make it executable
chmod +x obsidian-mcp-bridge.js

# Test it manually (not recommended - use plugin settings instead)
OBSIDIAN_API_KEY=your-key OBSIDIAN_VAULT_PATH=/path/to/vault node obsidian-mcp-bridge.js
```

### Troubleshooting

If you encounter issues:

1. Check that the Obsidian MCP plugin is loaded and the HTTP server is running
2. Verify your API key is correct
3. Ensure the vault path is accessible
4. Check the console output for error messages
5. Test the HTTP server using the plugin's test buttons 