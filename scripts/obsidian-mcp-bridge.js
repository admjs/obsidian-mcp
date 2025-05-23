#!/usr/bin/env node
/**
 * MCP Bridge Script for Obsidian
 * This script bridges MCP clients (like Claude Desktop) to the Obsidian MCP plugin
 * It communicates with the plugin via HTTP server running in Obsidian
 */

const http = require('http');
const { URL } = require('url');

// Configuration from environment variables
const OBSIDIAN_API_KEY = process.env.OBSIDIAN_API_KEY;
const OBSIDIAN_VAULT_PATH = process.env.OBSIDIAN_VAULT_PATH;
const OBSIDIAN_SERVER_PORT = process.env.OBSIDIAN_SERVER_PORT || '28734';
const OBSIDIAN_SERVER_HOST = process.env.OBSIDIAN_SERVER_HOST || 'localhost';

if (!OBSIDIAN_API_KEY) {
    console.error('Error: OBSIDIAN_API_KEY environment variable is required');
    process.exit(1);
}

if (!OBSIDIAN_VAULT_PATH) {
    console.error('Error: OBSIDIAN_VAULT_PATH environment variable is required');
    process.exit(1);
}

console.error('Starting Obsidian MCP Bridge...');
console.error('API Key:', OBSIDIAN_API_KEY.substring(0, 8) + '...');
console.error('Vault Path:', OBSIDIAN_VAULT_PATH);
console.error('Server:', `${OBSIDIAN_SERVER_HOST}:${OBSIDIAN_SERVER_PORT}`);

/**
 * Make HTTP request to Obsidian plugin
 */
function makeObsidianRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: OBSIDIAN_SERVER_HOST,
            port: OBSIDIAN_SERVER_PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OBSIDIAN_API_KEY}`,
                'User-Agent': 'ObsidianMCPBridge/1.0'
            }
        };

        if (data) {
            const jsonData = JSON.stringify(data);
            options.headers['Content-Length'] = Buffer.byteLength(jsonData);
        }

        const req = http.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseData);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(parsed);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${parsed.error || responseData}`));
                    }
                } catch (error) {
                    reject(new Error(`Invalid JSON response: ${responseData}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error(`Connection failed: ${error.message}`));
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

/**
 * MCP Protocol Implementation
 */
class ObsidianMCPServer {
    constructor() {
        this.tools = null;
        this.prompts = null;
    }

    async initialize() {
        try {
            // Get available tools from Obsidian plugin
            this.tools = await makeObsidianRequest('/api/mcp/tools');
            console.error(`Loaded ${this.tools.length} tools from Obsidian`);
            
            // Get available prompts from Obsidian plugin
            try {
                const promptsResponse = await makeObsidianRequest('/api/mcp/prompts');
                this.prompts = promptsResponse.prompts || [];
                console.error(`Loaded ${this.prompts.length} prompts from Obsidian`);
            } catch (error) {
                console.error('Warning: Could not load prompts (this is normal for older plugin versions):', error.message);
                this.prompts = [];
            }
        } catch (error) {
            console.error('Failed to connect to Obsidian plugin:', error.message);
            console.error('Make sure:');
            console.error('1. Obsidian is running');
            console.error('2. MCP plugin is enabled');
            console.error('3. HTTP server is started in plugin settings');
            console.error('4. API key is correct');
            process.exit(1);
        }
    }

    async handleRequest(request) {
        if (!request.method) {
            throw new Error('Missing method in request');
        }

        console.error(`[MCP] Handling request: ${request.method}`);

        switch (request.method) {
            case 'initialize':
                // Handle MCP initialization
                console.error('[MCP] Sending initialize response');
                return {
                    protocolVersion: "2024-11-05",
                    capabilities: {
                        tools: {},
                        prompts: {}
                    },
                    serverInfo: {
                        name: "obsidian-mcp-bridge",
                        version: "1.0.0"
                    }
                };
            
            case 'tools/list':
                console.error('[MCP] Sending tools list');
                return {
                    tools: this.tools || []
                };
            
            case 'tools/call':
                if (!request.params || !request.params.name) {
                    throw new Error('Missing tool name in tools/call request');
                }
                
                console.error(`[MCP] Calling tool: ${request.params.name}`);
                const toolResult = await makeObsidianRequest('/api/mcp/tools/call', 'POST', {
                    name: request.params.name,
                    arguments: request.params.arguments || {}
                });
                
                return {
                    content: toolResult.content || []
                };
            
            case 'prompts/list':
                console.error('[MCP] Sending prompts list');
                return {
                    prompts: this.prompts || []
                };
            
            case 'prompts/get':
                if (!request.params || !request.params.name) {
                    throw new Error('Missing prompt name in prompts/get request');
                }
                
                console.error(`[MCP] Getting prompt: ${request.params.name}`);
                const promptResult = await makeObsidianRequest('/api/mcp/prompts/get', 'POST', {
                    name: request.params.name,
                    arguments: request.params.arguments || {}
                });
                
                return promptResult;
                
            case 'notifications/initialized':
                // Handle initialization notification (no response needed)
                console.error('[MCP] Received initialized notification');
                return null;
            
            default:
                console.error(`[MCP] Unknown method: ${request.method}`);
                throw new Error(`Unknown method: ${request.method}`);
        }
    }
}

// Main execution
async function main() {
    const server = new ObsidianMCPServer();
    
    // Initialize connection to Obsidian
    await server.initialize();

    // Handle stdin/stdout communication (MCP protocol)
    process.stdin.setEncoding('utf8');
    
    let buffer = '';
    
    process.stdin.on('data', async (chunk) => {
        buffer += chunk;
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
            if (line.trim()) {
                let request = null;
                try {
                    request = JSON.parse(line);
                    console.error(`[MCP] Received request: ${JSON.stringify(request)}`);
                    
                    const response = await server.handleRequest(request);
                    
                    // Only send response if it's not null (notifications return null)
                    if (response !== null) {
                        // Send response with proper MCP format
                        const mcpResponse = {
                            jsonrpc: "2.0",
                            id: request.id !== undefined ? request.id : null,
                            result: response
                        };
                        
                        console.error(`[MCP] Sending response: ${JSON.stringify(mcpResponse)}`);
                        console.log(JSON.stringify(mcpResponse));
                    } else {
                        console.error('[MCP] No response needed for this request');
                    }
                } catch (error) {
                    console.error(`[MCP] Error processing request: ${error.message}`);
                    
                    // Only send error response if we have a valid request with an id
                    if (request && request.id !== undefined) {
                        const errorResponse = {
                            jsonrpc: "2.0",
                            id: request.id,
                            error: {
                                code: -32000,
                                message: error.message
                            }
                        };
                        
                        console.error(`[MCP] Sending error response: ${JSON.stringify(errorResponse)}`);
                        console.log(JSON.stringify(errorResponse));
                    } else {
                        // For invalid JSON or requests without id, log error to stderr
                        console.error('Error processing invalid request:', error.message);
                    }
                }
            }
        }
    });

    process.stdin.on('end', () => {
        console.error('Input stream ended');
        process.exit(0);
    });

    console.error('Obsidian MCP Bridge started successfully');
}

// Handle process termination
process.on('SIGINT', () => {
    console.error('Bridge shutting down...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.error('Bridge shutting down...');
    process.exit(0);
});

// Start the bridge
main().catch((error) => {
    console.error('Failed to start bridge:', error.message);
    process.exit(1);
}); 