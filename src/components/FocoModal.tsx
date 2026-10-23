'use client';
import { useEffect } from 'react';

export default function FocoModal(){
 useEffect(()=>{
  let modal:HTMLElement|null=null;let anterior:HTMLElement|null=null;
  const elementos=()=>modal?[...modal.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled),select,textarea,[tabindex="0"]')].filter(e=>e.getClientRects().length):[];
  const actualizar=()=>{
   const lista=[...document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]')];const siguiente=lista.at(-1)??null;
   if(siguiente===modal)return;
   if(!siguiente){anterior?.focus();modal=null;return;}
   anterior=document.activeElement as HTMLElement;modal=siguiente;modal.tabIndex=-1;(elementos()[0]??modal).focus();
  };
  const teclas=(e:KeyboardEvent)=>{
   if(document.querySelector('dialog[open]'))return;
   if(!modal)return;const lista=elementos();
   if(e.key==='Tab'){
    if(!lista.length){e.preventDefault();modal.focus();return;}
    const primero=lista[0],ultimo=lista.at(-1)!;
    if(e.shiftKey&&(document.activeElement===primero||document.activeElement===modal)){e.preventDefault();ultimo.focus();}
    else if(!e.shiftKey&&document.activeElement===ultimo){e.preventDefault();primero.focus();}
   }
   if(e.key==='Escape')modal.querySelector<HTMLButtonElement>('button[aria-label^="Cerrar"]')?.click();
  };
  const observer=new MutationObserver(actualizar);observer.observe(document.body,{childList:true,subtree:true});actualizar();
  document.addEventListener('keydown',teclas);return()=>{observer.disconnect();document.removeEventListener('keydown',teclas);};
 },[]);return null;
}
