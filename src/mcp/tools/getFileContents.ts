import { App, TFile } from 'obsidian';
import { ToolHandler, Content } from '../base';

export class GetFileContentsToolHandler extends ToolHandler {
    private app: App;

    constructor(app: App) {
        super('obsidian_get_file_contents');
        this.app = app;
    }

    getToolDescription() {
        return {
            name: this.name,
            description: 'Return the content of a single file in your vault.',
            inputSchema: {
                type: 'object',
                properties: {
                    filepath: {
                        type: 'string',
                        description: 'Path to the relevant file (relative to your vault root).',
                        format: 'path'
                    }
                },
                required: ['filepath']
            }
        };
    }

    async runTool(args: any): Promise<Content[]> {
        if (!args.filepath) {
            throw new Error('filepath argument missing in arguments');
        }

        const file = this.app.vault.getAbstractFileByPath(args.filepath);
        if (!file || !(file instanceof TFile)) {
            throw new Error(`File not found: ${args.filepath}`);
        }

        const content = await this.app.vault.read(file);
        return [{
            type: 'text',
            text: JSON.stringify(content)
        }];
    }
} 