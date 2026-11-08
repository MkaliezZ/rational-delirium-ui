import {afterEach,expect,it,vi} from "vitest";
import {enter} from "../web/motion";
afterEach(()=>vi.restoreAllMocks());
it("skips page animation when the OS requests reduced motion",()=>{
    vi.spyOn(window,"matchMedia").mockReturnValue({matches:true} as MediaQueryList);
    const element=document.createElement("main"),animate=vi.fn();element.animate=animate;
    enter(element);expect(animate).not.toHaveBeenCalled();
});
it("replaces an unfinished transition and stops it if the preference changes",()=>{
    const preference=vi.spyOn(window,"matchMedia").mockReturnValue({matches:false} as MediaQueryList),cancel=vi.fn(),element=document.createElement("main"),animate=vi.fn().mockReturnValue({cancel});element.animate=animate;
    enter(element);enter(element);expect(animate).toHaveBeenCalledTimes(2);expect(cancel).toHaveBeenCalledTimes(1);
    preference.mockReturnValue({matches:true} as MediaQueryList);enter(element);expect(cancel).toHaveBeenCalledTimes(2);expect(animate).toHaveBeenCalledTimes(2);
});
