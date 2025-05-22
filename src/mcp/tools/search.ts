import { App, TFile, prepareSimpleSearch } from 'obsidian';
import { Tool, Content, TextContent, ToolHandler } from '../server';

interface SearchMatch {
    context: string;
    match_position: {
        start: number;
        end: number;
    };
}

interface SearchResultItem {
    filename: string;
    score: number;
    matches: SearchMatch[];
}

export class SearchToolHandler extends ToolHandler {
    private app: App;

    constructor(app: App) {
        super('obsidian_simple_search');
        this.app = app;
    }

    getToolDescription(): Tool {
        return {
            name: this.name,
            description: 'Simple search for documents matching a specified text query across all files in the vault.',
            inputSchema: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Text to search for in the vault.'
                    },
                    context_length: {
                        type: 'integer',
                        description: 'How much context to return around the matching string (default: 100)',
                        default: 100
                    }
                },
                required: ['query']
            }
        };
    }

    async runTool(args: any): Promise<Content[]> {
        if (!args.query) {
            throw new Error('query argument missing in arguments');
        }

        const contextLength = args.context_length || 100;
        const search = prepareSimpleSearch(args.query);
        const results: SearchResultItem[] = [];

        for (const file of this.app.vault.getMarkdownFiles()) {
            const content = await this.app.vault.cachedRead(file);
            const result = search(content);
            if (result) {
                const matches: SearchMatch[] = [];
                for (const match of result.matches) {
                    const start = Math.max(match[0] - contextLength, 0);
                    const end = Math.min(match[1] + contextLength, content.length);
                    matches.push({
                        context: content.slice(start, end),
                        match_position: {
                            start: match[0] - start,
                            end: match[1] - start
                        }
                    });
                }
                results.push({
                    filename: file.path,
                    score: result.score,
                    matches
                });
            }
        }

        results.sort((a, b) => b.score - a.score);

        return [{
            type: 'text',
            text: JSON.stringify(results, null, 2)
        }];
    }
} 