// Correct zones (percent of board) – tweak these later to match your exact layout.
const ZONES = {
  candle_left:  { x: 12, y: 18, w: 12, h: 18, rot: 0 },
  candle_right: { x: 76, y: 18, w: 12, h: 18, rot: 0 },
  cross:        { x: 46, y: 14, w:  8, h: 20, rot: 0 },

  corporal:     { x: 40, y: 38, w: 20, h: 22, rot: 0 },
  missal:       { x: 24, y: 41, w: 14, h: 18, rot: -20 },
  chalice:      { x: 56, y: 50, w: 12, h: 18, rot: 0 },
  paten:        { x: 48, y: 56, w: 10, h: 12, rot: 0 },
  pall:         { x: 62, y: 38, w: 12, h: 12, rot: 0 }
};

const ITEMS = [
  { id:"candle1", name:"Candle (Left)",  src:"assets/candle.jpg",  zone:"candle_left" },
  { id:"candle2", name:"Candle (Right)", src:"assets/candle.jpg",  zone:"candle_right" },
  { id:"cross",   name:"Cross",          src:"assets/cross.jpg",   zone:"cross" },
  { id:"corporal",name:"Corporal",       src:"assets/corporal.jpg",zone:"corporal" },
  { id:"missal",  name:"Missal",         src:"assets/missal.jpg",  zone:"missal" },
  { id:"chalice", name:"Chalice",        src:"assets/chalice.jpg", zone:"chalice" },
  { id:"paten",   name:"Paten",          src:"assets/paten.jpg",   zone:"paten" },
  { id:"pall",    name:"Pall",           src:"assets/pall.jpg",    zone:"pall" }
];

const board = document.getElementById("board");
const tray  = document.getElementById("tray");
const statusBox = document.getElementById("status");

function setStatus(msg){ statusBox.textContent = msg; }

function percentRect(zone){
  const r = board.getBoundingClientRect();
  return {
    left: (zone.x/100)*r.width,
    top:  (zone.y/100)*r.height,
    width:(zone.w/100)*r.width,
    height:(zone.h/100)*r.height
  };
}
function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }
function angleDiff(a, b){
  let d = (a - b) % 360;
  d = (d + 540) % 360 - 180;
  return Math.abs(d);
}
function applyTransform(piece){
  const rot = parseFloat(piece.dataset.rot) || 0;
  piece.style.transform = `translate(-50%, -50%) rotate(${rot}deg)`;
}
function rotatePiece(piece, step=15){
  const rot = (parseFloat(piece.dataset.rot) + step) % 360;
  piece.dataset.rot = String(rot);
  applyTransform(piece);
}

function buildTray(){
  tray.innerHTML = "";
  ITEMS.forEach(item=>{
    const wrap = document.createElement("div");
    wrap.className = "tray-item";
    const img = document.createElement("img");
    img.src = item.src; img.alt = item.name;

    const tag = document.createElement("div");
    tag.className = "tag"; tag.textContent = item.name;

    wrap.appendChild(img);
    wrap.appendChild(tag);

    wrap.addEventListener("pointerdown", (e)=>{
      e.preventDefault();
      spawnPiece(item, e);
    });

    tray.appendChild(wrap);
  });
}

function spawnPiece(item, e){
  let piece = document.querySelector(`.piece[data-id="${item.id}"]`);
  if(!piece){
    piece = document.createElement("img");
    piece.className = "piece";
    piece.src = item.src;
    piece.alt = item.name;
    piece.dataset.id = item.id;
    piece.dataset.rot = "0";
    piece.style.left = "45%";
    piece.style.top  = "55%";

    piece.addEventListener("click", ()=> rotatePiece(piece, 15));
    piece.addEventListener("dblclick", ()=> rotatePiece(piece, 15));

    board.appendChild(piece);
    applyTransform(piece);
  }
  startDrag(piece, e);
}

let drag = null;

function startDrag(piece, e){
  const r = board.getBoundingClientRect();
  const px = parseFloat(piece.style.left) / 100 * r.width;
  const py = parseFloat(piece.style.top)  / 100 * r.height;

  drag = {
    piece,
    pointerId: e.pointerId,
    offsetX: (e.clientX - r.left) - px,
    offsetY: (e.clientY - r.top)  - py
  };

  piece.setPointerCapture(e.pointerId);
  piece.addEventListener("pointermove", onMove);
  piece.addEventListener("pointerup", onUp);
  piece.addEventListener("pointercancel", onUp);
}

