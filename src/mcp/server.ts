import { App } from 'obsidian';
import { ToolHandler, Tool, Content, Prompt, GetPromptResult } from './base';
import { InitToolHandler } from './tools/initTool';
import { ListFilesInVaultToolHandler } from './tools/listFiles';
import { GetFileContentsToolHandler } from './tools/getFileContents';
import { SearchToolHandler } from './tools/search';
import { AppendContentToolHandler } from './tools/appendContent';
import { DeleteFileToolHandler } from './tools/deleteFile';
import { ComplexSearchToolHandler } from './tools/complexSearch';
import { PeriodicNotesToolHandler } from './tools/periodicNotes';
import { RecentChangesToolHandler } from './tools/recentChanges';
import { TemplatesToolHandler } from './tools/templates';

export class MCPServer {
    private app: App;
    private tools: Map<string, ToolHandler>;
    private prompts: Map<string, Prompt>;
    private templatesHandler: TemplatesToolHandler;
    private initToolHandler: InitToolHandler;
    private getSystemPrompt: (() => string) | null = null;

    constructor(app: App, templatesDir: string = 'Templates', getSystemPrompt?: () => string) {
        this.app = app;
        this.tools = new Map();
        this.prompts = new Map();
        this.templatesHandler = new TemplatesToolHandler(app, templatesDir);
        this.initToolHandler = new InitToolHandler(app, getSystemPrompt);
        this.getSystemPrompt = getSystemPrompt || null;
        this.initializeTools();
        this.initializePrompts();
    }

    private initializeTools() {
        try {
            // Register init tool FIRST - this must be called before any other tools
            this.registerTool(this.initToolHandler);
            
            // Register all other tool handlers
            this.registerTool(new ListFilesInVaultToolHandler(this.app));
            this.registerTool(new GetFileContentsToolHandler(this.app));
            this.registerTool(new SearchToolHandler(this.app));
            this.registerTool(new AppendContentToolHandler(this.app));
            this.registerTool(new DeleteFileToolHandler(this.app));
            this.registerTool(new ComplexSearchToolHandler(this.app));
            this.registerTool(new PeriodicNotesToolHandler(this.app));
            this.registerTool(new RecentChangesToolHandler(this.app));
            this.registerTool(this.templatesHandler);
            
            console.log(`MCP Server initialized with ${this.tools.size} tools (init tool registered first)`);
        } catch (error) {
            console.error('Error initializing MCP tools:', error);
        }
    }

    private initializePrompts() {
        try {
            // Register system prompt (keeping this alongside the init tool approach)
            this.registerPrompt({
                name: 'obsidian-required-prompt',
                description: '🚨 REQUIRED FIRST - Load this essential system prompt before using ANY vault tools. Essential for proper AI behavior!'
            });

            console.log(`MCP Server initialized with ${this.prompts.size} prompts (also available as init tool)`);
        } catch (error) {
            console.error('Error initializing MCP prompts:', error);
        }
    }

    private registerTool(handler: ToolHandler) {
        this.tools.set(handler.name, handler);
    }

    private registerPrompt(prompt: Prompt) {
        this.prompts.set(prompt.name, prompt);
    }

    public async listTools(): Promise<Tool[]> {
        return Array.from(this.tools.values()).map(handler => handler.getToolDescription());
    }

    public async listPrompts(): Promise<Prompt[]> {
        return Array.from(this.prompts.values());
    }

    public async getPrompt(name: string, arguments_?: Record<string, string>): Promise<GetPromptResult> {
        const prompt = this.prompts.get(name);
        if (!prompt) {
            throw new Error(`Unknown prompt: ${name}`);
        }

        if (name === 'obsidian-required-prompt') {
            if (!this.getSystemPrompt) {
                throw new Error('System prompt getter not configured');
            }

            const systemPrompt = this.getSystemPrompt();
            return {
                description: 'Obsidian vault system prompt for guiding AI interactions',
                messages: [
                    {
                        role: 'system',
                        content: {
                            type: 'text',
                            text: systemPrompt
                        }
                    }
                ]
            };
        }

        throw new Error(`Prompt implementation not found: ${name}`);
    }

    public async callTool(name: string, arguments_: any): Promise<Content[]> {
        const handler = this.tools.get(name);
        if (!handler) {
            throw new Error(`Unknown tool: ${name}`);
        }

        try {
            return await handler.runTool(arguments_);
        } catch (error) {
            console.error(`Error running tool ${name}:`, error);
            throw error;
        }
    }

    public async handleToolCall(toolName: string, args: any): Promise<Content[]> {
        return this.callTool(toolName, args);
    }

    // Method to update templates directory
    public updateTemplatesDir(templatesDir: string) {
        this.templatesHandler.updateTemplatesDir(templatesDir);
    }

    // Method to update system prompt getter
    public updateSystemPromptGetter(getSystemPrompt: () => string) {
        this.getSystemPrompt = getSystemPrompt;
        // Also update the init tool handler
        this.initToolHandler.updateSystemPromptGetter(getSystemPrompt);
    }
}
