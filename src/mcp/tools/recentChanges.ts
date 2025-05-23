import { App } from 'obsidian';
import { ToolHandler, Content } from '../base';

export class RecentChangesToolHandler extends ToolHandler {
    private app: App;

    constructor(app: App) {
        super('obsidian_recent_changes');
        this.app = app;
    }

    getToolDescription() {
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

        const files = this.app.vault.getMarkdownFiles();
        const now = new Date();
        const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

        const recentFiles = await Promise.all(
            files.map(async (file) => {
                const stat = await this.app.vault.adapter.stat(file.path);
                if (!stat) return null;

                const modifiedDate = new Date(stat.mtime);
                
                if (modifiedDate >= cutoffDate) {
                    return {
                        path: file.path,
                        modifiedTime: modifiedDate.toISOString(),
                        modifiedTimestamp: stat.mtime,
                        size: stat.size
                    };
                }
                return null;
            })
        );

        const filtered = recentFiles
            .filter((file): file is NonNullable<typeof file> => file !== null)
            .sort((a, b) => b.modifiedTimestamp - a.modifiedTimestamp)
            .slice(0, limit);

        return [{
            type: 'text',
            text: JSON.stringify(filtered, null, 2)
        }];
    }
} 