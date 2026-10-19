(() => {
"use strict";
const rows=Array.isArray(window.SOUNDMARK_DATA)?window.SOUNDMARK_DATA:[];
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const cats=["전체","생활·동작음","자연·환경음","임팩트·충격음","화면 전환·Whoosh","기계·교통음","분위기·SF","UI·코믹"];
const catEN={"전체":"All","생활·동작음":"Everyday / Foley","자연·환경음":"Nature / Ambience","임팩트·충격음":"Impacts","화면 전환·Whoosh":"Transitions","기계·교통음":"Mechanics","분위기·SF":"Atmospheric / Sci-fi","UI·코믹":"UI / Playful"};
const read=(k,d)=>{try{return localStorage.getItem(k)||d}catch{return d}};
const save=(k,v)=>{try{localStorage.setItem(k,v)}catch{}};
let lang=read("sm-lang","ko"), category="전체",term="",current=null,playing=false,ctx=null,gain=null,compressed=null;
let fav=new Set(JSON.parse(read("sm-fav","[]"))); const elAudio=$("#audio"),elPlayer=$("#player");
const normalize=s=>String(s||"").toLocaleLowerCase().normalize("NFKD").trim();
const t=(ko,en)=>lang==="ko"?ko:en;
function duration(seconds){seconds=Math.max(0,Math.floor(Number(seconds)||0));return Math.floor(seconds/60)+":"+String(seconds%60).padStart(2,"0")}
function syncLang(){
 document.documentElement.lang=lang;$("#lang").textContent=lang==="ko"?"EN":"한";
 $$("[data-ko][data-en]").forEach(n=>n.textContent=n.dataset[lang]);
 $("#search").placeholder=t("어떤 소리가 필요하신가요? 예: 빗소리, 발걸음, whoosh","Find a sound: rain, footsteps, whoosh...");
 $("#sort").options[0].text=t("추천순","Featured");$("#sort").options[1].text=t("이름순","Name");$("#sort").options[2].text=t("짧은 소리순","Shortest");
 renderCats();render();syncPlayer();
}
function renderCats(){
 const box=$("#categories");box.replaceChildren();
 cats.forEach(c=>{
  const button=document.createElement("button");button.type="button";button.className="cat";button.setAttribute("aria-pressed",String(category===c));
  button.textContent=lang==="ko"?c:catEN[c];button.onclick=()=>{category=c;renderCats();render()};
  box.appendChild(button);
 });
}
function visible(){
 let v=rows.filter(x=>category==="전체"||x.category===category);
 if(term){const q=normalize(term);v=v.filter(x=>normalize([x.title_ko,x.title_en,x.category,x.source_file,x.source_name].join(" ")).includes(q));}
 let sort=$("#sort").value;
 if(sort==="alpha")v.sort((a,b)=>normalize(lang==="ko"?a.title_ko:a.title_en).localeCompare(normalize(lang==="ko"?b.title_ko:b.title_en),lang));
 if(sort==="duration")v.sort((a,b)=>a.duration-b.duration);
 return v;
}
function icon(filled){return filled?"♥":"♡"}
function makeCard(s){
 const article=document.createElement("article");article.className="soundcard";article.dataset.id=s.id;
 article.innerHTML='<button class="playbtn" type="button" aria-label="미리듣기"><span>▶</span></button><div class="sdetail"><strong class="ko"></strong><div class="en"></div><div class="mini"><span class="chip">CC0</span><span class="catlabel"></span><span class="sep">·</span><span class="dur"></span></div><div class="inlineprogress" aria-hidden="true"><span></span></div></div><div class="soundmeta"><span class="metahead"></span><span class="sub"></span></div><div class="actions"><button class="fav" type="button" aria-pressed="false" aria-label="즐겨찾기"></button><a class="download" target="_blank" rel="noopener noreferrer">다운로드 ↗</a><a class="source" target="_blank" rel="noopener noreferrer">원본 ↗</a></div>';
 article.querySelector(".ko").textContent=lang==="ko"?s.title_ko:s.title_en;
 article.querySelector(".en").textContent=lang==="ko"?s.title_en:s.title_ko;
 article.querySelector(".catlabel").textContent=lang==="ko"?s.category:catEN[s.category];
 article.querySelector(".dur").textContent=duration(s.duration);
 article.querySelector(".metahead").textContent=t("파일 검증 완료","Audio decoded & checked");
 article.querySelector(".sub").textContent=t("청취·권리 최종검수 전","Semantic/rights check pending");
 article.querySelector(".download").textContent=t("다운로드 ↗","Download ↗");
 article.querySelector(".source").textContent=t("원본 ↗","Source ↗");
 article.querySelector(".download").href=s.download_url;article.querySelector(".source").href=s.source_url;
 const fb=article.querySelector(".fav");fb.textContent=icon(fav.has(s.id));fb.setAttribute("aria-pressed",String(fav.has(s.id)));
 fb.addEventListener("click",()=>{if(fav.has(s.id))fav.delete(s.id);else fav.add(s.id);save("sm-fav",JSON.stringify([...fav]));fb.textContent=icon(fav.has(s.id));fb.setAttribute("aria-pressed",String(fav.has(s.id)))});
 article.querySelector(".playbtn").addEventListener("click",()=>toggle(s));
 syncCard(article);return article;
}
function syncCard(a){
 const active=current?.id===a.dataset.id;
 a.classList.toggle("is-current",active);
 a.classList.toggle("is-playing",active&&playing);
 a.querySelector(".playbtn span").textContent=active&&playing?"Ⅱ":"▶";
 a.querySelector(".playbtn").setAttribute("aria-label",active&&playing?t("일시정지","Pause"):t("미리듣기","Preview"));
 a.querySelector(".inlineprogress span").style.width=active&&elAudio.duration?Math.min(100,elAudio.currentTime/elAudio.duration*100)+"%":"0%";
}
function syncCards(){$$(".soundcard").forEach(syncCard)}
function render(){
 const list=$("#soundlist"),found=visible();list.replaceChildren();
 const frag=document.createDocumentFragment();found.forEach(x=>frag.appendChild(makeCard(x)));list.appendChild(frag);
 $("#count").textContent=t(found.length+"개",found.length+" sounds");
 $("#summary").innerHTML=t("선정된 <strong>"+rows.length+"개</strong> 중 "+found.length+"개 검색됨","<strong>"+rows.length+" selected</strong> · "+found.length+" results");
 $("#empty").hidden=found.length>0;syncCards();
}
function setupGain(){
 if(ctx || location.protocol === "file:" || (!window.AudioContext && !window.webkitAudioContext))return;
 try{
 ctx=new (window.AudioContext||window.webkitAudioContext)();
 const src=ctx.createMediaElementSource(elAudio);
 gain=ctx.createGain();compressed=ctx.createDynamicsCompressor();
 compressed.threshold.value=-8;compressed.ratio.value=8;compressed.attack.value=.003;compressed.release.value=.2;
 src.connect(gain);gain.connect(compressed);compressed.connect(ctx.destination);
 elAudio.volume=1;
 }catch(e){ctx=null;gain=null;elAudio.volume=Math.min(1,Number($("#volume").value)/100)}
}
function changeVolume(v){
 if(gain)gain.gain.value=Math.min(1.5,Math.max(0,v/100));
 else elAudio.volume=Math.min(1,Math.max(0,v/100));
}
async function toggle(s){
 const same=current?.id===s.id;
 if(same && playing){elAudio.pause();playing=false;syncPlayer();return}
 if(!same){current=s;elAudio.pause();elAudio.src=s.preview;elAudio.load()}
 if(same && elAudio.ended){elAudio.currentTime=0}
 setupGain();if(ctx?.state==="suspended"){try{await ctx.resume()}catch{}}
 changeVolume(Number($("#volume").value));
 try{await elAudio.play();playing=true;elPlayer.hidden=false;syncPlayer()}
 catch(e){playing=false;elPlayer.hidden=false;syncPlayer();$("#playerTitle").textContent=t("재생 오류 · 파일을 확인하세요","Playback error · check file");}
}
function syncPlayer(){
 if(!current)return;
 $("#playerTitle").textContent=t(current.title_ko,current.title_en);
 $("#playerToggle").textContent=playing?"Ⅱ":"▶";
 $("#playerToggle").setAttribute("aria-label",playing?t("일시정지","Pause"):t("재생","Play"));
 $("#time").textContent=duration(elAudio.currentTime)+" / "+duration(Number.isFinite(elAudio.duration)?elAudio.duration:current.preview_duration);
 if(!$("#seek").matches(":active"))$("#seek").value=elAudio.duration?Math.max(0,Math.min(100,elAudio.currentTime/elAudio.duration*100)):0;
 syncCards();
}
$("#search").addEventListener("input",e=>{term=e.target.value;$("#clear").hidden=!term;render()});
$("#clear").addEventListener("click",()=>{$("#search").value="";term="";$("#clear").hidden=true;render();$("#search").focus()});
$("#sort").addEventListener("change",render);
$("#lang").addEventListener("click",()=>{lang=lang==="ko"?"en":"ko";save("sm-lang",lang);syncLang()});
$("#playerToggle").addEventListener("click",()=>{if(current)toggle(current)});
$("#playerClose").addEventListener("click",()=>{elAudio.pause();elAudio.removeAttribute("src");elAudio.load();current=null;playing=false;elPlayer.hidden=true;syncCards()});
$("#volume").addEventListener("input",e=>changeVolume(Number(e.target.value)));
$("#seek").addEventListener("input",e=>{if(Number.isFinite(elAudio.duration))elAudio.currentTime=(Number(e.target.value)/100)*elAudio.duration;syncPlayer()});
elAudio.addEventListener("timeupdate",syncPlayer);
elAudio.addEventListener("pause",()=>{if(!elAudio.ended){playing=false;syncPlayer()}});
elAudio.addEventListener("play",()=>{playing=true;syncPlayer()});
elAudio.addEventListener("ended",()=>{playing=false;try{elAudio.currentTime=0}catch{}syncPlayer()});
elAudio.addEventListener("error",()=>{playing=false;syncPlayer()});
document.addEventListener("keydown",e=>{if(e.key==="/" && !["INPUT","TEXTAREA"].includes(document.activeElement.tagName)){e.preventDefault();$("#search").focus()}if(e.key==="Escape" && document.activeElement===$("#search")){e.target.blur()}});
window.SOUNDMARK_DEBUG={get count(){return rows.length},get playing(){return playing},get current(){return current?.id||null},get visible(){return visible().length}};
syncLang();
})();