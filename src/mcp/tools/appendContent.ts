import { App, TFile } from 'obsidian';
import { ToolHandler, Content } from '../base';

export class AppendContentToolHandler extends ToolHandler {
    private app: App;

    constructor(app: App) {
        super('obsidian_append_content');
        this.app = app;
    }

    getToolDescription() {
        return {
            name: this.name,
            description: 'Append content to a new or existing file in the vault.',
            inputSchema: {
                type: 'object',
                properties: {
                    filepath: {
                        type: 'string',
                        description: 'Path to the file (relative to your vault root).',
                        format: 'path'
                    },
                    content: {
                        type: 'string',
                        description: 'Content to append to the file.'
                    }
                },
                required: ['filepath', 'content']
            }
        };
    }

    async runTool(args: any): Promise<Content[]> {
        if (!args.filepath) {
            throw new Error('filepath argument missing in arguments');
        }
        if (!args.content) {
            throw new Error('content argument missing in arguments');
        }

        const file = this.app.vault.getAbstractFileByPath(args.filepath);
        let newContent: string;

        if (file instanceof TFile) {
            // File exists, append to it
            const existingContent = await this.app.vault.read(file);
            newContent = existingContent + '\n' + args.content;
            await this.app.vault.modify(file, newContent);
        } else {
            // File doesn't exist, create it
            newContent = args.content;
            await this.app.vault.create(args.filepath, newContent);
        }

        return [{
            type: 'text',
            text: JSON.stringify({ success: true })
        }];
    }
} 