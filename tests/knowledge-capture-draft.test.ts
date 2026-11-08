import {expect,it,vi} from "vitest";
import {setupWorkbench} from "../web/workbench-ui";
it("keeps an unsaved capture when the dialog closes and reopens",async()=>{
    document.body.innerHTML="";
    const hooks={api:vi.fn(),esc:(v:unknown)=>String(v),notify:vi.fn(),refresh:vi.fn(),open:vi.fn(),note:()=>null,view:()=>"library",settled:vi.fn()},ui=setupWorkbench(hooks),target=document.createElement("button");
    await ui.action("kb-capture",target);
    const material=document.querySelector<HTMLTextAreaElement>('textarea[name="material"]')!;expect(material.closest("label")!.textContent).toBe("原文");material.value="一份尚未保存的中文材料";material.dispatchEvent(new Event("input",{bubbles:true}));
    await ui.action("kb-close",target);await ui.action("kb-capture",target);
    expect(document.querySelector<HTMLTextAreaElement>('textarea[name="material"]')!.value).toBe("一份尚未保存的中文材料");expect(hooks.api).not.toHaveBeenCalled();
});
