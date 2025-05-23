import { App, Plugin, PluginSettingTab, Setting, Notice } from 'obsidian';
import { MCPServer } from './mcp/server';
import { MCPHttpServer } from './mcp/httpServer';
import * as path from 'path';

interface MCPPluginSettings {
    apiKey: string;
    port: number;
    httpServerEnabled: boolean;
    httpServerPort: number;
    bridgeScriptPath: string;
    templatesDir: string;
    systemPrompt: string;
}

const DEFAULT_SETTINGS: MCPPluginSettings = {
    apiKey: '',
    port: 3000,
    httpServerEnabled: true,
    httpServerPort: 28734,
    bridgeScriptPath: '',
    templatesDir: 'Templates',
    systemPrompt: `You are an AI assistant with access to an Obsidian vault through MCP tools. Here are some guidelines for interacting with this vault:

## Style & Behavior:
- Be helpful, concise, and respectful of the user's knowledge management workflow
- When creating or modifying notes, follow consistent markdown formatting
- Use appropriate heading levels, bullet points, and formatting for readability
- Respect existing note structures and naming conventions when possible

## Working with Notes:
- Always check if files exist before creating new ones to avoid duplicates
- When creating daily/periodic notes, use the structured templates provided
- For search operations, try multiple approaches if initial searches don't yield results
- When appending content, consider the existing structure and add appropriate spacing

## Best Practices:
- Suggest meaningful file names and organize content logically
- Use tags and links to maintain vault connectivity
- When uncertain about user preferences, ask for clarification
- Prioritize accuracy and useful organization over speed

Feel free to customize this prompt to match your specific workflow and preferences.`
}

export default class MCPPlugin extends Plugin {
    settings: MCPPluginSettings;
    mcpServer: MCPServer | null = null;
    httpServer: MCPHttpServer | null = null;

    constructor(app: App, manifest: any) {
        super(app, manifest);
        this.settings = { ...DEFAULT_SETTINGS };
    }

    async onload() {
        try {
            await this.loadSettings();
            
            // Initialize MCPServer after settings are loaded
            this.mcpServer = new MCPServer(this.app, this.settings.templatesDir, () => this.settings.systemPrompt);

            // Always refresh bridge script path on load to ensure it's correct
            const detectedBridgePath = this.getBridgeScriptPath();
            console.log('Detected bridge script path on load:', detectedBridgePath);
            
            if (this.settings.bridgeScriptPath !== detectedBridgePath) {
                console.log('Updating bridge script path from:', this.settings.bridgeScriptPath, 'to:', detectedBridgePath);
                this.settings.bridgeScriptPath = detectedBridgePath;
                await this.saveSettings();
            }

            // Initialize HTTP server if enabled
            if (this.settings.httpServerEnabled && this.settings.apiKey) {
                this.httpServer = new MCPHttpServer(
                    this.app, 
                    this.mcpServer, 
                    this.settings.httpServerPort, 
                    this.settings.apiKey
                );
                
                try {
                    await this.httpServer.start();
                    new Notice(`MCP HTTP server started on port ${this.settings.httpServerPort}`);
                } catch (error) {
                    console.error('Failed to start HTTP server:', error);
                    new Notice('Failed to start MCP HTTP server. Check console for details.');
                }
            }

            // Add settings tab
            this.addSettingTab(new MCPSettingTab(this.app, this));

            // Add ribbon icon
            this.addRibbonIcon('server', 'MCP Server', () => {
                const status = this.httpServer?.isServerRunning() ? 'HTTP server running' : 'HTTP server stopped';
                new Notice(`MCP Plugin loaded - ${status}`);
            });

            console.log('MCP Plugin loaded successfully');
            console.log('Final bridge script path:', this.settings.bridgeScriptPath);
            console.log('Vault path:', this.getVaultPath());
            new Notice('MCP Plugin loaded successfully');
        } catch (error) {
            console.error('Failed to load MCP plugin:', error);
            new Notice('Failed to load MCP plugin. Check console for details.');
        }
    }

    async onunload() {
        try {
            if (this.httpServer) {
                await this.httpServer.stop();
                this.httpServer = null;
            }
            this.mcpServer = null;
            console.log('MCP Plugin unloaded');
        } catch (error) {
            console.error('Error unloading MCP plugin:', error);
        }
    }

    async loadSettings() {
        try {
            this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        } catch (error) {
            console.error('Error loading settings:', error);
            this.settings = { ...DEFAULT_SETTINGS };
        }
    }

    async saveSettings() {
        try {
            await this.saveData(this.settings);
        } catch (error) {
            console.error('Error saving settings:', error);
            new Notice('Failed to save settings');
        }
    }

