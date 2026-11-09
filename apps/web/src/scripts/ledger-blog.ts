import {decodeHex} from './byte-order';
const input=document.querySelector<HTMLInputElement>('#hex-input');
function updateLab(){
 if(!input)return;
 const result=decodeHex(input.value),error=document.querySelector<HTMLElement>('#hex-error')!;
 error.hidden=!!result;input.setAttribute('aria-invalid',String(!result));
 const big=document.querySelector('#big-bytes')!,little=document.querySelector('#little-bytes')!,decimal=document.querySelector('#decimal-value')!,message=document.querySelector('#lab-result')!;
 function showBytes(target:Element,bytes:string[]){target.replaceChildren(...bytes.map(value=>{const b=document.createElement('b');b.textContent=value;return b;}));}
 if(!result){showBytes(big,['—','—','—','—']);showBytes(little,['—','—','—','—']);decimal.textContent='—';message.textContent='Enter a valid 32-bit hexadecimal value to compare the byte sequences.';return;}
 const reverse=[...result.bytes].reverse();showBytes(big,result.bytes);showBytes(little,reverse);decimal.textContent=result.value.toLocaleString('en-US');
 const wrong=parseInt(reverse.join(''),16);message.textContent=wrong===result.value?'This pattern looks the same in both orders. Asymmetric values are better at exposing byte-order mistakes.':`Read the big-endian row as little-endian and you get 0x${reverse.join('')} (${wrong.toLocaleString('en-US')}), a different value.`;
}
input?.addEventListener('input',updateLab);
document.querySelector('#reset-value')?.addEventListener('click',()=>{if(input){input.value='12345678';updateLab();input.focus();}});
updateLab();
let toastTimeout:ReturnType<typeof setTimeout>;
function toast(text:string){const el=document.querySelector<HTMLElement>('#toast');if(!el)return;el.textContent=text;el.classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.classList.remove('show'),2500);}
document.querySelectorAll<HTMLElement>('.article-body pre').forEach((pre,index)=>{
 const code=pre.querySelector('code');if(!code)return;
 const wrapper=document.createElement('div');wrapper.className='code-block';
 const header=document.createElement('div');header.className='code-header';const label=document.createElement('span');label.textContent='EXAMPLE';
 const button=document.createElement('button');button.className='copy-code';button.textContent='Copy code';button.type='button';button.setAttribute('aria-label',`Copy code example ${index+1}`);
 header.append(label,button);pre.before(wrapper);wrapper.append(header,pre);
 button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(code.textContent??'');toast('Code copied');}catch{const selection=window.getSelection();const range=document.createRange();range.selectNodeContents(code);selection?.removeAllRanges();selection?.addRange(range);toast('Code selected. Use your copy shortcut.');}});
});
const article=document.querySelector('.article-body');
function progress(){const el=document.querySelector<HTMLElement>('#reading-progress');if(!el)return;const height=document.documentElement.scrollHeight-window.innerHeight;el.style.width=(article&&height>0?Math.min(100,Math.max(0,window.scrollY/height*100)):0)+'%';}
window.addEventListener('scroll',progress,{passive:true});window.addEventListener('resize',progress);progress();
if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting)document.querySelectorAll<HTMLAnchorElement>('.contents nav a').forEach(a=>{const active=a.hash==='#'+entry.target.id;a.classList.toggle('current',active);if(active)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}),{rootMargin:'-10% 0px -75% 0px'});document.querySelectorAll('.article-body h2[id],#byte-lab').forEach(h=>observer.observe(h));}
