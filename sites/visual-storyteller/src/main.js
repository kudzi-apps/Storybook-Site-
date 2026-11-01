const services = [
  {name:"Photography", image:"https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1400&q=88", children:[
    ["Weddings","Wedding coverage and keepsakes"],["Portraits","Individual, couple and family sessions"],["Events","Celebrations, launches and gatherings"],["Commercial","People, products and brand imagery"]
  ]},
  {name:"Digital Experiences", image:"https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1400&q=88", children:[
    ["Storybook","Digital wedding invitations and guest experiences"],["Websites","Business and personal websites"],["Campaigns","Landing pages and campaign experiences"],["Custom builds","Bespoke digital projects"]
  ]},
  {name:"Drone", image:"https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&w=1400&q=88", children:[
    ["Events","Aerial event coverage"],["Properties","Land, homes and commercial spaces"],["Locations","Travel, tourism and landscapes"],["Custom projects","Bespoke aerial work"]
  ]},
  {name:"Videography", image:"https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?auto=format&fit=crop&w=1400&q=88", children:[
    ["Weddings","Highlights, ceremony and full-day films"],["Commercial","Product films and business showcases"],["Social films","Short-form reels and campaigns"],["Music videos","Performance-led visual storytelling"]
  ]}
];
const stack = document.querySelector("#stack");
const world = document.querySelector("#world");
const current = document.querySelector("#current");
const total = document.querySelector("#total");
const sectionName = document.querySelector("#section-name");
const sectionPosition = document.querySelector("#section-position");
const hint = document.querySelector("#hint");
let path = [];
let items = services;
let index = 0;
let touchY = 0;
let wheelBusy = false;
const pad = n => String(n).padStart(2,"0");
const activeItems = () => path.length ? path[path.length-1].items : services;
function render(){
  items = activeItems();
  index = Math.max(0,Math.min(index,items.length-1));
  stack.innerHTML = "";
  items.forEach((item,i)=>{
    const card = document.createElement("button");
    card.className = "card";
    card.type = "button";
    card.style.setProperty("--position",i-index);
    if(path.length===0){
      card.classList.add("service-card");
      card.style.setProperty("--image",`url("${item.image}")`);
    } else {
      card.classList.add("menu-card");
      const parent = path[path.length-1].name;
      card.innerHTML = `<span class="card-number">${pad(i+1)}</span><span class="card-name">${item[0]}</span><span class="card-arrow">↗</span>`;
      card.dataset.description = item[1];
    }
    if(path.length===0) card.innerHTML = `<span class="card-number">${pad(i+1)}</span><span class="card-name">${item.name}</span><span class="card-arrow">↗</span>`;
    card.setAttribute("aria-label",path.length===0?item.name:item[0]);
    card.addEventListener("click",()=>choose(i));
    stack.append(card);
  });
  const selected=items[index];
  current.textContent=pad(index+1);
  total.textContent=pad(items.length);
  sectionName.textContent=path.length?path.map(p=>p.name.toUpperCase()).join(" / "):selected.name.toUpperCase();
  sectionPosition.textContent=pad(index+1)+" / "+pad(items.length);
  hint.textContent=path.length?"SELECT A CATEGORY":"SCROLL TO EXPLORE";
  document.querySelector("#previous").disabled=index===0&&!path.length;
  document.querySelector("#next").disabled=index===items.length-1&&!path.length;
  layout();
}
function layout(){
  [...stack.children].forEach((card,i)=>{
    const offset=i-index;
    card.style.setProperty("--y",`${offset*23}px`);
    card.style.setProperty("--z",`${-Math.abs(offset)*115}px`);
    card.style.setProperty("--scale",String(1-Math.abs(offset)*.055));
    card.style.setProperty("--rotate",`${offset*-1.3}deg`);
    card.style.setProperty("--opacity",String(Math.max(.28,1-Math.abs(offset)*.16)));
    card.classList.toggle("is-active",i===index);
    card.style.zIndex=String(100-Math.abs(offset));
  });
  world.style.setProperty("--depth",`${index*18}px`);
}
function choose(i){
  index=i;
  const item=items[i];
  if(!path.length){
    path.push({name:item.name,items:item.children});
    index=0;
    render();
    return;
  }
  const description=item[1];
  const leafName=item[0];
  path.push({name:leafName,items:[
    {label:"Lite",detail:"A focused option"},
    {label:"Plus",detail:"An expanded option"},
    {label:"Director’s",detail:"The complete experience"}
  ],description});
  index=0;
  render();
}
function back(){
  if(path.length){path.pop();index=0;render();}
}
function move(delta){
  const next=index+delta;
  if(next<0){if(path.length)back();return;}
  if(next>=items.length)return;
  index=next;render();
}
document.querySelector("#previous").addEventListener("click",()=>move(-1));
document.querySelector("#next").addEventListener("click",()=>move(1));
stack.addEventListener("wheel",e=>{
  e.preventDefault();if(wheelBusy)return;wheelBusy=true;
  if(Math.abs(e.deltaY)>4)move(e.deltaY>0?1:-1);
  setTimeout(()=>wheelBusy=false,520);
},{passive:false});
stack.addEventListener("touchstart",e=>{touchY=e.touches[0].clientY},{passive:true});
stack.addEventListener("touchend",e=>{
  const delta=touchY-e.changedTouches[0].clientY;
  if(Math.abs(delta)>35)move(delta>0?1:-1);
},{passive:true});
document.addEventListener("keydown",e=>{
  if(e.key==="ArrowDown"||e.key==="ArrowRight")move(1);
  if(e.key==="ArrowUp"||e.key==="ArrowLeft")move(-1);
  if(e.key==="Escape")back();
});
document.querySelector("#contact").addEventListener("click",()=>{
  document.querySelector("#contact-layer").classList.add("open");
  document.querySelector("#contact-layer").setAttribute("aria-hidden","false");
});
document.querySelector("#contact-close").addEventListener("click",()=>{
  document.querySelector("#contact-layer").classList.remove("open");
  document.querySelector("#contact-layer").setAttribute("aria-hidden","true");
});
render();