    // Get the path to the bridge script in the plugin directory
    public getBridgeScriptPath(): string {
        console.log('=== Bridge Script Path Detection ===');
        
        try {
            // Method 1: Use detected vault path as base (most reliable)
            const vaultPath = this.getVaultPath();
            console.log('Method 1 - vault path:', vaultPath);
            if (vaultPath !== "/path/to/your/vault") {
                const scriptPath = path.join(vaultPath, '.obsidian', 'plugins', 'obsidian-mcp', 'scripts', 'obsidian-mcp-bridge.js');
                console.log('Method 1 - constructed script path:', scriptPath);
                console.log('Method 1 - path.isAbsolute:', path.isAbsolute(scriptPath));
                console.log('✓ Using bridge script path from vault path:', scriptPath);
                return scriptPath;
            }
            
            // Method 2: Try to get from manifest dir
            // @ts-ignore - accessing the plugin manifest path
            const manifestDir = this.manifest.dir;
            console.log('Method 2 - manifest.dir:', manifestDir);
            if (manifestDir) {
                const scriptPath = path.join(manifestDir, 'scripts', 'obsidian-mcp-bridge.js');
                console.log('Method 2 - constructed script path:', scriptPath);
                console.log('Method 2 - path.isAbsolute:', path.isAbsolute(scriptPath));
                // Ensure it's absolute
                if (path.isAbsolute(scriptPath)) {
                    console.log('✓ Using bridge script path from manifest:', scriptPath);
                    return scriptPath;
                } else {
                    console.log('⚠️ Manifest path is not absolute, skipping');
                }
            }
            
            // Method 3: Try to get from app plugin manager
            // @ts-ignore - accessing plugin manager
            const pluginInstance = this.app.plugins.plugins['obsidian-mcp'];
            console.log('Method 3 - plugin instance:', pluginInstance ? 'exists' : 'undefined');
            if (pluginInstance && pluginInstance.manifest && pluginInstance.manifest.dir) {
                const scriptPath = path.join(pluginInstance.manifest.dir, 'scripts', 'obsidian-mcp-bridge.js');
                console.log('Method 3 - constructed script path:', scriptPath);
                console.log('Method 3 - path.isAbsolute:', path.isAbsolute(scriptPath));
                if (path.isAbsolute(scriptPath)) {
                    console.log('✓ Using bridge script path from plugin manager:', scriptPath);
                    return scriptPath;
                } else {
                    console.log('⚠️ Plugin manager path is not absolute, skipping');
                }
            }
            
            throw new Error('Could not determine absolute plugin directory path');
            
        } catch (error) {
            console.error('Error getting bridge script path:', error);
            console.log('❌ Bridge script path detection failed, using fallback');
            return '/absolute/path/to/.obsidian/plugins/obsidian-mcp/scripts/obsidian-mcp-bridge.js';
        }
    }

    // Get the actual vault path
    public getVaultPath(): string {
        console.log('=== Vault Path Detection ===');
        
        try {
            // Method 1: Try vault adapter path property
            // @ts-ignore - accessing vault adapter path
            const adapterPath = this.app.vault.adapter.path;
            console.log('Method 1 - adapter.path:', adapterPath, typeof adapterPath);
            if (adapterPath && typeof adapterPath === 'string') {
                console.log('✓ Using vault path from adapter.path:', adapterPath);
                return adapterPath;
            }
            
            // Method 2: Try vault adapter basePath property  
            // @ts-ignore - accessing vault adapter basePath
            const basePath = this.app.vault.adapter.basePath;
            console.log('Method 2 - adapter.basePath:', basePath, typeof basePath);
            if (basePath && typeof basePath === 'string') {
                console.log('✓ Using vault path from adapter.basePath:', basePath);
                return basePath;
            }
            
            // Method 3: Try to get from file manager
            // @ts-ignore - accessing vault adapter fs
            const fs = this.app.vault.adapter.fs;
            console.log('Method 3 - adapter.fs:', fs ? 'exists' : 'undefined');
            if (fs && fs.cwd) {
                const cwd = fs.cwd();
                console.log('Method 3 - fs.cwd():', cwd);
                if (cwd) {
                    console.log('✓ Using vault path from fs.cwd:', cwd);
                    return cwd;
                }
            }
            
            // Method 4: Try getting from a file operation
            const abstractFiles = this.app.vault.getAllLoadedFiles();
            console.log('Method 4 - loaded files count:', abstractFiles.length);
            if (abstractFiles.length > 0) {
                const firstFile = abstractFiles[0];
                console.log('Method 4 - first file path:', firstFile.path);
                // @ts-ignore - accessing vault adapter
                const fullPath = this.app.vault.adapter.getFullPath(firstFile.path);
                console.log('Method 4 - full path:', fullPath);
                if (fullPath) {
                    // Remove the file path to get vault directory
                    const vaultPath = fullPath.replace(path.sep + firstFile.path, '');
                    console.log('Method 4 - calculated vault path:', vaultPath);
                    console.log('✓ Using vault path from file operation:', vaultPath);
                    return vaultPath;
                }
            }
            
        } catch (error) {
            console.error('Error in vault path detection:', error);
        }
        
        console.log('❌ Vault path detection failed, using fallback');
        return "/path/to/your/vault";
    }

