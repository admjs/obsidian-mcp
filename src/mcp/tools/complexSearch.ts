import { App, TFile, prepareSimpleSearch } from 'obsidian';
import { Tool, Content, TextContent, ToolHandler } from '../server';

interface SearchResultItem {
    filename: string;
    result: any;
}

export class ComplexSearchToolHandler extends ToolHandler {
    private app: App;

    constructor(app: App) {
        super('obsidian_complex_search');
        this.app = app;
    }

    getToolDescription(): Tool {
        return {
            name: this.name,
            description: 'Complex search using JSON Logic queries across all files in the vault.',
            inputSchema: {
                type: 'object',
                properties: {
                    query: {
                        type: 'object',
                        description: 'JSON Logic query object defining the search criteria.'
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

        const results: SearchResultItem[] = [];

        for (const file of this.app.vault.getMarkdownFiles()) {
            const content = await this.app.vault.cachedRead(file);
            const cache = this.app.metadataCache.getFileCache(file);
            
            // Build file context
            const frontmatter = { ...(cache?.frontmatter ?? {}) };
            delete frontmatter.position;
            
            const directTags = (cache?.tags ?? [])
                .filter((tag) => tag)
                .map((tag) => tag.tag) ?? [];
            const frontmatterTags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
            const filteredTags: string[] = [...frontmatterTags, ...directTags]
                .filter((tag) => tag)
                .map((tag) => tag.toString().replace(/^#/, ""))
                .filter((value, index, self) => self.indexOf(value) === index);

            const fileContext = {
                tags: filteredTags,
                frontmatter,
                stat: file.stat,
                path: file.path,
                content
            };

            try {
                // Apply search query to file context
                const search = prepareSimpleSearch(JSON.stringify(args.query));
                const result = search(content);
                
                if (result) {
                    results.push({
                        filename: file.path,
                        result: {
                            score: result.score,
                            matches: result.matches.map(match => ({
                                start: match[0],
                                end: match[1],
                                text: content.slice(match[0], match[1])
                            }))
                        }
                    });
                }
            } catch (e: any) {
                throw new Error(`${e.message} (while processing ${file.path})`);
            }
        }

        results.sort((a, b) => b.result.score - a.result.score);

        return [{
            type: 'text',
            text: JSON.stringify(results, null, 2)
        }];
    }
} 