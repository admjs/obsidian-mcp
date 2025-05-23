# Obsidian MCP Plugin

An Obsidian plugin that provides MCP (Model Context Protocol) server functionality, enabling external MCP clients like Claude Desktop to interact with your Obsidian vault.

## Features

- 🔐 **Authentication**: API key-based authentication for secure connections
- 🌐 **HTTP Server**: Local HTTP server for MCP client communication
- 🌉 **Bridge Script**: Included bridge script for MCP protocol translation
- ⚙️ **Auto-Configuration**: Automatic configuration generation for MCP clients
- 🧠 **System Prompt**: Customizable AI system prompt that's automatically enforced
- 🛠️ **Tool Set**: File operations, search, templates, and vault management tools
- 🔄 **Real-time Communication**: Direct communication between MCP clients and Obsidian

## What is MCP?

The Model Context Protocol (MCP) is a standardized way for AI assistants to connect to external data sources and tools. This plugin makes your Obsidian vault accessible to MCP-compatible AI clients like Claude Desktop.

## System Prompt

The system prompt defines how AI assistants interact with your Obsidian vault. It's automatically loaded when MCP clients connect to your vault.

### How it works:
- **Automatic Enforcement**: The system prompt is loaded through a required initialization tool
- **First Tool Called**: MCP clients must call the `obsidian_init_required` tool before accessing any other vault tools
- **Context Loading**: This initialization loads your custom system prompt as the AI's behavioral context
- **Consistent Behavior**: All AI interactions follow your specified guidelines

### System Prompt Enforcement:

The system prompt is enforced through MCP's tool system:
1. **Required Initialization**: The first tool (`obsidian_init_required`) must be called before any vault access
2. **Automatic Loading**: This tool loads your custom system prompt as context
3. **Behavioral Guidelines**: The AI receives your specific instructions for working with your vault
4. **No Manual Steps**: This happens automatically in MCP clients

### Workflow Integration:

The system prompt works with other plugin features:
- **Templates**: Reference your template directory and preferred template usage
- **Search**: Guide how the AI should search and organize information
- **File Operations**: Set rules for creating, modifying, and organizing files
- **Periodic Notes**: Define how daily/weekly/monthly notes should be handled

## Available Tools

- **Vault Initialization**: Required first tool (`obsidian_init_required`) that loads system prompt context
- **File Operations**: List files, read content, append content, delete files
- **Search**: Simple text search and complex metadata-based search  
- **Periodic Notes**: Access daily, weekly, and monthly notes
- **Recent Changes**: Get recently modified files
- **Templates**: Access to note templates from your configured templates directory
- **Vault Management**: Vault interaction capabilities

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
3. **Configure System Prompt**: Edit the AI system prompt to match your workflow
4. Enable and start the HTTP server
5. Note the bridge script path (automatically configured)

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

### 3. Start Using Your Vault

Once configured, MCP clients can access your vault:
1. **Automatic Initialization**: The first tool call loads your system prompt context
2. **Guided Interactions**: The AI follows your custom workflow preferences
3. **No Manual Steps**: System prompt enforcement happens automatically

### 4. Restart Your MCP Client

Restart Claude Desktop (or your MCP client) to load the new server configuration.

## How It Works

1. **Plugin HTTP Server**: The plugin runs a local HTTP server (default port 28734)
2. **Bridge Script**: The included bridge script (`scripts/obsidian-mcp-bridge.js`) translates MCP protocol to HTTP API calls
3. **MCP Client**: Your MCP client (like Claude Desktop) runs the bridge script as a subprocess
4. **Communication Flow**: MCP Client ↔ Bridge Script ↔ HTTP Server ↔ Obsidian Plugin

## Configuration Options

### Basic Settings
- **API Key**: Authentication key for HTTP server access
- **HTTP Server Port**: Port for the local HTTP server (default: 28734)
- **Bridge Script Path**: Path to the bridge script (auto-configured)

### System Prompt Configuration
- **System Prompt**: Prompt that guides AI interactions with your vault
- **Templates Directory**: Directory path for note templates (default: "Templates")
- **Reset to Default**: Button to restore the default system prompt template

### Server Controls
- **Enable/Disable HTTP Server**: Toggle server on/off
- **Server Status**: Current server status display
- **Test Functions**: Built-in testing for server connectivity

### Advanced Features
- **Path Debug Information**: Diagnostic tool for troubleshooting path detection
- **Configuration Generator**: Auto-generates MCP client configuration with detected paths
- **Available Tools Display**: Shows all available MCP tools and their schemas

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
- **Test System Prompt**: Verify system prompt accessibility via MCP
- **Show Available Tools**: Display all available tools and their schemas

### System Prompt Issues

1. **System prompt not loading in MCP client**
   - Ensure the HTTP server is running
   - Verify the system prompt is configured in plugin settings
   - Test using the "Test System Prompt" button
   - Try restarting your MCP client

2. **AI not following custom guidelines**
   - Make sure the initialization tool is being called first
   - Check that your custom prompt is saved in the plugin settings
   - Verify the prompt contains clear, specific instructions

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

- 📖 **Documentation**: Check the plugin settings for setup instructions
- 🐛 **Issues**: Report bugs on [GitHub Issues](https://github.com/admjs/obsidian-mcp/issues)
- 💡 **Feature Requests**: Suggest improvements via GitHub issues
- 🔧 **Support**: Use the built-in test functions for troubleshooting
