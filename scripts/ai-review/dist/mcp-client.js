import net from 'net';
let socket = null;
let buffer = '';
let nextId = 1;
const pending = new Map();
function getPort() {
    return parseInt(process.env.MCP_PORT || '3030', 10);
}
function ensureSocket() {
    if (socket && !socket.destroyed) {
        return Promise.resolve(socket);
    }
    return new Promise((resolve, reject) => {
        const port = getPort();
        const client = net.createConnection({ host: '127.0.0.1', port }, () => {
            socket = client;
            buffer = '';
            client.on('data', (data) => {
                buffer += data.toString('utf-8');
                let newlineIndex;
                while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
                    const line = buffer.slice(0, newlineIndex).trim();
                    buffer = buffer.slice(newlineIndex + 1);
                    if (!line)
                        continue;
                    try {
                        const response = JSON.parse(line);
                        const entry = pending.get(response.id);
                        if (!entry) {
                            continue;
                        }
                        pending.delete(response.id);
                        if ('result' in response) {
                            entry.resolve(response.result);
                        }
                        else {
                            entry.reject(new Error(response.error?.message || 'Unknown MCP error'));
                        }
                    }
                    catch (err) {
                        // Ignore malformed responses, but do not crash the process
                        console.error('[MCP client] Failed to parse response:', err);
                    }
                }
            });
            client.on('error', (err) => {
                console.error('[MCP client] Socket error:', err);
                for (const [, entry] of pending) {
                    entry.reject(err);
                }
                pending.clear();
            });
            client.on('close', () => {
                socket = null;
            });
            resolve(client);
        });
        client.on('error', (err) => {
            reject(err);
        });
    });
}
export async function callMcpTool(method, params) {
    const client = await ensureSocket();
    const id = nextId++;
    const request = {
        jsonrpc: '2.0',
        id,
        method,
        params,
    };
    const payload = JSON.stringify(request) + '\n';
    return new Promise((resolve, reject) => {
        pending.set(id, {
            resolve: (value) => resolve(value),
            reject,
        });
        client.write(payload, (err) => {
            if (err) {
                pending.delete(id);
                reject(err);
            }
        });
    });
}
//# sourceMappingURL=mcp-client.js.map