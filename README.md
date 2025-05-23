# Obsidian MCP Plugin

An Obsidian plugin that provides MCP (Model Context Protocol) server functionality, enabling external MCP clients like Claude Desktop to interact with your Obsidian vault.

## Features

- 🔐 **Secure Authentication**: API key-based authentication for secure connections
- 🌐 **HTTP Server**: Local HTTP server for MCP client communication
- 🌉 **Bridge Script**: Included bridge script for seamless MCP protocol translation
- ⚙️ **Auto-Configuration**: Automatic configuration generation for MCP clients
- 🛠️ **Rich Tool Set**: Comprehensive tools for vault interaction
- 🔄 **Real-time Communication**: Direct communication between MCP clients and Obsidian

## What is MCP?

The Model Context Protocol (MCP) is a standardized way for AI assistants to connect to external data sources and tools. This plugin makes your Obsidian vault accessible to MCP-compatible AI clients like Claude Desktop.

## Available Tools

- **File Operations**: List files, read content, append content, delete files
- **Search**: Simple text search and complex metadata-based search  
- **Periodic Notes**: Access daily, weekly, and monthly notes
- **Recent Changes**: Get recently modified files
- **Vault Management**: Comprehensive vault interaction capabilities

## Installation

> **Note**: This plugin is not yet available in the Obsidian Community Plugins store. You'll need to install it manually.

### Manual Installation

1. **Clone the repository into your vault's plugins directory:**
   ```bash
   cd /path/to/your/vault/.obsidian/plugins/
   git clone https://github.com/admjs/obsidian-mcp.git
   cd obsidian-mcp
   ```

2. **Install dependencies and build:**
   ```bash
   npm install
   npm run build
   ```

3. **Enable the plugin:**
   - Open Obsidian
   - Go to Settings → Community Plugins
   - Find "MCP Server" in the list and enable it

## Quick Setup

### 1. Configure the Plugin

1. Open Obsidian Settings → MCP Plugin
2. Set a secure API key
3. Enable and start the HTTP server
4. Note the bridge script path (automatically configured)

### 2. Configure Your MCP Client

1. Click "Generate Configuration" in the plugin settings
2. Copy the generated configuration
3. Add it to your MCP client's configuration file

#### For Claude Desktop:

**Configuration file locations:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

**Example configuration:**
```json
{
  "mcpServers": {
    "obsidian": {
      "command": "node",
      "args": ["/path/to/your/vault/.obsidian/plugins/obsidian-mcp/scripts/obsidian-mcp-bridge.js"],
      "env": {
        "OBSIDIAN_API_KEY": "your-api-key",
        "OBSIDIAN_VAULT_PATH": "/path/to/your/vault",
        "OBSIDIAN_SERVER_PORT": "28734",
        "OBSIDIAN_SERVER_HOST": "localhost"
      }
    }
  }
}
```

### 3. Restart Your MCP Client

Restart Claude Desktop (or your MCP client) to load the new server configuration.

## How It Works

1. **Plugin HTTP Server**: The plugin runs a local HTTP server (default port 28734)
2. **Bridge Script**: The included bridge script (`scripts/obsidian-mcp-bridge.js`) translates MCP protocol to HTTP API calls
3. **MCP Client**: Your MCP client (like Claude Desktop) runs the bridge script as a subprocess
4. **Communication Flow**: MCP Client ↔ Bridge Script ↔ HTTP Server ↔ Obsidian Plugin

## Configuration Options

### Basic Settings
- **API Key**: Secure authentication key for HTTP server access
- **HTTP Server Port**: Port for the local HTTP server (default: 28734)
- **Bridge Script Path**: Path to the bridge script (auto-configured)

### Server Controls
- **Enable/Disable HTTP Server**: Toggle server on/off
- **Server Status**: Real-time server status display
- **Test Functions**: Built-in testing for server connectivity

## Security

- 🔒 **Local Only**: HTTP server only accepts connections from localhost
- 🔑 **API Key Authentication**: All requests require valid API key
- 🛡️ **Sandboxed**: Plugin runs within Obsidian's security context
- 🔐 **No External Access**: No data leaves your local machine

## Troubleshooting

### Common Issues

1. **"HTTP server test failed"**
   - Ensure the HTTP server is running
   - Check that your API key is set
   - Verify the port is not blocked

2. **"Failed to connect to Obsidian plugin"**
   - Make sure Obsidian is running
   - Verify the MCP plugin is enabled
   - Check the API key in your MCP client configuration

3. **"Bridge script not found"**
   - Use the "Reset to Default" button to restore the bridge script path
   - Ensure the bridge script file exists and is executable
   - Make sure you copied the `scripts/` folder during installation

4. **"Cannot find module" error in MCP client**
   - Verify the bridge script path in your MCP client configuration
   - Ensure Node.js is installed and accessible
   - Make the bridge script executable: `chmod +x /path/to/bridge/script`

### Testing

Use the built-in test functions in the plugin settings:
- **Test MCP Server**: Verify the core MCP functionality
- **Test HTTP Server**: Check HTTP server connectivity
- **Show Available Tools**: Display all available tools and their schemas

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/admjs/obsidian-mcp.git
cd obsidian-mcp

# Install dependencies
npm install

# Build for development (with hot reloading)
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Clean build artifacts
npm run clean
```

### Development Workflow

- `npm run dev` - Start development build with hot reloading
- `npm run build` - Create production build
- `npm run lint` - Check code quality
- `npm run lint:fix` - Auto-fix linting issues
- `npm run clean` - Remove build artifacts

### Architecture

- **`src/main.ts`**: Main plugin file with settings and lifecycle management
- **`src/mcp/server.ts`**: Core MCP server implementation
- **`src/mcp/httpServer.ts`**: HTTP server for external communication
- **`src/mcp/tools/`**: Individual tool implementations
- **`scripts/obsidian-mcp-bridge.js`**: Bridge script for MCP protocol translation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 **Documentation**: Check the plugin settings for detailed setup instructions
- 🐛 **Issues**: Report bugs on [GitHub Issues](https://github.com/admjs/obsidian-mcp/issues)
- 💡 **Feature Requests**: Suggest improvements via GitHub issues
- 🔧 **Support**: Use the built-in test functions for troubleshooting

## Roadmap

- [ ] Submit to Obsidian Community Plugins store
- [ ] Add more MCP tool implementations
- [ ] Improve auto-configuration detection
- [ ] Add plugin marketplace integration
