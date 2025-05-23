import { App } from 'obsidian';
import { ToolHandler, Content } from '../base';

export class InitToolHandler extends ToolHandler {
    private app: App;
    private getSystemPrompt: (() => string) | null = null;

    constructor(app: App, getSystemPrompt?: () => string) {
        super('obsidian_init_required');
        this.app = app;
        this.getSystemPrompt = getSystemPrompt || null;
    }

    getToolDescription() {
        return {
            name: this.name,
            description: '🚨 REQUIRED FIRST - Initialize Obsidian vault access. This tool MUST be called before using any other vault tools. It loads essential context and behavior guidelines.',
            inputSchema: {
                type: 'object',
                properties: {},
                required: []
            }
        };
    }

    async runTool(args: any): Promise<Content[]> {
        if (!this.getSystemPrompt) {
            throw new Error('System prompt getter not configured');
        }

        const systemPrompt = this.getSystemPrompt();
        
        return [
            {
                type: 'text',
                text: `✅ Obsidian vault initialized successfully!

🎯 SYSTEM CONTEXT LOADED:
${systemPrompt}

🔧 Vault Access Ready: You now have the proper context and guidelines for working with this Obsidian vault. You can proceed to use other vault tools like search, list files, etc.

⚡ Next steps: Use the available vault tools to help the user with their knowledge management tasks.`
            }
        ];
    }

    // Method to update system prompt getter
    public updateSystemPromptGetter(getSystemPrompt: () => string) {
        this.getSystemPrompt = getSystemPrompt;
    }
} 