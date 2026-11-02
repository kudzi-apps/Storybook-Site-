const serviceData={
 "Photography":{description:"Honest, considered images of the people, places and moments that matter. From weddings and portraits to events and commercial work.",items:["Weddings","Portraits & people","Events","Commercial photography"]},
 "Videography":{description:"Moving pictures with feeling, rhythm and a clear point of view. Thoughtful coverage, beautifully edited.",items:["Wedding films","Event coverage","Commercial films","Social content","Music videos"]},
 "Drone":{description:"A different perspective for places, properties and once-in-a-lifetime moments.",items:["Aerial event coverage","Property & real estate","Land & location showcases","Custom aerial projects"]},
 "Digital Experiences":{description:"Useful, beautiful digital spaces that make your brand or occasion easier to experience.",items:["Storybook invitations","Business websites","Campaign landing pages","Custom digital projects"]},
 "Selected Work":{description:"A collection of real moments, considered frames and stories made to stay with you.",items:["Weddings & celebrations","People & portraits","Live events","Brand stories"]},
 "Storybook":{description:"A digital home for a celebration. Invitations, memories, venue information and the details guests need, brought together in one beautiful experience.",items:["Interactive invitations","RSVP and guest details","Venue and programme","Memories and galleries"]},
 "Portraits & People":{description:"People first. Portraits with personality, presence and a little room to be yourself.",items:["Personal portraits","Couples","Creative portraits","Brand portraits"]},
 "Events & Brands":{description:"The energy, atmosphere and details that make an event or brand worth remembering.",items:["Live events","Launches & activations","Corporate coverage","Brand campaigns"]}
};
const modal=document.querySelector("#service-modal");
const title=document.querySelector("#modal-title");
const desc=document.querySelector("#modal-description");
const cats=document.querySelector("#modal-categories");
const world=document.querySelector("#spatial-world");
let activeTile=null;
function openService(name,tile){
 const item=serviceData[name];if(!item)return;
 if(activeTile)activeTile.classList.remove("is-selected");
 activeTile=tile||null;if(activeTile)activeTile.classList.add("is-selected");
 title.textContent=name;desc.textContent=item.description;
 cats.innerHTML=item.items.map((x,i)=>'<div class="category"><span>'+String(i+1).padStart(2,"0")+'</span><b>'+x+'</b><i>↗</i></div>').join("");
 modal.classList.add("open");modal.setAttribute("aria-hidden","false");
 document.body.classList.add("modal-open");modal.querySelector(".modal-close").focus();
}
function closeService(){
 modal.classList.remove("open");modal.setAttribute("aria-hidden","true");
 document.body.classList.remove("modal-open");
 if(activeTile)activeTile.classList.remove("is-selected");activeTile=null;
}
document.querySelectorAll("[data-service]").forEach(tile=>tile.addEventListener("click",()=>openService(tile.dataset.service,tile)));
document.querySelector(".modal-close").addEventListener("click",closeService);
modal.querySelector(".modal-shade").addEventListener("click",closeService);
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeService();});
document.querySelector(".menu-toggle").addEventListener("click",()=>document.querySelector(".topbar").classList.toggle("menu-open"));
document.querySelectorAll(".topbar nav a").forEach(a=>a.addEventListener("click",()=>document.querySelector(".topbar").classList.remove("menu-open")));
const worldEl=document.querySelector("#spatial-world");
if(worldEl){
 const updateCamera=()=>{
  worldEl.style.setProperty("--scroll-camera-y",(-window.scrollY).toFixed(1)+"px");
 };
 window.addEventListener("scroll",updateCamera,{passive:true});
 window.addEventListener("resize",updateCamera,{passive:true});
 updateCamera();
}
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
 if(entry.isIntersecting){entry.target.classList.add("in-view");observer.unobserve(entry.target);}
}),{threshold:.12});
document.querySelectorAll(".section,.manifesto,.work").forEach(el=>observer.observe(el));
