export const VERSION = "1.11.0";
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_PLAN_BYTES = 8 * 1024 * 1024;
export const MAX_WORKSPACE_BYTES = 256 * 1024 * 1024;
export interface SourceFile {
    path: string;
    markdown: string;
    revision: string;
    mtime: number;
}
export interface WorkspaceConfig {
    schema: "rd-workspace/1";
    workspaceId: string;
    createdAt: string;
    approvalPublicKey: string;
}
export interface Change {
    path: string;
    beforeSha256: string | null;
    afterSha256: string | null;
    afterMarkdown: string | null;
}
export interface Proposal {
    schema: "rd-agent-proposal/1";
    id: string;
    workspaceId: string;
    createdAt: string;
    actor: string;
    reason: string;
    evidence: string[];
    evidenceSources: {
        id: string | null;
        path: string;
        revision: string;
    }[];
    operations: Record<string, unknown>[];
    changes: Change[];
    objectIds: string[];
    digest: string;
}
export interface Decision {
    schema: "rd-agent-decision/1";
    proposalId: string;
    proposalDigest: string;
    workspaceId: string;
    decision: "approved" | "rejected";
    reviewer: string;
    decidedAt: string;
    signature: string;
}
export interface Transaction {
    schema: "rd-agent-transaction/1";
    id: string;
    proposal: Proposal;
    decision: Decision;
    createdAt: string;
    finishedAt?: string;
    status: "prepared" | "applying" | "committed" | "rolled_back" | "execution_uncertain";
    before: Record<string, string | null>;
    failure?: string;
}
export interface QueryResult {
    revision: string;
    data: unknown;
}
