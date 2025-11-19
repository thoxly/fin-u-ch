export interface ReadFileParams {
    path: string;
}
export interface ReadFileRangeParams {
    path: string;
    start: number;
    end: number;
}
export interface ListFilesParams {
    pattern: string;
}
export interface SearchParams {
    query: string;
}
export declare function readFileTool(params: ReadFileParams): Promise<string>;
export declare function readFileRangeTool(params: ReadFileRangeParams): Promise<string>;
export declare function listFilesTool(params: ListFilesParams): Promise<string[]>;
export declare function searchTool(params: SearchParams): Promise<{
    path: string;
    line: number;
    preview: string;
}[]>;
//# sourceMappingURL=mcp-tools.d.ts.map