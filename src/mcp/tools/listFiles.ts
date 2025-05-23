import { App, TFile, TFolder } from 'obsidian';
import { ToolHandler, Content } from '../base';

export class ListFilesInVaultToolHandler extends ToolHandler {
    private app: App;

    constructor(app: App) {
        super('obsidian_list_files_in_vault');
        this.app = app;
    }

    getToolDescription() {
        return {
            name: this.name,
            description: 'Lists all files and directories in the root directory of your Obsidian vault. Note: Call obsidian_init_required first if you haven\'t already.',
            inputSchema: {
                type: 'object',
                properties: {},
                required: []
            }
        };
    }

    async runTool(args: any): Promise<Content[]> {
        const files = this.app.vault.getAllLoadedFiles();
        
        const result = files.map(file => {
            if (file instanceof TFile) {
                return {
                    path: file.path,
                    type: 'file',
                    extension: file.extension,
                    basename: file.basename
                };
            } else if (file instanceof TFolder) {
                return {
                    path: file.path,
                    type: 'folder'
                };
            }
            return null;
        }).filter(Boolean);

        return [
            {
                type: 'text',
                text: JSON.stringify(result, null, 2)
            }
        ];
    }
} 