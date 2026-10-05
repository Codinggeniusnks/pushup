'use client';
import {useEffect,useRef} from 'react';
export function ModalFrame({children,onClose}:{children:React.ReactNode;onClose:()=>void}){
 const root=useRef<HTMLDivElement>(null),close=useRef(onClose);close.current=onClose;
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;
  const dialog=root.current!;
  const focusable=()=>Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]'));
  (dialog.querySelector<HTMLElement>('input:not([type=range])')??focusable()[0])?.focus();
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();close.current();}if(e.key==='Tab'){const elements=focusable(),first=elements[0],last=elements.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};
  document.addEventListener('keydown',key);const overflow=document.body.style.overflow;document.body.style.overflow='hidden';
  return()=>{document.removeEventListener('keydown',key);document.body.style.overflow=overflow;previous?.focus();};
 },[]);
 return <div className="modal-backdrop" ref={root}>{children}</div>;
}
