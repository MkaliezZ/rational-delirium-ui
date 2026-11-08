/** Refresh an expired page session without losing the current route or editor.
 * Only rejected (never executed) requests are retried, and only for the same
 * workspace. Network errors and successful mutations are never replayed. */
export function sessionClient(initialToken: string, request: typeof fetch = fetch) {
    let token = initialToken, identity: string | undefined;
    let renewing: Promise<void> | undefined;
    const send = async (command: string, args: Record<string, unknown>) => {
        const response = await request("/api", { method: "POST", headers: { "content-type": "application/json", "x-rd-token": token }, body: JSON.stringify({ command, args }) });
        const result = await response.json();
        return result;
    };
    const key = (s: any) => JSON.stringify([s.root, s.workspaceId ?? null, s.readOnly === true]);
    const renew = () => renewing ??= (async () => {
        const html = await request("/", { cache: "no-store" });
        if (!html.ok) throw Error("无法重新连接本地服务，请稍后重试。草稿仍保留。");
        const next = (await html.text()).match(/name="rd-token" content="([a-f0-9]{64})"/)?.[1];
        if (!next) throw Error("无法恢复本地会话，请保留草稿后刷新页面。");
        token = next;
        const status = await send("status", {});
        if (!status.ok) throw Error("本地会话尚未恢复，请重试。");
        const actual = key(status.data);
        if (identity !== undefined && identity !== actual) {
            token = "";
            throw Error("此端口已切换到其他工作区或访问模式。草稿已保留，请复制草稿后刷新页面。");
        }
        identity = actual;
    })().finally(() => { renewing = undefined; });
    return async (command: string, args: Record<string, unknown> = {}) => {
        if (renewing) await renewing;
        let result = await send(command, args);
        if (!result.ok && result.error?.code === "UNAUTHORIZED") {
            await renew();
            result = await send(command, args);
        }
        if (result.ok && command === "status") {
            const actual = key(result.data);
            if (identity !== undefined && identity !== actual) throw Error("工作区已切换，请保留草稿后刷新页面。");
            identity = actual;
        }
        return result;
    };
}
