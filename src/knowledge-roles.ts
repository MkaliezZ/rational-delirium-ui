import { isIndexablePath } from "./scope";
/** Cognitive roles supplement both existing object schemas; never migrate identity on read. */
export const KNOWLEDGE_ROLES = ["case", "evidence", "hypothesis", "loop"] as const;
export type KnowledgeRole = typeof KNOWLEDGE_ROLES[number];
export const ROLE_LABELS: Record<KnowledgeRole, string> = { case: "案例", evidence: "证据", hypothesis: "假设", loop: "重复模式" };
export function isRole(value: unknown): value is KnowledgeRole { return KNOWLEDGE_ROLES.includes(value as KnowledgeRole); }
const relationKinds=["supports","contradicts","complements","related","derived_from","observed_in","repeats_in","depends_on","revises","supersedes"];
export function isSourceCitation(s:any):boolean{return !!s&&typeof s==="object"&&typeof s.path==="string"&&isIndexablePath(s.path)&&!s.path.startsWith("/")&&s.path.split("/").every((p:string)=>p&&p!==".")&&!/[\\:\r\n\0]/.test(s.path)&&/^[a-f0-9]{64}$/.test(s.revision)&&Number.isInteger(s.startLine)&&s.startLine>=1&&Number.isInteger(s.endLine)&&s.endLine>=s.startLine&&typeof s.quote==="string";}
export function rolesOf(kind: string | null | undefined, fields: Record<string, unknown>): KnowledgeRole[] {
    const declared = Array.isArray(fields.rd_roles) ? fields.rd_roles.filter(isRole) : [];
    return KNOWLEDGE_ROLES.filter(role => role === kind || declared.includes(role));
}
export function roleMetadataErrors(fields: Record<string, unknown>): string[] {
    const errors: string[] = [];
    if (fields.rd_roles !== undefined && (!Array.isArray(fields.rd_roles) || !fields.rd_roles.every(isRole) || new Set(fields.rd_roles).size !== fields.rd_roles.length)) errors.push("rd_roles must contain unique case/evidence/hypothesis/loop values");
    if (fields.rd_sources !== undefined && (!Array.isArray(fields.rd_sources) || fields.rd_sources.length > 32 || !fields.rd_sources.every(s => s && typeof s === "object" && typeof s.path === "string" && isIndexablePath(s.path) && !s.path.startsWith("/") && s.path.split("/").every((p:string)=>p&&p!==".") && !/[\\:\r\n\0]/.test(s.path) && /^[a-f0-9]{64}$/.test(s.revision) && Number.isInteger(s.startLine) && s.startLine >= 1 && Number.isInteger(s.endLine) && s.endLine >= s.startLine && typeof s.quote === "string"))) errors.push("rd_sources requires a relative Markdown path, SHA-256 revision, line range and quote");
    if (fields.rd_extraction_key !== undefined && (typeof fields.rd_extraction_key !== "string" || !/^[a-f0-9]{64}$/.test(fields.rd_extraction_key))) errors.push("rd_extraction_key must be SHA-256");
    if(fields.rd_relation_notes!==undefined&&(!Array.isArray(fields.rd_relation_notes)||fields.rd_relation_notes.length>128||!fields.rd_relation_notes.every((n:any)=>n&&typeof n.reason==="string"&&(n.evidence===undefined||Array.isArray(n.evidence)&&n.evidence.length<=8&&n.evidence.every(isSourceCitation)))))errors.push("rd_relation_notes evidence requires valid source citations");
    if(fields.rd_relation_candidates!==undefined&&(!Array.isArray(fields.rd_relation_candidates)||fields.rd_relation_candidates.length>64||!fields.rd_relation_candidates.every((n:any)=>n&&n.state==="candidate"&&relationKinds.includes(n.predicate)&&typeof n.target==="string"&&n.target.length>0&&typeof n.reason==="string"&&n.reason.length>0&&n.reason.length<=2000&&Array.isArray(n.evidence)&&n.evidence.length>0&&n.evidence.length<=8&&n.evidence.every(isSourceCitation))))errors.push("rd_relation_candidates require candidate state, target, reason and source citations");
    return errors;
}
