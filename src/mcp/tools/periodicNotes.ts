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
            description: 'Get or create current periodic note for the specified period. If the note doesn\'t exist, it can optionally be created with a basic template.',
            inputSchema: {
                type: 'object',
                properties: {
                    period: {
                        type: 'string',
                        description: 'The period type (daily, weekly, monthly, quarterly, yearly)',
                        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
                    },
                    create_if_missing: {
                        type: 'boolean',
                        description: 'Whether to create the note if it doesn\'t exist (default: false)',
                        default: false
                    },
                    template_content: {
                        type: 'string',
                        description: 'Optional template content to use when creating a new note. If not provided, a basic template will be used.'
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

        const createIfMissing = args.create_if_missing === true;
        const templateContent = args.template_content || null;

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

        console.log(`[PeriodicNotes] Looking for ${args.period} note at: ${notePath}`);

        const file = this.app.vault.getAbstractFileByPath(notePath);
        
        if (!(file instanceof TFile)) {
            // Note doesn't exist
            if (createIfMissing) {
                try {
                    // Create the note with template content
                    const content = templateContent || this.getDefaultTemplate(args.period, now);
                    const newFile = await this.app.vault.create(notePath, content);
                    
                    console.log(`[PeriodicNotes] Created new ${args.period} note: ${notePath}`);
                    
                    return [{
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            created: true,
                            path: notePath,
                            content: content,
                            message: `Created new ${args.period} note for ${this.formatDateForDisplay(now, args.period)}`
                        }, null, 2)
                    }];
                } catch (error) {
                    console.error(`[PeriodicNotes] Error creating ${args.period} note:`, error);
                    return [{
                        type: 'text',
                        text: JSON.stringify({
                            success: false,
                            created: false,
                            path: notePath,
                            error: `Failed to create ${args.period} note: ${error.message}`,
                            suggestions: [
                                `Check if the directory "${this.getDirectoryFromPath(notePath)}" exists`,
                                `Ensure you have write permissions`,
                                `Try creating the directory structure first`
                            ]
                        }, null, 2)
                    }];
                }
            } else {
                // Note doesn't exist and user doesn't want to create it
                return [{
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        found: false,
                        path: notePath,
                        message: `${args.period.charAt(0).toUpperCase() + args.period.slice(1)} note for ${this.formatDateForDisplay(now, args.period)} doesn't exist yet`,
                        suggestions: [
                            `Set "create_if_missing": true to automatically create the note`,
                            `Create the note manually in Obsidian`,
                            `Use the obsidian_get_templates tool to find an appropriate template`,
                            `Check if your periodic notes are stored in a different location`
                        ],
                        would_create_at: notePath,
                        template_preview: this.getDefaultTemplate(args.period, now)
                    }, null, 2)
                }];
            }
        }

        // Note exists, read and return it
        try {
            const content = await this.app.vault.read(file);
            console.log(`[PeriodicNotes] Found existing ${args.period} note: ${notePath}`);
            
            return [{
                type: 'text',
                text: JSON.stringify({
                    success: true,
                    found: true,
                    path: notePath,
                    content: content,
                    last_modified: file.stat.mtime,
                    size: file.stat.size
                }, null, 2)
            }];
        } catch (error) {
            console.error(`[PeriodicNotes] Error reading ${args.period} note:`, error);
            return [{
                type: 'text',
                text: JSON.stringify({
                    success: false,
                    found: true,
                    path: notePath,
                    error: `Failed to read ${args.period} note: ${error.message}`
                }, null, 2)
            }];
        }
    }

    private getDefaultTemplate(period: string, date: Date): string {
        const dateStr = this.formatDateForDisplay(date, period);
        
        switch (period) {
            case 'daily':
                return `# ${dateStr}

## 🎯 Today's Focus
- 

## 📝 Notes


## ✅ Tasks
- [ ] 

## 🔗 Links


## 📊 Reflection
### What went well:
- 

### What could be improved:
- 

### Tomorrow's priorities:
- 

---
*Created: ${new Date().toISOString()}*`;

            case 'weekly':
                return `# Week ${this.getWeekNumber(date)}, ${date.getFullYear()}

## 🎯 Week's Goals
- 

## 📊 Progress Review
### Completed:
- 

### In Progress:
- 

### Planned:
- 

## 🔗 Related Notes


## 📈 Reflection
### Wins:
- 

### Challenges:
- 

### Next Week's Focus:
- 

---
*Week of ${dateStr} | Created: ${new Date().toISOString()}*`;

            case 'monthly':
                return `# ${dateStr}

## 🎯 Monthly Objectives
- 

## 📊 Monthly Review
### Key Achievements:
- 

### Projects Completed:
- 

### Ongoing Initiatives:
- 

## 📈 Metrics & KPIs


## 🔗 Important Notes


## 🔄 Reflection
### What worked well:
- 

### Areas for improvement:
- 

### Next month's priorities:
- 

---
*Created: ${new Date().toISOString()}*`;

            case 'quarterly':
                return `# Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}

## 🎯 Quarterly Goals
- 

## 📊 Quarterly Review
### Major Milestones:
- 

### Key Projects:
- 

### Performance Highlights:
- 

## 📈 Metrics & Analytics


## 🔄 Strategic Reflection
### Successes:
- 

### Lessons Learned:
- 

### Next Quarter's Strategy:
- 

---
*Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()} | Created: ${new Date().toISOString()}*`;

            case 'yearly':
                return `# ${date.getFullYear()} Annual Review

## 🎯 Year's Vision & Goals
- 

## 📊 Annual Achievements
### Major Accomplishments:
- 

### Key Projects Completed:
- 

### Skills Developed:
- 

## 📈 Year in Numbers


## 🔄 Annual Reflection
### Greatest successes:
- 

### Biggest challenges overcome:
- 

### Key learnings:
- 

## 🚀 Looking Ahead to ${date.getFullYear() + 1}
### Vision:
- 

### Priorities:
- 

### Goals:
- 

---
*${date.getFullYear()} Annual Review | Created: ${new Date().toISOString()}*`;

            default:
                return `# ${dateStr}

## Notes


---
*Created: ${new Date().toISOString()}*`;
        }
    }

    private formatDateForDisplay(date: Date, period: string): string {
        switch (period) {
            case 'daily':
                return date.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                });
            case 'weekly':
                return `Week ${this.getWeekNumber(date)}, ${date.getFullYear()}`;
            case 'monthly':
                return date.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long' 
                });
            case 'quarterly':
                return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
            case 'yearly':
                return date.getFullYear().toString();
            default:
                return date.toLocaleDateString();
        }
    }

    private getDirectoryFromPath(filePath: string): string {
        const lastSlash = filePath.lastIndexOf('/');
        return lastSlash > 0 ? filePath.substring(0, lastSlash) : '';
    }

    private formatDailyNotePath(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `Daily/${year}-${month}-${day}.md`;
    }

    private formatWeeklyNotePath(date: Date): string {
        const year = date.getFullYear();
        const week = this.getWeekNumber(date);
        return `Weekly/${year}-W${week}.md`;
    }

    private formatMonthlyNotePath(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `Monthly/${year}-${month}.md`;
    }

    private formatQuarterlyNotePath(date: Date): string {
        const year = date.getFullYear();
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        return `Quarterly/${year}-Q${quarter}.md`;
    }

    private formatYearlyNotePath(date: Date): string {
        const year = date.getFullYear();
        return `Yearly/${year}.md`;
    }

    private getWeekNumber(date: Date): number {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
        return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
    }
} 