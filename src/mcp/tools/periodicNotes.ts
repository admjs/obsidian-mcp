import { App, TFile } from 'obsidian';
import { ToolHandler, Content } from '../base';

export class PeriodicNotesToolHandler extends ToolHandler {
    private app: App;

    constructor(app: App) {
        super('obsidian_periodic_notes');
        this.app = app;
    }

    getToolDescription() {
        return {
            name: this.name,
            description: 'Get current periodic note for the specified period.',
            inputSchema: {
                type: 'object',
                properties: {
                    period: {
                        type: 'string',
                        description: 'The period type (daily, weekly, monthly, quarterly, yearly)',
                        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
                    }
                },
                required: ['period']
            }
        };
    }

    async runTool(args: any): Promise<Content[]> {
        if (!args.period) {
            throw new Error('period argument missing in arguments');
        }

        const validPeriods = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
        if (!validPeriods.includes(args.period)) {
            throw new Error(`Invalid period: ${args.period}. Must be one of: ${validPeriods.join(', ')}`);
        }

        const now = new Date();
        let notePath: string;

        switch (args.period) {
            case 'daily':
                notePath = this.formatDailyNotePath(now);
                break;
            case 'weekly':
                notePath = this.formatWeeklyNotePath(now);
                break;
            case 'monthly':
                notePath = this.formatMonthlyNotePath(now);
                break;
            case 'quarterly':
                notePath = this.formatQuarterlyNotePath(now);
                break;
            case 'yearly':
                notePath = this.formatYearlyNotePath(now);
                break;
            default:
                throw new Error(`Unhandled period: ${args.period}`);
        }

        const file = this.app.vault.getAbstractFileByPath(notePath);
        if (!(file instanceof TFile)) {
            throw new Error(`Periodic note not found: ${notePath}`);
        }

        const content = await this.app.vault.read(file);
        return [{
            type: 'text',
            text: content
        }];
    }

    private formatDailyNotePath(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `Daily Notes/${year}-${month}-${day}.md`;
    }

    private formatWeeklyNotePath(date: Date): string {
        const year = date.getFullYear();
        const week = this.getWeekNumber(date);
        return `Weekly Notes/${year}-W${week}.md`;
    }

    private formatMonthlyNotePath(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `Monthly Notes/${year}-${month}.md`;
    }

    private formatQuarterlyNotePath(date: Date): string {
        const year = date.getFullYear();
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `Quarterly Notes/${year}-Q${quarter}.md`;
    }

    private formatYearlyNotePath(date: Date): string {
        const year = date.getFullYear();
        return `Yearly Notes/${year}.md`;
    }

    private getWeekNumber(date: Date): number {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }
} 