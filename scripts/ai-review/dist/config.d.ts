export declare const CONFIG: {
    deepseek: {
        apiKey: string;
        model: string;
        maxTokens: number;
    };
    github: {
        token: string;
        owner: string;
        repo: string;
    };
    mcp: {
        port: number;
    };
    contextPaths: string[];
    review: {
        maxFilesPerBatch: number;
        minSeverity: string;
        projectRoot: string;
    };
};
export declare function validateConfig(): void;
//# sourceMappingURL=config.d.ts.map