import { App, Plugin, PluginSettingTab, Setting, Notice } from 'obsidian';
import { MCPServer } from './mcp/server';
import WebSocket from 'ws';

interface MCPPluginSettings {
    apiKey: string;
    port: number;
}

const DEFAULT_SETTINGS: MCPPluginSettings = {
    apiKey: '',
    port: 3000
}

interface WebSocketMessage {
    type: string;
    apiKey?: string;
    tool?: string;
    args?: any;
}

export default class MCPPlugin extends Plugin {
    settings: MCPPluginSettings;
    mcpServer: MCPServer;
    private wsServer: WebSocket.Server | null = null;

    async onload() {
        await this.loadSettings();
        this.mcpServer = new MCPServer(this.app);

        // Add settings tab
        this.addSettingTab(new MCPSettingTab(this.app, this));

        // Start MCP server
        this.startMCPServer();
    }

    onunload() {
        // Cleanup when plugin is disabled
        if (this.wsServer) {
            this.wsServer.close();
            this.wsServer = null;
        }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    private startMCPServer() {
        if (!this.settings.apiKey) {
            new Notice('MCP Server: API key not set. Please configure in settings.');
            return;
        }

        try {
            this.wsServer = new WebSocket.Server({ port: this.settings.port });
            
            this.wsServer.on('connection', (ws: WebSocket) => {
                let authenticated = false;

                ws.on('message', async (message: WebSocket.Data) => {
                    try {
                        const data = JSON.parse(message.toString()) as WebSocketMessage;
                        
                        // Handle authentication
                        if (!authenticated) {
                            if (data.type === 'auth' && data.apiKey === this.settings.apiKey) {
                                authenticated = true;
                                ws.send(JSON.stringify({ type: 'auth', status: 'success' }));
                            } else {
                                ws.send(JSON.stringify({ type: 'auth', status: 'error', message: 'Invalid API key' }));
                                ws.close();
                            }
                            return;
                        }

                        // Handle tool calls
                        if (data.type === 'tool_call' && data.tool && data.args) {
                            const result = await this.mcpServer.handleToolCall(data.tool, data.args);
                            ws.send(JSON.stringify({ type: 'tool_result', result }));
                        }
                    } catch (error) {
                        ws.send(JSON.stringify({ type: 'error', message: error.message }));
                    }
                });

                ws.on('close', () => {
                    authenticated = false;
                });
            });

            new Notice(`MCP Server started on port ${this.settings.port}`);
        } catch (error) {
            new Notice(`Failed to start MCP Server: ${error.message}`);
        }
    }
}

class MCPSettingTab extends PluginSettingTab {
    plugin: MCPPlugin;

    constructor(app: App, plugin: MCPPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName('API Key')
            .setDesc('API key for MCP client authentication')
            .addText(text => text
                .setPlaceholder('Enter your API key')
                .setValue(this.plugin.settings.apiKey)
                .onChange(async (value) => {
                    this.plugin.settings.apiKey = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Server Port')
            .setDesc('Port for the MCP server to listen on')
            .addText(text => text
                .setPlaceholder('Enter port number')
                .setValue(this.plugin.settings.port.toString())
                .onChange(async (value) => {
                    const port = parseInt(value);
                    if (!isNaN(port) && port > 0 && port < 65536) {
                        this.plugin.settings.port = port;
                        await this.plugin.saveSettings();
                    }
                }));
    }
} 