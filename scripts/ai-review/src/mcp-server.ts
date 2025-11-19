#!/usr/bin/env node

import net from 'net';
import {
  ReadFileParams,
  ReadFileRangeParams,
  ListFilesParams,
  SearchParams,
  readFileTool,
  readFileRangeTool,
  listFilesTool,
  searchTool,
} from './mcp-tools.js';

type JsonRpcId = string | number | null;

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

function sendResponse(socket: net.Socket, response: JsonRpcResponse) {
  const payload = JSON.stringify(response);
  socket.write(payload + '\n');
}

async function handleRequest(socket: net.Socket, raw: string) {
  let request: JsonRpcRequest;

  try {
    request = JSON.parse(raw);
  } catch (err) {
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

  async function safeCall<TParams, TResult>(
    fn: (p: TParams) => Promise<TResult>
  ): Promise<void> {
    try {
      const result = await fn((params || {}) as TParams);
      sendResponse(socket, { jsonrpc: '2.0', id, result });
    } catch (err: any) {
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
      return safeCall<ReadFileParams, string>(readFileTool);
    case 'read_file_range':
      return safeCall<ReadFileRangeParams, string>(readFileRangeTool);
    case 'list_files':
      return safeCall<ListFilesParams, string[]>(listFilesTool);
    case 'search':
      return safeCall<
        SearchParams,
        { path: string; line: number; preview: string }[]
      >(searchTool);
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

export function startMcpServer(port: number) {
  const server = net.createServer((socket) => {
    console.log('[MCP] Client connected');

    let buffer = '';

    socket.on('data', (data) => {
      buffer += data.toString('utf-8');

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);

        if (!line) continue;

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
