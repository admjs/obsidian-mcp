import { App, TFile } from 'obsidian';
import { Tool, Content, TextContent, ToolHandler } from '../server';

export class RecentChangesToolHandler extends ToolHandler {
    private app: App;

    constructor(app: App) {
        super('obsidian_recent_changes');
        this.app = app;
    }

    getToolDescription(): Tool {
        return {
            name: this.name,
            description: 'Get recent changes in the vault.',
            inputSchema: {
                type: 'object',
                properties: {
                    limit: {
                        type: 'integer',
                        description: 'Maximum number of changes to return (default: 10)',
                        default: 10
                    },
                    days: {
                        type: 'integer',
                        description: 'Number of days to look back (default: 90)',
                        default: 90
                    }
                },
                required: []
            }
        };
    }

    async runTool(args: any): Promise<Content[]> {
        const limit = args.limit || 10;
        const days = args.days || 90;

        // Get all files in the vault
        const files = this.app.vault.getMarkdownFiles();
        const now = new Date();
        const cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

        // Get file stats and filter by date
        const recentFiles = await Promise.all(
            files.map(async (file) => {
                const stat = await this.app.vault.adapter.stat(file.path);
                if (!stat) return null;

                const mtime = new Date(stat.mtime);
                if (mtime < cutoffDate) return null;

                return {
                    path: file.path,
                    mtime: mtime.toISOString(),
                    size: stat.size
                };
            })
        );

        // Sort by modification time and limit results
        const changes = recentFiles
            .filter(Boolean)
            .sort((a, b) => new Date(b.mtime).getTime() - new Date(a.mtime).getTime())
            .slice(0, limit);

        return [{
            type: 'text',
            text: JSON.stringify(changes, null, 2)
        }];
    }
} 