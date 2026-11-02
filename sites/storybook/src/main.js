const $=s=>document.querySelector(s);
const photos={
couple:"https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1600&q=90",
venue:"https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=85",
gallery1:"https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=85",
gallery2:"https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=1000&q=85",
gallery3:"https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1000&q=85"
};
const pages=["rsvp","venue","gallery"];
const details={
rsvp:{title:"Your invitation",kicker:"A PLACE AT OUR TABLE",description:"Be part of the day. Let us know if you'll be joining us.",image:photos.couple,action:"Open your invitation"},
home:{title:"Our little forever",kicker:"THE WEDDING OF ALEXANDRA & JAMES",description:"A day made more beautiful because we'll share it with you.",image:photos.couple,action:"View the invitation"},
venue:{title:"The Olive Grove",kicker:"HARARE · ZIMBABWE",description:"A garden setting for a day filled with love, laughter and the people who matter.",image:photos.venue,action:"Explore the venue"},
gallery:{title:"Moments to keep",kicker:"THE WEDDING COLLECTION",description:"A growing collection of the little moments that make the day ours.",image:photos.gallery1,action:"Open the gallery"}
};
let current=0,accepted=false,modalReturnFocus=null;
const activeKey=()=>current===0&&accepted?"home":pages[current];
const icons={rsvp:'<svg class="card-icon" viewBox="0 0 24 24"><path d="M4 5h16v14H4z"/><path d="m4 7 8 6 8-6"/></svg>',home:'<svg class="card-icon" viewBox="0 0 24 24"><path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10M9 21v-7h6v7"/></svg>',venue:'<svg class="card-icon" viewBox="0 0 24 24"><path d="M12 22s8-7.2 8-13a8 8 0 1 0-16 0c0 5.8 8 13 8 13Z"/><circle cx="12" cy="9" r="2.5"/></svg>',gallery:'<svg class="card-icon" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/></svg>'};
function render(){
const order=[(current+2)%3,current,(current+1)%3],labels=accepted?["Home","Venue","Gallery"]:["RSVP","Venue","Gallery"];
$("#nav").querySelectorAll("button").forEach((b,i)=>{b.classList.toggle("active",i===current);b.innerHTML=icons[i===0?(accepted?"home":"rsvp"):pages[i]]+"<span>"+labels[i]+"</span>";b.setAttribute("aria-current",i===current?"page":"false");});
$("#stage").innerHTML='<div class="carousel" aria-label="Storybook pages">'+order.map((idx,pos)=>{const key=idx===0&&accepted?"home":pages[idx],item=details[key];return '<button class="story-card '+(pos===1?"is-active":"is-side")+'" data-page="'+idx+'" aria-label="Open '+labels[idx]+'"><img src="'+item.image+'" alt="" loading="eager"><span class="card-shade"></span><span class="card-content">'+icons[key]+'<strong>'+labels[idx]+'</strong></span></button>';}).join("")+'</div>';
$("#stage").querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>{const index=Number(b.dataset.page);if(index!==current){setPage(index);return;}const key=activeKey();openModal(key==="home"?"rsvp":key);});
}
function setPage(i){current=(i+3)%3;render();}
function openModal(kind){
modalReturnFocus=document.activeElement;const modal=$("#modal");let body="";
if(kind==="rsvp")body='<section class="modal-panel"><button class="modal-close" aria-label="Close">×</button><small class="eyebrow">YOUR INVITATION</small><h2>Will you be <em>there with us?</em></h2><p>We would love to celebrate together. Let us know if you can make it.</p><form id="rsvp-form"><label>Full name<input name="name" required autocomplete="name" placeholder="Your full name"></label><label>Email address<input name="email" type="email" required autocomplete="email" placeholder="you@example.com"></label><label>WhatsApp number<input name="phone" autocomplete="tel" placeholder="+263"></label><label>Attendance<select name="attendance"><option value="yes">Joyfully accepts</option><option value="no">Regretfully declines</option></select></label><label>Accompanying guest<select name="plus"><option>Just me</option><option>One guest</option></select></label><label>Dietary requirements<textarea name="diet" rows="2" placeholder="Anything we should know?"></textarea></label><button class="primary" type="submit">Save response</button></form><p class="micro">Preview only: responses are stored in this browser and are not sent to an organiser.</p></section>';
else if(kind==="venue")body='<section class="modal-panel"><button class="modal-close" aria-label="Close">×</button><img class="modal-photo" src="'+photos.venue+'" alt="Garden wedding venue"><small class="eyebrow">THE OLIVE GROVE · HARARE</small><h2>A place to <em>gather.</em></h2><p>Set among leafy gardens, The Olive Grove is where we will celebrate together. Please aim to arrive 20 minutes before the ceremony.</p><a class="primary" href="https://www.google.com/maps/search/?api=1&query=The+Olive+Grove+Harare" target="_blank" rel="noreferrer">Get directions ↗</a></section>';
else body='<section class="modal-panel gallery-panel"><button class="modal-close" aria-label="Close">×</button><small class="eyebrow">THE WEDDING COLLECTION</small><h2>Moments to <em>keep.</em></h2><div class="gallery-grid">'+[photos.gallery1,photos.couple,photos.gallery2,photos.gallery3,photos.venue].map((src,i)=>'<img src="'+src+'" alt="Wedding photograph '+(i+1)+'" loading="lazy">').join("")+'</div></section>';
modal.innerHTML='<div class="modal-backdrop"></div>'+body;modal.classList.remove("hidden");
modal.querySelector(".modal-close").onclick=closeModal;modal.querySelector(".modal-backdrop").onclick=closeModal;
const form=$("#rsvp-form");if(form)form.onsubmit=e=>{e.preventDefault();const data=new FormData(form),name=String(data.get("name")||"").trim(),attendance=data.get("attendance");try{localStorage.setItem("storybook-rsvp-preview",JSON.stringify({attendance}));}catch(_){}if(attendance==="yes"){accepted=true;setPage(0);}closeModal();};
modal.querySelector(".modal-close").focus();
}
function closeModal(){$("#modal").classList.add("hidden");$("#modal").innerHTML="";if(modalReturnFocus?.focus)modalReturnFocus.focus();}
$("#nav").querySelectorAll("button").forEach((b,i)=>b.onclick=()=>setPage(i));
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#modal").classList.contains("hidden"))closeModal();});
let touchX=null;$("#stage").addEventListener("touchstart",e=>touchX=e.touches[0].clientX,{passive:true});
$("#stage").addEventListener("touchend",e=>{if(touchX===null)return;const dx=e.changedTouches[0].clientX-touchX;if(Math.abs(dx)>55)setPage(current+(dx<0?1:-1));touchX=null;},{passive:true});
try{const saved=JSON.parse(localStorage.getItem("storybook-rsvp-preview")||"null");accepted=!!(saved&&saved.attendance==="yes");}catch(_){}
function countdown(){const target=new Date("2026-11-05T14:00:00+02:00").getTime(),diff=Math.max(0,target-Date.now()),d=Math.floor(diff/86400000),h=Math.floor(diff%86400000/3600000),m=Math.floor(diff%3600000/60000),s=Math.floor(diff%60000/1000);$("#cd-days").textContent=String(d).padStart(2,"0");$("#cd-hours").textContent=String(h).padStart(2,"0");$("#cd-minutes").textContent=String(m).padStart(2,"0");$("#cd-seconds").textContent=String(s).padStart(2,"0");}
render();countdown();setInterval(countdown,1000);


// Restrained background-only parallax; the cards and glass bars remain fixed.
const root=document.documentElement;
let parallaxFrame=0;
function moveBackdrop(x,y){
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 if(parallaxFrame)cancelAnimationFrame(parallaxFrame);
 parallaxFrame=requestAnimationFrame(()=>{
  const dx=(x/window.innerWidth-.5)*-14,dy=(y/window.innerHeight-.5)*-10;
  root.style.setProperty('--bg-x',dx.toFixed(1)+'px');
  root.style.setProperty('--bg-y',dy.toFixed(1)+'px');
 });
}
window.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')moveBackdrop(e.clientX,e.clientY);},{passive:true});
window.addEventListener('deviceorientation',e=>{
 if(e.gamma==null||e.beta==null)return;
 const dx=Math.max(-1,Math.min(1,e.gamma/35))*7,dy=Math.max(-1,Math.min(1,(e.beta-45)/45))*6;
 root.style.setProperty('--bg-x',dx.toFixed(1)+'px');root.style.setProperty('--bg-y',dy.toFixed(1)+'px');
},{passive:true});
