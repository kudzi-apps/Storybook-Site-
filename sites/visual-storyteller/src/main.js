const serviceData={
"Photography":{description:"Honest, considered images of the people, places and moments that matter.",items:["Weddings","Portraits","Events","Commercial photography"]},
"Videography":{description:"Moving pictures with feeling, rhythm and a clear point of view.",items:["Wedding films","Event coverage","Commercial films","Social content","Music videos"]},
"Drone":{description:"A different perspective for places, properties and once-in-a-lifetime moments.",items:["Aerial event coverage","Property & real estate","Land & location showcases","Custom aerial projects"]},
"Digital Experiences":{description:"Useful, beautiful digital spaces that make your brand or occasion easier to experience.",items:["Storybook invitations","Business websites","Campaign landing pages","Custom digital projects"]}
};
const modal=document.querySelector("#service-modal"),title=document.querySelector("#modal-title"),desc=document.querySelector("#modal-description"),cats=document.querySelector("#modal-categories");
function openService(name){const item=serviceData[name];if(!item)return;title.textContent=name;desc.textContent=item.description;cats.innerHTML=item.items.map((x,i)=>'<div class="category"><span>'+String(i+1).padStart(2,"0")+'</span><b>'+x+'</b><i>↗</i></div>').join("");modal.classList.add("open");modal.setAttribute("aria-hidden","false");document.body.classList.add("modal-open");modal.querySelector(".modal-close").focus();}
function closeService(){modal.classList.remove("open");modal.setAttribute("aria-hidden","true");document.body.classList.remove("modal-open");}
document.querySelectorAll("[data-service]").forEach(card=>card.addEventListener("click",()=>openService(card.dataset.service)));
document.querySelector(".modal-close").addEventListener("click",closeService);modal.querySelector(".modal-shade").addEventListener("click",closeService);document.addEventListener("keydown",e=>{if(e.key==="Escape")closeService();});
document.querySelector(".menu-toggle").addEventListener("click",()=>document.querySelector(".topbar").classList.toggle("menu-open"));
document.querySelectorAll(".topbar nav a").forEach(a=>a.addEventListener("click",()=>document.querySelector(".topbar").classList.remove("menu-open")));
const reduce=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if(!reduce){window.addEventListener("pointermove",e=>{if(e.pointerType!=="mouse")return;const x=(e.clientX/innerWidth-.5)*10,y=(e.clientY/innerHeight-.5)*8;document.documentElement.style.setProperty("--shift-x",x+"px");document.documentElement.style.setProperty("--shift-y",y+"px");},{passive:true});}
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add("in-view");observer.unobserve(entry.target);}}),{threshold:.12});document.querySelectorAll(".section,.hero-copy,.hero-image").forEach(el=>observer.observe(el));