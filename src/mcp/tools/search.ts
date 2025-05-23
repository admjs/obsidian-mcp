import { App, prepareSimpleSearch } from 'obsidian';
import { ToolHandler, Content } from '../base';

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

    getToolDescription() {
        return {
            name: this.name,
            description: 'Simple search for documents matching a specified text query across files in the vault.',
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
                    },
                    max_results: {
                        type: 'integer',
                        description: 'Maximum number of results to return (default: 20)',
                        default: 20
                    },
                    max_files: {
                        type: 'integer',
                        description: 'Maximum number of files to search (default: 500)',
                        default: 500
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
        const maxResults = args.max_results || 20;
        const maxFiles = args.max_files || 500;
        
        console.log(`[Search] Starting search for: "${args.query}"`);
        console.log(`[Search] Limits: ${maxResults} results, ${maxFiles} files, ${contextLength} context`);
        
        const search = prepareSimpleSearch(args.query);
        const results: SearchResultItem[] = [];
        const allFiles = this.app.vault.getMarkdownFiles();
        
        console.log(`[Search] Total files in vault: ${allFiles.length}`);
        
        // Limit files to search to prevent hanging
        const filesToSearch = allFiles.slice(0, maxFiles);
        
        const startTime = Date.now();
        let filesProcessed = 0;
        
        // Process files in batches to avoid blocking
        const batchSize = 10;
        for (let i = 0; i < filesToSearch.length; i += batchSize) {
            const batch = filesToSearch.slice(i, i + batchSize);
            
            for (const file of batch) {
                try {
                    filesProcessed++;
                    
                    // Early termination if we have enough results
                    if (results.length >= maxResults) {
                        console.log(`[Search] Early termination: found ${results.length} results`);
                        break;
                    }
                    
                    const content = await this.app.vault.cachedRead(file);
                    const result = search(content);
                    
                    if (result) {
                        const matches = [];
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
                        
                        console.log(`[Search] Found match in: ${file.path} (score: ${result.score})`);
                    }
                    
                    // Progress logging every 50 files
                    if (filesProcessed % 50 === 0) {
                        const elapsed = Date.now() - startTime;
                        console.log(`[Search] Processed ${filesProcessed}/${filesToSearch.length} files (${elapsed}ms, ${results.length} results)`);
                    }
                    
                } catch (error) {
                    console.warn(`[Search] Error processing file ${file.path}:`, error.message);
                    continue;
                }
            }
            
            // Break if we have enough results
            if (results.length >= maxResults) {
                break;
            }
            
            // Yield control between batches to prevent blocking
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        const totalTime = Date.now() - startTime;
        console.log(`[Search] Completed: ${results.length} results in ${totalTime}ms (${filesProcessed} files processed)`);

        // Sort by score descending and limit results
        results.sort((a, b) => b.score - a.score);
        const finalResults = results.slice(0, maxResults);

        const summary = {
            query: args.query,
            total_results: finalResults.length,
            files_processed: filesProcessed,
            total_files_in_vault: allFiles.length,
            search_time_ms: totalTime,
            truncated: results.length > maxResults
        };

        return [{
            type: 'text',
            text: JSON.stringify({
                summary,
                results: finalResults
            }, null, 2)
        }];
    }
} 