    // Public method to expose MCP server functionality
    public async executeTool(toolName: string, args: any): Promise<any> {
        if (!this.mcpServer) {
            throw new Error('MCP Server not initialized');
        }
        return await this.mcpServer.handleToolCall(toolName, args);
    }

    // Public method to list available tools
    public async getAvailableTools(): Promise<any[]> {
        if (!this.mcpServer) {
            throw new Error('MCP Server not initialized');
        }
        return await this.mcpServer.listTools();
    }

    // Generate MCP client configuration with proper bridge script path
    public async generateClientConfig(): Promise<any> {
        // Get actual vault path using our detection method
        const vaultPath = this.getVaultPath();
        
        return {
            mcpServers: {
                obsidian: {
                    command: "node",
                    args: [this.settings.bridgeScriptPath],
                    env: {
                        OBSIDIAN_API_KEY: this.settings.apiKey || "your-api-key-here",
                        OBSIDIAN_VAULT_PATH: vaultPath,
                        OBSIDIAN_SERVER_PORT: this.settings.httpServerPort.toString(),
                        OBSIDIAN_SERVER_HOST: "localhost"
                    }
                }
            }
        };
    }

    // Get bridge script content for display/copying
    public getBridgeScriptContent(): string {
        const scriptPath = this.settings.bridgeScriptPath;
        const vaultPath = this.getVaultPath();
        
        const isScriptPathDetected = !scriptPath.includes('/absolute/path/to/');
        const isVaultPathDetected = vaultPath !== "/path/to/your/vault";
        
        let content = `Bridge Script Location: ${scriptPath}\n\n`;
        
        if (isScriptPathDetected && isVaultPathDetected) {
            content += `✅ PATHS AUTO-DETECTED SUCCESSFULLY!\n\n`;
            content += `Vault Path: ${vaultPath}\n`;
            content += `Bridge Script: ${scriptPath}\n\n`;
            content += `FINAL SETUP STEPS:\n`;
            content += `1. Verify the HTTP server is running (check status above)\n`;
            content += `2. Copy the configuration above to your MCP client\n`;
            content += `3. Restart your MCP client (e.g., Claude Desktop)\n`;
            content += `4. The bridge script should work automatically!\n\n`;
        } else {
            content += `⚠️  MANUAL CONFIGURATION NEEDED:\n\n`;
            
            if (!isScriptPathDetected) {
                content += `❌ Bridge Script Path: Not auto-detected\n`;
                content += `   Use "Reset to Default" button above to fix\n\n`;
            } else {
                content += `✅ Bridge Script Path: Auto-detected\n\n`;
            }
            
            if (!isVaultPathDetected) {
                content += `❌ Vault Path: Not auto-detected\n`;
                content += `   Update OBSIDIAN_VAULT_PATH in the configuration manually\n\n`;
            } else {
                content += `✅ Vault Path: Auto-detected\n\n`;
            }
        }
        
        content += `MAKE SCRIPT EXECUTABLE:\n`;
        content += `chmod +x "${scriptPath}"\n\n`;
        
        content += `TROUBLESHOOTING:\n`;
        content += `- "Cannot find module" error = wrong bridge script path\n`;
        content += `- "Failed to connect" error = HTTP server not running or wrong API key\n`;
        content += `- Use the debug button above for detailed path information\n`;
        
        return content;
    }

    // Start/stop HTTP server
    public async toggleHttpServer(): Promise<void> {
        if (!this.settings.apiKey) {
            new Notice('Please set an API key before starting the HTTP server');
            return;
        }

        if (this.httpServer?.isServerRunning()) {
            await this.httpServer.stop();
            new Notice('HTTP server stopped');
        } else {
            if (!this.httpServer) {
                this.httpServer = new MCPHttpServer(
                    this.app, 
                    this.mcpServer!, 
                    this.settings.httpServerPort, 
                    this.settings.apiKey
                );
            }
            
            try {
                await this.httpServer.start();
                new Notice(`HTTP server started on port ${this.settings.httpServerPort}`);
            } catch (error) {
                console.error('Failed to start HTTP server:', error);
                new Notice('Failed to start HTTP server. Check console for details.');
            }
        }
    }

    // Update HTTP server settings
    public async updateHttpServerSettings(): Promise<void> {
        if (this.httpServer) {
            this.httpServer.updateApiKey(this.settings.apiKey);
            await this.httpServer.updatePort(this.settings.httpServerPort);
        }
    }

    // Update templates directory in MCP server
    public updateTemplatesDir(): void {
        if (this.mcpServer) {
            this.mcpServer.updateTemplatesDir(this.settings.templatesDir);
        }
    }

    // Update system prompt in MCP server
    public updateSystemPrompt(): void {
        if (this.mcpServer) {
            this.mcpServer.updateSystemPromptGetter(() => this.settings.systemPrompt);
        }
    }

