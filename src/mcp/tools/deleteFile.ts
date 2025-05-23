import { App } from 'obsidian';
import { ToolHandler, Content } from '../base';

export class DeleteFileToolHandler extends ToolHandler {
    private app: App;

    constructor(app: App) {
        super('obsidian_delete_file');
        this.app = app;
    }

    getToolDescription() {
        return {
            name: this.name,
            description: 'Delete a file or directory from the vault.',
            inputSchema: {
                type: 'object',
                properties: {
                    filepath: {
                        type: 'string',
                        description: 'Path to the file or directory to delete (relative to your vault root).',
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
        if (!file) {
            throw new Error(`File or directory not found: ${args.filepath}`);
        }

        await this.app.vault.delete(file);

        return [{
            type: 'text',
            text: JSON.stringify({ success: true })
        }];
    }
} 