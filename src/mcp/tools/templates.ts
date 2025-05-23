import { App, TFile, TFolder } from 'obsidian';
import { ToolHandler, Content } from '../base';

interface TemplateItem {
    name: string;
    path: string;
    content: string;
    basename: string;
    extension: string;
}

export class TemplatesToolHandler extends ToolHandler {
    private app: App;
    private templatesDir: string;

    constructor(app: App, templatesDir: string = 'Templates') {
        super('obsidian_get_templates');
        this.app = app;
        this.templatesDir = templatesDir;
    }

    // Method to update templates directory
    updateTemplatesDir(templatesDir: string) {
        this.templatesDir = templatesDir;
    }

    getToolDescription() {
        return {
            name: this.name,
            description: 'Get all available templates from the configured templates directory in the vault. Templates will likely inlcude things like notes, tasks, and other strutured objects. Use this when the user is asking you to create something specific to check for an appropriate template.',
            inputSchema: {
                type: 'object',
                properties: {
                    include_content: {
                        type: 'boolean',
                        description: 'Whether to include template content in the response (default: true)',
                        default: true
                    }
                },
                required: []
            }
        };
    }

    async runTool(args: any): Promise<Content[]> {
        const includeContent = args.include_content !== false; // Default to true
        
        console.log(`[Templates] Getting templates from directory: ${this.templatesDir}`);
        
        try {
            // Get the templates folder
            const templatesFolder = this.app.vault.getAbstractFileByPath(this.templatesDir);
            
            if (!templatesFolder) {
                return [{
                    type: 'text',
                    text: JSON.stringify({
                        error: `Templates directory '${this.templatesDir}' not found in vault`,
                        templates: [],
                        summary: {
                            total_templates: 0,
                            templates_directory: this.templatesDir,
                            directory_exists: false
                        }
                    }, null, 2)
                }];
            }

            if (!(templatesFolder instanceof TFolder)) {
                return [{
                    type: 'text',
                    text: JSON.stringify({
                        error: `'${this.templatesDir}' exists but is not a directory`,
                        templates: [],
                        summary: {
                            total_templates: 0,
                            templates_directory: this.templatesDir,
                            directory_exists: false
                        }
                    }, null, 2)
                }];
            }

            // Get all template files from the directory (including subdirectories)
            const templates: TemplateItem[] = [];
            await this.collectTemplatesFromFolder(templatesFolder, templates, includeContent);

            const summary = {
                total_templates: templates.length,
                templates_directory: this.templatesDir,
                directory_exists: true,
                include_content: includeContent
            };

            console.log(`[Templates] Found ${templates.length} templates`);

            return [{
                type: 'text',
                text: JSON.stringify({
                    summary,
                    templates
                }, null, 2)
            }];

        } catch (error) {
            console.error('[Templates] Error getting templates:', error);
            return [{
                type: 'text',
                text: JSON.stringify({
                    error: `Error reading templates: ${error.message}`,
                    templates: [],
                    summary: {
                        total_templates: 0,
                        templates_directory: this.templatesDir,
                        directory_exists: false
                    }
                }, null, 2)
            }];
        }
    }

    private async collectTemplatesFromFolder(
        folder: TFolder, 
        templates: TemplateItem[], 
        includeContent: boolean
    ): Promise<void> {
        for (const child of folder.children) {
            if (child instanceof TFile) {
                // Include all file types as potential templates (not just .md)
                try {
                    let content = '';
                    if (includeContent) {
                        content = await this.app.vault.cachedRead(child);
                    }

                    templates.push({
                        name: child.name,
                        path: child.path,
                        content: content,
                        basename: child.basename,
                        extension: child.extension
                    });
                } catch (error) {
                    console.warn(`[Templates] Error reading template file ${child.path}:`, error);
                    // Still include the file in the list, but without content
                    templates.push({
                        name: child.name,
                        path: child.path,
                        content: `Error reading file: ${error.message}`,
                        basename: child.basename,
                        extension: child.extension
                    });
                }
            } else if (child instanceof TFolder) {
                // Recursively process subdirectories
                await this.collectTemplatesFromFolder(child, templates, includeContent);
            }
        }
    }
} 