import { App, TFile, TFolder } from 'obsidian';

export interface Tool {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: Record<string, any>;
        required: string[];
    };
}

export interface TextContent {
    type: 'text';
    text: string;
}

export interface ImageContent {
    type: 'image';
    url: string;
}

export interface EmbeddedResource {
    type: 'embedded';
    url: string;
}

export type Content = TextContent | ImageContent | EmbeddedResource;

export abstract class ToolHandler {
    protected name: string;

    constructor(name: string) {
        this.name = name;
    }

    abstract getToolDescription(): Tool;
    abstract runTool(args: any): Promise<Content[]>;
}

export class MCPServer {
    private app: App;
    private tools: Map<string, ToolHandler>;

    constructor(app: App) {
        this.app = app;
        this.tools = new Map();
        this.initializeTools();
    }

    private initializeTools() {
        // We'll add tool handlers here
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
} 