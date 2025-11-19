import net from 'net';

type JsonRpcId = number;

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: JsonRpcId;
  method: string;
  params?: unknown;
}

interface JsonRpcSuccess {
  jsonrpc: '2.0';
  id: JsonRpcId;
  result: unknown;
}

interface JsonRpcError {
  jsonrpc: '2.0';
  id: JsonRpcId;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

type JsonRpcResponse = JsonRpcSuccess | JsonRpcError;

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

let socket: net.Socket | null = null;
let buffer = '';
let nextId: JsonRpcId = 1;
const pending = new Map<JsonRpcId, PendingRequest>();

function getPort(): number {
  return parseInt(process.env.MCP_PORT || '3030', 10);
}

function ensureSocket(): Promise<net.Socket> {
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

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);

          if (!line) continue;

          try {
            const response: JsonRpcResponse = JSON.parse(line);
            const entry = pending.get(response.id as JsonRpcId);
            if (!entry) {
              continue;
            }

            pending.delete(response.id as JsonRpcId);

            if ('result' in response) {
              entry.resolve(response.result);
            } else {
              entry.reject(
                new Error(response.error?.message || 'Unknown MCP error')
              );
            }
          } catch (err) {
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

export async function callMcpTool<TInput extends object, TResult>(
  method: string,
  params: TInput
): Promise<TResult> {
  const client = await ensureSocket();
  const id = nextId++;

  const request: JsonRpcRequest = {
    jsonrpc: '2.0',
    id,
    method,
    params,
  };

  const payload = JSON.stringify(request) + '\n';

  return new Promise<TResult>((resolve, reject) => {
    pending.set(id, {
      resolve: (value: unknown) => resolve(value as TResult),
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
