const $ = (s) => document.querySelector(s);
const photos = {
  couple: "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=1600&q=90",
  venue: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=85",
  gallery1: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=85",
  gallery2: "https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=1000&q=85",
  gallery3: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1000&q=85"
};
const pages = ["rsvp", "venue", "gallery"];
const pageInfo = {
  rsvp: { title: "Your invitation", kicker: "A PLACE AT OUR TABLE", description: "Be part of the day. Let us know if you'll be joining us.", image: photos.couple, action: "Open your invitation" },
  home: { title: "Our little forever", kicker: "THE WEDDING OF ALEXANDRA & JAMES", description: "A day made more beautiful because we'll share it with you.", image: photos.couple, action: "View the invitation" },
  venue: { title: "The Olive Grove", kicker: "HARARE · ZIMBABWE", description: "A garden setting for a day filled with love, laughter and the people who matter.", image: photos.venue, action: "Explore the venue" },
  gallery: { title: "Moments to keep", kicker: "THE WEDDING COLLECTION", description: "A growing collection of the little moments that make the day ours.", image: photos.gallery1, action: "Open the gallery" }
};
let current = 0;
let accepted = false;
let eventLive = false;
let modalReturnFocus = null;
const activeKey = () => current === 0 && accepted ? "home" : pages[current];
function setPage(index) {
  current = (index + pages.length) % pages.length;
  render();
}
function render() {
  const key = activeKey();
  const order = [(current + 2) % 3, current, (current + 1) % 3];
  $("#nav").querySelectorAll("button").forEach((button, i) => {
    button.classList.toggle("active", i === current);
    if (i === 0) button.textContent = accepted ? "Home" : "RSVP";
    button.setAttribute("aria-current", i === current ? "page" : "false");
  });
  $("#page-title").innerHTML = key === "home" ? 'A little piece of <em>forever.</em>' : key === "rsvp" ? 'A day to <em>remember.</em>' : key === "venue" ? 'Meet us <em>there.</em>' : 'Held in <em>memory.</em>';
  $("#page-subtitle").textContent = key === "home" ? "A place for the people, places and moments that make this day ours." : "A celebration of love, friendship and everything in between.";
  $("#stage").innerHTML = '<div class="carousel" aria-label="Storybook pages">' + order.map((index, position) => {
    const cardKey = index === 0 && accepted ? "home" : pages[index];
    const item = pageInfo[cardKey];
    const selected = position === 1;
    return '<button class="story-card ' + (selected ? "is-active" : "is-side") + '" data-page="' + index + '" aria-label="Open ' + (cardKey === "rsvp" ? "RSVP" : cardKey) + '">' +
      '<img src="' + item.image + '" alt="" loading="eager"><span class="card-shade"></span>' +
      '<span class="card-content"><small>' + item.kicker + '</small><strong>' + item.title + '</strong><span class="card-description">' + item.description + '</span><span class="card-action">' + item.action + ' ↗</span></span></button>';
  }).join("") + '</div><div class="pagination" aria-label="Page ' + (current + 1) + ' of 3">' + pages.map((p, i) => '<button data-dot="' + i + '" class="' + (i === current ? "active" : "") + '" aria-label="Go to ' + (i === 0 ? (accepted ? "Home" : "RSVP") : p) + '"></button>').join("") + '</div>';
  $("#stage").querySelectorAll("[data-page]").forEach(button => button.addEventListener("click", () => setPage(Number(button.dataset.page))));
  $("#stage").querySelectorAll("[data-dot]").forEach(button => button.addEventListener("click", () => setPage(Number(button.dataset.dot))));
  $("#page-count").textContent = String(current + 1).padStart(2, "0") + " / 03";
  $("#prev").disabled = false;
  $("#next").disabled = false;
  $("#prev").onclick = () => setPage(current - 1);
  $("#next").onclick = () => setPage(current + 1);
  $("#happening-now").classList.toggle("visible", eventLive);
  updateStatus();
}
function openModal(kind) {
  modalReturnFocus = document.activeElement;
  const modal = $("#modal");
  let body = "";
  if (kind === "rsvp") {
    body = '<div class="modal-panel rsvp-panel"><button class="modal-close" aria-label="Close">×</button><small class="eyebrow">YOUR INVITATION</small><h2>Will you be <em>there with us?</em></h2><p>We would love to celebrate together. Let us know if you can make it.</p><form id="rsvp-form"><label>Full name<input name="name" required autocomplete="name" placeholder="Your full name"></label><label>Email address<input name="email" type="email" required autocomplete="email" placeholder="you@example.com"></label><label>WhatsApp number <span>(optional)</span><input name="phone" autocomplete="tel" placeholder="+263"></label><label>Will you attend?<select name="attendance"><option value="yes">Joyfully accepts</option><option value="no">Regretfully declines</option></select></label><label>Accompanying guest<select name="plus"><option>Just me</option><option>One guest</option></select></label><label>Dietary requirements<textarea name="diet" rows="2" placeholder="Anything we should know?"></textarea></label><button class="primary" type="submit">Send response ↗</button></form><p class="micro">Demo mode: this response is stored only in this browser preview. No organiser is notified.</p></div>';
  } else if (kind === "venue") {
    body = '<div class="modal-panel"><button class="modal-close" aria-label="Close">×</button><img class="modal-photo" src="' + photos.venue + '" alt="Garden wedding venue"><small class="eyebrow">THE OLIVE GROVE · HARARE</small><h2>A place to <em>gather.</em></h2><p>Set among leafy gardens, The Olive Grove is where we will celebrate together. Please aim to arrive 20 minutes before the ceremony.</p><a class="primary link-button" href="https://www.google.com/maps/search/?api=1&query=The+Olive+Grove+Harare" target="_blank" rel="noreferrer">Get directions ↗</a></div>';
  } else if (kind === "gallery") {
    const images = [photos.gallery1, photos.couple, photos.gallery2, photos.gallery3, photos.venue];
    body = '<div class="modal-panel gallery-panel"><button class="modal-close" aria-label="Close">×</button><small class="eyebrow">THE WEDDING COLLECTION</small><h2>Moments to <em>keep.</em></h2><p>A few glimpses of the celebration.</p><div class="gallery-grid">' + images.map((src, i) => '<img src="' + src + '" alt="Wedding gallery photograph ' + (i + 1) + '" loading="lazy">').join("") + '</div></div>';
  } else {
    body = '<div class="modal-panel"><button class="modal-close" aria-label="Close">×</button><small class="eyebrow">THE WEDDING OF ALEXANDRA & JAMES</small><h2>A little story.<br><em>A lifetime of love.</em></h2><p>Saturday, 5 November 2026 · 14:00 · The Olive Grove, Harare.</p><button class="primary" id="home-rsvp">RSVP / YOUR INVITATION ↗</button></div>';
  }
  modal.innerHTML = '<div class="modal-backdrop"></div>' + body;
  modal.classList.remove("hidden");
  modal.querySelector(".modal-close").onclick = closeModal;
  modal.querySelector(".modal-backdrop").onclick = closeModal;
  const form = $("#rsvp-form");
  if (form) form.onsubmit = event => {
    event.preventDefault();
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    if (data.get("attendance") === "yes") {
      accepted = true;
      localStorage.setItem("storybook-rsvp-preview", JSON.stringify({ name, email: data.get("email"), attendance: "yes" }));
      closeModal();
      setPage(0);
      $("#page-subtitle").textContent = "Thank you, " + name + ". We're looking forward to celebrating with you.";
    } else {
      localStorage.setItem("storybook-rsvp-preview", JSON.stringify({ name, email: data.get("email"), attendance: "no" }));
      closeModal();
      alert("Thank you for letting us know, " + name + ".");
    }
  };
  const homeRsvp = $("#home-rsvp");
  if (homeRsvp) homeRsvp.onclick = () => openModal("rsvp");
  modal.querySelector(".modal-close").focus();
}
function closeModal() {
  $("#modal").classList.add("hidden");
  $("#modal").innerHTML = "";
  if (modalReturnFocus && modalReturnFocus.focus) modalReturnFocus.focus();
}
function updateStatus() {
  const kicker = $("#status-kicker");
  const main = $("#status-main");
  if (eventLive) {
    kicker.textContent = "HAPPENING NOW";
    main.textContent = "The celebration is underway";
    $("#ticker").textContent = "Today, together · Ceremony · Celebration · Dinner · Dancing · ";
    return;
  }
  const target = new Date("2026-11-05T14:00:00+02:00").getTime();
  const remaining = Math.max(0, target - Date.now());
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  kicker.textContent = "COUNTING DOWN";
  main.textContent = days + " days · " + String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
  $("#ticker").textContent = "We cannot wait to celebrate with you · Alexandra & James · 5 November 2026 · ";
}
$("#nav").querySelectorAll("button").forEach((button, index) => button.addEventListener("click", () => setPage(index)));
$("#demo-toggle").addEventListener("click", () => { eventLive = !eventLive; updateStatus(); $("#happening-now").classList.toggle("visible", eventLive); });
$("#happening-now").addEventListener("click", () => { eventLive = !eventLive; updateStatus(); $("#happening-now").classList.toggle("visible", eventLive); });
document.addEventListener("keydown", event => { if (event.key === "Escape" && !$("#modal").classList.contains("hidden")) closeModal(); });
let touchStart = null;
$("#stage").addEventListener("touchstart", event => { touchStart = event.touches[0].clientX; }, { passive: true });
$("#stage").addEventListener("touchend", event => {
  if (touchStart === null || !$("#modal").classList.contains("hidden")) return;
  const delta = event.changedTouches[0].clientX - touchStart;
  if (Math.abs(delta) > 55) setPage(current + (delta < 0 ? 1 : -1));
  touchStart = null;
}, { passive: true });
try {
  const saved = JSON.parse(localStorage.getItem("storybook-rsvp-preview") || "null");
  accepted = !!(saved && saved.attendance === "yes");
} catch (_) {}
render();
updateStatus();
setInterval(updateStatus, 1000);