function onMove(e){
  if(!drag || e.pointerId !== drag.pointerId) return;
  const r = board.getBoundingClientRect();

  const x = (e.clientX - r.left) - drag.offsetX;
  const y = (e.clientY - r.top)  - drag.offsetY;

  const cx = clamp(x, 0, r.width);
  const cy = clamp(y, 0, r.height);

  drag.piece.style.left = (cx / r.width * 100) + "%";
  drag.piece.style.top  = (cy / r.height * 100) + "%";
}

function pieceCenterPx(piece){
  const r = board.getBoundingClientRect();
  return {
    cx: parseFloat(piece.style.left) / 100 * r.width,
    cy: parseFloat(piece.style.top)  / 100 * r.height,
    r
  };
}

function snapIfClose(piece){
  const id = piece.dataset.id;
  const item = ITEMS.find(i=>i.id===id);
  if(!item) return;

  const zone = ZONES[item.zone];
  const rect = percentRect(zone);

  const { cx, cy, r } = pieceCenterPx(piece);
  const zx = rect.left + rect.width/2;
  const zy = rect.top  + rect.height/2;

  const dist = Math.hypot(cx - zx, cy - zy);
  const snapRadius = r.width * 0.10;

  if(dist <= snapRadius){
    piece.style.left = (zx / r.width * 100) + "%";
    piece.style.top  = (zy / r.height * 100) + "%";

    const curRot = parseFloat(piece.dataset.rot) || 0;
    const tgtRot = zone.rot || 0;
    if(angleDiff(curRot, tgtRot) <= 15){
      piece.dataset.rot = String(tgtRot);
      applyTransform(piece);
    }
  }
}

function onUp(e){
  if(!drag || e.pointerId !== drag.pointerId) return;

  const piece = drag.piece;
  piece.releasePointerCapture(e.pointerId);

  piece.removeEventListener("pointermove", onMove);
  piece.removeEventListener("pointerup", onUp);
  piece.removeEventListener("pointercancel", onUp);

  snapIfClose(piece);
  drag = null;
}

function checkAll(){
  let correct = 0;
  const lines = [];

  for(const item of ITEMS){
    const piece = document.querySelector(`.piece[data-id="${item.id}"]`);
    if(!piece){
      lines.push(`• ${item.name}: not placed`);
      continue;
    }

    const zone = ZONES[item.zone];
    const rect = percentRect(zone);
    const { cx, cy } = pieceCenterPx(piece);

    const inside = cx >= rect.left && cx <= rect.left + rect.width &&
                   cy >= rect.top  && cy <= rect.top  + rect.height;

    const curRot = parseFloat(piece.dataset.rot) || 0;
    const rotOk  = angleDiff(curRot, zone.rot || 0) <= 20;

    if(inside && rotOk){
      correct++;
    }else if(inside && !rotOk){
      lines.push(`• ${item.name}: right spot, wrong rotation`);
    }else{
      lines.push(`• ${item.name}: wrong spot`);
    }
  }

  if(correct === ITEMS.length){
    setStatus(`✅ Perfect! All ${ITEMS.length} items are correctly placed.`);
  }else{
    setStatus(`You got ${correct}/${ITEMS.length}.\nFix:\n${lines.join("\n")}`);
  }
}

function resetAll(){
  document.querySelectorAll(".piece").forEach(p=>p.remove());
  setStatus("Drag items from the tray onto the altar. Tap to rotate.");
}

function randomizeAll(){
  resetAll();
  ITEMS.forEach(item=>{
    const piece = document.createElement("img");
    piece.className = "piece";
    piece.src = item.src;
    piece.alt = item.name;
    piece.dataset.id = item.id;

    piece.style.left = (Math.random()*100) + "%";
    piece.style.top  = (20 + Math.random()*70) + "%";

    piece.dataset.rot = String(Math.floor(Math.random()*24)*15);
    applyTransform(piece);

    piece.addEventListener("click", ()=> rotatePiece(piece, 15));
    piece.addEventListener("dblclick", ()=> rotatePiece(piece, 15));
    piece.addEventListener("pointerdown", (e)=>{ e.preventDefault(); startDrag(piece, e); });

    board.appendChild(piece);
  });

  setStatus("Randomized setup! Fix it by dragging/rotating into correct places.");
}

document.getElementById("btnCheck").addEventListener("click", checkAll);
document.getElementById("btnReset").addEventListener("click", resetAll);
document.getElementById("btnRandom").addEventListener("click", randomizeAll);

buildTray();
setStatus("Drag items from the tray onto the altar. Tap to rotate.");
