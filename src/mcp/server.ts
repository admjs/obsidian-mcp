import { App } from 'obsidian';
import { ToolHandler, Tool, Content } from './base';
import { ListFilesInVaultToolHandler } from './tools/listFiles';
import { GetFileContentsToolHandler } from './tools/getFileContents';
import { SearchToolHandler } from './tools/search';
import { AppendContentToolHandler } from './tools/appendContent';
import { DeleteFileToolHandler } from './tools/deleteFile';
import { ComplexSearchToolHandler } from './tools/complexSearch';
import { PeriodicNotesToolHandler } from './tools/periodicNotes';
import { RecentChangesToolHandler } from './tools/recentChanges';

export class MCPServer {
    private app: App;
    private tools: Map<string, ToolHandler>;

    constructor(app: App) {
        this.app = app;
        this.tools = new Map();
        this.initializeTools();
    }

    private initializeTools() {
        try {
            // Register all tool handlers
            this.registerTool(new ListFilesInVaultToolHandler(this.app));
            this.registerTool(new GetFileContentsToolHandler(this.app));
            this.registerTool(new SearchToolHandler(this.app));
            this.registerTool(new AppendContentToolHandler(this.app));
            this.registerTool(new DeleteFileToolHandler(this.app));
            this.registerTool(new ComplexSearchToolHandler(this.app));
            this.registerTool(new PeriodicNotesToolHandler(this.app));
            this.registerTool(new RecentChangesToolHandler(this.app));
            
            console.log(`MCP Server initialized with ${this.tools.size} tools`);
        } catch (error) {
            console.error('Error initializing MCP tools:', error);
        }
    }

    private registerTool(handler: ToolHandler) {
        this.tools.set(handler.name, handler);
    }

    public async listTools(): Promise<Tool[]> {
        return Array.from(this.tools.values()).map(handler => handler.getToolDescription());
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
}
