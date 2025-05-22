import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { MCPServer } from './mcp/server';

interface MCPPluginSettings {
    apiKey: string;
}

const DEFAULT_SETTINGS: MCPPluginSettings = {
    apiKey: ''
}

export default class MCPPlugin extends Plugin {
    settings: MCPPluginSettings;
    mcpServer: MCPServer;

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
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    private startMCPServer() {
        // TODO: Implement MCP server startup
        // This will involve setting up the communication channel
        // between the MCP client and our server
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
    }
} 