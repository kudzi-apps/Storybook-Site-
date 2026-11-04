(()=>{"use strict";
const views=[...document.querySelectorAll(".view")],nav=[...document.querySelectorAll("[data-view]")],heading=document.querySelector("#page-heading");
const names={overview:"Overview",projects:"Projects",media:"Media library",appearance:"Appearance",layout:"Layout & navigation",publishing:"Publishing"};
function show(name){if(!names[name])return;views.forEach(v=>v.classList.toggle("active",v.id==="view-"+name));nav.forEach(n=>n.classList.toggle("active",n.dataset.view===name));heading.textContent=names[name];window.scrollTo({top:0,behavior:"smooth"});}
nav.forEach(n=>n.addEventListener("click",()=>show(n.dataset.view)));
document.querySelectorAll("[data-open]").forEach(b=>b.addEventListener("click",()=>show(b.dataset.open)));
document.querySelector("#preview-button").addEventListener("click",()=>window.open("../","_blank","noopener"));
document.querySelectorAll("[data-token]").forEach(input=>input.addEventListener("input",()=>{const token=input.dataset.token;document.querySelector("#style-preview").style.setProperty(token,input.value);}));
document.querySelector("#column-setting").addEventListener("change",e=>{const n=Number.parseInt(e.target.value,10);document.querySelector("#style-preview").dataset.columns=n;});
})();