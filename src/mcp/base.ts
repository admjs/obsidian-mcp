export interface Tool {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: Record<string, any>;
        required: string[];
    };
}

export interface PromptArgument {
    name: string;
    description?: string;
    required?: boolean;
}

export interface Prompt {
    name: string;
    description?: string;
    arguments?: PromptArgument[];
}

export interface PromptMessage {
    role: 'user' | 'assistant' | 'system';
    content: TextContent;
}

export interface GetPromptResult {
    description?: string;
    messages: PromptMessage[];
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
    public name: string;

    constructor(name: string) {
        this.name = name;
    }

    abstract getToolDescription(): Tool;
    abstract runTool(args: any): Promise<Content[]>;
} 