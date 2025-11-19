#!/usr/bin/env node
import net from 'net';
import { readFileTool, readFileRangeTool, listFilesTool, searchTool, } from './mcp-tools.js';
function sendResponse(socket, response) {
    const payload = JSON.stringify(response);
    socket.write(payload + '\n');
}
async function handleRequest(socket, raw) {
    let request;
    try {
        request = JSON.parse(raw);
    }
    catch (err) {
        return sendResponse(socket, {
            jsonrpc: '2.0',
            id: null,
            error: {
                code: -32700,
                message: 'Parse error',
            },
        });
    }
    const { id, method, params } = request;
    async function safeCall(fn) {
        try {
            const result = await fn((params || {}));
            sendResponse(socket, { jsonrpc: '2.0', id, result });
        }
        catch (err) {
            sendResponse(socket, {
                jsonrpc: '2.0',
                id,
                error: {
                    code: -32000,
                    message: err?.message || 'Internal error',
                },
            });
        }
    }
    switch (method) {
        case 'read_file':
            return safeCall(readFileTool);
        case 'read_file_range':
            return safeCall(readFileRangeTool);
        case 'list_files':
            return safeCall(listFilesTool);
        case 'search':
            return safeCall(searchTool);
        default:
            return sendResponse(socket, {
                jsonrpc: '2.0',
                id,
                error: {
                    code: -32601,
                    message: `Method not found: ${method}`,
                },
            });
    }
}
export function startMcpServer(port) {
    const server = net.createServer((socket) => {
        console.log('[MCP] Client connected');
        let buffer = '';
        socket.on('data', (data) => {
            buffer += data.toString('utf-8');
            let newlineIndex;
            while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
                const line = buffer.slice(0, newlineIndex).trim();
                buffer = buffer.slice(newlineIndex + 1);
                if (!line)
                    continue;
                void handleRequest(socket, line);
            }
        });
        socket.on('close', () => {
            console.log('[MCP] Client disconnected');
        });
        socket.on('error', (err) => {
            console.error('[MCP] Socket error:', err);
        });
    });
    server.listen(port, '127.0.0.1', () => {
        console.log(`[MCP] Server listening on 127.0.0.1:${port}`);
    });
    server.on('error', (err) => {
        console.error('[MCP] Server error:', err);
        process.exit(1);
    });
}
if (import.meta.url === `file://${process.argv[1]}`) {
    const port = parseInt(process.env.MCP_PORT || '3030', 10);
    startMcpServer(port);
}
//# sourceMappingURL=mcp-server.js.map