    // Debug method to help identify correct paths
    public getPathDebugInfo(): string {
        const debugInfo = [];
        
        try {
            debugInfo.push('=== PATH DEBUG INFORMATION ===');
            debugInfo.push('');
            
            // Current detected paths
            const detectedVaultPath = this.getVaultPath();
            const detectedBridgePath = this.getBridgeScriptPath();
            
            debugInfo.push('DETECTED PATHS:');
            debugInfo.push(`✓ Vault Path: ${detectedVaultPath}`);
            debugInfo.push(`✓ Bridge Script: ${detectedBridgePath}`);
            debugInfo.push('');
            
            // Raw path sources
            debugInfo.push('RAW PATH SOURCES:');
            
            // @ts-ignore - accessing manifest properties
            const manifestDir = this.manifest.dir;
            debugInfo.push(`Manifest dir: ${manifestDir || 'undefined'}`);
            
            // @ts-ignore - accessing vault adapter properties  
            const adapterPath = this.app.vault.adapter.path;
            debugInfo.push(`Adapter path: ${adapterPath || 'undefined'}`);
            
            // @ts-ignore - accessing vault adapter properties
            const adapterBasePath = this.app.vault.adapter.basePath;
            debugInfo.push(`Adapter base path: ${adapterBasePath || 'undefined'}`);
            
            const vaultName = this.app.vault.getName();
            debugInfo.push(`Vault name: ${vaultName || 'undefined'}`);
            
            debugInfo.push('');
            debugInfo.push('CURRENT SETTINGS:');
            debugInfo.push(`Configured bridge path: ${this.settings.bridgeScriptPath}`);
            debugInfo.push(`HTTP server port: ${this.settings.httpServerPort}`);
            debugInfo.push(`API key set: ${this.settings.apiKey ? 'Yes' : 'No'}`);
            
        } catch (error) {
            debugInfo.push(`Error getting debug info: ${error.message}`);
        }
        
        return debugInfo.join('\n');
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

        // Main heading
        containerEl.createEl('h2', {text: 'MCP Plugin Settings'});

        // Basic Settings Section
        containerEl.createEl('h3', {text: 'Basic Configuration'});

        new Setting(containerEl)
            .setName('API Key')
            .setDesc('API key for MCP client authentication (required for HTTP server)')
            .addText(text => text
                .setPlaceholder('Enter your API key')
                .setValue(this.plugin.settings.apiKey)
                .onChange(async (value) => {
                    this.plugin.settings.apiKey = value;
                    await this.plugin.saveSettings();
                    await this.plugin.updateHttpServerSettings();
                }));

        // Templates Section
        containerEl.createEl('h3', {text: 'Templates Configuration'});

        new Setting(containerEl)
            .setName('Templates Directory')
            .setDesc('Directory path where templates are stored (relative to vault root, e.g., "Templates")')
            .addText(text => text
                .setPlaceholder('Templates')
                .setValue(this.plugin.settings.templatesDir)
                .onChange(async (value) => {
                    this.plugin.settings.templatesDir = value;
                    await this.plugin.saveSettings();
                    this.plugin.updateTemplatesDir();
                }));

        // System Prompt Section
        containerEl.createEl('h3', {text: 'AI System Prompt'});

        const systemPromptDesc = containerEl.createEl('p', {
            text: 'Configure the system prompt that guides AI interactions with your vault. This prompt is exposed to MCP clients and helps define how the AI should behave when working with your Obsidian vault.'
        });
        systemPromptDesc.style.marginBottom = '10px';
        systemPromptDesc.style.fontSize = '14px';
        systemPromptDesc.style.color = 'var(--text-muted)';

        new Setting(containerEl)
            .setName('System Prompt')
            .setDesc('The system prompt that will be available to MCP clients like Claude Desktop')
            .addTextArea(text => {
                text.setPlaceholder('Enter your system prompt...')
                    .setValue(this.plugin.settings.systemPrompt)
                    .onChange(async (value) => {
                        this.plugin.settings.systemPrompt = value;
                        await this.plugin.saveSettings();
                        this.plugin.updateSystemPrompt();
                    });
                
                // Style the textarea for full width and better usability
                text.inputEl.style.width = '100%';
                text.inputEl.style.height = '400px'; // Even larger height for editing system prompts
                text.inputEl.style.fontFamily = 'var(--font-monospace)';
                text.inputEl.style.fontSize = '13px'; // Slightly larger font
                text.inputEl.style.resize = 'vertical';
                text.inputEl.style.marginTop = '10px';
                text.inputEl.style.padding = '12px'; // More comfortable padding
                text.inputEl.style.lineHeight = '1.5'; // Better line spacing for readability
                
                // Override the Setting component's layout constraints
                const settingEl = text.inputEl.closest('.setting-item') as HTMLElement;
                if (settingEl) {
                    settingEl.style.display = 'block';
                    const controlEl = settingEl.querySelector('.setting-item-control') as HTMLElement;
                    if (controlEl) {
                        controlEl.style.width = '100%';
                        controlEl.style.maxWidth = 'none';
                    }
                }
                
                return text;
            });

        new Setting(containerEl)
            .setName('Reset to Default Prompt')
            .setDesc('Reset the system prompt to the default template')
            .addButton(button => button
                .setButtonText('Reset to Default')
                .onClick(async () => {
                    // Get the default prompt from DEFAULT_SETTINGS
                    const defaultPrompt = `You are an AI assistant with access to an Obsidian vault through MCP tools. Here are some guidelines for interacting with this vault:

## Style & Behavior:
- Be helpful, concise, and respectful of the user's knowledge management workflow
- When creating or modifying notes, follow consistent markdown formatting
- Use appropriate heading levels, bullet points, and formatting for readability
- Respect existing note structures and naming conventions when possible

## Working with Notes:
- Always check if files exist before creating new ones to avoid duplicates
- When creating daily/periodic notes, use the structured templates provided
- For search operations, try multiple approaches if initial searches don't yield results
- When appending content, consider the existing structure and add appropriate spacing

## Best Practices:
- Suggest meaningful file names and organize content logically
- Use tags and links to maintain vault connectivity
- When uncertain about user preferences, ask for clarification
- Prioritize accuracy and useful organization over speed

Feel free to customize this prompt to match your specific workflow and preferences.`;
                    
                    this.plugin.settings.systemPrompt = defaultPrompt;
                    await this.plugin.saveSettings();
                    this.plugin.updateSystemPrompt();
                    this.display(); // Refresh the settings display
                }));

        // HTTP Server Section
        containerEl.createEl('h3', {text: 'HTTP Server'});

        new Setting(containerEl)
            .setName('Enable HTTP Server')
            .setDesc('Enable HTTP server for external MCP clients to connect')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.httpServerEnabled)
                .onChange(async (value) => {
                    this.plugin.settings.httpServerEnabled = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('HTTP Server Port')
            .setDesc('Port for the HTTP server (default: 28734)')
            .addText(text => text
                .setPlaceholder('Enter port number')
                .setValue(this.plugin.settings.httpServerPort.toString())
                .onChange(async (value) => {
                    const port = parseInt(value);
                    if (!isNaN(port) && port > 0 && port < 65536) {
                        this.plugin.settings.httpServerPort = port;
                        await this.plugin.saveSettings();
                        await this.plugin.updateHttpServerSettings();
                    }
                }));

        const serverStatus = this.plugin.httpServer?.isServerRunning() ? 'Running' : 'Stopped';
        const serverStatusColor = this.plugin.httpServer?.isServerRunning() ? 'green' : 'red';

        new Setting(containerEl)
            .setName('HTTP Server Control')
            .setDesc(`Current status: ${serverStatus}`)
            .addButton(button => button
                .setButtonText(this.plugin.httpServer?.isServerRunning() ? 'Stop Server' : 'Start Server')
                .onClick(async () => {
                    await this.plugin.toggleHttpServer();
                    this.display(); // Refresh the settings display
                }));

        // Bridge Script Section
        containerEl.createEl('h3', {text: 'Bridge Script Configuration'});

        new Setting(containerEl)
            .setName('Bridge Script Path')
            .setDesc('Path to the bridge script (automatically set to the included script)')
            .addText(text => text
                .setPlaceholder('Path to bridge script')
                .setValue(this.plugin.settings.bridgeScriptPath)
                .onChange(async (value) => {
                    this.plugin.settings.bridgeScriptPath = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Reset Bridge Script Path')
            .setDesc('Reset to the default bridge script included with the plugin')
            .addButton(button => button
                .setButtonText('Reset to Default')
                .onClick(async () => {
                    this.plugin.settings.bridgeScriptPath = this.plugin.getBridgeScriptPath();
                    await this.plugin.saveSettings();
                    this.display(); // Refresh the settings display
                }));

        new Setting(containerEl)
            .setName('Debug Path Information')
            .setDesc('Show debug information to help identify correct paths')
            .addButton(button => button
                .setButtonText('Show Debug Info')
                .onClick(() => {
                    const debugInfo = this.plugin.getPathDebugInfo();
                    
                    // Create a modal or text area to show debug info
                    const modal = document.createElement('div');
                    modal.style.position = 'fixed';
                    modal.style.top = '50%';
                    modal.style.left = '50%';
                    modal.style.transform = 'translate(-50%, -50%)';
                    modal.style.background = 'var(--background-primary)';
                    modal.style.border = '1px solid var(--background-modifier-border)';
                    modal.style.borderRadius = '8px';
                    modal.style.padding = '20px';
                    modal.style.zIndex = '1000';
                    modal.style.maxWidth = '80%';
                    modal.style.maxHeight = '80%';
                    modal.style.overflow = 'auto';
                    
                    const header = modal.createEl('h3', {text: 'Path Debug Information'});
                    header.style.marginTop = '0';
                    
                    const pre = modal.createEl('pre');
                    pre.style.background = 'var(--background-secondary)';
                    pre.style.padding = '10px';
                    pre.style.borderRadius = '4px';
                    pre.style.fontSize = '12px';
                    pre.style.overflow = 'auto';
                    pre.textContent = debugInfo;
                    
                    const closeButton = modal.createEl('button', {text: 'Close'});
                    closeButton.style.marginTop = '10px';
                    closeButton.onclick = () => {
                        document.body.removeChild(modal);
                        overlay.remove();
                    };
                    
                    const copyButton = modal.createEl('button', {text: 'Copy to Clipboard'});
                    copyButton.style.marginTop = '10px';
                    copyButton.style.marginLeft = '10px';
                    copyButton.onclick = () => {
                        navigator.clipboard.writeText(debugInfo);
                        new Notice('Debug info copied to clipboard');
                    };
                    
                    // Create overlay
                    const overlay = document.createElement('div');
                    overlay.style.position = 'fixed';
                    overlay.style.top = '0';
                    overlay.style.left = '0';
                    overlay.style.width = '100%';
                    overlay.style.height = '100%';
                    overlay.style.background = 'rgba(0,0,0,0.5)';
                    overlay.style.zIndex = '999';
                    overlay.onclick = () => {
                        document.body.removeChild(modal);
                        overlay.remove();
                    };
                    
                    document.body.appendChild(overlay);
                    document.body.appendChild(modal);
                }));

        // Test Section
        containerEl.createEl('h3', {text: 'Testing'});

        new Setting(containerEl)
            .setName('Test MCP Server')
            .setDesc('Test the MCP server functionality')
            .addButton(button => button
                .setButtonText('Test')
                .onClick(async () => {
                    try {
                        const tools = await this.plugin.getAvailableTools();
                        new Notice(`MCP Server is working! Found ${tools.length} tools.`);
                        console.log('Available tools:', tools);
                    } catch (error) {
                        new Notice('MCP Server test failed: ' + error.message);
                        console.error('MCP Server test failed:', error);
                    }
                }));

        new Setting(containerEl)
            .setName('Test HTTP Server')
            .setDesc('Test the HTTP server connection')
            .addButton(button => button
                .setButtonText('Test HTTP')
                .onClick(async () => {
                    if (!this.plugin.httpServer?.isServerRunning()) {
                        new Notice('HTTP server is not running');
                        return;
                    }

                    try {
                        // Test HTTP server by making a request to the health endpoint
                        const response = await fetch(`http://localhost:${this.plugin.settings.httpServerPort}/api/mcp/health`, {
                            headers: {
                                'Authorization': `Bearer ${this.plugin.settings.apiKey}`
                            }
                        });
                        
                        if (response.ok) {
                            const data = await response.json();
                            new Notice('HTTP server is responding correctly!');
                            console.log('HTTP server response:', data);
                        } else {
                            new Notice(`HTTP server test failed: ${response.status}`);
                        }
                    } catch (error) {
                        new Notice('HTTP server test failed: ' + error.message);
                        console.error('HTTP server test failed:', error);
                    }
                }));

        new Setting(containerEl)
            .setName('Test System Prompt')
            .setDesc('Test the system prompt functionality')
            .addButton(button => button
                .setButtonText('Test Prompt')
                .onClick(async () => {
                    if (!this.plugin.httpServer?.isServerRunning()) {
                        new Notice('HTTP server is not running');
                        return;
                    }

                    try {
                        // Test prompts list endpoint
                        const listResponse = await fetch(`http://localhost:${this.plugin.settings.httpServerPort}/api/mcp/prompts`, {
                            headers: {
                                'Authorization': `Bearer ${this.plugin.settings.apiKey}`
                            }
                        });
                        
                        if (listResponse.ok) {
                            const listData = await listResponse.json();
                            console.log('Available prompts:', listData);
                            
                            // Test getting the system prompt
                            const getResponse = await fetch(`http://localhost:${this.plugin.settings.httpServerPort}/api/mcp/prompts/get`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${this.plugin.settings.apiKey}`,
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    name: 'obsidian-system-prompt'
                                })
                            });
                            
                            if (getResponse.ok) {
                                const promptData = await getResponse.json();
                                new Notice('System prompt is working! Check console for details.');
                                console.log('System prompt response:', promptData);
                            } else {
                                new Notice(`System prompt test failed: ${getResponse.status}`);
                            }
                        } else {
                            new Notice(`Prompts list test failed: ${listResponse.status}`);
                        }
                    } catch (error) {
                        new Notice('System prompt test failed: ' + error.message);
                        console.error('System prompt test failed:', error);
                    }
                }));

        // Client Configuration Section
        containerEl.createEl('h3', {text: 'Client Configuration'});
        
        const configDesc = containerEl.createEl('p', {
            text: 'Generate configuration for MCP clients like Claude Desktop. This uses the included bridge script and automatic configuration.'
        });
        configDesc.style.marginBottom = '10px';

        // Configuration JSON display area
        const configContainer = containerEl.createEl('div');
        configContainer.style.marginBottom = '15px';

        const configLabel = configContainer.createEl('h4', {text: 'MCP Client Configuration'});
        configLabel.style.marginBottom = '5px';

        const configTextArea = configContainer.createEl('textarea');
        configTextArea.style.width = '100%';
        configTextArea.style.height = '150px';
        configTextArea.style.fontFamily = 'monospace';
        configTextArea.style.fontSize = '12px';
        configTextArea.style.border = '1px solid var(--background-modifier-border)';
        configTextArea.style.borderRadius = '4px';
        configTextArea.style.padding = '10px';
        configTextArea.readOnly = true;

        // Bridge Script Info display area
        const bridgeContainer = containerEl.createEl('div');
        bridgeContainer.style.marginBottom = '15px';

        const bridgeLabel = bridgeContainer.createEl('h4', {text: 'Bridge Script Information'});
        bridgeLabel.style.marginBottom = '5px';

        const bridgeTextArea = bridgeContainer.createEl('textarea');
        bridgeTextArea.style.width = '100%';
        bridgeTextArea.style.height = '120px';
        bridgeTextArea.style.fontFamily = 'monospace';
        bridgeTextArea.style.fontSize = '11px';
        bridgeTextArea.style.border = '1px solid var(--background-modifier-border)';
        bridgeTextArea.style.borderRadius = '4px';
        bridgeTextArea.style.padding = '10px';
        bridgeTextArea.readOnly = true;

        // Buttons for config actions
        const buttonContainer = containerEl.createEl('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '10px';
        buttonContainer.style.marginBottom = '20px';

        const generateButton = buttonContainer.createEl('button', {text: 'Generate Configuration'});
        generateButton.style.padding = '8px 16px';
        generateButton.style.border = '1px solid var(--interactive-accent)';
        generateButton.style.backgroundColor = 'var(--interactive-accent)';
        generateButton.style.color = 'var(--text-on-accent)';
        generateButton.style.borderRadius = '4px';
        generateButton.style.cursor = 'pointer';

        const copyConfigButton = buttonContainer.createEl('button', {text: 'Copy Config'});
        copyConfigButton.style.padding = '8px 16px';
        copyConfigButton.style.border = '1px solid var(--interactive-normal)';
        copyConfigButton.style.backgroundColor = 'var(--interactive-normal)';
        copyConfigButton.style.borderRadius = '4px';
        copyConfigButton.style.cursor = 'pointer';

        // Generate configuration function
        const updateConfig = async () => {
            try {
                const config = await this.plugin.generateClientConfig();
                
                // Check if paths were auto-detected successfully
                const vaultPath = config.mcpServers.obsidian.env.OBSIDIAN_VAULT_PATH;
                const bridgeScriptPath = config.mcpServers.obsidian.args[0];
                
                const needsVaultPathUpdate = vaultPath === "/path/to/your/vault";
                const needsBridgePathUpdate = bridgeScriptPath.includes('/absolute/path/to/');
                
                let configWithComment = '';
                
                if (needsVaultPathUpdate || needsBridgePathUpdate) {
                    configWithComment += '// IMPORTANT: Some paths need manual configuration:\n';
                    if (needsVaultPathUpdate) {
                        configWithComment += '// - Update OBSIDIAN_VAULT_PATH to your actual vault location\n';
                        configWithComment += '//   Example: /Users/yourname/Documents/YourVaultName\n';
                    }
                    if (needsBridgePathUpdate) {
                        configWithComment += '// - Update the bridge script path (use "Reset to Default" button above)\n';
                    }
                    configWithComment += '\n';
                } else {
                    configWithComment += '// Configuration auto-generated with detected paths\n';
                    configWithComment += '// Verify the paths below are correct before using\n\n';
                }
                
                configWithComment += JSON.stringify(config, null, 2);
                configTextArea.value = configWithComment;
                
                const bridgeInfo = this.plugin.getBridgeScriptContent();
                bridgeTextArea.value = bridgeInfo;
            } catch (error) {
                configTextArea.value = `Error generating config: ${error.message}`;
                bridgeTextArea.value = `Error: ${error.message}`;
            }
        };

        // Event handlers
        generateButton.addEventListener('click', updateConfig);
        
        copyConfigButton.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(configTextArea.value);
                new Notice('Configuration copied to clipboard!');
            } catch (error) {
                new Notice('Failed to copy to clipboard');
            }
        });

        // Available Tools Section
        containerEl.createEl('h3', {text: 'Available Tools'});
        
        const toolsContainer = containerEl.createEl('div');
        
        new Setting(containerEl)
            .setName('Show Available Tools')
            .setDesc('Display all available MCP tools and their descriptions')
            .addButton(button => button
                .setButtonText('Show Tools')
                .onClick(async () => {
                    try {
                        const tools = await this.plugin.getAvailableTools();
                        toolsContainer.empty();
                        
                        tools.forEach(tool => {
                            const toolEl = toolsContainer.createEl('div');
                            toolEl.style.marginBottom = '15px';
                            toolEl.style.padding = '10px';
                            toolEl.style.border = '1px solid var(--background-modifier-border)';
                            toolEl.style.borderRadius = '4px';
                            
                            const nameEl = toolEl.createEl('h4', {text: tool.name});
                            nameEl.style.margin = '0 0 5px 0';
                            nameEl.style.color = 'var(--text-accent)';
                            
                            toolEl.createEl('p', {text: tool.description});
                            
                            const schemaEl = toolEl.createEl('details');
                            const summaryEl = schemaEl.createEl('summary', {text: 'Input Schema'});
                            summaryEl.style.cursor = 'pointer';
                            summaryEl.style.fontWeight = 'bold';
                            
                            const schemaCode = schemaEl.createEl('pre');
                            schemaCode.style.backgroundColor = 'var(--background-secondary)';
                            schemaCode.style.padding = '10px';
                            schemaCode.style.borderRadius = '4px';
                            schemaCode.style.fontSize = '11px';
                            schemaCode.style.overflow = 'auto';
                            schemaCode.textContent = JSON.stringify(tool.inputSchema, null, 2);
                        });
                    } catch (error) {
                        toolsContainer.innerHTML = `<p style="color: red;">Error loading tools: ${error.message}</p>`;
                    }
                }));

        // Usage Instructions
        containerEl.createEl('h3', {text: 'Setup Instructions'});
        
        const instructionsEl = containerEl.createEl('div');
        instructionsEl.style.backgroundColor = 'var(--background-secondary)';
        instructionsEl.style.padding = '15px';
        instructionsEl.style.borderRadius = '4px';
        instructionsEl.style.marginBottom = '20px';
        
        instructionsEl.innerHTML = `
            <h4>Quick Setup for Claude Desktop:</h4>
            <ol>
                <li><strong>Set API Key:</strong> Create a secure API key in the settings above</li>
                <li><strong>Configure System Prompt:</strong> Customize the AI system prompt above to match your workflow preferences</li>
                <li><strong>Start HTTP Server:</strong> Enable and start the HTTP server</li>
                <li><strong>Generate Configuration:</strong> Click "Generate Configuration" to create the config with auto-detected paths</li>
                <li><strong>Update Claude Desktop:</strong>
                    <ul>
                        <li>Copy the generated configuration</li>
                        <li>Open Claude Desktop config file (see locations below)</li>
                        <li>Add the configuration to your mcpServers section</li>
                        <li>Paths should be auto-detected, but verify they're correct</li>
                    </ul>
                </li>
                <li><strong>Restart Claude Desktop</strong> to load the new MCP server</li>
            </ol>
            
            <h4>Using the System Prompt:</h4>
            <p>Once configured, Claude Desktop will have access to the "Obsidian System Prompt" which you can use by:</p>
            <ul>
                <li>Typing <code>/obsidian-system-prompt</code> in Claude Desktop</li>
                <li>This loads your custom system prompt to guide AI interactions with your vault</li>
                <li>The prompt helps maintain consistent behavior and follows your preferences</li>
            </ul>
            
            <h4>Claude Desktop config file locations:</h4>
            <ul>
                <li><strong>macOS:</strong> <code>~/Library/Application Support/Claude/claude_desktop_config.json</code></li>
                <li><strong>Windows:</strong> <code>%APPDATA%\\Claude\\claude_desktop_config.json</code></li>
            </ul>
            
            <h4>Automatic Path Detection:</h4>
            <p>The plugin now automatically detects:</p>
            <ul>
                <li><strong>Bridge Script Path:</strong> Located in your plugin directory</li>
                <li><strong>Vault Path:</strong> Your actual Obsidian vault location</li>
            </ul>
            <p>If auto-detection fails, you'll see warnings in the generated configuration with manual setup instructions.</p>
            
            <h4>Bridge Script:</h4>
            <p>The bridge script is included with the plugin and automatically configured. It handles communication between MCP clients and this Obsidian plugin via HTTP.</p>
            
            <h4>Troubleshooting:</h4>
            <ul>
                <li>Ensure the HTTP server is running (check status above)</li>
                <li>Test the HTTP server using the "Test HTTP" button</li>
                <li>Make sure your API key is set correctly</li>
                <li>Use "Show Debug Info" if paths aren't auto-detected</li>
                <li>Check the console for any error messages</li>
            </ul>
        `;

        // Generate initial config
        updateConfig();
    }
} 