const active=new WeakMap<Element,Animation>();
/** Motion carries a single state transition and follows the OS accessibility preference. */
export function enter(element:HTMLElement){
    active.get(element)?.cancel();
    if(typeof element.animate!=="function"||window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    active.set(element,element.animate([{opacity:.35,transform:"translateY(6px)"},{opacity:1,transform:"translateY(0)"}],{duration:180,easing:"cubic-bezier(.2,.7,.3,1)"}));
}
