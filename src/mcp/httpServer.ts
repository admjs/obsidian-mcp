import { App, Notice } from 'obsidian';
import { MCPServer } from './server';

export class MCPHttpServer {
    private app: App;
    private mcpServer: MCPServer;
    private server: any = null;
    private port: number;
    private apiKey: string;
    private isRunning: boolean = false;

    constructor(app: App, mcpServer: MCPServer, port: number = 28734, apiKey: string) {
        this.app = app;
        this.mcpServer = mcpServer;
        this.port = port;
        this.apiKey = apiKey;
    }

    public async start(): Promise<void> {
        if (this.isRunning) {
            console.log('HTTP server is already running');
            return;
        }

        try {
            // Import http module - this needs to be done dynamically for Obsidian
            const http = require('http');
            const url = require('url');

            this.server = http.createServer(async (req: any, res: any) => {
                // Enable CORS
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
                res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

                // Handle preflight requests
                if (req.method === 'OPTIONS') {
                    res.writeHead(200);
                    res.end();
                    return;
                }

                try {
                    await this.handleRequest(req, res);
                } catch (error) {
                    console.error('HTTP server error:', error);
                    this.sendErrorResponse(res, 500, 'Internal server error');
                }
            });

            await new Promise<void>((resolve, reject) => {
                this.server.listen(this.port, 'localhost', () => {
                    console.log(`MCP HTTP server started on port ${this.port}`);
                    this.isRunning = true;
                    resolve();
                });

                this.server.on('error', (error: any) => {
                    console.error('Failed to start HTTP server:', error);
                    reject(error);
                });
            });

        } catch (error) {
            console.error('Error starting HTTP server:', error);
            throw error;
        }
    }

    public async stop(): Promise<void> {
        if (!this.isRunning || !this.server) {
            return;
        }

        return new Promise<void>((resolve) => {
            this.server.close(() => {
                console.log('MCP HTTP server stopped');
                this.isRunning = false;
                this.server = null;
                resolve();
            });
        });
    }

    private async handleRequest(req: any, res: any): Promise<void> {
        const url = require('url');
        const parsedUrl = url.parse(req.url, true);
        const path = parsedUrl.pathname;

        // Verify API key
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            this.sendErrorResponse(res, 401, 'Missing or invalid authorization header');
            return;
        }

        const providedKey = authHeader.substring(7); // Remove 'Bearer ' prefix
        if (providedKey !== this.apiKey) {
            this.sendErrorResponse(res, 401, 'Invalid API key');
            return;
        }

        // Route handling
        if (path === '/api/mcp/tools' && req.method === 'GET') {
            await this.handleListTools(req, res);
        } else if (path === '/api/mcp/tools/call' && req.method === 'POST') {
            await this.handleCallTool(req, res);
        } else if (path === '/api/mcp/health' && req.method === 'GET') {
            await this.handleHealth(req, res);
        } else {
            this.sendErrorResponse(res, 404, 'Not found');
        }
    }

    private async handleListTools(req: any, res: any): Promise<void> {
        try {
            const tools = await this.mcpServer.listTools();
            this.sendJsonResponse(res, 200, tools);
        } catch (error) {
            console.error('Error listing tools:', error);
            this.sendErrorResponse(res, 500, 'Failed to list tools');
        }
    }

    private async handleCallTool(req: any, res: any): Promise<void> {
        try {
            const body = await this.readRequestBody(req);
            const { name, arguments: args } = JSON.parse(body);

            if (!name) {
                this.sendErrorResponse(res, 400, 'Missing tool name');
                return;
            }

            const result = await this.mcpServer.callTool(name, args || {});
            this.sendJsonResponse(res, 200, { content: result });
        } catch (error) {
            console.error('Error calling tool:', error);
            this.sendErrorResponse(res, 500, error.message || 'Failed to call tool');
        }
    }

    private async handleHealth(req: any, res: any): Promise<void> {
        this.sendJsonResponse(res, 200, {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        });
    }

    private readRequestBody(req: any): Promise<string> {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', (chunk: any) => {
                body += chunk.toString();
            });
            req.on('end', () => {
                resolve(body);
            });
            req.on('error', (error: any) => {
                reject(error);
            });
        });
    }

    private sendJsonResponse(res: any, statusCode: number, data: any): void {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    }

    private sendErrorResponse(res: any, statusCode: number, message: string): void {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: message }));
    }

    public isServerRunning(): boolean {
        return this.isRunning;
    }

    public getPort(): number {
        return this.port;
    }

    public updateApiKey(newApiKey: string): void {
        this.apiKey = newApiKey;
    }

    public async updatePort(newPort: number): Promise<void> {
        if (this.isRunning) {
            await this.stop();
            this.port = newPort;
            await this.start();
        } else {
            this.port = newPort;
        }
    }
} 