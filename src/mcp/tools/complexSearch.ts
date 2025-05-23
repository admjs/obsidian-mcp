import { App, prepareSimpleSearch } from 'obsidian';
import { ToolHandler, Content } from '../base';

export class ComplexSearchToolHandler extends ToolHandler {
    private app: App;

    constructor(app: App) {
        super('obsidian_complex_search');
        this.app = app;
    }

    getToolDescription() {
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

        const maxResults = 20;
        const maxFiles = 500;
        
        console.log(`[ComplexSearch] Starting search with query:`, args.query);
        
        const results: any[] = [];
        const allFiles = this.app.vault.getMarkdownFiles();
        
        console.log(`[ComplexSearch] Total files in vault: ${allFiles.length}`);
        
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
                        console.log(`[ComplexSearch] Early termination: found ${results.length} results`);
                        break;
                    }
                    
                    const content = await this.app.vault.cachedRead(file);
                    const cache = this.app.metadataCache.getFileCache(file);

                    // Extract frontmatter
                    const frontmatter = { ...cache?.frontmatter ?? {} };
                    delete frontmatter.position;

                    // Extract tags
                    const directTags = (cache?.tags ?? [])
                        .filter(tag => tag)
                        .map(tag => tag.tag) ?? [];
                    
                    const frontmatterTags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [];
                    
                    const filteredTags = [...frontmatterTags, ...directTags]
                        .filter(tag => tag)
                        .map(tag => tag.toString().replace(/^#/, ''))
                        .filter((value, index, self) => self.indexOf(value) === index);

                    // Create file context for search
                    const fileContext = {
                        tags: filteredTags,
                        frontmatter,
                        stat: file.stat,
                        path: file.path,
                        content
                    };

                    // For now, using simple search as a fallback
                    // In the future, this could be enhanced with actual JSON Logic
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
                        
                        console.log(`[ComplexSearch] Found match in: ${file.path} (score: ${result.score})`);
                    }
                    
                    // Progress logging every 50 files
                    if (filesProcessed % 50 === 0) {
                        const elapsed = Date.now() - startTime;
                        console.log(`[ComplexSearch] Processed ${filesProcessed}/${filesToSearch.length} files (${elapsed}ms, ${results.length} results)`);
                    }
                    
                } catch (e) {
                    console.warn(`[ComplexSearch] Error processing file ${file.path}:`, e.message);
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
        console.log(`[ComplexSearch] Completed: ${results.length} results in ${totalTime}ms (${filesProcessed} files processed)`);

        // Sort by score descending and limit results
        results.sort((a, b) => b.result.score - a.result.score);
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