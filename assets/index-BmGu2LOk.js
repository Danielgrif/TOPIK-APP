const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/ui_bulk-D2TqyS8R.js","assets/vendor-supabase-GG-Sp6Hl.js","assets/vendor-confetti-oQXWb4Lk.js","assets/vendor-charts-IK6Vv9H5.js","assets/ui_edit_word-D42SJL6z.js","assets/ui_custom_words-DBisxjwX.js","assets/ui_shop-CPdhjkX7.js","assets/ui_data-6bXqcUXy.js","assets/ui_review-DXsD-XG9.js","assets/ui_collections-FBsbpJ1k.js","assets/ui_hanja-CE5eSmTt.js","assets/ui_grammar-DArDM1TU.js","assets/ui_share-DhJDEWt1.js","assets/ui_retry-D-5OhA1K.js"])))=>i.map(i=>d[i]);
import{c as cs}from"./vendor-supabase-GG-Sp6Hl.js";import{c as ve}from"./vendor-confetti-oQXWb4Lk.js";import{C as Le}from"./vendor-charts-IK6Vv9H5.js";(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))i(a);new MutationObserver(a=>{for(const s of a)if(s.type==="childList")for(const l of s.addedNodes)l.tagName==="LINK"&&l.rel==="modulepreload"&&i(l)}).observe(document,{childList:!0,subtree:!0});function n(a){const s={};return a.integrity&&(s.integrity=a.integrity),a.referrerPolicy&&(s.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?s.credentials="include":a.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function i(a){if(a.ep)return;a.ep=!0;const s=n(a);fetch(a.href,s)}})();const ds="modulepreload",us=function(t){return"/"+t},xi={},_=function(e,n,i){let a=Promise.resolve();if(n&&n.length>0){let c=function(d){return Promise.all(d.map(u=>Promise.resolve(u).then(m=>({status:"fulfilled",value:m}),m=>({status:"rejected",reason:m}))))};document.getElementsByTagName("link");const l=document.querySelector("meta[property=csp-nonce]"),r=l?.nonce||l?.getAttribute("nonce");a=c(n.map(d=>{if(d=us(d),d in xi)return;xi[d]=!0;const u=d.endsWith(".css"),m=u?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${d}"]${m}`))return;const p=document.createElement("link");if(p.rel=u?"stylesheet":ds,u||(p.as="script"),p.crossOrigin="",p.href=d,r&&p.setAttribute("nonce",r),document.head.appendChild(p),u)return new Promise((g,f)=>{p.addEventListener("load",g),p.addEventListener("error",()=>f(new Error(`Unable to preload CSS for ${d}`)))})}))}function s(l){const r=new Event("vite:preloadError",{cancelable:!0});if(r.payload=l,window.dispatchEvent(r),!r.defaultPrevented)throw l}return a.then(l=>{for(const r of l||[])r.status==="rejected"&&s(r.reason);return e().catch(s)})},ms="https://gscnfituczfkrdeanzsw.supabase.co",ps="sb_publishable_HAU_-kPId3UdTvdy9rh5VQ_NGCg9ExI",fs=async(t,e)=>{const a=typeof t=="string"?t:"url"in t?t.url:t.toString();let s=1e4,l=4;a.includes("/storage/v1/object/")?(s=12e4,l=2):a.includes("/functions/v1/")&&(s=6e4);let r;for(let c=0;c<l;c++)try{const d=new AbortController;e?.signal&&(e.signal.aborted?d.abort():e.signal.addEventListener("abort",()=>d.abort(),{once:!0})),r=setTimeout(()=>{console.warn(`Supabase request timed out after ${s/1e3}s for`,a,e),d.abort()},s);const u=await fetch(t,{...e,signal:d.signal});if(!u)throw new Error("Fetch failed: No response received.");if(r&&(clearTimeout(r),r=void 0),!u.ok&&u.status>=400&&u.status<500){const m=await u.text().catch(()=>`{"error": "Could not read error body", "code": "${u.status}"}`);return u.status===401&&(m.includes("Invalid JWT")||m.includes("expired"))&&(window.isSessionExpired||(window.isSessionExpired=!0,console.warn("☠️ Invalid or expired JWT detected. Dispatching session-expired event."),document.dispatchEvent(new CustomEvent("session-expired")))),console.warn(`Client error: ${u.status} for ${a}`,m),new Response(m,{status:u.status,headers:u.headers})}if(!u.ok&&u.status>=500){const m=await u.text();throw new Error(`Server error: ${u.status}: ${m}`)}return u}catch(d){if(console.error("Fetch with retries error:",d),r&&(clearTimeout(r),r=void 0),e?.signal?.aborted)throw d;if(c<l-1){const u=1500*Math.pow(2,c);console.warn(`[Retry ${c+1}/${l}] Request failed with "${d.message}". Retrying in ${u}ms...`,d,e),await new Promise(m=>setTimeout(m,u))}else throw console.error(`[Final Retry Failed] Request failed after ${l} attempts.`),d}throw new Error("Fetch with retries failed: Maximum retries exceeded.")},S=cs(ms,ps,{global:{fetch:fs},auth:{autoRefreshToken:!0,persistSession:!0,detectSessionInUrl:!0},realtime:{timeout:2e4,heartbeatIntervalMs:15e3,reconnectAfterMs:t=>{const e=[2e3,5e3,1e4][t-1]||1e4;return console.log(`[Realtime] Попытка переподключения #${t} через ${e}ms...`),e}}}),v={DB_VERSION:"db_version",USER_STATS:"user_stats_v5",LEARNED:"learned_v5",MISTAKES:"mistakes_v5",FAVORITES:"favorites_v5",WORD_HISTORY:"word_history_v5",STREAK:"streak_v5",SESSIONS:"sessions_v5",ACHIEVEMENTS:"achievements_v5",DIRTY_IDS:"dirty_ids_v1",SYNC_OUTBOX:"sync_outbox_v1",CUSTOM_WORDS:"custom_words_v1",FAVORITE_QUOTES:"favorite_quotes_v1",TRASH_RETENTION:"trash_retention_v1",PURCHASED_ITEMS:"purchased_items_v1",VOCAB_CACHE:"vocabulary_cache_v1",VOCAB_VERSION:"vocabulary_version",LAST_VOCAB_SYNC:"last_vocab_sync_v1",SEARCH_HISTORY:"search_history_v1",WORD_REQUESTS:"word_requests_state_v1",STUDY_GOAL:"study_goal_v1",ONBOARDING:"onboarding_completed_v1",DAILY_CHALLENGE:"daily_challenge_v1",PWA_BANNER_DISMISSED:"pwa_banner_dismissed_v1",HANJA_MODE:"hanja_mode_v1",VOICE_PREF:"voice_pref",AUDIO_SPEED:"audio_speed_v1",DARK_MODE:"dark_mode_v1",ZEN_MODE:"zen_mode_v1",VIEW_MODE:"view_mode_v1",THEME_COLOR:"theme_color_v1",AUTO_UPDATE:"auto_update_v1",AUTO_THEME:"auto_theme_v1",AUTO_THEME_START:"auto_theme_start_v1",AUTO_THEME_END:"auto_theme_end_v1",MUSIC_ENABLED:"background_music_enabled_v1",MUSIC_VOLUME:"background_music_volume_v1",TTS_VOLUME:"tts_volume_v1",QUIZ_DIFFICULTY:"quiz_difficulty_v1",QUIZ_TOPIC:"quiz_topic_v1",QUIZ_CATEGORY:"quiz_category_v1",SHOW_QUIZ_EXTRA_INFO:"show_quiz_extra_info_v1",SAFETY_BACKUP:"safety_backup_v1",WRITING_DRAFT:"writing_draft_v1",WRITING_HISTORY:"writing_history_v1"},A={VOCABULARY:"vocabulary",QUOTES:"quotes",USER_PROGRESS:"user_progress",USER_GLOBAL_STATS:"user_global_stats",WORD_REQUESTS:"word_requests",USER_LISTS:"user_lists",LIST_ITEMS:"list_items",ARTICLES:"articles",USER_FAVORITE_QUOTES:"user_favorite_quotes"},Ft={AUDIO:"audio-files",IMAGES:"image-files",FEEDBACK_ATTACHMENTS:"feedback_attachments"},gs={PENDING:"pending",AI:"ai",AUDIO:"audio",DONE:"done",PROCESSED:"processed",ERROR:"error"},Mt={SKIP_WAITING:"SKIP_WAITING",CONTENT_SYNC:"content-sync",DOWNLOAD_QUEUE_COMPLETED:"DOWNLOAD_QUEUE_COMPLETED"};function vs(){try{const t=["user_stats_v5","learned_v5","mistakes_v5","favorites_v5","word_history_v5","streak_v5","sessions_v5","achievements_v5","daily_challenge_v1","custom_words_v1","favorite_quotes_v1","dirty_ids_v1","word_requests_state_v1"],e=Object.create(null);let n=0;if(t.forEach(i=>{const a=localStorage.getItem(i);a&&(e[i]=a,n+=a.length)}),n>3*1024*1024){console.warn("⚠️ Backup skipped: Data too large for localStorage duplication.");return}localStorage.setItem(v.SAFETY_BACKUP,JSON.stringify(e))}catch(t){console.warn("⚠️ Backup failed:",t)}}const qn=new Set,hs=t=>(qn.add(t),()=>qn.delete(t)),H=(t,e)=>qn.forEach(n=>n(t,e)),Dn=10,M=t=>{try{return localStorage.getItem(t)}catch(e){return console.warn(`localStorage access failed for key "${t}":`,e),null}},o={dataStore:[],filteredData:[],searchResults:null,userStats:{sprintTimer:60,xp:0,level:1,sprintRecord:0,survivalRecord:0,coins:0,streakFreeze:0,lastDailyReward:null,dailyRewardStreak:0,achievements:[],survivalHealth:0,lastFreezeDate:null,timeFreeze:0,skipQuestion:0,fiftyFifty:0,weeklyXp:0,league:"Bronze",lastWeekId:""},learned:new Set,mistakes:new Set,favorites:new Set,wordHistory:Object.create(null),streak:{count:0,lastDate:null},sessions:[],achievements:[],dailyChallenge:{lastDate:null,completed:!1,streak:0},searchHistory:[],customWords:[],studyGoal:{type:"words",target:10},streakCount:0,lastDate:null,favoriteQuotes:[],dirtyWordIds:new Set,trashRetentionDays:30,selectMode:!1,selectedWords:new Set,wordRequests:[],purchasedItems:[],currentStar:"all",currentTopic:["all"],currentCategory:["all"],currentType:"word",hanjaMode:M(v.HANJA_MODE)==="true",currentVoice:M(v.VOICE_PREF)||"female",audioSpeed:M(v.AUDIO_SPEED)!==null?Number(M(v.AUDIO_SPEED)):.9,darkMode:M(v.DARK_MODE)!==null?M(v.DARK_MODE)==="true":!!(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches),focusMode:!1,zenMode:M(v.ZEN_MODE)==="true",viewMode:M(v.VIEW_MODE)||"grid",themeColor:M(v.THEME_COLOR)||"purple",autoUpdate:M(v.AUTO_UPDATE)!=="false",autoTheme:M(v.AUTO_THEME)==="true",autoThemeStart:M(v.AUTO_THEME_START)!==null?Number(M(v.AUTO_THEME_START)):20,autoThemeEnd:M(v.AUTO_THEME_END)!==null?Number(M(v.AUTO_THEME_END)):6,backgroundMusicEnabled:M(v.MUSIC_ENABLED)==="true",backgroundMusicVolume:M(v.MUSIC_VOLUME)!==null?Number(M(v.MUSIC_VOLUME)):.3,ttsVolume:M(v.TTS_VOLUME)!==null?Number(M(v.TTS_VOLUME)):1,MUSIC_TRACKS:[{id:"default",name:"Seoul Lounge (Instrumental)",filename:"Seoul Lounge (Instrumental).mp3"},{id:"zen",name:"K-Drama Study (Instrumental)",filename:"K-Drama Study (Instrumental).mp3"},{id:"quiz",name:"Future Bass Pop (Instrumental)",filename:"Future Bass Pop (Instrumental).mp3"}],quizDifficulty:M(v.QUIZ_DIFFICULTY)||"all",quizTopic:M(v.QUIZ_TOPIC)||"all",quizCategory:M(v.QUIZ_CATEGORY)||"all",showQuizExtraInfo:M(v.SHOW_QUIZ_EXTRA_INFO)!=="false",isSyncing:!1,sessionActive:!1,sessionSeconds:0,sessionInterval:null,sessionWordsReviewed:0,currentUser:null,networkPing:null,settingsUpdatedAt:0,state:{xp:0,level:0,sprintRecord:0,survivalRecord:0,coins:0,streakFreeze:0,lastDailyReward:null,dailyRewardStreak:0,achievements:[],survivalHealth:0,lastFreezeDate:null,timeFreeze:0,skipQuestion:0,fiftyFifty:0,weeklyXp:0,league:"",lastWeekId:""}};try{(()=>{try{const s=Number(M(v.DB_VERSION)||"0");if(s>=Dn)return;if(vs(),s<5&&["user_stats","learned","mistakes","favorites","word_history","streak","sessions","achievements"].forEach(r=>{const c=`${r}_v4`,d=`${r}_v5`,u=M(c);u&&!M(d)&&localStorage.setItem(d,u)}),s<6){const l="user_stats_v5",r=M(l);if(r)try{const c=JSON.parse(r);c.survivalHealth===void 0&&(c.survivalHealth=0),localStorage.setItem(l,JSON.stringify(c))}catch(c){console.error("Migration v6 failed:",c)}}if(s<7){const l="sessions_v5",r=M(l);if(r)try{const c=JSON.parse(r);if(Array.isArray(c)){const d=c.map(u=>({...u,platform:u.platform||"web"}));localStorage.setItem(l,JSON.stringify(d))}}catch(c){console.error("Migration v7 failed:",c)}}if(s<8){const l="sessions_v5",r=M(l);if(r)try{const c=JSON.parse(r);if(Array.isArray(c)){const d=new Set,u=c.filter(m=>{if(!m.date)return!1;const p=d.has(m.date);return d.add(m.date),!p});u.length!==c.length&&localStorage.setItem(l,JSON.stringify(u))}}catch(c){console.error("Migration v8 failed:",c)}}if(s<9){const l="sessions_v5",r=M(l);if(r)try{const c=JSON.parse(r);if(Array.isArray(c)){const d=new Map;c.forEach(m=>{const p=m.date;if(d.has(p)){const g=d.get(p),f=g.wordsReviewed+m.wordsReviewed,y=f>0?((g.accuracy||0)*g.wordsReviewed+(m.accuracy||0)*m.wordsReviewed)/f:g.accuracy;g.duration+=m.duration,g.wordsReviewed+=m.wordsReviewed,g.accuracy=Math.round(y)}else d.set(p,{...m})});const u=Array.from(d.values());localStorage.setItem(l,JSON.stringify(u))}}catch(c){console.error("Migration v9 failed:",c)}}if(s<10){const l="user_stats_v5",r=M(l);if(r){const c=JSON.parse(r);c.weeklyXp===void 0&&(c.weeklyXp=0),c.league===void 0&&(c.league="Bronze"),c.lastWeekId===void 0&&(c.lastWeekId=""),localStorage.setItem(l,JSON.stringify(c))}}localStorage.setItem(v.DB_VERSION,String(Dn))}catch(s){console.error("Migration failed:",s)}})();const e=(s,l)=>{const r=M(s);if(!r)return l;try{return JSON.parse(r)}catch(c){return console.warn(`⚠️ Corrupted data for key "${s}". Resetting to default.`,c),l}};o.userStats=e(v.USER_STATS,o.userStats),o.learned=new Set(e(v.LEARNED,[])),o.mistakes=new Set(e(v.MISTAKES,[])),o.favorites=new Set(e(v.FAVORITES,[]));const n=e(v.WORD_HISTORY,{});o.wordHistory=Object.assign(Object.create(null),n),o.streak=e(v.STREAK,{count:0,lastDate:null}),o.streak.count===void 0&&(o.streak.count=0),o.streak.lastDate===void 0&&(o.streak.lastDate=null),o.sessions=e(v.SESSIONS,o.sessions),o.achievements=e(v.ACHIEVEMENTS,o.achievements),o.dailyChallenge=e(v.DAILY_CHALLENGE,{lastDate:null,completed:!1,streak:0}),o.dailyChallenge.lastDate===void 0&&(o.dailyChallenge.lastDate=null),o.dailyChallenge.completed===void 0&&(o.dailyChallenge.completed=!1),o.dailyChallenge.streak===void 0&&(o.dailyChallenge.streak=0),o.searchHistory=e(v.SEARCH_HISTORY,[]),o.customWords=e(v.CUSTOM_WORDS,[]),o.wordRequests=e(v.WORD_REQUESTS,[]),o.purchasedItems=e(v.PURCHASED_ITEMS,[]),o.settingsUpdatedAt=Number(M("settings_updated_at"))||0;const i=M(v.VOCAB_CACHE);if(i)try{const s=JSON.parse(i);if(Array.isArray(s)&&s.every(r=>r&&typeof r=="object"&&"id"in r&&"word_kr"in r))o.dataStore=s;else throw new Error("Invalid vocabulary schema in cache")}catch(s){console.warn("Failed to parse vocabulary cache, resetting.",s),localStorage.removeItem(v.VOCAB_CACHE),o.dataStore=[]}o.studyGoal=e(v.STUDY_GOAL,{type:"words",target:10}),o.favoriteQuotes=e(v.FAVORITE_QUOTES,[]),o.dirtyWordIds=new Set(e(v.DIRTY_IDS,[])),o.trashRetentionDays=M(v.TRASH_RETENTION)!==null?Number(M(v.TRASH_RETENTION)):30,o.quizDifficulty=localStorage.getItem(v.QUIZ_DIFFICULTY)||"all",o.quizTopic=localStorage.getItem(v.QUIZ_TOPIC)||"all",o.quizCategory=localStorage.getItem(v.QUIZ_CATEGORY)||"all";const a=(s,l=0)=>typeof s=="number"&&Number.isFinite(s)&&s>=0?s:l;o.userStats.level=Math.max(1,Math.floor(a(o.userStats.level,1))),o.userStats.xp=a(o.userStats.xp),o.userStats.sprintRecord===void 0&&(o.userStats.sprintRecord=0),o.userStats.survivalRecord===void 0&&(o.userStats.survivalRecord=0),o.userStats.coins===void 0&&(o.userStats.coins=0),o.userStats.sprintRecord=a(o.userStats.sprintRecord),o.userStats.survivalRecord=a(o.userStats.survivalRecord),o.userStats.coins=a(o.userStats.coins),o.userStats.streakFreeze===void 0&&(o.userStats.streakFreeze=0),o.userStats.lastDailyReward===void 0&&(o.userStats.lastDailyReward=null),o.userStats.dailyRewardStreak===void 0&&(o.userStats.dailyRewardStreak=0),o.userStats.survivalHealth===void 0&&(o.userStats.survivalHealth=0),o.userStats.timeFreeze===void 0&&(o.userStats.timeFreeze=0),o.userStats.skipQuestion===void 0&&(o.userStats.skipQuestion=0),o.userStats.fiftyFifty===void 0&&(o.userStats.fiftyFifty=0),o.userStats.weeklyXp===void 0&&(o.userStats.weeklyXp=0),o.userStats.league===void 0&&(o.userStats.league="Bronze"),o.userStats.lastWeekId===void 0&&(o.userStats.lastWeekId="")}catch(t){console.error("State init error:",t)}function w(t){return t==null?"":String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;").replace(/`/g,"&#96;")}function jt(t){return t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function ys(){const t=navigator.connection;return t?t.saveData||["slow-2g","2g"].includes(t.effectiveType):!1}function pt(t,e,n=new Error(`Promise timed out after ${e}ms`)){const i=new Promise((a,s)=>{const l=setTimeout(()=>{clearTimeout(l),s(n)},e)});return Promise.race([t,i])}const wi={daily:"🏠",life:"🏠",жизнь:"🏠",economics:"💰",economy:"💰",экономика:"💰",politics:"🏛️",политика:"🏛️",society:"👥",social:"👥",общество:"👥",culture:"🎭",культура:"🎭",health:"🏥",здоровье:"🏥",environment:"🌳",nature:"🌳",природа:"🌳",экология:"🌳",science:"🔬",наука:"🔬",education:"🎓",school:"🎓",образование:"🎓",школа:"🎓",history:"📜",история:"📜",art:"🎨",искусство:"🎨",sports:"⚽",спорт:"⚽",weather:"🌤️",погода:"🌤️",shopping:"🛍️",покупки:"🛍️",travel:"✈️",путешествия:"✈️",food:"🍔",cooking:"🍳",еда:"🍔",work:"💼",job:"💼",работа:"💼",feelings:"😊",emotion:"😊",чувства:"😊",personality:"🧠",характер:"🧠",appearance:"👀",внешность:"👀",hobbies:"🎮",хобби:"🎮",noun:"📦",существительное:"📦",verb:"🏃",глагол:"🏃",adjective:"💎",прилагательное:"💎",adverb:"🚀",наречие:"🚀",particle:"🔗",частица:"🔗",suffix:"📎",суффикс:"📎",pronoun:"👈",местоимение:"👈",number:"🔢",числительное:"🔢",interjection:"❗",междометие:"❗"};function ln(t,e="🔹"){if(!t||t==="all")return"🌍";const n=t.toLowerCase();for(const i in wi)if(n.includes(i))return wi[i];return e}function bn(t,e=200){let n;return function(...i){clearTimeout(n),n=window.setTimeout(()=>t.apply(this,i),e)}}function mc(t,e,n,i=5e3){const a=document.getElementById("toast-container");if(!a){n();return}const s=document.createElement("div");s.className="toast-item",s.style.paddingRight="10px",s.innerHTML=`
    <span>${w(t)}</span>
    <button class="toast-undo-btn">↩ Отмена</button>
    <div class="toast-undo-bar" style="transition: width ${i}ms linear;"></div>
  `,a.appendChild(s),requestAnimationFrame(()=>{const d=s.querySelector("div");d&&(d.style.width="0%")});let l=!1;const r=s.querySelector("button"),c=setTimeout(()=>{l||(n(),s.classList.add("toast-hide"),setTimeout(()=>s.remove(),300))},i);r.onclick=()=>{l=!0,clearTimeout(c),e(),s.classList.add("toast-hide"),setTimeout(()=>s.remove(),300)},Ui(s)}function h(t,e=3500){try{const n=document.getElementById("toast-container");if(!n)return;const i=document.createElement("div");i.className="toast-item",i.textContent=t,Ui(i),n.appendChild(i),setTimeout(()=>{i.classList.add("toast-hide")},Math.max(1200,e-600)),setTimeout(()=>{try{n.removeChild(i)}catch{}},e)}catch(n){console.warn("showToast error",n)}}function Ui(t){let e=0,n=0,i=!1;const a=r=>{e=r.touches[0].clientX,i=!0,t.style.transition="none"},s=r=>{if(!i)return;const d=r.touches[0].clientX-e;n=d,t.style.transform=`translateX(${d}px)`,t.style.opacity=`${1-Math.abs(d)/200}`},l=()=>{i=!1,t.style.transition="transform 0.3s ease, opacity 0.3s ease",Math.abs(n)>100?(t.style.transform=`translateX(${n>0?500:-500}px)`,t.style.opacity="0",setTimeout(()=>t.remove(),300)):(t.style.transform="",t.style.opacity="1")};t.addEventListener("touchstart",a,{passive:!0}),t.addEventListener("touchmove",s,{passive:!0}),t.addEventListener("touchend",l,{passive:!0})}function Ae(t){const e=document.createElement("div");e.className="effect-popup show",e.innerText=t,document.body.appendChild(e),setTimeout(()=>{e.classList.remove("show"),setTimeout(()=>e.remove(),500)},800)}function Ei(t){if(!t)return{kr:"기타",ru:"Общее"};const e=t.match(/^(.*?)\s*[(（]([^)）]+)[)）]$/);return e?{ru:e[1].trim(),kr:e[2].trim()}:{ru:t,kr:t}}function ti(t,e){if(t.length===0)return e.length;if(e.length===0)return t.length;t.length>e.length&&([t,e]=[e,t]);const n=[];for(let i=0;i<=t.length;i++)n[i]=i;for(let i=1;i<=e.length;i++){let a=i,s=i-1;for(let l=1;l<=t.length;l++){const r=n[l];e.charAt(i-1)===t.charAt(l-1)?n[l]=s:n[l]=Math.min(s,a,r)+1,s=r,a=n[l]}}return n[t.length]}function Zt(t,e){let n="";const i=Math.max(t.length,e.length);for(let a=0;a<i;a++){const s=t[a],l=e[a];s===l?n+=`<span class="diff-same">${w(s)}</span>`:(s!==void 0&&(n+=`<span class="diff-del">${w(s)}</span>`),l!==void 0&&(n+=`<span class="diff-ins">${w(l)}</span>`))}return n}let On=[];function $n(){On.forEach(({type:t,handler:e})=>{document.removeEventListener(t,e,{capture:!0})}),On=[]}function Si(t){$n();const e=n=>{$n(),t()};["click","touchstart","keydown"].forEach(n=>{document.addEventListener(n,e,{capture:!0,once:!0}),On.push({type:n,handler:e})})}let kt=null,oe=null;const Be=new Map,bs=50;let Wt=null;function Pi(){try{return kt||(kt=new(window.AudioContext||window.webkitAudioContext)),kt.state==="suspended"&&kt.resume(),kt}catch{return null}}function Vi(){$n(),oe&&(oe.pause(),oe=null),"speechSynthesis"in window&&window.speechSynthesis.cancel()}function F(t="success",e=120){return new Promise(n=>{try{const i=Pi();if(!i)return n();try{Wt&&Wt.stop()}catch{}const a=i.createOscillator(),s=i.createGain();a.connect(s),s.connect(i.destination);const l=i.currentTime;t==="success"?(a.type="triangle",a.frequency.setValueAtTime(587,l),a.frequency.exponentialRampToValueAtTime(1174,l+.15),s.gain.setValueAtTime(.15,l),s.gain.exponentialRampToValueAtTime(.001,l+.3),e=300):t==="failure"?(a.type="sawtooth",a.frequency.setValueAtTime(150,l),a.frequency.linearRampToValueAtTime(80,l+.15),s.gain.setValueAtTime(.15,l),s.gain.exponentialRampToValueAtTime(.001,l+.15),e=150):t==="cash-register"?(a.type="square",a.frequency.setValueAtTime(800,l),a.frequency.setValueAtTime(1600,l+.1),s.gain.setValueAtTime(.05,l),s.gain.setValueAtTime(.05,l+.1),s.gain.exponentialRampToValueAtTime(.001,l+.4)):t==="survival-success"?(a.type="square",a.frequency.setValueAtTime(880,l),a.frequency.exponentialRampToValueAtTime(1760,l+.1),s.gain.setValueAtTime(.05,l),s.gain.exponentialRampToValueAtTime(.01,l+.1)):t==="life-lost"?(a.type="triangle",a.frequency.setValueAtTime(300,l),a.frequency.exponentialRampToValueAtTime(50,l+.4),s.gain.setValueAtTime(.3,l),s.gain.exponentialRampToValueAtTime(.01,l+.4)):t==="achievement-unlock"?(a.type="sine",a.frequency.setValueAtTime(523.25,l),a.frequency.setValueAtTime(659.25,l+.1),a.frequency.setValueAtTime(783.99,l+.2),a.frequency.setValueAtTime(1046.5,l+.3),s.gain.setValueAtTime(.1,l),s.gain.linearRampToValueAtTime(.1,l+.3),s.gain.exponentialRampToValueAtTime(.001,l+.8),e=800):t==="pop"?(a.type="sine",a.frequency.setValueAtTime(800,l),a.frequency.exponentialRampToValueAtTime(100,l+.1),s.gain.setValueAtTime(.05,l),s.gain.exponentialRampToValueAtTime(.001,l+.1),e=100):t==="flip"?(a.type="triangle",a.frequency.setValueAtTime(150,l),a.frequency.linearRampToValueAtTime(300,l+.1),s.gain.setValueAtTime(.05,l),s.gain.linearRampToValueAtTime(.001,l+.15),e=150):t==="tick"?(a.type="triangle",a.frequency.setValueAtTime(800,l),a.frequency.exponentialRampToValueAtTime(1200,l+.05),s.gain.setValueAtTime(.1,l),s.gain.exponentialRampToValueAtTime(.001,l+.05),e=100):(a.type="sawtooth",a.frequency.setValueAtTime(200,l),a.frequency.linearRampToValueAtTime(50,l+.15),s.gain.setValueAtTime(.1,l),s.gain.exponentialRampToValueAtTime(.01,l+.15)),a.start(),Wt=a,setTimeout(()=>{try{a.stop()}catch{}Wt=null,n()},e)}catch{n()}})}function xs(t){return new Promise(e=>{try{const n=Pi();if(!n)return e();const i=[261.63,293.66,329.63,349.23,392,440,493.88,523.25,587.33,659.25,698.46,783.99,880,987.77,1046.5],a=Math.min(t-1,i.length-1),s=i[Math.max(0,a)],l=n.createOscillator(),r=n.createGain();l.connect(r),r.connect(n.destination);const c=n.currentTime;l.type="triangle",l.frequency.setValueAtTime(s,c),l.frequency.linearRampToValueAtTime(s*1.05,c+.1),r.gain.setValueAtTime(.1,c),r.gain.exponentialRampToValueAtTime(.001,c+.3),l.start(),l.stop(c+.3),setTimeout(e,300)}catch{e()}})}function ki(t,e,n=40){return new Promise(i=>{t.textContent="",t.classList.add("typing-effect");let a=0;function s(){a<e.length?(t.textContent+=e.charAt(a),a++,setTimeout(s,n)):(t.classList.remove("typing-effect"),i())}s()})}function K(t,e){document.dispatchEvent(new CustomEvent("duck-music",{detail:{duck:!0}})),oe&&(oe.pause(),oe.currentTime=0,oe=null);const n=new Promise(i=>{if(e){"speechSynthesis"in window&&window.speechSynthesis.cancel();let a=Be.get(e);if(a)a.currentTime=0,Be.delete(e),Be.set(e,a);else{if(a=new Audio(e),Be.size>=bs){const s=Be.keys().next().value;s&&Be.delete(s)}Be.set(e,a)}oe=a,a.volume=o.ttsVolume,a.onended=()=>{oe===a&&(oe=null),i()},a.onerror=()=>{Be.delete(e),oe===a&&(oe=null),t?K(t,null).then(i):(h("Ошибка аудио файла"),i())},a.play().catch(s=>{oe===a&&(oe=null);const l=s.name==="NotAllowedError";if(l){if(console.warn("🔊 Autoplay blocked (Audio). Attempting TTS fallback..."),!t){Si(()=>K(null,e).then(i));return}}else console.warn("Audio play error",s);t?K(t,null).then(i):(l||h("Ошибка аудио файла"),i())});return}if(!t){i();return}if(!("speechSynthesis"in window)){h("Голосовой вывод недоступен в этом браузере"),i();return}try{window.speechSynthesis.paused&&window.speechSynthesis.resume(),window.speechSynthesis.cancel();const a=new SpeechSynthesisUtterance(t);a.lang="ko-KR";const l=window.speechSynthesis.getVoices().filter(r=>r.lang.includes("ko"));if(l.length>0){let r=null;o.currentVoice==="male"?r=l.find(c=>c.name.toLowerCase().includes("male")):r=l.find(c=>c.name.toLowerCase().includes("female")),r&&(a.voice=r)}a.rate=o.audioSpeed||.9,a.volume=o.ttsVolume,a.onend=()=>i(),a.onerror=r=>{if(r.error==="not-allowed"){console.warn("🔊 TTS Autoplay blocked. Queuing retry on interaction."),Si(()=>K(t,null).then(i));return}console.warn("SpeechSynthesis error",r),i()},window.speechSynthesis.speak(a)}catch(a){console.warn("SpeechSynthesis error",a),h("Ошибка голосового воспроизведения"),i()}});return n.finally(()=>{document.dispatchEvent(new CustomEvent("duck-music",{detail:{duck:!1}}))}),n}const nt=t=>{const e=document.getElementById("sync-status");if(!e)return;e.className=`sync-status ${t}`;const n={syncing:"⏳",success:"✅",error:"❌",offline:"📡"};e.textContent=n[t]||""};function ws(){try{const t=localStorage.getItem(v.SYNC_OUTBOX);if(!t)return null;const e=JSON.parse(t);return e&&Array.isArray(e.dirtyWordIds)?e:null}catch{return null}}function Es(t){try{localStorage.setItem(v.SYNC_OUTBOX,JSON.stringify(t))}catch(e){console.warn("⚠️ Не удалось сохранить outbox синхронизации:",e)}}function Ss(){try{localStorage.removeItem(v.SYNC_OUTBOX)}catch{}}async function Fi(){if(o.isSyncing)return;if(!navigator.onLine){nt("offline");return}o.isSyncing=!0,H("sync_changed",{isSyncing:!0}),nt("syncing");const t=ws();if(t)for(const n of t.dirtyWordIds)o.dirtyWordIds.add(n);let e=null;try{let n=o.currentUser;if(!n){const{data:l}=await S.auth.getSession();l?.session?.user&&(n=l.session.user)}if(!n)return;const i={darkMode:o.darkMode,hanjaMode:o.hanjaMode,audioSpeed:o.audioSpeed,currentVoice:o.currentVoice,autoUpdate:o.autoUpdate,autoTheme:o.autoTheme,autoThemeStart:o.autoThemeStart,autoThemeEnd:o.autoThemeEnd,studyGoal:o.studyGoal,lastDailyReward:o.userStats.lastDailyReward,themeColor:o.themeColor,backgroundMusicEnabled:o.backgroundMusicEnabled,backgroundMusicVolume:o.backgroundMusicVolume,ttsVolume:o.ttsVolume,streakLastDate:o.streak.lastDate,survivalHealth:o.userStats.survivalHealth,lastFreezeDate:o.userStats.lastFreezeDate,settingsUpdatedAt:o.settingsUpdatedAt,showQuizExtraInfo:o.showQuizExtraInfo},a={user_id:n.id,xp:o.userStats.xp,level:o.userStats.level,weekly_xp:o.userStats.weeklyXp,league:o.userStats.league,sprint_record:o.userStats.sprintRecord,survival_record:o.userStats.survivalRecord,coins:o.userStats.coins,streak_freeze:o.userStats.streakFreeze,achievements:o.achievements,sessions:o.sessions,settings:i,updated_at:new Date().toISOString(),avatar_url:n.user_metadata?.avatar_url||null,full_name:n.user_metadata?.full_name||null};e=a;const{error:s}=await S.from(A.USER_GLOBAL_STATS).upsert(a,{onConflict:"user_id"});if(s)throw s;if(o.dirtyWordIds.size>0){const l=[];for(const r of o.dirtyWordIds){const c=o.wordHistory[r];l.push({user_id:n.id,word_id:r,is_learned:o.learned.has(r),is_mistake:o.mistakes.has(r),is_favorite:o.favorites.has(r),attempts:c?.attempts??0,correct:c?.correct??0,last_review:c?.lastReview??0,sm2_interval:c?.sm2?.interval??0,sm2_repetitions:c?.sm2?.repetitions??0,sm2_ef:c?.sm2?.ef??2.5,sm2_next_review:c?.sm2?.nextReview??null,learned_date:c?.learnedDate??null,updated_at:new Date().toISOString()})}if(l.length>0)for(let c=0;c<l.length;c+=100){const d=l.slice(c,c+100),{error:u}=await S.from(A.USER_PROGRESS).upsert(d,{onConflict:"user_id,word_id"});if(u)throw u}o.dirtyWordIds.clear(),localStorage.setItem(v.DIRTY_IDS,"[]")}Ss(),nt("success")}catch(n){const i=n;console.error("Sync failed:",i?.message||i),Es({globalUpdates:e??t?.globalUpdates??{},dirtyWordIds:[...o.dirtyWordIds],timestamp:Date.now()}),i?.message?.toLowerCase().includes("failed to fetch")||i?.message?.toLowerCase().includes("network")||!navigator.onLine?(h("🌐 Нет связи с сервером. Изменения сохранятся при восстановлении сети."),nt("offline")):i?.message?.includes("JWT")||i?.code==="PGRST301"?(h("⚠️ Ошибка синхронизации: требуется повторный вход"),nt("error")):(h("❌ Ошибка синхронизации. Попробуйте позже."),nt("error"))}finally{o.isSyncing=!1,H("sync_changed",{isSyncing:!1})}}class te{static instances=new Set;elementId;initialized=!1;element;subscriptions=[];eventListeners=[];constructor(e){this.elementId=e;const n=document.getElementById(e);n?this.element=n:this.element=document.createElement("div"),te.instances.add(this)}static initAll(){te.instances.forEach(e=>{e.isInitialized()||e.init()})}isInitialized(){return this.initialized}init(){if(!this.initialized){if(this.initialized=!0,!this.element.id||!document.body.contains(this.element)){const e=document.getElementById(this.elementId);e&&(this.element=e)}this.setupEventListeners(),this.setupStateSubscriptions(),this.render()}}setupEventListeners(){}setupStateSubscriptions(){}destroy(){this.subscriptions.forEach(e=>e()),this.subscriptions=[],this.eventListeners.forEach(({element:e,type:n,handler:i})=>{e.removeEventListener(n,i)}),this.eventListeners=[],this.initialized=!1}listen(e,n){const i=hs((a,s)=>{(e==="*"||a===e)&&n(a,s)});this.subscriptions.push(i),e==="state_changed"&&this.addEvent(document,"state-changed",()=>n("state_changed",void 0))}addEvent(e,n,i){e.addEventListener(n,i),this.eventListeners.push({element:e,type:n,handler:i})}$(e){return this.element.querySelector(e)}$$(e){return this.element.querySelectorAll(e)}}const we=36,cn=10;let _i=null,_t=Object.create(null);function ks(t){if(_i!==o.dataStore){_t=Object.create(null);for(let e=0;e<o.dataStore.length;e++){const n=o.dataStore[e],i=n.type||"word";_t[i]||(_t[i]=[]),_t[i].push(n)}_i=o.dataStore}return _t[t]||[]}class _s extends te{constructor(){super("filter-panel"),console.info("FiltersComponent created",this.element)}init(){if(console.info("FiltersComponent.init() called"),!this.element.id||!document.body.contains(this.element)){const e=document.getElementById("filter-panel");e&&(this.element=e)}this.rebindElement(),super.init()}setupStateSubscriptions(){this.listen("vocabs_updated",()=>this.updateFilterCounts()),this.listen("auth_changed",()=>this.rebindElement()),document.addEventListener("state-changed",()=>{this.updateFilterCounts()});const e=()=>{this.togglePanel()},n=document.getElementById("filter-panel-overlay");n&&this.addEvent(n,"click",e)}togglePanel=()=>{xn()};rebindElement(){if(!this.element.id||!document.body.contains(this.element)){const e=document.getElementById("filter-panel");e&&(this.element=e)}}render(){console.info("FiltersComponent render() called")}updateFilterCounts(){this.element.id||this.rebindElement();const e=document.querySelectorAll(".filter-chip");e.length!==0&&requestAnimationFrame(()=>{const n={all:0,"★★★":0,"★★☆":0,"★☆☆":0,favorites:0,mistakes:0},i=o.currentType,a=ks(i);for(let s=0;s<a.length;s++){const l=a[s];n.all++,l.level&&n[l.level]!==void 0&&n[l.level]++,o.favorites.has(l.id)&&n.favorites++,o.mistakes.has(l.id)&&n.mistakes++}e.forEach(s=>{const l=s.dataset.value;if(l&&n[l]!==void 0){const r=n[l];let c=s.querySelector(".filter-count");c||(c=document.createElement("span"),c.className="filter-count",s.appendChild(c));const d=String(r);c.textContent!==d&&(c.textContent=d,c.classList.remove("pop"),c.offsetWidth,c.classList.add("pop"))}})})}}function ji(){Ts()}function Ts(){const t=document.querySelector(".sort-actions");if(t){if(!t.querySelector('[data-action="sort-level"]')){const e=document.createElement("div");e.className="sort-btn",e.setAttribute("data-action","sort-level"),e.innerHTML='<span class="sort-icon">⭐</span><span>По сложности</span>',t.appendChild(e)}if(!t.querySelector('[data-action="sort-date"]')){const e=document.createElement("div");e.className="sort-btn",e.setAttribute("data-action","sort-date"),e.innerHTML='<span class="sort-icon">📅</span><span>По дате</span>',t.appendChild(e)}}}const Hn=new _s;function Wi(){Hn.init()}function xn(){const t=document.getElementById("filter-panel");console.info("toggling via global function()");const e=document.getElementById("filter-panel-overlay");if(t&&t.classList.toggle("show"),e&&e.classList.toggle("show"),t){const n=t.classList.contains("show");document.body.style.overflow=n?"hidden":"",n&&wn()}}function Ti(){const t=new Set,e=o.dataStore;for(let n=0;n<e.length;n++){const i=e[n];if(i.type!==o.currentType)continue;const a=i.topic||i.topic_ru||i.topic_kr;a&&t.add(a)}return Array.from(t).sort()}function Is(t){const e=o.currentTopic.includes("all"),n=o.currentTopic.includes(t);t==="all"?o.currentTopic=["all"]:e?o.currentTopic=[t]:n?(o.currentTopic=o.currentTopic.filter(i=>i!==t),o.currentTopic.length===0&&(o.currentTopic=["all"])):o.currentTopic.push(t),Je(),document.dispatchEvent(new CustomEvent("state-changed"))}function Cs(t,e){const n=document.createElement("label");n.className="multiselect-item",n.style.cursor="pointer";const i=o.currentTopic.includes(t)||t==="all"&&o.currentTopic.includes("all"),a=ln(t,"🏷️");return n.innerHTML=`<input type="checkbox" ${i?"checked":""}> <span style="margin-right: 6px;">${a}</span> <span>${w(e)}</span>`,n.addEventListener("click",s=>{s.stopPropagation(),Is(t)}),n}function Je(){const t=document.getElementById("topic-filter-btn");if(t){const n=t.querySelector(".fs-value"),i=o.currentTopic.includes("all")||o.currentTopic.length===0?"Все темы":`Выбрано: ${o.currentTopic.length}`;n&&(n.textContent=i)}const e=document.getElementById("topic-modal-content");if(e){let n=0;const i=e.querySelector(".multiselect-scroll-container");i&&(n=i.scrollTop);let a="";const s=e.querySelector("input.search-box");s&&(a=s.value),e.innerHTML="";const l=document.createElement("input");l.type="text",l.placeholder="🔍 Поиск тем...",l.className="search-box",l.style.marginBottom="10px",l.value=a,l.oninput=x=>{const E=x.target.value.toLowerCase();e.querySelectorAll(".multiselect-item").forEach(k=>{const T=k.textContent?.toLowerCase()||"";k.style.display=T.includes(E)?"flex":"none"})},e.appendChild(l);const r=document.createElement("div");r.className="multiselect-actions";const c=document.createElement("button");c.className="multiselect-action-btn",c.textContent="Выбрать все",c.onclick=x=>{x.stopPropagation(),o.currentTopic=Ti(),o.currentTopic.length===0&&(o.currentTopic=["all"]),Je(),document.dispatchEvent(new CustomEvent("state-changed"))};const d=document.createElement("button");d.className="multiselect-action-btn",d.textContent="Сбросить",d.onclick=x=>{x.stopPropagation(),o.currentTopic=["all"],Je(),document.dispatchEvent(new CustomEvent("state-changed"))},r.appendChild(c),r.appendChild(d),e.appendChild(r);const u=document.createElement("div");u.className="multiselect-scroll-container";const m=document.createElement("div"),p=document.createElement("div");p.className="virtual-content",m.appendChild(p),u.appendChild(m),e.appendChild(u);const g=Ti(),f=[{value:"all",label:"Все темы"},...g.map(x=>({value:x,label:x}))];let y=f;if(a){const x=a.toLowerCase();y=f.filter(E=>E.label.toLowerCase().includes(x))}const b=()=>{const x=u.scrollTop,E=u.clientHeight,k=Math.max(0,Math.floor(x/we)-cn),T=Math.ceil(E/we),I=Math.min(y.length,k+T+cn*2),C=k*we;p.style.transform=`translateY(${C}px)`,p.innerHTML="";const R=document.createDocumentFragment();for(let L=k;L<I;L++){const q=y[L];R.appendChild(Cs(q.value,q.label))}p.appendChild(R)};l.oninput=x=>{const E=x.target.value.toLowerCase();y=f.filter(k=>k.label.toLowerCase().includes(E)),m.style.height=`${y.length*we}px`,u.scrollTop=0,b()},u.onscroll=b,m.style.height=`${y.length*we}px`,n>0&&(u.scrollTop=n),b()}dn()}function dn(){const t=document.getElementById("category-filter-btn");if(t){const n=t.querySelector(".fs-value");let i="Все категории";!o.currentCategory.includes("all")&&o.currentCategory.length>0&&(i=`Выбрано: ${o.currentCategory.length}`),n&&(n.textContent=i)}const e=document.getElementById("category-modal-content");if(e){let n=0;const i=e.querySelector(".multiselect-scroll-container");i&&(n=i.scrollTop);let a="";const s=e.querySelector("input.search-box");s&&(a=s.value),e.innerHTML="";const l=()=>{const x=new Set,E=o.dataStore,k=o.currentType,T=o.currentTopic,I=T.includes("all");for(let C=0;C<E.length;C++){const R=E[C];if(R.type!==k)continue;const L=R.topic||R.topic_ru||R.topic_kr;if(!L||!I&&!T.includes(L))continue;const q=R.category||R.category_ru||R.category_kr;q&&x.add(q)}return Array.from(x).sort()},r=document.createElement("input");r.type="text",r.placeholder="🔍 Поиск категорий...",r.className="search-box",r.style.marginBottom="10px",r.value=a;const c=document.createElement("div");c.className="multiselect-actions";const d=document.createElement("button");d.className="multiselect-action-btn",d.textContent="Выбрать все",d.onclick=x=>{x.stopPropagation(),o.currentCategory=l(),o.currentCategory.length===0&&(o.currentCategory=["all"]),dn(),document.dispatchEvent(new CustomEvent("state-changed"))};const u=document.createElement("button");u.className="multiselect-action-btn",u.textContent="Сбросить",u.onclick=x=>{x.stopPropagation(),o.currentCategory=["all"],dn(),document.dispatchEvent(new CustomEvent("state-changed"))},c.appendChild(d),c.appendChild(u),e.appendChild(r),e.appendChild(c);const m=document.createElement("div");m.className="multiselect-scroll-container";const p=document.createElement("div"),g=document.createElement("div");g.className="virtual-content",p.appendChild(g),m.appendChild(p),e.appendChild(m);const f=[{value:"all",label:"Все категории"},...l().map(x=>({value:x,label:x}))];let y=f;if(a){const x=a.toLowerCase();y=f.filter(E=>E.label.toLowerCase().includes(x))}const b=()=>{const x=m.scrollTop,E=m.clientHeight,k=Math.max(0,Math.floor(x/we)-cn),T=Math.ceil(E/we),I=Math.min(y.length,k+T+cn*2),C=k*we;g.style.transform=`translateY(${C}px)`,g.innerHTML="";const R=document.createDocumentFragment();for(let L=k;L<I;L++){const q=y[L];R.appendChild(Ls(q.value,q.label))}g.appendChild(R)};r.oninput=()=>{const x=r.value.toLowerCase();y=f.filter(E=>E.label.toLowerCase().includes(x)),p.style.height=`${y.length*we}px`,m.scrollTop=0,b()},m.onscroll=b,p.style.height=`${y.length*we}px`,n>0&&(m.scrollTop=n),b()}}function ni(t){const e=o.currentCategory.includes("all"),n=o.currentCategory.includes(t);t==="all"?o.currentCategory=["all"]:e?o.currentCategory=[t]:n?(o.currentCategory=o.currentCategory.filter(i=>i!==t),o.currentCategory.length===0&&(o.currentCategory=["all"])):o.currentCategory.push(t),dn(),document.dispatchEvent(new CustomEvent("state-changed"))}function Ls(t,e){const n=document.createElement("label");n.className="multiselect-item",n.style.cursor="pointer";const i=o.currentCategory.includes(t)||t==="all"&&o.currentCategory.includes("all"),a=ln(t,"🔹");return n.innerHTML=`<input type="checkbox" ${i?"checked":""}> <span style="margin-right: 6px;">${a}</span> <span>${w(e)}</span>`,n.addEventListener("click",s=>{s.stopPropagation(),ni(t)}),n}function Rt(t,e){o.currentType=t,As("#type-filters",e),Je(),wn(),document.dispatchEvent(new CustomEvent("state-changed"))}function ii(t,e){o.currentStar=t,(e.parentElement||document).querySelectorAll(".filter-chip").forEach(i=>i.classList.remove("active")),e.classList.add("active"),document.dispatchEvent(new CustomEvent("state-changed"))}function Gi(){o.currentType="word",o.currentStar="all",o.currentTopic=["all"],o.currentCategory=["all"],document.querySelectorAll("#type-filters .segment-btn").forEach(t=>{t.classList.toggle("active",t.getAttribute("data-value")==="word")}),document.querySelectorAll(".filter-chip").forEach(t=>{t.classList.toggle("active",t.getAttribute("data-value")==="all")}),Je(),wn(),document.dispatchEvent(new CustomEvent("state-changed")),h("Фильтры сброшены")}function wn(){Hn&&Hn.updateFilterCounts()}function As(t,e){const n=document.querySelector(t);if(!n)return;n.querySelectorAll(".segment-btn").forEach(a=>{a.classList.remove("active")}),e&&e.classList.add("active")}const pc=Object.freeze(Object.defineProperty({__proto__:null,handleCategoryChange:ni,initFiltersUI:Wi,populateFilters:Je,resetFilters:Gi,setStarFilter:ii,setTypeFilter:Rt,setupFilterBehavior:ji,toggleFilterPanel:xn,updateFilterCounts:wn},Symbol.toStringTag,{value:"Module"})),qt={_data:[],_history:Object.create(null),init({dataStore:t,wordHistory:e}){this._data=t||[],this._history=e||Object.create(null)},calculate(t,e,n=null){let{interval:i=0,repetitions:a=0,ef:s=2.5}=e||{};t=Math.max(0,Math.min(5,t));let l=i;if(n&&t>=3){const r=(Date.now()-n)/864e5;r>i&&(l=r)}if(t>=3?(a===0?i>1?i=Math.round(i*1.2):i=1:a===1?i=Math.max(6,Math.round(l*s)):t===3?i=Math.round(l*1.2):t===5?i=Math.round(l*s*1.3):i=Math.round(l*s),i<1&&(i=1),a++):(i>10?i=Math.max(1,Math.round(i*.2)):i=1,a=0),s=s+(.1-(5-t)*(.08+(5-t)*.02)),s<1.3&&(s=1.3),i>2){const r=Math.random()*.1-.05;i=Math.round(i*(1+r))}return{interval:i,repetitions:a,ef:s}},getQueue({limit:t=50}={}){const e=Date.now(),n=[],i=new Set,a=this._data;for(let s=0;s<a.length;s++){const l=a[s],r=l.id||l.word_kr;if(i.has(r))continue;const c=this._history[r];if(c){if(!c.sm2){n.push({...l,nextReview:0}),i.add(r);continue}c.sm2&&c.sm2.nextReview!==void 0&&c.sm2.nextReview<=e&&(n.push({...l,nextReview:c.sm2.nextReview}),i.add(r))}}return n.sort((s,l)=>s.nextReview-l.nextReview),n.slice(0,t)},submitReview(t,e){this._history[t]||(this._history[t]={attempts:0,correct:0,lastReview:Date.now()});const n=this._history[t];n.sm2||(n.sm2={interval:0,repetitions:0,ef:2.5,nextReview:0});const i=this.calculate(e,n.sm2,n.lastReview);n.sm2.interval=i.interval,n.sm2.repetitions=i.repetitions,n.sm2.ef=i.ef;const a=Date.now()+i.interval*24*60*60*1e3;return n.sm2.nextReview=a,n.lastReview=Date.now(),n.attempts++,e>=3&&n.correct++,i},previewNextIntervals(t){const e=this._history[t]||{sm2:null},n=e.lastReview||null,i=e.sm2||{interval:0,repetitions:0,ef:2.5};return{fail:this.calculate(0,i,n).interval,hard:this.calculate(3,i,n).interval,easy:this.calculate(5,i,n).interval}}},Ms="topik_offline_db",Bs=1,ft="keyval";function Qi(){return new Promise((t,e)=>{if(typeof window>"u"||!window.indexedDB)return e(new Error("IndexedDB is not supported in this environment"));const n=window.indexedDB.open(Ms,Bs);n.onupgradeneeded=()=>{const i=n.result;i.objectStoreNames.contains(ft)||i.createObjectStore(ft)},n.onsuccess=()=>t(n.result),n.onerror=()=>e(n.error||new Error("Failed to open IndexedDB"))})}async function Ii(t){try{const e=await Qi();return new Promise((n,i)=>{const l=e.transaction(ft,"readonly").objectStore(ft).get(t);l.onsuccess=()=>n(l.result!==void 0?l.result:null),l.onerror=()=>i(l.error||new Error(`Failed to get key: ${t}`))})}catch(e){return console.warn(`[IDB] Failed to read '${t}':`,e),null}}async function Ci(t,e){try{const n=await Qi();return new Promise((i,a)=>{const r=n.transaction(ft,"readwrite").objectStore(ft).put(e,t);r.onsuccess=()=>i(),r.onerror=()=>a(r.error||new Error(`Failed to put key: ${t}`))})}catch(n){console.warn(`[IDB] Failed to save '${t}':`,n)}}let Gt=null;const un="v1.1";function zs(t){if(!t||t.length===0)return;const e=t[0],i=["id","word_kr","translation","level","type"].filter(a=>!(a in e));i.length>0&&(console.error("🚨 CRITICAL: Database schema mismatch. Missing columns:",i),h(`⚠️ Ошибка БД: нет колонок ${i.join(", ")}`))}function Rs(t){if(!t||typeof t!="object")return!1;const e=t,i=["xp","level","coins","sprintRecord","survivalRecord"].every(a=>{const s=e[a];return!(typeof s!="number"||!Number.isFinite(s)||s<0||a==="level"&&s<1)});return i||console.error("❌ Validation failed for UserStats:",t),i}function D(t=300){Gt&&clearTimeout(Gt),Gt=window.setTimeout(()=>{En(),Gt=null,Fi()},t)}function En(){try{if(!Rs(o.userStats)){console.warn("⚠️ State validation failed. Aborting save to protect localStorage.");return}if(localStorage.setItem(v.DB_VERSION,String(Dn)),localStorage.setItem(v.USER_STATS,JSON.stringify(o.userStats)),localStorage.setItem(v.LEARNED,JSON.stringify([...o.learned])),localStorage.setItem(v.MISTAKES,JSON.stringify([...o.mistakes])),localStorage.setItem(v.FAVORITES,JSON.stringify([...o.favorites])),localStorage.setItem(v.WORD_HISTORY,JSON.stringify(o.wordHistory)),localStorage.setItem(v.STREAK,JSON.stringify(o.streak)),localStorage.setItem(v.SESSIONS,JSON.stringify(o.sessions)),localStorage.setItem(v.ACHIEVEMENTS,JSON.stringify(o.achievements)),localStorage.setItem(v.DIRTY_IDS,JSON.stringify([...o.dirtyWordIds])),localStorage.setItem(v.CUSTOM_WORDS,JSON.stringify(o.customWords)),localStorage.setItem(v.WORD_REQUESTS,JSON.stringify(o.wordRequests)),localStorage.setItem(v.FAVORITE_QUOTES,JSON.stringify(o.favoriteQuotes)),localStorage.setItem(v.DAILY_CHALLENGE,JSON.stringify(o.dailyChallenge)),localStorage.setItem(v.TRASH_RETENTION,String(o.trashRetentionDays)),localStorage.setItem(v.PURCHASED_ITEMS,JSON.stringify(o.purchasedItems)),localStorage.setItem(v.TTS_VOLUME,String(o.ttsVolume)),localStorage.setItem(v.VOCAB_VERSION,un),o.dataStore&&o.dataStore.length>0){Ci(v.VOCAB_CACHE,o.dataStore),Ci(v.VOCAB_VERSION,un);try{localStorage.setItem(v.VOCAB_CACHE,JSON.stringify(o.dataStore))}catch{}}}catch(t){console.error("Save error:",t);const e=t;(e?.name==="QuotaExceededError"||e?.name==="NS_ERROR_DOM_QUOTA_REACHED")&&h("⚠️ Память переполнена! Данные могут не сохраниться.")}}function Yi(){if(!o.dataStore||o.dataStore.length===0)return;const t=new Set(o.dataStore.map(n=>String(n.id))),e=n=>{const i=new Set;return n.forEach(a=>{t.has(String(a))&&i.add(a)}),i};o.learned=e(o.learned),o.mistakes=e(o.mistakes),o.favorites=e(o.favorites);for(const n in o.wordHistory)t.has(String(n))||delete o.wordHistory[n]}function Ji(){const t=new Date().toLocaleDateString("en-CA");if(o.streak.lastDate!==t){const e=new Date;e.setDate(e.getDate()-1);const n=e.toLocaleDateString("en-CA");if(o.streak.lastDate===n)o.streak.count++;else{const a=(o.userStats.lastFreezeDate?new Date(o.userStats.lastFreezeDate).toLocaleDateString("en-CA"):null)===t;o.streak.count>0&&o.streak.lastDate&&(o.userStats.streakFreeze>0||a)?(a||(o.userStats.streakFreeze--,o.userStats.lastFreezeDate=Date.now()),h("❄️ Заморозка спасла серию!"),o.streak.count++):o.streak.count=1}o.streak.lastDate=t,D()}}function gt(t,e){o.wordHistory[t]||(o.wordHistory[t]={attempts:0,correct:0,lastReview:null});const n=o.wordHistory[t];if(n.attempts++,e&&n.correct++,n.lastReview=Date.now(),!e&&n.sm2){const i=qt.calculate(0,n.sm2);n.sm2.interval=i.interval,n.sm2.repetitions=i.repetitions,n.sm2.ef=i.ef,n.sm2.nextReview=Date.now()}o.dirtyWordIds.add(t),Ji(),o.sessionActive&&o.sessionWordsReviewed++,D()}function Xi(){const t=new Map,e=o.dataStore;for(let i=0;i<e.length;i++){const a=e[i];a.id&&!t.has(a.id)&&t.set(a.id,a)}o.dataStore=Array.from(t.values()),o.dataStore.sort((i,a)=>{const s=i.topic||i.topic_ru||i.topic_kr||"zzz",l=a.topic||a.topic_ru||a.topic_kr||"zzz";if(s!==l)return s.localeCompare(l);const r=i.category||i.category_ru||i.category_kr||"zzz",c=a.category||a.category_ru||a.category_kr||"zzz";return r!==c?r.localeCompare(c):(i.word_kr||"").localeCompare(a.word_kr||"")});const n=o.dataStore;for(let i=0;i<n.length;i++){const a=n[i];a.type||(a.type="word"),a._parsedTopic=Ei(a.topic||a.topic_ru||a.topic_kr),a._parsedCategory=Ei(a.category||a.category_ru||a.category_kr),a._searchStr=[a.word_kr,a.translation,a.word_hanja,a.synonyms,a.my_notes,a.topic,a.topic_ru,a.category,a.category_ru].filter(Boolean).join(" ").toLowerCase()}zs(o.dataStore),Yi(),En()}function qs(t){if(t.length===0&&o.dataStore.length>0){console.warn("⚠️ Empty vocabulary response — keeping local cache.");return}const e=new Set(t.map(n=>n.word_kr));o.customWords=o.customWords.filter(n=>!e.has(n.word_kr)),o.dataStore=[...t,...o.customWords],Xi()}function Ds(t){if(t.length===0)return;const e=new Set(t.filter(s=>s.deleted_at).map(s=>s.id)),n=t.filter(s=>!s.deleted_at),i=new Map(n.map(s=>[s.id,s])),a=new Set(n.map(s=>s.word_kr));o.customWords=o.customWords.filter(s=>!a.has(s.word_kr)),o.dataStore=o.dataStore.filter(s=>!e.has(s.id)&&!i.has(s.id)),o.dataStore.push(...n),Xi()}async function Li(){try{const e=localStorage.getItem(v.VOCAB_VERSION)===un,n=localStorage.getItem(v.LAST_VOCAB_SYNC),i=await Ii(v.VOCAB_CACHE),a=await Ii(v.VOCAB_VERSION);(Array.isArray(i)&&i.length>0&&a===un||o.dataStore.length===0&&Array.isArray(i))&&(o.dataStore=i,H("vocabs_updated"));const l=o.dataStore.length>0;if(ys()&&l){h("🐌 Медленный интернет: обновление словаря отложено");return}if(!navigator.onLine){h(l?"⚠️ Офлайн режим: используются кэшированные данные":"❌ Нет интернета и нет кэша словаря");return}const r=new AbortController,c=setTimeout(()=>r.abort(),3e4),d="id, word_kr, translation, level, type, topic, topic_ru, topic_kr, category, category_ru, category_kr, example_kr, example_ru, audio_url, audio_male, example_audio, image, image_source, synonyms, antonyms, word_hanja, my_notes, grammar_info, collocations, is_public, created_by, user_id, deleted_at, updated_at",u=1e3,m=200,p=[];let g=null;try{for(let f=0;f<m;f++){const y=f*u;let b=S.from(A.VOCABULARY).select(d);e&&n&&l?b=b.gt("updated_at",n):b=b.is("deleted_at",null);const{data:x,error:E}=await b.order("updated_at",{ascending:!0}).order("id",{ascending:!0}).range(y,y+u-1).abortSignal(r.signal);if(E){g=E;break}const k=x||[];if(p.push(...k),k.length<u)break}}finally{clearTimeout(c)}if(g)throw g;e&&n&&l?p.length>0?(console.info(`🔄 Incremental sync: ${p.length} changes.`),Ds(p),H("vocabs_updated")):console.info("✅ Dictionary up to date."):(console.info(`📥 Full sync: ${p.length} words.`),qs(p),H("vocabs_updated")),localStorage.setItem(v.LAST_VOCAB_SYNC,new Date().toISOString())}catch(t){console.error("Vocabulary fetch failed:",t);const e=!navigator.onLine||t instanceof Error&&(t.message.includes("Failed to fetch")||t.message.includes("NetworkError"))||typeof t=="object"&&t!==null&&"message"in t&&String(t.message).includes("Failed to fetch");typeof t=="object"&&t!==null&&("code"in t&&String(t.code)==="42501"||"message"in t&&String(t.message).includes("permission denied"))?console.warn("ℹ️ Supabase RLS permission restricted. Using local cached dictionary dataset."):e&&o.dataStore.length>0?h("⚠️ Офлайн режим. Используются кэшированные данные."):o.dataStore.length===0&&(console.error("Full db load error:",t),h("❌ Не удалось загрузить словарь."))}}async function Nn(t){if(navigator.onLine)try{h("☁️ Синхронизация...");const{error:e}=await S.rpc("cleanup_user_progress");e&&e.message&&!e.message.includes("AbortError")&&console.warn("Server cleanup skipped:",e.message);const{data:n}=await S.from(A.USER_GLOBAL_STATS).select("*").eq("user_id",t.id).single();if(n){if((n.level||0)>o.userStats.level?(o.userStats.level=n.level,o.userStats.xp=n.xp??0):(n.level||0)===o.userStats.level&&(o.userStats.xp=Math.max(o.userStats.xp,n.xp??0)),o.userStats.sprintRecord=Math.max(o.userStats.sprintRecord,n.sprint_record??0),o.userStats.survivalRecord=Math.max(o.userStats.survivalRecord,n.survival_record??0),o.userStats.coins=Math.max(o.userStats.coins,n.coins??0),o.userStats.streakFreeze=Math.max(o.userStats.streakFreeze,n.streak_freeze??0),n.weekly_xp!==void 0&&(o.userStats.weeklyXp=Math.max(o.userStats.weeklyXp||0,n.weekly_xp||0)),n.league!==void 0){const r=["Bronze","Silver","Gold","Platinum","Diamond","Master","Grandmaster","Challenger"],c=o.userStats.league||"Bronze";r.indexOf(n.league)>r.indexOf(c)&&(o.userStats.league=n.league)}if(n.achievements&&Array.isArray(n.achievements)){const r=new Set(o.achievements.map(c=>c.id));n.achievements.forEach(c=>{r.has(c.id)||o.achievements.push({...c,date:c.date||Date.now()})})}if(n.settings){const r=n.settings,c=r.settingsUpdatedAt||0,d=o.settingsUpdatedAt||0;c>=d&&(o.settingsUpdatedAt=c,localStorage.setItem("settings_updated_at",String(c)),r.darkMode!==void 0&&(o.darkMode=r.darkMode,localStorage.setItem(v.DARK_MODE,String(o.darkMode))),r.hanjaMode!==void 0&&(o.hanjaMode=r.hanjaMode,localStorage.setItem(v.HANJA_MODE,String(o.hanjaMode))),r.audioSpeed!==void 0&&(o.audioSpeed=r.audioSpeed,localStorage.setItem(v.AUDIO_SPEED,String(o.audioSpeed))),r.currentVoice!==void 0&&(o.currentVoice=r.currentVoice,localStorage.setItem(v.VOICE_PREF,o.currentVoice)),r.autoUpdate!==void 0&&(o.autoUpdate=r.autoUpdate,localStorage.setItem(v.AUTO_UPDATE,String(o.autoUpdate))),r.autoTheme!==void 0&&(o.autoTheme=r.autoTheme,localStorage.setItem(v.AUTO_THEME,String(o.autoTheme))),r.autoThemeStart!==void 0&&(o.autoThemeStart=r.autoThemeStart,localStorage.setItem(v.AUTO_THEME_START,String(o.autoThemeStart))),r.autoThemeEnd!==void 0&&(o.autoThemeEnd=r.autoThemeEnd,localStorage.setItem(v.AUTO_THEME_END,String(o.autoThemeEnd))),r.studyGoal!==void 0&&(o.studyGoal=r.studyGoal,localStorage.setItem(v.STUDY_GOAL,JSON.stringify(o.studyGoal))),r.lastDailyReward!==void 0&&(o.userStats.lastDailyReward=r.lastDailyReward),r.themeColor!==void 0&&(o.themeColor=r.themeColor,localStorage.setItem(v.THEME_COLOR,o.themeColor)),r.backgroundMusicEnabled!==void 0&&(o.backgroundMusicEnabled=r.backgroundMusicEnabled,localStorage.setItem(v.MUSIC_ENABLED,String(o.backgroundMusicEnabled))),r.backgroundMusicVolume!==void 0&&(o.backgroundMusicVolume=r.backgroundMusicVolume,localStorage.setItem(v.MUSIC_VOLUME,String(o.backgroundMusicVolume))),r.ttsVolume!==void 0&&(o.ttsVolume=r.ttsVolume,localStorage.setItem(v.TTS_VOLUME,String(o.ttsVolume))),r.trashRetentionDays!==void 0&&(o.trashRetentionDays=r.trashRetentionDays,localStorage.setItem(v.TRASH_RETENTION,String(o.trashRetentionDays))),r.streakLastDate!==void 0&&(o.streak.lastDate=r.streakLastDate),r.survivalHealth!==void 0&&(o.userStats.survivalHealth=r.survivalHealth),r.lastFreezeDate!==void 0&&(o.userStats.lastFreezeDate=r.lastFreezeDate))}if(n.sessions&&Array.isArray(n.sessions)){const r=new Set(o.sessions.map(c=>c.date));n.sessions.forEach(c=>{r.has(c.date)||o.sessions.push(c)}),o.sessions.sort((c,d)=>new Date(c.date).getTime()-new Date(d.date).getTime())}}const{data:i}=await S.from(A.USER_PROGRESS).select("*").eq("user_id",t.id),a=new Set(o.dataStore.map(r=>String(r.id)));if(i)for(let r=0;r<i.length;r++){const c=i[r],d=c.word_id;if(!a.has(String(d)))continue;const u=o.wordHistory[d]?.attempts||0,m=Number(c.attempts)||0;if(u>m){o.dirtyWordIds.add(d);continue}c.is_learned&&o.learned.add(d),c.is_mistake&&o.mistakes.add(d),c.is_favorite&&o.favorites.add(d),o.wordHistory[d]={attempts:c.attempts,correct:c.correct,lastReview:c.last_review?new Date(Number(c.last_review)||c.last_review).getTime():null,learnedDate:c.learned_date?new Date(Number(c.learned_date)||c.learned_date).getTime():void 0,sm2:{interval:c.sm2_interval??0,repetitions:c.sm2_repetitions??0,ef:c.sm2_ef??2.5,nextReview:c.sm2_next_review?new Date(Number(c.sm2_next_review)||c.sm2_next_review).getTime():void 0}}}const{data:s,error:l}=await S.from(A.USER_FAVORITE_QUOTES).select("quote_id").eq("user_id",t.id);if(l)console.error("Error loading favorite quotes:",l);else if(s){const r=s.map(c=>c.quote_id);if(r.length>0){const{data:c,error:d}=await S.from(A.QUOTES).select("*").in("id",r);d?console.error("Error fetching full favorite quotes:",d):o.favoriteQuotes=c||[]}}Yi(),H("stats_updated",o.userStats),H("settings_updated"),D(),h("✅ Профиль загружен")}catch(e){console.error("Load Error:",e)}}async function Os(){try{const{count:t,error:e}=await S.from(A.QUOTES).select("*",{count:"exact",head:!0});if(e||t===null||t===0)return null;const n=Math.floor(Math.random()*t),{data:i,error:a}=await S.from(A.QUOTES).select("*").range(n,n).single();if(a)throw a;return i}catch(t){return console.warn("Quote fetch error:",t),null}}async function lt(t=5e3){try{const e=S.supabaseUrl,n=S.supabaseKey;if(!e)return!1;const i=new AbortController,a=setTimeout(()=>i.abort(),t),s=await fetch(`${e}/rest/v1/`,{method:"HEAD",mode:"cors",cache:"no-store",signal:i.signal,headers:n?{apikey:n}:{}});return clearTimeout(a),s.ok}catch{return!1}}function $s(t){const e=document.getElementById("level-up-overlay"),n=document.getElementById("level-up-val");if(!e||!n)return;n.textContent=String(t),e.classList.add("active"),F("success",300);const i=window.innerWidth<768;ve({particleCount:i?100:200,spread:i?60:100,origin:{y:.6},disableForReducedMotion:!0,zIndex:20020})}function Hs(t,e,n,i){let a=document.getElementById("achievement-overlay");a||(a=document.createElement("div"),a.id="achievement-overlay",a.innerHTML=`
        <div class="achievement-popup">
            <div class="ach-icon-wrapper">
                <div class="ach-icon"></div>
            </div>
            <div class="ach-text">
                <div class="ach-label">ДОСТИЖЕНИЕ РАЗБЛОКИРОВАНО</div>
                <div class="ach-title"></div>
                <div class="ach-progress-display" style="display: none;">
                    <div class="ach-progress-bar-popup">
                        <div class="ach-progress-fill-popup"></div>
                    </div>
                    <div class="ach-progress-text-popup"></div>
                </div>
            </div>
        </div>
    `,document.body.appendChild(a));const s=a.querySelector(".ach-icon"),l=a.querySelector(".ach-title"),r=a.querySelector(".ach-progress-display"),c=a.querySelector(".ach-progress-fill-popup"),d=a.querySelector(".ach-progress-text-popup");s&&(s.textContent=e),l&&(l.textContent=t),r&&c&&d&&typeof n=="number"&&typeof i=="number"&&i>1?(r.style.display="block",d.textContent=`${n}/${i}`,requestAnimationFrame(()=>{c.style.width=`${n/i*100}%`})):r&&(r.style.display="none"),a.classList.remove("active"),a.offsetWidth,a.classList.add("active"),F("achievement-unlock"),setTimeout(()=>{a?.classList.remove("active")},4e3)}const $e=["Bronze","Silver","Gold","Platinum","Diamond","Master","Grandmaster","Challenger"];function mn(t){return Math.floor(100*Math.pow(Math.max(1,t),1.2))}function Ns(t,e){let n=e;for(let i=1;i<t;i++)n+=mn(i);return n}function Us(){const t=new Date;t.setHours(0,0,0,0),t.setDate(t.getDate()+4-(t.getDay()||7));const e=new Date(t.getFullYear(),0,1),n=Math.ceil(((t.getTime()-e.getTime())/864e5+1)/7);return`${t.getFullYear()}-W${n}`}function Ki(){const t=Us();if(!o.userStats.lastWeekId)return o.userStats.lastWeekId=t,null;if(o.userStats.lastWeekId!==t){const e=o.userStats.weeklyXp||0,n=o.userStats.league||"Bronze";let i=n;const a=$e.indexOf(n);if(a!==-1){const s=[300,600,1e3,1500,2e3,3e3,5e3,1/0],l=[0,50,150,300,500,800,1200,2e3];a<$e.length-1&&e>=s[a]?i=$e[a+1]:a>0&&e<l[a]&&(i=$e[a-1])}return o.userStats.weeklyXp=0,o.userStats.lastWeekId=t,o.userStats.league=i,D(),H("stats_updated",o.userStats),{oldLeague:n,newLeague:i,prevXp:e}}return null}function Ps(){const t=Ki();if(t){const{oldLeague:e,newLeague:n,prevXp:i}=t;window.setTimeout(()=>{if(n!==e){const a=$e.indexOf(n)>$e.indexOf(e),s=a?`🎉 Повышение лиги!
${e} ➡ ${n}`:`📉 Понижение лиги...
${e} ➡ ${n}`;if(Ae(s),F(a?"achievement-unlock":"failure"),a&&typeof ve=="function"){const l=window.innerWidth<768;ve({particleCount:l?60:100,spread:l?50:70,origin:{y:.6},disableForReducedMotion:!0})}}else h(`📅 Новая неделя! Итог прошлой: ${i} XP`)},1500)}}function vt(t){const e=Ki();if(e){const{oldLeague:c,newLeague:d}=e;if(d!==c){const u=$e.indexOf(d)>$e.indexOf(c);Ae(u?`🎉 Лига: ${d}!`:`📉 Лига: ${d}`)}}o.userStats.xp=(o.userStats.xp||0)+t,t>0&&(o.userStats.weeklyXp=(o.userStats.weeklyXp||0)+t),t>0&&(o.userStats.coins=(o.userStats.coins||0)+t);let n=Math.max(1,Math.floor(Number(o.userStats.level)||1));const i=ht(n);let a=mn(n),s=!1,l=0;for(;o.userStats.xp>=a&&a>0&&l++<1e3;)o.userStats.xp-=a,n++,$s(n),s=!0,a=mn(n);o.userStats.level=n,Zi(),H("stats_updated",o.userStats);const r=ht(n);if(r.name!==i.name&&window.setTimeout(()=>{if(Ae(`🏆 Новое звание: ${r.name}!`),F("achievement-unlock"),typeof ve=="function"){const c=window.innerWidth<768;ve({particleCount:c?100:200,spread:c?60:100,origin:{y:.6},disableForReducedMotion:!0})}},1e3),s){const c=document.getElementById("xp-fill");c&&(c.classList.remove("level-up-shine"),c.offsetWidth,c.classList.add("level-up-shine"),window.setTimeout(()=>c.classList.remove("level-up-shine"),1500))}D()}function Zi(){const t=o.userStats.level,e=o.userStats.xp,n=mn(t),i=document.getElementById("user-level");i&&(i.innerText=String(t));const a=document.getElementById("xp-text");a&&(a.innerText=`${e}/${n}`);const s=ht(t),l=document.querySelector("#xp-level-widget .xp-label");l&&(l.textContent=`${s.icon} LVL`);const r=document.getElementById("xp-fill");if(r){const c=Math.min(100,Math.max(0,e/n*100));r.tagName==="path"||r.tagName==="PATH"?(r.setAttribute("stroke-dasharray",`${c}, 100`),r.style.stroke=s.color):(r.style.width=`${c}%`,r.style.backgroundColor=s.color)}}function Sn(){const t=document.getElementById("coins-count-header");t&&(t.innerText=String(o.userStats.coins));const e=document.getElementById("stats-strip");if(e){const n=ea(),i=[{label:"Серия",value:o.streak.count,icon:"🔥",color:"var(--danger)",isChart:!1},{label:"Изучено",value:o.learned.size,icon:"📚",color:"var(--success)",isChart:!1},{label:"Процент правильных ответов",value:n,icon:"🎯",color:"var(--primary)",isChart:!0},{label:"Ошибок",value:o.mistakes.size,icon:"⚠️",color:"var(--warning)",isChart:!1},{label:"Сессии",value:o.sessions.length,icon:"⏱",color:"var(--info)",isChart:!1}];e.innerHTML=i.map(a=>a.isChart?`
                <div class="stat-card-primary">
                    <div class="stat-chart-wrapper">
                        <svg viewBox="0 0 36 36" class="circular-chart">
                            <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <path class="circle-fill" stroke="${a.color}" stroke-dasharray="${a.value}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        </svg>
                        <div class="stat-chart-text" style="color: ${a.color}">${a.value}%</div>
                    </div>
                    <div class="stat-label-primary">${a.label}</div>
                </div>
            `:`
          <div class="stat-card-primary">
              <div class="stat-icon-primary" style="background: ${a.color}20; color: ${a.color};">${a.icon}</div>
              <div class="stat-info-primary" style="text-align: center;">
                  <div class="stat-value-primary">${a.value}</div>
                  <div class="stat-label-primary">${a.label}</div>
              </div>
          </div>
      `).join("")}}function ai(){try{qt.init({dataStore:o.dataStore,wordHistory:o.wordHistory});const t=qt.getQueue({limit:999}),e=document.getElementById("srs-badge");if(e){const i=parseInt(e.textContent||"0"),a=t.length;e.textContent=String(t.length),e.style.display=t.length>0?"inline-block":"none",a>0&&a!==i&&(e.classList.remove("badge-pop"),e.offsetWidth,e.classList.add("badge-pop"))}const n=document.querySelector('.nav-btn[onclick="openReviewMode()"]');n&&(t.length>0?n.classList.add("has-reviews"):n.classList.remove("has-reviews"))}catch(t){console.warn("SRS Badge update failed:",t)}}function ea(){if(Vn!==null)return Vn;let t=0,e=0;const n=Object.values(o.wordHistory);for(let i=0;i<n.length;i++){const a=n[i];a&&typeof a.attempts=="number"&&(t+=a.attempts,e+=a.correct)}return t===0?0:Math.round(e/t*100)}function ta(){let t=null;const e=()=>{if(t!==null)return t;t=0;const n=o.wordHistory;for(const i in n){const a=n[i];a.attempts>=3&&a.correct/a.attempts>=.9&&t++}return t};return[{id:"first_10",title:"Первые шаги",description:"Выучить 10 слов",emoji:"🎯",progress:()=>o.learned.size,max:10},{id:"first_50",title:"Словарный запас",description:"Выучить 50 слов",emoji:"💪",progress:()=>o.learned.size,max:50},{id:"first_100",title:"Сотня!",description:"Выучить 100 слов",emoji:"🔥",progress:()=>o.learned.size,max:100},{id:"master_10",title:"Мастер",description:"Довести 10 слов до 90% точности",emoji:"👑",progress:e,max:10},{id:"master_50",title:"Сэнсэй",description:"Довести 50 слов до 90% точности",emoji:"🎓",progress:e,max:50},{id:"first_favorite",title:"На заметку",description:"Добавить первое слово в избранное",emoji:"❤️",progress:()=>o.favorites.size,max:1},{id:"zero_mistakes",title:"Перфекционист",description:"Выучить 5 слов без единой ошибки",emoji:"✨",progress:()=>o.mistakes.size===0&&o.learned.size>=5?1:0,max:1},{id:"streak_3",title:"Начало положено",description:"Серия занятий 3 дня подряд",emoji:"🌱",progress:()=>o.streak.count,max:3},{id:"streak_7",title:"Марафонец",description:"Серия занятий 7 дней подряд",emoji:"🏆",progress:()=>o.streak.count,max:7},{id:"sessions_5",title:"Регулярность",description:"Завершить 5 учебных сессий",emoji:"📚",progress:()=>o.sessions.length,max:5},{id:"sprint_20",title:"Спринтер",description:"Набрать 20 очков в Спринте",emoji:"⚡",progress:()=>o.userStats.sprintRecord||0,max:20},{id:"survival_20",title:"Выживший",description:"Набрать 20 очков в Выживании",emoji:"☠️",progress:()=>o.userStats.survivalRecord||0,max:20},{id:"collector_1000",title:"Коллекционер",description:"Накопить 1000 монет",emoji:"💰",progress:()=>o.userStats.coins,max:1e3},{id:"shopaholic",title:"Покупатель",description:"Купить предмет в магазине",emoji:"🛍️",progress:()=>o.userStats.streakFreeze>0?1:0,max:1},{id:"level_5",title:"Пятый уровень",description:"Достичь 5 уровня",emoji:"⭐",progress:()=>o.userStats.level,max:5},{id:"level_10",title:"Десятый уровень",description:"Достичь 10 уровня",emoji:"🌟",progress:()=>o.userStats.level,max:10},{id:"night_owl",title:"Ночная сова",description:"Секретное достижение",secretDesc:"Заниматься после 23:00",emoji:"🦉",progress:()=>new Date().getHours()>=23?1:0,max:1,secret:!0},{id:"early_bird",title:"Жаворонок",description:"Секретное достижение",secretDesc:"Заниматься до 6:00 утра",emoji:"🌅",progress:()=>new Date().getHours()<6?1:0,max:1,secret:!0}]}function Me(t=!0){const e=ta(),n=new Set(o.achievements.map(i=>i.id));e.forEach(i=>{if(n.has(i.id))return;const a=i.progress();a>=i.max&&(o.achievements.push({id:i.id,date:Date.now()}),n.add(i.id),t&&Hs(i.title,i.emoji,a,i.max))}),localStorage.setItem("achievements_v5",JSON.stringify(o.achievements))}function Vs(){const t=document.getElementById("achievements-list"),e=document.getElementById("achievements-header");if(!t)return;t.scrollTop=0,t.innerHTML="";const n=ta(),i=new Set(o.achievements.map(l=>l.id)),a=i.size,s=n.length;e&&(e.innerHTML=`
            <div style="font-size: 14px; color: var(--text-sub); margin-bottom: 10px; font-weight: 500; text-align: center;">Открыто ${a} из ${s}</div>
            <div class="xp-bar-container" style="height: 10px; max-width: 100%; margin: 0 auto; background: var(--surface-2); border-radius: 5px; overflow: hidden;">
                <div id="ach-progress-fill" class="xp-bar-fill" style="width: 0%; background: var(--gold); height: 100%; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);"></div>
            </div>
        `,requestAnimationFrame(()=>{const l=document.getElementById("ach-progress-fill");l&&(l.style.width=`${a/s*100}%`)})),n.forEach((l,r)=>{const c=i.has(l.id),d=document.createElement("div");d.className="achievement-card",d.style.animation=`fadeInUpList 0.3s ease-out ${r*.05}s backwards`,c?d.classList.add("unlocked"):d.classList.add("locked");let u=l.emoji,m=l.title,p=l.description;!c&&l.secret&&(d.classList.add("secret"),u="❓",m="Секретное достижение",p="Выполните особое условие");const g=l.progress(),f=Math.min(100,g/l.max*100);let y="";!c&&l.max>1&&(y=`<div class="ach-progress-bar"><div class="ach-progress-fill" style="width: ${f}%"></div></div><div class="ach-progress-text">${g} / ${l.max}</div>`),d.innerHTML=`<div class="achievement-icon">${u}</div><div class="achievement-info"><div class="achievement-title">${m}</div><div class="achievement-desc">${p}</div></div>${y}`,t.appendChild(d)})}let en=null,Un=-1,Pn=null,Vn=null;function fc(){en=null,Un=-1,Pn=null}function Fs(){Vn=null}function js(){const t=document.getElementById("topic-mastery-list");if(!t)return;if(en&&o.learned.size===Un&&o.currentType===Pn){t.innerHTML=en;return}const e=Object.create(null),n=o.dataStore,i=n.length,a=o.currentType;for(let l=0;l<i;l++){const r=n[l];if(r.type!==a)continue;const c=r.topic||r.topic_ru||r.topic_kr||"Other";e[c]||(e[c]={total:0,learned:0}),e[c].total++,o.learned.has(r.id)&&e[c].learned++}let s="";Object.entries(e).forEach(([l,r])=>{const c=Math.round(r.learned/r.total*100);s+=`
        <div class="topic-mastery-card">
            <div class="topic-header"><span class="topic-name">${l}</span> <span class="topic-pct">${c}%</span></div>
            <div class="topic-progress">
                <div class="topic-bar" style="width: ${c}%; background-color: hsl(${c*1.2}, 70%, 50%);"></div>
            </div>
            <div class="topic-stats">${r.learned} из ${r.total} слов</div>
        </div>`}),t.innerHTML=s,en=s,Un=o.learned.size,Pn=a}const Pe={};function Ke(){const t=document.body.classList.contains("dark-mode");return{textColor:t?"rgba(255, 255, 255, 0.7)":"#64748b",gridColor:t?"rgba(255, 255, 255, 0.05)":"rgba(0, 0, 0, 0.05)",tooltipBg:t?"#1e1b4b":"#ffffff",tooltipText:t?"#ffffff":"#1e293b",fontFamily:"'Pretendard Variable', sans-serif",success:t?"#34d399":"#059669",danger:t?"#fb7185":"#e11d48"}}function Vt(t){return window.matchMedia("(prefers-reduced-motion: reduce)").matches?0:t}function Ze(t){const e=Pe[t];e&&typeof e.destroy=="function"&&e.destroy()}function Ws(){const t=[],e=new Date;for(let n=6;n>=0;n--){const i=new Date;i.setDate(e.getDate()-n);const a=i.toLocaleDateString("en-CA"),s=o.sessions.some(l=>l.date?new Date(l.date).toLocaleDateString("en-CA")===a:!1);t.push({day:i.toLocaleDateString("ru-RU",{weekday:"short"}),date:i.getDate(),active:s,isToday:n===0})}return t}async function si(){const t=document.getElementById("stats-details");if(!t)return;const e=t.closest(".modal-body-container");if(e&&(e.scrollTop=0),typeof Le>"u"&&await new Promise((l,r)=>{if(document.getElementById("chartjs-cdn")){l();return}const c=document.createElement("script");c.id="chartjs-cdn",c.src="https://cdn.jsdelivr.net/npm/chart.js",c.onload=()=>l(),c.onerror=()=>r(new Error("Chart.js load failed")),document.head.appendChild(c)}).catch(()=>{t.innerHTML='<div style="padding: 20px; text-align: center; color: var(--text-sub);">Графики недоступны (Chart.js не загружен)</div>'}),typeof Le>"u"){t.innerHTML='<div style="padding: 20px; text-align: center; color: var(--text-sub);">Графики недоступны (Chart.js не загружен)</div>';return}const n=Ws(),i="";let a=`
    <div id="streak-calendar-card" class="streak-calendar-card">
      <div class="streak-info">
        <div class="streak-icon-lg">🔥</div>
        <div>
          <div class="streak-label">Текущая серия</div>
          <div class="streak-value">${o.streak.count} дн.</div>
        </div>
      </div>
      <div class="streak-days-grid">
        ${n.map(l=>`
          <div class="streak-day-col">
            <div class="streak-day-name">${l.day}</div>
            <div class="streak-day-circle ${l.active?"active":""} ${l.isToday?"today":""}">
              ${l.active?"✓":l.date}
            </div>
          </div>
        `).join("")}
      </div>
    </div>
  `;o.mistakes.size>0&&(a+=`
      <button class="btn" data-action="open-mistakes" style="width: 100%; margin-bottom: 24px; background: rgba(239, 68, 68, 0.1); color: var(--danger); border: 1px solid var(--danger);">
        ⚠️ Анализ ошибок (${o.mistakes.size})
      </button>
    `);const s=document.getElementById("streak-calendar-card");s&&s.parentElement?s.outerHTML=a+i:document.getElementById("activityChart")?t.insertAdjacentHTML("afterbegin",a+i):t.innerHTML=`
      ${a}
      ${i}
      <div class="charts-grid">
        <div class="chart-card">
          <h3 class="chart-title">📊 Активность (7 дней)</h3>
          <div class="chart-container">
            <canvas id="activityChart" style="width: 100%; height: 100%;"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <h3 class="chart-title">🧠 Прогресс (SRS)</h3>
          <div class="chart-container">
            <canvas id="srsChart"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <h3 class="chart-title">📅 Изучено по уровням</h3>
          <div class="chart-container">
            <canvas id="learnedChart"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <h3 class="chart-title">🏷️ По категориям</h3>
          <div class="chart-container">
            <canvas id="typesChart"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <h3 class="chart-title">⏰ Время занятий</h3>
          <div class="chart-container">
            <canvas id="hourlyChart"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <h3 class="chart-title">🎯 Точность сессий</h3>
          <div class="chart-container">
            <canvas id="accuracyChart"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <h3 class="chart-title">📉 Кривая забывания</h3>
          <div class="chart-container">
            <canvas id="forgettingChart"></canvas>
          </div>
        </div>
      </div>
    `,requestAnimationFrame(()=>{Gs(),Xs(),Qs(),Ks(),Zs(),Ys(),Js()})}function Gs(){const t=document.getElementById("activityChart")?.getContext("2d");if(!t)return;Ze("activity");const e=[],n=[],i=new Date,a=Ke(),s=new Map;Object.values(o.wordHistory).forEach(r=>{if(r.learnedDate){const c=new Date(r.learnedDate);if(!isNaN(c.getTime())){const d=c.toLocaleDateString("en-CA");s.set(d,(s.get(d)||0)+1)}}});for(let r=6;r>=0;r--){const c=new Date;c.setDate(i.getDate()-r);const d=c.toLocaleDateString("en-CA");e.push(c.toLocaleDateString("ru-RU",{weekday:"short"}));let u=s.get(d)||0;if(u===0&&r>0){const m=o.sessions.filter(p=>{if(!p.date)return!1;const g=new Date(p.date);return!isNaN(g.getTime())&&g.toLocaleDateString("en-CA")===d}).reduce((p,g)=>p+(g.wordsReviewed||0),0);u=Math.ceil(m*.5)}n.push(u)}const l=t.createLinearGradient(0,0,0,200);l.addColorStop(0,"rgba(124, 58, 237, 0.9)"),l.addColorStop(1,"rgba(124, 58, 237, 0.2)"),Pe.activity=new Le(t,{type:"bar",data:{labels:e,datasets:[{label:"Активность",data:n,backgroundColor:l,borderRadius:6,borderSkipped:!1,barThickness:"flex",maxBarThickness:30}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1},tooltip:{backgroundColor:a.tooltipBg,titleColor:a.tooltipText,bodyColor:a.tooltipText,borderColor:a.gridColor,borderWidth:1,padding:10,cornerRadius:8,displayColors:!1,callbacks:{label:r=>`📝 ~${r.raw} слов`}}},scales:{y:{beginAtZero:!0,grid:{color:a.gridColor},border:{display:!1},ticks:{color:a.textColor,font:{family:a.fontFamily},precision:0}},x:{grid:{display:!1},ticks:{color:a.textColor,font:{family:a.fontFamily}}}},animation:{duration:Vt(2e3),easing:"easeOutQuart",delay:r=>{let c=0;return r.type==="data"&&r.mode==="default"&&(c=r.dataIndex*100+r.datasetIndex*100),c}}}})}function Qs(){const t=document.getElementById("learnedChart")?.getContext("2d");if(!t)return;Ze("learned");const e=Ke(),n={"★☆☆":0,"★★☆":0,"★★★":0},i={"★☆☆":0,"★★☆":0,"★★★":0},a=o.dataStore;for(let s=0;s<a.length;s++){const l=a[s];l.level&&l.level in i&&(i[l.level]++,o.learned.has(l.id)&&n[l.level]++)}Pe.learned=new Le(t,{type:"bar",data:{labels:Object.keys(n),datasets:[{label:"Изучено",data:Object.values(n),backgroundColor:["#34d399","#60a5fa","#a78bfa"],borderRadius:6,barThickness:"flex",maxBarThickness:40}]},options:{responsive:!0,maintainAspectRatio:!1,animation:{duration:Vt(1500),easing:"easeOutBounce",delay:s=>{let l=0;return s.type==="data"&&s.mode==="default"&&(l=s.dataIndex*150),l}},plugins:{legend:{display:!1},tooltip:{backgroundColor:e.tooltipBg,titleColor:e.tooltipText,bodyColor:e.tooltipText,borderColor:e.gridColor,borderWidth:1,padding:10,cornerRadius:8,callbacks:{label:s=>{const l=s.label,r=i[l]||0,c=s.raw,d=r>0?Math.round(c/r*100):0;return`📚 ${c} из ${r} (${d}%)`}}}},scales:{y:{beginAtZero:!0,grid:{color:e.gridColor},border:{display:!1},ticks:{color:e.textColor,font:{family:e.fontFamily},precision:0}},x:{grid:{display:!1},ticks:{color:e.textColor,font:{family:e.fontFamily}}}}}})}function Ys(){const t=document.getElementById("accuracyChart")?.getContext("2d");if(!t)return;Ze("accuracy");const e=Ke(),n=o.sessions.slice(-10);if(n.length===0)return;const i=n.map(l=>{const r=new Date(l.date);return`${r.getDate()}.${r.getMonth()+1}`}),a=n.map(l=>l.accuracy||0),s=t.createLinearGradient(0,0,0,200);s.addColorStop(0,"rgba(0, 184, 148, 0.4)"),s.addColorStop(1,"rgba(0, 184, 148, 0.0)"),Pe.accuracy=new Le(t,{type:"line",data:{labels:i,datasets:[{label:"Точность %",data:a,borderColor:"#00b894",backgroundColor:s,borderWidth:3,pointBackgroundColor:"#ffffff",pointBorderColor:"#00b894",pointRadius:3,pointHoverRadius:6,fill:!0,tension:.4}]},options:{responsive:!0,maintainAspectRatio:!1,animations:{y:{duration:Vt(2e3),easing:"easeOutCubic",from:l=>l.type==="data"?0:void 0}},plugins:{legend:{display:!1},tooltip:{backgroundColor:e.tooltipBg,titleColor:e.tooltipText,bodyColor:e.tooltipText,borderColor:e.gridColor,borderWidth:1,padding:10,cornerRadius:8,callbacks:{label:l=>`🎯 ${l.raw}%`}}},scales:{y:{beginAtZero:!0,max:100,grid:{color:e.gridColor},border:{display:!1},ticks:{color:e.textColor,font:{family:e.fontFamily}}},x:{grid:{display:!1},ticks:{color:e.textColor,font:{family:e.fontFamily},maxRotation:0,autoSkip:!0}}}}})}function Js(){const t=document.getElementById("forgettingChart")?.getContext("2d");if(!t)return;Ze("forgetting");const e=Ke();let n=0,i=0;Object.values(o.wordHistory).forEach(d=>{d&&d.sm2&&d.sm2.interval>1&&(n+=d.sm2.interval,i++)});const a=i>0?n/i:2.5,s=[],l=[],r=[];for(let d=0;d<=7;d++)s.push(d===0?"Сейчас":d+"д"),l.push(Math.exp(-d/2.5)*100),r.push(Math.exp(-d/a)*100);const c=t.createLinearGradient(0,0,0,200);c.addColorStop(0,"rgba(52, 211, 153, 0.5)"),c.addColorStop(1,"rgba(52, 211, 153, 0.0)"),Pe.forgetting=new Le(t,{type:"line",data:{labels:s,datasets:[{label:"Ваша память",data:r,borderColor:e.success,backgroundColor:c,borderWidth:3,pointRadius:0,pointBackgroundColor:e.success,pointHoverRadius:4,fill:!0,tension:.4},{label:"Без повторений",data:l,borderColor:"#e17055",backgroundColor:"transparent",borderWidth:2,borderDash:[5,5],pointRadius:0,fill:!1,tension:.1}]},options:{responsive:!0,maintainAspectRatio:!1,animation:{duration:Vt(2500),easing:"easeInOutQuart",loop:!1},plugins:{legend:{display:!0,position:"top",labels:{color:e.textColor,font:{family:e.fontFamily}}},tooltip:{backgroundColor:e.tooltipBg,titleColor:e.tooltipText,bodyColor:e.tooltipText,borderColor:e.gridColor,borderWidth:1,callbacks:{label:d=>`🧠 ${d.dataset.label}: ${Math.round(d.raw)}%`}}},scales:{y:{beginAtZero:!0,max:100,grid:{color:e.gridColor},border:{display:!1},ticks:{color:e.textColor,font:{family:e.fontFamily}}},x:{grid:{display:!1},ticks:{color:e.textColor,font:{family:e.fontFamily}}}}}})}function Xs(){const t=document.getElementById("srsChart")?.getContext("2d");if(!t)return;Ze("srs");const e=Ke(),n=[0,0,0,0],i=o.dataStore;for(let s=0;s<i.length;s++){const l=i[s],r=o.wordHistory[l.id];!r||!r.sm2||r.sm2.interval===0?n[0]++:r.sm2.interval<3?n[1]++:r.sm2.interval<21?n[2]++:n[3]++}const a=n.reduce((s,l)=>s+l,0);Pe.srs=new Le(t,{type:"doughnut",data:{labels:["Новые","Изучаю","Закрепляю","Выучено"],datasets:[{data:n,backgroundColor:[e.gridColor,"#60a5fa","#a78bfa","#34d399"],borderColor:e.tooltipBg,borderWidth:3,hoverOffset:8}]},options:{responsive:!0,maintainAspectRatio:!1,animation:{duration:Vt(1500),easing:"easeOutCirc"},cutout:"75%",plugins:{legend:{position:"bottom",labels:{boxWidth:12,color:e.textColor,font:{family:e.fontFamily,size:12},padding:20}},tooltip:{backgroundColor:e.tooltipBg,titleColor:e.tooltipText,bodyColor:e.tooltipText,borderColor:e.gridColor,borderWidth:1,padding:10,cornerRadius:8,callbacks:{label:s=>{const l=s.raw,r=s.dataset.data.reduce((d,u)=>d+u,0),c=r>0?Math.round(l/r*100):0;return` ${s.label}: ${l} (${c}%)`}}}}},plugins:[{id:"centerText",afterDraw:s=>{const l=s.ctx,{width:r,height:c}=s;l.restore();const d=(c/115).toFixed(2);l.font=`bold ${d}em ${e.fontFamily}`,l.textBaseline="middle",l.textAlign="center";const u=`${a}`,m=r/2,p=c/2,g="слов",f=(c/250).toFixed(2);l.fillStyle=e.textColor,l.fillText(u,m,p-c*.05),l.font=`600 ${f}em ${e.fontFamily}`,l.fillStyle=e.textColor.replace(")",", 0.7)"),l.fillText(g,m,p+c*.08),l.save()}}]})}function Ks(){const t=document.getElementById("typesChart")?.getContext("2d");if(!t)return;Ze("types");const e=Ke(),n={};o.dataStore.forEach(c=>{let d=c.category_ru||c.category||"Другое";d=d.split("(")[0].trim(),n[d]=(n[d]||0)+1});const i=Object.entries(n).sort((c,d)=>d[1]-c[1]),a=i.slice(0,6),s=i.slice(6).reduce((c,d)=>c+d[1],0);s>0&&a.push(["Другое",s]);const l=a.map(c=>c[0]),r=a.map(c=>c[1]);Pe.types=new Le(t,{type:"polarArea",data:{labels:l,datasets:[{data:r,backgroundColor:["rgba(251, 146, 60, 0.7)","rgba(52, 211, 153, 0.7)","rgba(96, 165, 250, 0.7)","rgba(167, 139, 250, 0.7)","rgba(244, 114, 182, 0.7)","rgba(251, 113, 133, 0.7)","rgba(148, 163, 184, 0.7)"],borderWidth:1,borderColor:e.tooltipBg}]},options:{responsive:!0,maintainAspectRatio:!1,scales:{r:{grid:{color:e.gridColor},ticks:{display:!1,backdropColor:"transparent"}}},plugins:{legend:{position:"right",labels:{color:e.textColor,font:{family:e.fontFamily,size:11},boxWidth:10}}}}})}function Zs(){const t=document.getElementById("hourlyChart")?.getContext("2d");if(!t)return;Ze("hourly");const e=Ke(),n=new Array(24).fill(0);o.sessions.forEach(a=>{if(a.date){const s=new Date(a.date);if(!isNaN(s.getTime())){const l=s.getHours();n[l]+=a.duration/60}}});const i=t.createLinearGradient(0,0,0,200);i.addColorStop(0,"rgba(245, 158, 11, 0.8)"),i.addColorStop(1,"rgba(245, 158, 11, 0.1)"),Pe.hourly=new Le(t,{type:"bar",data:{labels:n.map((a,s)=>String(s)),datasets:[{label:"Минут",data:n,backgroundColor:i,borderRadius:4,barThickness:"flex"}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1}},scales:{y:{display:!1},x:{grid:{display:!1},ticks:{color:e.textColor,font:{family:e.fontFamily,size:10},maxRotation:0,autoSkip:!0,maxTicksLimit:12}}}}})}const We=[{minLevel:100,name:"Божество",icon:"👑",color:"#FFD700"},{minLevel:75,name:"Титан",icon:"⚡",color:"#E11D48"},{minLevel:50,name:"Легенда",icon:"🏆",color:"#9333EA"},{minLevel:40,name:"Мудрец",icon:"📜",color:"#2563EB"},{minLevel:30,name:"Грандмастер",icon:"🔮",color:"#059669"},{minLevel:20,name:"Мастер",icon:"🥋",color:"#0D9488"},{minLevel:15,name:"Эксперт",icon:"🎓",color:"#CA8A04"},{minLevel:10,name:"Знаток",icon:"🧠",color:"#EA580C"},{minLevel:5,name:"Студент",icon:"📚",color:"#4F46E5"},{minLevel:3,name:"Ученик",icon:"📝",color:"#64748B"},{minLevel:0,name:"Новичок",icon:"🌱",color:"#94A3B8"}];function ht(t){return We.find(e=>t>=e.minLevel)||We[We.length-1]}function eo(){let t=document.getElementById("roles-modal");t||(t=document.createElement("div"),t.id="roles-modal",t.className="modal",t.setAttribute("data-close-modal","roles-modal"),document.body.appendChild(t));const e=o.userStats.level,n=ht(e),i=We.indexOf(n),a=i>0?We[i-1]:null;let s="";if(a){const c=n.minLevel,d=a.minLevel,u=d-c,m=e-c,p=Math.min(100,Math.max(0,m/u*100)),g=d-e;s=`
      <div style="margin-bottom: 20px; padding: 15px; background: var(--surface-2); border-radius: 16px; text-align: center; border: 1px solid var(--border-color);">
        <div style="font-size: 13px; color: var(--text-sub); margin-bottom: 10px;">
          До звания <strong style="color: ${a.color}">${a.name}</strong> осталось уровней: <strong>${g}</strong>
        </div>
        <div class="xp-bar-container" style="height: 10px; background: var(--surface-3); border-radius: 5px; overflow: hidden; position: relative;">
          <div class="xp-bar-fill" style="width: ${p}%; background: ${a.color}; height: 100%; transition: width 0.5s ease;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 11px; color: var(--text-tertiary); font-weight: 600;">
          <span>${n.icon} ${n.name} (L${c})</span>
          <span>${a.icon} ${a.name} (L${d})</span>
        </div>
      </div>
    `}else s=`
      <div style="margin-bottom: 20px; padding: 15px; background: linear-gradient(135deg, var(--surface-2), var(--surface-1)); border-radius: 16px; text-align: center; border: 1px solid var(--gold);">
        <div style="font-size: 24px; margin-bottom: 5px;">👑</div>
        <div style="font-size: 15px; font-weight: 800; color: var(--gold);">Вы достигли вершины!</div>
        <div style="font-size: 12px; color: var(--text-sub);">Вы — легенда этого мира.</div>
      </div>
    `;const r=[...We].reverse().map(c=>{const d=e>=c.minLevel&&We.find(m=>e>=m.minLevel)===c,u=e>=c.minLevel;return`
            <div class="role-item" style="
                display: flex; 
                align-items: center; 
                padding: 12px; 
                margin-bottom: 8px; 
                background: var(--surface-2); 
                border-radius: 12px; 
                border: 2px solid ${d?c.color:"transparent"};
                opacity: ${u?1:.5};
                filter: ${u?"none":"grayscale(0.8)"};
            ">
                <div style="font-size: 24px; margin-right: 15px; width: 40px; text-align: center;">${c.icon}</div>
                <div style="flex: 1;">
                    <div style="font-weight: 800; color: var(--text-main);">${c.name}</div>
                    <div style="font-size: 12px; color: var(--text-sub);">Уровень ${c.minLevel}+</div>
                </div>
                ${d?`<div style="font-size: 11px; font-weight: bold; color: white; background: ${c.color}; padding: 4px 8px; border-radius: 8px;">Вы здесь</div>`:""}
                ${u?"":'<div style="font-size: 16px;">🔒</div>'}
            </div>
        `}).join("");t.innerHTML=`
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3>🏆 Звания</h3>
                <button class="btn btn-icon close-modal-btn" data-close-modal="roles-modal" aria-label="Закрыть">✕</button>
            </div>
            <div class="modal-body" style="max-height: 60vh; overflow-y: auto; padding-right: 5px;">
                ${s}
                ${r}
            </div>
        </div>
    `,document.dispatchEvent(new CustomEvent("open-modal",{detail:{id:"roles-modal"}}))}const W={userLists:[],listItems:Object.create(null),currentCollectionFilter:null};function gc(t){W.currentCollectionFilter=t}const oi=()=>_(()=>import("./ui_bulk-D2TqyS8R.js"),__vite__mapDeps([0,1,2,3])),to=()=>_(()=>import("./ui_edit_word-D42SJL6z.js"),__vite__mapDeps([4,1,2,3])),no=()=>_(()=>import("./ui_custom_words-DBisxjwX.js"),__vite__mapDeps([5,1,2,3]));function io(t){const e=o.wordHistory[t]||{attempts:0,correct:0};return e.attempts===0?0:Math.min(100,Math.round(e.correct/e.attempts*100))}function na(t,e){let n=null;const i=600,a=l=>{o.selectMode||l.target.closest("button, input, textarea")||(n=window.setTimeout(()=>{oi().then(r=>{o.selectMode||(r.toggleSelectMode(),t.dataset.lpHandled="true",r.toggleSelection(e),navigator.vibrate&&navigator.vibrate(50))})},i))},s=()=>{n&&(clearTimeout(n),n=null)};t.addEventListener("touchstart",a,{passive:!0}),t.addEventListener("touchend",s,{passive:!0}),t.addEventListener("touchmove",s,{passive:!0}),t.addEventListener("mousedown",a),t.addEventListener("mouseup",s),t.addEventListener("mouseleave",s)}function ao(t,e){const n=document.createElement("div");n.className="card",n.tabIndex=0,n.onkeydown=d=>{(d.key==="Enter"||d.key===" ")&&(d.preventDefault(),n.click())},n.dataset.wordId=String(t.id),o.selectMode&&(n.classList.add("select-mode"),o.selectedWords.has(t.id)&&n.classList.add("selected")),o.hanjaMode&&n.classList.add("hanja-mode"),t.type==="grammar"&&n.classList.add("grammar-card"),o.learned.has(t.id)&&n.classList.add("learned"),o.mistakes.has(t.id)&&n.classList.add("has-mistake"),t.created_by&&o.currentUser&&t.created_by===o.currentUser.id&&n.classList.add("custom-word");const a=document.createElement("div");a.className="card-inner";const s=document.createElement("div");s.className="select-checkbox",o.selectedWords.has(t.id)&&(s.innerHTML="✓"),n.appendChild(s);const l=so(t),r=oo(t);a.appendChild(l),a.appendChild(r),n.appendChild(a),na(n,t.id);let c=!1;return n.onclick=d=>{if(!n.dataset.lpHandled){if(o.selectMode){d.stopPropagation(),oi().then(u=>u.toggleSelection(t.id));return}if(!d.target.closest("button")&&(n.classList.toggle("revealed"),navigator.vibrate&&navigator.vibrate(10),n.classList.contains("revealed")&&!c)){const u=n.querySelector(".card-image");u&&u.dataset.src&&(u.src=u.dataset.src,c=!0)}}},n}function so(t,e){const n=document.createElement("div");n.className="card-front";const i=o.favorites.has(t.id),a=document.createElement("div");a.className="card-top-row";const s=document.createElement("button");s.className="icon-btn",s.innerHTML="🔊",s.setAttribute("data-action","speak-word"),s.setAttribute("data-value",String(t.id)),s.title="Озвучить",a.appendChild(s);const l=document.createElement("button");if(l.className="icon-btn",l.innerHTML="📁",l.setAttribute("data-action","add-to-list"),l.setAttribute("data-value",String(t.id)),l.title="Добавить в список",a.appendChild(l),W.currentCollectionFilter&&W.currentCollectionFilter!=="my-custom"&&W.currentCollectionFilter!=="uncategorized"){const O=document.createElement("button");O.className="icon-btn",O.innerHTML="➖",O.title="Убрать из этого списка",O.style.color="var(--danger)",O.setAttribute("data-action","remove-from-list"),O.setAttribute("data-value",String(t.id)),a.appendChild(O)}const r=document.createElement("button");r.className=`icon-btn fav-btn ${i?"active":""}`,r.innerHTML=i?"❤️":"🤍",r.title=i?"Убрать из избранного":"В избранное",r.setAttribute("data-action","toggle-favorite"),r.setAttribute("data-value",String(t.id)),a.appendChild(r),n.appendChild(a);const c=document.createElement("div");c.className="card-main";const d=document.createElement("div");d.className="front-section";const u=document.createElement("div");u.className="card-level-stars",u.textContent=t.level||"★☆☆",d.appendChild(u),c.appendChild(d);const m=document.createElement("div");m.className="front-section";let p="";o.learned.has(t.id)?p="✅":o.mistakes.has(t.id)&&(p="❌");const g=document.createElement("div");g.style.display="flex",g.style.alignItems="center",g.style.justifyContent="center",g.style.gap="10px";const f=document.createElement("div");if(f.className="word",f.textContent=t.word_kr||"",f.title="Нажмите, чтобы скопировать",f.style.cursor="copy",f.setAttribute("data-action","copy-word"),f.setAttribute("data-value",t.word_kr),g.appendChild(f),p){const O=document.createElement("div");O.textContent=p,O.style.fontSize="24px",g.appendChild(O)}if(m.appendChild(g),c.appendChild(m),t.word_hanja){const O=document.createElement("div");O.className="front-section";const ce=document.createElement("div");ce.className="hanja-container",[...t.word_hanja].forEach(ye=>{const Z=document.createElement("span");Z.className="hanja-char",Z.setAttribute("role","button"),Z.tabIndex=0,Z.textContent=ye,Z.setAttribute("data-action","open-hanja-modal"),Z.setAttribute("data-value",ye),Z.onkeydown=bi=>{(bi.key==="Enter"||bi.key===" ")&&Z.click()},ce.appendChild(Z)}),c.appendChild(ce)}if(t.grammar_info){const O=document.createElement("div");O.className="grammar-badge",O.textContent="📘 Грамматика",O.style.cursor="pointer",O.setAttribute("data-action","open-grammar-modal"),O.setAttribute("data-value",String(t.id)),c.appendChild(O)}const y=o.wordHistory[t.id]||{attempts:0};if(y.attempts>0){const O=io(t.id);let ce="В процессе",ye="neutral";y.attempts<3?ce="Новое":O>=90?(ce="Мастер",ye="success"):O>=70?(ce="Хорошо",ye="success"):O>=40?ce="Средне":(ce="Слабо",ye="failure");const Z=document.createElement("div");Z.className=`card-stat-pill ${ye}`,Z.innerHTML=`<span>🎯 ${O}%</span><span class="sep">|</span><span>${ce}</span>`,c.appendChild(Z)}const b=t.topic_ru||"Общее",x=t.topic_kr||"기타",E=t.category_ru||"Общее",k=t.category_kr||"기타",T=b===x?b:`${b} (${x})`,I=E===k?E:`${E} (${k})`,C=b==="Общее"&&x==="기타",R=E==="Общее"&&k==="기타",L=ln(b,"🏷"),q=ln(E,"🔹"),U=document.createElement("div");U.className="card-tags";let J="";return C||(J+=`<span class="tag-pill topic">${L} ${w(T)}</span>`),R||(J+=`<span class="tag-pill category">${q} ${w(I)}</span>`),U.innerHTML=J,t.created_by&&o.currentUser&&t.created_by===o.currentUser.id&&(U.innerHTML+='<span class="tag-pill" style="background: var(--primary); color: white;">🌟 Моё слово</span>'),t.isLocal&&(U.innerHTML+='<span class="tag-pill ai">⏳ AI</span>'),c.appendChild(U),n.appendChild(c),n}function oo(t){const e=document.createElement("div");e.className="card-back";const n=document.createElement("div");n.className="card-back-header",n.innerHTML=`<div class="back-translation">${w(t.translation||"")}</div>`,e.appendChild(n);const i=document.createElement("div");i.className="card-back-scroll";const a=document.createElement("div");a.style.marginBottom="16px";const s=document.createElement("button");s.className="btn-text",s.style.width="100%",s.style.background=t.image?"var(--surface-3)":"var(--surface-1)",s.style.border=t.image?"none":"1px dashed var(--border-color)",s.style.borderRadius="12px",s.style.padding="12px",s.innerHTML=t.image?"📷 Показать изображение":"🖼️ Добавить изображение";const l=document.createElement("div");l.className="back-image-container",l.style.display="none";const r=document.createElement("img");r.dataset.src=t.image,r.className="card-image",r.style.objectFit="cover",r.alt=t.word_kr,r.draggable=!1;const c=document.createElement("div");c.className="back-image-overlay",c.innerHTML="<span>👁️ Скрыть</span>",s.onclick=f=>{f.stopPropagation(),t.image?(s.style.display="none",l.style.display="block"):jn(t,s)},l.onclick=f=>{f.stopPropagation(),!(f.target.closest("button")||f.target.closest("input"))&&t.image&&(l.style.display="none",s.style.display="block")};const d=document.createElement("button");d.className="card-image-zoom-btn btn-icon",d.title="На весь экран",d.innerHTML="🔍",d.style.left="10px",d.style.position="absolute",d.style.top="10px",d.style.zIndex="20",d.onclick=f=>{f.stopPropagation(),So(r.src,t.word_kr)};const u=document.createElement("button");if(u.className="card-image-regenerate-btn btn-icon",u.title="Сгенерировать AI",u.innerHTML="🔄",u.onclick=f=>{f.stopPropagation();const y=f.currentTarget;jn(t,y)},l.appendChild(r),l.appendChild(c),l.appendChild(d),l.appendChild(u),t.image&&a.appendChild(l),a.insertBefore(s,a.firstChild),i.appendChild(a),t.example_kr&&t.example_kr.trim()){const f=document.createElement("div");f.className="back-section",f.style.borderLeft="3px solid var(--section-info-border)",f.style.backgroundColor="var(--section-info-bg)",f.style.padding="12px 12px 12px 16px",f.style.marginBottom="16px",f.style.borderRadius="8px";const y=w(t.example_kr),b=w(t.word_kr||""),x=b?y.replace(new RegExp(w(b),"gi"),'<span class="highlight">$&</span>'):y;f.innerHTML=`
        <div class="section-label" style="color: var(--section-info-border); font-weight: bold; margin-bottom: 4px;">💬 Пример</div>
        <div class="back-example-kr">${x}</div>
        <div class="back-example-ru">${w(t.example_ru||"")}</div>
    `,i.appendChild(f)}if(t.synonyms||t.antonyms){const f=document.createElement("div");f.className="back-section";let y='<div class="section-label">⛓️ Связи</div>';if(t.synonyms){const b=t.synonyms.split(",").map(x=>x.trim()).filter(Boolean).map(x=>`<span class="rel-chip syn">${w(x)}</span>`).join("");b&&(y+=`<div class="relation-row"><span class="rel-icon">↔️</span><div class="rel-chips">${b}</div></div>`)}if(t.antonyms){const b=t.antonyms.split(",").map(x=>x.trim()).filter(Boolean).map(x=>`<span class="rel-chip ant">${w(x)}</span>`).join("");b&&(y+=`<div class="relation-row"><span class="rel-icon">≠</span><div class="rel-chips">${b}</div></div>`)}f.innerHTML=y,i.appendChild(f)}if(t.my_notes&&t.my_notes.trim()){const f=document.createElement("div");f.className="back-section",f.innerHTML=`<div class="section-label">📝 Заметки</div><div class="info-item">${w(t.my_notes)}</div>`,i.appendChild(f)}e.appendChild(i);const m=document.createElement("div");if(m.className="card-back-actions",t.created_by){const f=document.createElement("button");f.className="action-btn",f.textContent="✏️ Изменить",f.onclick=y=>{y.stopPropagation(),to().then(b=>b.openEditWordModal(String(t.id)))},m.appendChild(f)}const p=o.learned.has(t.id),g=o.mistakes.has(t.id);if(p||g){const f=document.createElement("button");f.className="action-btn action-reset",f.textContent="Сброс",f.onclick=y=>{y.stopPropagation(),Eo(t.id)},m.appendChild(f)}else{const f=document.createElement("button");f.className="action-btn action-mistake",f.textContent="Забыл",f.onclick=b=>{b.stopPropagation(),xo(t.id)};const y=document.createElement("button");y.className="action-btn action-learned",y.textContent="Знаю",y.onclick=b=>{b.stopPropagation(),bo(t.id)},m.appendChild(f),m.appendChild(y)}if(t.isLocal){const f=document.createElement("button");f.className="action-btn",f.innerHTML="🗑️",f.onclick=y=>{y.stopPropagation(),le("Удалить заявку?",()=>{no().then(b=>b.deleteCustomWord(t.id))})},m.appendChild(f)}return e.appendChild(m),e}function ro(t,e){const n=document.createElement("div");n.className="list-item-wrapper",n.dataset.wordId=String(t.id),o.selectMode&&(n.classList.add("select-mode"),o.selectedWords.has(t.id)&&n.classList.add("selected"));const i=document.createElement("div");i.className="list-item";const a=o.favorites.has(t.id),s=document.createElement("div");s.className="select-checkbox",o.selectedWords.has(t.id)&&(s.innerHTML="✓"),i.appendChild(s);const l=document.createElement("div");l.className="list-col-main",l.innerHTML=`
    <div class="list-word-row">
        <div class="list-word">${w(t.word_kr)}</div>
    </div>
    <div class="list-trans">${w(t.translation||"")}</div>
  `,i.appendChild(l);const r=document.createElement("div");r.className="list-col-actions";const c=document.createElement("button");return c.className=`btn-icon list-action-btn ${a?"active":""}`,c.textContent=a?"❤️":"🤍",c.setAttribute("data-action","toggle-favorite"),c.setAttribute("data-value",String(t.id)),r.appendChild(c),i.appendChild(r),na(i,t.id),i.onclick=d=>{if(!i.dataset.lpHandled){if(o.selectMode){d.stopPropagation(),oi().then(u=>u.toggleSelection(t.id));return}d.target.closest("button")||n.classList.toggle("expanded")}},n.appendChild(i),n}let qe=null,Se=!1;const lo=300*1e3;function kn(){const t=document.getElementById("timer-display");if(!t)return;const e=Math.floor(o.sessionSeconds/60),n=o.sessionSeconds%60;t.innerText=`${String(e).padStart(2,"0")}:${String(n).padStart(2,"0")}`,t.style.color=Se?"var(--warning, #f39c12)":""}function ia(){o.sessionInterval&&clearInterval(o.sessionInterval),o.sessionInterval=window.setInterval(()=>{o.sessionSeconds++,kn()},1e3)}function aa(){o.sessionActive=!0,Se=!1,o.sessionSeconds=0,o.sessionWordsReviewed=0,kn();const t=document.getElementById("session-timer");t&&(t.style.display="block"),ia(),Ji(),ri()}function co(){!o.sessionActive||Se||(Se=!0,o.sessionInterval&&clearInterval(o.sessionInterval),o.sessionInterval=null,kn(),h("⏸️ Сессия на паузе (нет активности)"))}function sa(){!o.sessionActive||!Se||(Se=!1,ia(),kn(),h("▶️ Сессия возобновлена"),ri())}function uo(){if(!o.sessionActive)return;o.sessionInterval&&clearInterval(o.sessionInterval),o.sessionInterval=null,o.sessionActive=!1,Se=!1;const t=document.getElementById("session-timer");t&&(t.style.display="none"),qe&&clearTimeout(qe),qe=null;const e={date:new Date().toISOString(),duration:o.sessionSeconds,wordsReviewed:o.sessionWordsReviewed,accuracy:ea()||0};o.sessions.push(e),o.sessions.length>1e3&&(o.sessions=o.sessions.slice(-1e3)),Me(),D(),h(`✅ Сессия завершена! ${o.sessionSeconds}с`)}function oa(){o.sessionActive?uo():(aa(),h("⏱ Сессия запущена"))}function _n(){o.sessionActive?Se&&sa():(aa(),h("⏱ Сессия автоматически запущена"))}function ri(){if(qe&&clearTimeout(qe),qe=null,!!o.sessionActive){if(Se){sa();return}qe=window.setTimeout(()=>{qe=null,o.sessionActive&&!Se&&co()},lo)}}function mo(){["mousedown","keydown","touchstart","scroll"].forEach(e=>document.addEventListener(e,ri,{passive:!0}))}mo();const Bt=82;let Ge=480;const ra=340,Ai=10,Fn=16;let pn=!1,Cn=null,de=[],yt=null,Ln=null;function li(){D(),ai(),Sn(),ie()}function ci(){Ge=480,document.documentElement.style.setProperty("--card-height",`${Ge}px`)}function po(){const t=document.getElementById("vocabulary-grid"),e=sessionStorage.getItem("vocab_scroll_top");t&&e&&(t.scrollTop=Number(e))}function fo(){const t=document.getElementById("vocabulary-grid");if(!t)return;t.classList.remove("virtual-scroll-container","list-view"),t.classList.add("grid"),ci(),t.innerHTML="";const e=document.createDocumentFragment();for(let n=0;n<12;n++){const i=document.createElement("div");i.className="card skeleton",i.innerHTML=`
            <div class="card-inner">
                <div class="card-front">
                    <div class="card-main">
                        <div class="word skeleton-pulse"></div>
                        <div class="hanja skeleton-pulse"></div>
                        <div class="card-meta-central">
                            <div class="meta-level skeleton-pulse"></div>
                            <div class="meta-info skeleton-pulse"></div>
                        </div>
                    </div>
                </div>
            </div>
        `,e.appendChild(i)}t.appendChild(e)}function ie(){const t=document.getElementById("vocabulary-grid");if(!t)return;const e=t.scrollTop;go(),pn&&(t.removeEventListener("scroll",Dt),yt&&window.removeEventListener("resize",yt),pn=!1),t.classList.remove("virtual-scroll-container","list-view","grid"),t.innerHTML="",o.viewMode==="list"?(t.classList.add("list-view","virtual-scroll-container"),ho(t)):(ci(),t.classList.add("virtual-scroll-container"),vo(t)),e>0&&requestAnimationFrame(()=>{t.scrollTop=e})}function la(t){t.innerHTML=`
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-sub); animation: fadeIn 0.5s;">
                <div style="font-size: 64px; margin-bottom: 20px; opacity: 0.5;">🔍</div>
                <div style="font-size: 20px; font-weight: 800; margin-bottom: 10px;">Ничего не найдено</div>
                <div style="font-size: 14px; margin-bottom: 25px;">Попробуйте изменить запрос или фильтры</div>
                <button class="btn" onclick="resetSearchHandler()">Сбросить поиск</button>
            </div>
        `}function go(){const t=o.searchResults||o.dataStore||[];let e=null;W.currentCollectionFilter==="uncategorized"&&(e=new Set,Object.values(W.listItems).forEach(n=>{n.forEach(i=>e.add(i))})),de=t.filter(n=>{if(!n||o.currentStar!=="all"&&o.currentStar!=="favorites"&&o.currentStar!=="mistakes"&&n.level!==o.currentStar||o.currentStar==="favorites"&&!o.favorites.has(n.id)||o.currentStar==="mistakes"&&!o.mistakes.has(n.id)||n.type!==o.currentType)return!1;const i=n.topic_ru||n.topic_kr||"Общее",a=Array.isArray(o.currentTopic)?o.currentTopic:[o.currentTopic];if(!a.includes("all")&&!a.includes(i))return!1;const s=n.category_ru||n.category_kr||"Общее",l=Array.isArray(o.currentCategory)?o.currentCategory:[o.currentCategory];if(!l.includes("all")&&!l.includes(s))return!1;if(W.currentCollectionFilter){if(W.currentCollectionFilter==="uncategorized"){if(e?.has(n.id))return!1}else if(W.currentCollectionFilter==="my-custom"){if(!o.currentUser||n.created_by!==o.currentUser.id)return!1}else if(W.listItems[W.currentCollectionFilter]&&!W.listItems[W.currentCollectionFilter].has(n.id))return!1}return!0}),o.filteredData=de}function ca(){return de}function Dt(t){Cn||(Cn=window.requestAnimationFrame(()=>{const e=document.getElementById("vocabulary-grid");e&&(sessionStorage.setItem("vocab_scroll_top",String(e.scrollTop)),o.viewMode==="list"?ua({target:e,sourceData:de}):da({target:e,sourceData:de})),Cn=null;const n=document.getElementById("card-counter-indicator");if(e&&n&&de.length>0){const i=e.scrollTop,a=o.viewMode==="list"?Bt:Ge+Fn,s=e.clientWidth,l=Fn,r=o.viewMode==="list"?1:Math.max(1,Math.floor((s+l)/(ra+l))),c=Math.floor((i+a/2)/a),d=Math.min(de.length,Math.max(1,c*r+1));n.textContent=`${d} / ${de.length}`,n.classList.add("visible"),Ln&&clearTimeout(Ln),Ln=window.setTimeout(()=>{n.classList.remove("visible")},2e3)}}))}function vo(t){const e=de;if(e.length===0){la(t);return}t.style.position="relative";const n=document.createElement("div");n.id="virtual-grid-content",n.className="vocabulary-inner-grid",n.style.position="absolute",n.style.top="0",n.style.left="0",n.style.width="100%";const i=window.innerWidth<600;n.style.padding=i?"16px 16px 100px 16px":"24px 24px 100px 24px",n.style.boxSizing="border-box",t.appendChild(n);const a=document.createElement("div");a.className="virtual-sizer",t.appendChild(a),t.addEventListener("scroll",Dt),yt=()=>{ci(),Dt(new Event("resize"))},window.addEventListener("resize",yt),pn=!0,da({target:t,sourceData:e})}function da(t){const e=t.target;if(!e)return;const n=t.sourceData||ca(),i=document.getElementById("virtual-grid-content"),a=e.querySelector(".virtual-sizer");if(!i||!a)return;const s=window.innerWidth<600?32:48,l=e.clientWidth-s,r=Fn,c=Math.max(1,Math.floor((l+r)/(ra+r)));i.style.gridTemplateColumns=`repeat(${c}, 1fr)`;const d=Math.ceil(n.length/c),u=d>0?d*(Ge+r)-r:0;a.style.height=`${u+124}px`;const m=e.scrollTop,p=e.clientHeight,g=Math.max(0,Math.floor(m/(Ge+r))),f=Math.ceil(p/(Ge+r))+1,y=g*c,b=Math.min(n.length,(g+f)*c),x=g*(Ge+r);i.style.transform=`translateY(${x}px)`;const E=n.slice(y,b),k=[];E.forEach((T,I)=>{k.push(ao(T))}),i.replaceChildren(...k),ma(b,4),pa(b,2)}function ho(t){const e=de;if(e.length===0){la(t);return}t.style.position="relative";const n=document.createElement("div");n.id="virtual-list-content",n.style.position="absolute",n.style.top="0",n.style.left="0",n.style.width="100%",t.appendChild(n);const i=document.createElement("div");i.className="virtual-sizer",i.style.height=`${e.length*Bt}px`,t.appendChild(i),t.addEventListener("scroll",Dt),yt=()=>Dt(new Event("resize")),window.addEventListener("resize",yt),pn=!0,ua({target:t,sourceData:e})}function ua(t){const e=t.target;if(!e)return;const n=t.sourceData||ca(),i=document.getElementById("virtual-list-content");if(!i)return;const a=e.scrollTop,s=e.clientHeight,l=Math.max(0,Math.floor(a/Bt)-Ai),r=Math.ceil(s/Bt),c=Math.min(n.length,l+r+Ai*2),d=l*Bt;i.style.transform=`translateY(${d}px)`;const u=n.slice(l,c),m=[];u.forEach((p,g)=>{m.push(ro(p))}),i.replaceChildren(...m),ma(c,4),pa(c,2)}function ma(t,e=5){const n=de;for(let i=0;i<e;i++){const a=t+i;if(a<n.length){const s=n[a];if(s.image){const l=new Image;l.src=s.image}}}}function pa(t,e=3){const n=de;for(let i=0;i<e;i++){const a=t+i;if(a<n.length){const s=n[a];let l=s.audio_url;if(o.currentVoice==="male"&&s.audio_male&&(l=s.audio_male),l){const r=new Audio;r.src=l,r.preload="metadata"}}}}async function jn(t,e){e instanceof HTMLButtonElement&&(e.disabled=!0),e.classList.add("rotating");try{const n=S.functions.invoke("regenerate-image",{body:{mode:"search",id:t.id,word:t.word_kr,translation:t.translation}}),{data:i,error:a}=await pt(n,15e3,new Error("Время ожидания от сервера истекло"));if(a||!i||!i.images)throw new Error(a?.message||"Не удалось найти изображения");const s=document.getElementById("image-picker-grid"),l=document.getElementById("regenerate-again-btn");if(!s||!l)return;s.scrollTop=0,s.innerHTML="",i.images.length===0?s.innerHTML='<div style="text-align:center; color:var(--text-sub); padding: 20px;">Не найдено. Попробуйте еще раз.</div>':i.images.forEach(c=>{const d=document.createElement("div");d.className="image-preview-item",d.innerHTML=`
                    <img src="${c.url}" alt="Preview" loading="lazy">
                    <span class="source-badge">${c.source}</span>
                `,d.onclick=()=>{s.querySelectorAll(".image-preview-item").forEach(u=>{u.style.pointerEvents="none"}),d.classList.add("loading"),yo(t,c.url,c.source)},s.appendChild(d)});const r=l.cloneNode(!0);l.parentNode?.replaceChild(r,l),r.onclick=()=>{s.innerHTML='<div class="spinner-wrapper" style="height: 200px;"><div class="loader-circle"></div></div>',jn(t,e)},N("image-picker-modal")}catch(n){h(`❌ Ошибка: ${n.message}`)}finally{e instanceof HTMLButtonElement&&(e.disabled=!1),e.classList.remove("rotating")}}async function yo(t,e,n){try{const i=S.functions.invoke("regenerate-image",{body:{mode:"finalize",id:t.id,selectedUrl:e,source:n}}),{data:a,error:s}=await pt(i,2e4,new Error("Время ожидания сохранения истекло"));if(s||!a||!a.finalUrl)throw new Error(s?.message||"Не удалось сохранить изображение");const l=o.dataStore.find(c=>c.id===t.id);l&&(l.image=a.finalUrl,l.image_source=n);const r=document.querySelector(`.card[data-word-id="${t.id}"]`);if(r){const c=r.querySelector(".card-image");if(c){c.src=a.finalUrl,c.dataset.src=a.finalUrl;const d=r.querySelector(".back-image-container");d&&(d.style.display="block");const u=r.querySelector(".btn-text");u&&u.innerHTML.includes("Показать")&&(u.style.display="none")}}z("image-picker-modal"),h("✅ Изображение обновлено!")}catch(i){h(`❌ Ошибка сохранения: ${i.message}`);const a=document.getElementById("image-picker-grid");a&&a.querySelectorAll(".image-preview-item").forEach(s=>{s.style.pointerEvents="auto",s.classList.remove("loading")})}}function bo(t){_n(),o.learned.add(t),o.mistakes.delete(t),gt(t,!0),o.wordHistory[t]&&!o.wordHistory[t].learnedDate&&(o.wordHistory[t].learnedDate=Date.now()),o.dirtyWordIds.add(t),vt(10),Me(),li()}function xo(t){_n(),o.mistakes.add(t),o.learned.delete(t),gt(t,!1),o.dirtyWordIds.add(t),vt(-5),Me(),li()}function wo(t,e){o.favorites.has(t)?(o.favorites.delete(t),e&&(e.textContent="🤍",e.classList.remove("active"))):(o.favorites.add(t),e&&(e.textContent="❤️",e.classList.add("active")),h("Добавлено в избранное")),o.dirtyWordIds.add(t),Me(),D(),o.currentStar==="favorites"&&ie()}function Eo(t){o.learned.delete(t),o.mistakes.delete(t),delete o.wordHistory[t],o.dirtyWordIds.add(t),Me(),D(),li()}function fa(){const t=document.getElementById("searchInput");t&&(t.value="",t.focus(),t.dispatchEvent(new Event("input")))}function So(t,e){const n=document.createElement("div");n.className="fullscreen-image-overlay",n.style.cssText=`
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.9); z-index: 30000;
      display: flex; justify-content: center; align-items: center;
      cursor: zoom-out; opacity: 0; transition: opacity 0.3s;
  `;const i=document.createElement("img");i.src=t,i.alt=e,i.style.cssText=`
      max-width: 95%; max-height: 95%; 
      object-fit: contain; border-radius: 8px;
      box-shadow: 0 0 20px rgba(0,0,0,0.5);
      transform: scale(0.9); transition: transform 0.3s;
  `,n.appendChild(i),document.body.appendChild(n),requestAnimationFrame(()=>{n.style.opacity="1",i.style.transform="scale(1)"}),n.onclick=()=>{n.style.opacity="0",i.style.transform="scale(0.9)",setTimeout(()=>n.remove(),300)}}function ko(t,e=1280,n=.8){return new Promise((i,a)=>{const s=new FileReader;s.readAsDataURL(t),s.onload=l=>{const r=new Image;r.src=l.target?.result,r.onload=()=>{const c=document.createElement("canvas");let{width:d,height:u}=r;(d>e||u>e)&&(d>u?(u=Math.round(u*(e/d)),d=e):(d=Math.round(d*(e/u)),u=e)),c.width=d,c.height=u;const m=c.getContext("2d");if(!m)return a(new Error("Could not get canvas context"));m.drawImage(r,0,0,d,u),c.toBlob(p=>p?i(p):a(new Error("Canvas to Blob failed")),"image/jpeg",n)},r.onerror=c=>a(c)},s.onerror=l=>a(l)})}class _o extends te{constructor(){super("reading-modal")}async show(){if(!this.element.id||!document.body.contains(this.element)){const e=document.getElementById("reading-modal");e&&(this.element=e)}N("reading-modal"),await this.loadArticles()}render(){}async loadArticles(){const e=document.getElementById("reading-list"),n=document.getElementById("reading-view");if(!e||!n)return;e.style.display="grid",n.style.display="none",e.innerHTML='<div style="grid-column:1/-1; text-align:center; padding:40px;"><div class="spinner-tiny"></div> Загрузка статей...</div>';const{data:i,error:a}=await S.from(A.ARTICLES).select("*").order("created_at",{ascending:!1});if(a){console.error("Error loading articles:",a),e.innerHTML=`<div style="text-align:center; color:var(--danger);">Ошибка загрузки: ${w(a.message)}</div>`;return}if(!i||i.length===0){e.innerHTML='<div style="text-align:center; color:var(--text-sub);">Нет доступных статей.</div>';return}this.renderArticleList(i)}renderArticleList(e){const n=document.getElementById("reading-list");n&&(n.innerHTML=e.map(i=>{const a=i.image_url||"https://via.placeholder.com/300x150?text=TOPIK+Reading";return`
        <div class="article-card" data-id="${w(i.id)}" role="button" tabindex="0" aria-label="Открыть статью: ${w(i.title)}">
          <img src="${w(a)}" class="article-card-img" alt="Cover" loading="lazy" onerror="this.onerror=null; this.src='https://via.placeholder.com/300x150?text=TOPIK+Reading';">
          <div class="article-card-body">
            <div class="article-card-title">${w(i.title)}</div>
            <div class="article-card-meta">
              <span class="article-level-badge">${w(i.level)}</span>
              <span>${w(i.topic)}</span>
            </div>
          </div>
        </div>
      `}).join(""),n.querySelectorAll(".article-card").forEach(i=>{const a=()=>{const s=i.dataset.id,l=e.find(r=>r.id===s);l&&this.openArticle(l)};i.addEventListener("click",a),i.addEventListener("keydown",s=>{(s.key==="Enter"||s.key===" ")&&a()})}))}openArticle(e){const n=document.getElementById("reading-list"),i=document.getElementById("reading-view"),a=document.getElementById("article-container"),s=document.getElementById("back-to-articles");if(!n||!i||!a||!s)return;n.style.display="none",i.style.display="block";const l=i.closest(".modal-body");l&&(l.scrollTop=0);const r=e.image_url?`<img src="${w(e.image_url)}" style="width:100%; max-height:300px; object-fit:cover; border-radius:12px; margin-bottom:20px;">`:"",c=e.translation?`<div id="article-trans-content" class="article-translation-box" style="display:none;">
           <strong>Перевод:</strong><br>${w(e.translation).replace(/\n/g,"<br>")}
         </div>
         <button class="btn btn-quiz" id="toggle-trans-btn" style="width:100%; margin-top:20px;">Показать перевод</button>`:"";a.innerHTML=`
      <div class="article-content-wrapper">
        ${r}
        <div class="article-header">
          <div class="article-title-large">${w(e.title)}</div>
          <div style="display:flex; gap:10px; font-size:13px; color:var(--text-sub);">
              <span class="article-level-badge">${w(e.level)}</span>
              <span>${w(e.topic)}</span>
              <span>${new Date(e.created_at).toLocaleDateString()}</span>
          </div>
        </div>
        <div class="article-text">${w(e.content).replace(/\n/g,"<br>")}</div>
        ${c}
      </div>
    `;const d=document.getElementById("toggle-trans-btn");d&&(d.onclick=()=>{const u=document.getElementById("article-trans-content");if(u){const m=u.style.display==="none";u.style.display=m?"block":"none",d.textContent=m?"Скрыть перевод":"Показать перевод"}}),s.onclick=()=>{i.style.display="none",n.style.display="grid"}}}new _o;const To={q:"ㅂ",w:"ㅈ",e:"ㄷ",r:"ㄱ",t:"ㅅ",y:"ㅛ",u:"ㅕ",i:"ㅑ",o:"ㅐ",p:"ㅔ",a:"ㅁ",s:"ㄴ",d:"ㅇ",f:"ㄹ",g:"ㅎ",h:"ㅗ",j:"ㅓ",k:"ㅏ",l:"ㅣ",z:"ㅋ",x:"ㅌ",c:"ㅊ",v:"ㅍ",b:"ㅠ",n:"ㅜ",m:"ㅡ",Q:"ㅃ",W:"ㅉ",E:"ㄸ",R:"ㄲ",T:"ㅆ",O:"ㅒ",P:"ㅖ"},se="ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ",xe="ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ",ze=" ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ",Mi={ㅗㅏ:"ㅘ",ㅗㅐ:"ㅙ",ㅗㅣ:"ㅚ",ㅜㅓ:"ㅝ",ㅜㅔ:"ㅞ",ㅜㅣ:"ㅟ",ㅡㅣ:"ㅢ",ㅘㅣ:"ㅙ",ㅝㅣ:"ㅞ",ㅑㅣ:"ㅒ",ㅕㅣ:"ㅖ"},Wn={ㄱㅅ:"ㄳ",ㄴㅈ:"ㄵ",ㄴㅎ:"ㄶ",ㄹㄱ:"ㄺ",ㄹㅁ:"ㄻ",ㄹㅂ:"ㄼ",ㄹㅅ:"ㄽ",ㄹㅌ:"ㄾ",ㄹㅍ:"ㄿ",ㄹㅎ:"ㅀ",ㅂㅅ:"ㅄ"},di=Object.create(null);for(const t in Wn)di[Wn[t]]=t.split("");function ga(t){const e=t.charCodeAt(0);return e>=44032&&e<=55203}function Io(t){const e=[];let n=0,i=-1,a=-1,s=0;const l=()=>String.fromCharCode(44032+i*21*28+a*28+s),r=t.split("");for(let c=0;c<r.length;c++){const d=r[c],u=To[d]||(se.includes(d)||xe.includes(d)||ze.includes(d)?d:null);if(!u){n===2||n===3||n===4?e.push(l()):n===1&&e.push(se[i]),e.push(d),n=0,i=-1,a=-1,s=0;continue}const m=se.indexOf(u)!==-1,p=xe.indexOf(u)!==-1,g=ze.indexOf(u);if(n===0){if(m)i=se.indexOf(u),n=1;else if(p){const f=e.length>0?e[e.length-1]:"",y=Mi[f+u];y?(e.pop(),e.push(y)):e.push(u)}}else if(n===1)p?(a=xe.indexOf(u),n=2):m&&(e.push(se[i]),i=se.indexOf(u));else if(n===2)if(p){const f=Mi[xe[a]+u];f?a=xe.indexOf(f):(e.push(l()),i=-1,a=xe.indexOf(u),n=0,e.push(u))}else g>0?(s=g,n=3):m&&(e.push(l()),i=se.indexOf(u),a=-1,s=0,n=1);else if(n===3)if(p){const f=ze[s],y=String.fromCharCode(44032+i*21*28+a*28+0);e.push(y),i=se.indexOf(f),a=xe.indexOf(u),s=0,n=2}else if(g>0){const f=Wn[ze[s]+u];f?(s=ze.indexOf(f),n=4):(e.push(l()),i=se.indexOf(u),a=-1,s=0,n=1)}else m&&(e.push(l()),i=se.indexOf(u),a=-1,s=0,n=1);else if(n===4)if(p){const f=ze[s],y=di[f];if(y){const[b,x]=y,E=ze.indexOf(b);e.push(String.fromCharCode(44032+i*21*28+a*28+E)),i=se.indexOf(x),a=xe.indexOf(u),s=0,n=2}else e.push(l()),i=-1,a=xe.indexOf(u),s=0,n=0,e.push(u)}else e.push(l()),m?(i=se.indexOf(u),a=-1,s=0,n=1):(i=-1,a=-1,s=0,n=0,e.push(u))}return n===2||n===3||n===4?e.push(l()):n===1&&e.push(se[i]),e.join("")}function Co(t){if(!ga(t))return[t];const e=t.charCodeAt(0)-44032,n=e%28,i=(e-n)/28%21,a=Math.floor((e-n)/28/21),s=[se[a],xe[i]];if(n>0){const l=ze[n],r=di[l];r?s.push(...r):s.push(l)}return s}function Gn(t,e,n){if(t.querySelector(".virtual-keyboard"))return null;const i=document.createElement("div");i.className="virtual-keyboard",i.style.cssText=`
        margin-top: 10px; 
        padding: 8px; 
        background: var(--surface-2); 
        border-radius: 12px;
        display: none; 
        grid-template-rows: auto auto auto auto auto;
        gap: 6px;
        user-select: none;
        width: 100%;
        box-shadow: var(--shadow-md);
        z-index: 100;
        padding-bottom: 20px; /* Safe area for bottom */
        transition: background-color 0.3s ease, box-shadow 0.3s ease;
    `;let a=!1,s=!1;const l=["1","2","3","4","5","6","7","8","9","0"],r=["!","@","#","$","%","^","&","*","(",")"],c=["ㅂ","ㅈ","ㄷ","ㄱ","ㅅ","ㅛ","ㅕ","ㅑ","ㅐ","ㅔ"],d=["ㅃ","ㅉ","ㄸ","ㄲ","ㅆ","ㅛ","ㅕ","ㅑ","ㅒ","ㅖ"],u=["ㅁ","ㄴ","ㅇ","ㄹ","ㅎ","ㅗ","ㅓ","ㅏ","ㅣ"],m=["⇧","ㅋ","ㅌ","ㅊ","ㅍ","ㅠ","ㅜ","ㅡ","⌫"],p=["?123",",",".","SPACE","↵"],g=["+","×","÷","=","/","_","<",">","[","]"],f=["!","@","#","$","%","^","&","*","(",")"],y=["-","'",'"',":",";","~","\\","|","⌫"],b=["ABC","{","}","SPACE","↵"],x=I=>{const C=document.createElement("button");return C.textContent=I==="SPACE"?"Пробел":I,C.className="btn-kb",C.style.cssText=`
            flex: 1;
            height: 42px; 
            background: var(--surface-1); 
            border: 1px solid var(--border-color); 
            border-radius: 6px; 
            font-weight: bold;
            font-size: 16px;
            cursor: pointer;
            color: var(--text-main);
            display: flex; align-items: center; justify-content: center;
            touch-action: manipulation;
            min-width: 28px;
            transition: background-color 0.1s, color 0.1s;
        `,(I==="⇧"||I==="⌫")&&(C.style.background="var(--surface-3)",C.style.flex="1.5"),I==="SPACE"&&(C.style.flex="4"),I==="↵"&&(C.style.background="var(--primary)",C.style.color="var(--text-inverse)",C.style.flex="1.5"),(I==="?123"||I==="ABC")&&(C.style.flex="1.5"),I==="⇧"&&a&&(C.style.background="var(--primary)",C.style.color="var(--text-inverse)"),C.onclick=R=>{if(R.preventDefault(),R.stopPropagation(),I==="⇧"){a=!a,k();return}if(I==="?123"){s=!0,a=!1,k();return}if(I==="ABC"){s=!1,k();return}const L=e.selectionStart||e.value.length,q=e.selectionEnd||e.value.length;if(I==="⌫")L!==q?(e.value=e.value.substring(0,L)+e.value.substring(q),e.setSelectionRange(L,L)):L>0&&(e.value=e.value.substring(0,L-1)+e.value.substring(L),e.setSelectionRange(L-1,L-1));else{let U=I;if(I==="SPACE"?U=" ":I==="↵"&&(U=`
`),I==="↵"){e.value=e.value.substring(0,L)+`
`+e.value.substring(q),e.setSelectionRange(L+1,L+1),e.dispatchEvent(new Event("input")),e.focus();return}const J=e.value.substring(L-1,L),X=ga(J)||/[ㄱ-ㅎㅏ-ㅣ]/.test(J),O=/[ㄱ-ㅎㅏ-ㅣ]/.test(U);if(L>0&&X&&O){const ce=Co(J);ce.push(U);const ye=Io(ce.join(""));e.value=e.value.substring(0,L-1)+ye+e.value.substring(q);const Z=L-1+ye.length;e.setSelectionRange(Z,Z)}else e.value=e.value.substring(0,L)+U+e.value.substring(q),e.setSelectionRange(L+1,L+1);a&&(a=!1,k())}e.dispatchEvent(new Event("input")),e.focus()},C},E=I=>{const C=document.createElement("div");C.style.cssText="display: flex; gap: 4px; justify-content: center; width: 100%;",I.forEach(R=>C.appendChild(x(R))),i.appendChild(C)},k=()=>{i.innerHTML="",E(a?r:l),s?(E(g),E(f),E(y),E(b)):(E(a?d:c),E(u),E(m),E(p))};k(),t.appendChild(i);const T=I=>{if(!document.body.contains(i)){document.removeEventListener("mousedown",T);return}if(i.style.display==="none")return;const C=I.target;!i.contains(C)&&C!==e&&!n.contains(C)&&(i.style.display="none")};return document.addEventListener("mousedown",T),i}let me="51",st="all",ge=null,tn=null,ct=0,fn=!1,Qt=null,Ct=localStorage.getItem("writing_font_size_v1")||"md";const nn=["sm","md","lg","xl"],va={51:{min:5,max:100},52:{min:5,max:100},53:{min:200,max:300},54:{min:600,max:700}},Lo={51:300,52:300,53:900,54:1800};class Ao extends te{constructor(){super("writing-modal")}init(){if(!this.element.id||!document.body.contains(this.element)){const e=document.getElementById("writing-modal");e&&(this.element=e)}super.init(),this.setupInternalListeners()}destroy(){super.destroy(),bt()}setupInternalListeners(){const e=this.element;Qt&&Qt.disconnect(),Qt=new MutationObserver(l=>{for(const r of l)r.attributeName==="class"&&(e.classList.contains("active")||bt())}),Qt.observe(e,{attributes:!0,attributeFilter:["class"]});const n=document.getElementById("writing-history-filters");if(n){const l=n.querySelectorAll(".history-filter-btn");l.forEach(r=>{r.addEventListener("click",()=>{l.forEach(c=>c.classList.remove("active")),r.classList.add("active"),st=r.dataset.filter||"all",Ot()})})}const i=document.getElementById("writing-expand-btn"),a=document.getElementById("writing-focus-btn");i&&(i.onclick=()=>ya()),a&&(a.onclick=()=>ba());const s=document.getElementById("writing-font-size-btn");s&&(s.onclick=qo),this.setupImageUpload(),this.setupTimer(),this.setupInputs(),this.setupHistory(),Oo(),xa()}setupImageUpload(){const e=document.getElementById("writing-img-btn"),n=document.getElementById("writing-file-input"),i=document.getElementById("writing-img-preview"),a=document.getElementById("writing-question-img"),s=document.getElementById("remove-writing-img");e&&n&&(e.onclick=()=>n.click(),n.onchange=async r=>{const c=r.target.files?.[0];if(c){try{const d=await ko(c,800,.7);if(ge={data:await Do(d),mimeType:"image/jpeg"},a&&i&&(a.src=URL.createObjectURL(d),i.style.display="block"),h("📷 Изображение добавлено!"),["51","52","54"].includes(me)&&ge){const m=document.getElementById("writing-question");m&&!m.value.trim()&&(h("🔍 Распознавание текста..."),S.functions.invoke("ocr-image",{body:{image:ge}}).then(({data:p})=>{if(p&&p.text){const g=document.getElementById("ocr-edit-textarea");g&&(g.value=p.text.trim(),N("ocr-edit-modal"))}}).catch(p=>console.error("OCR Error:",p)))}}catch(d){console.error("Image process error",d),h("Ошибка обработки изображения")}n.value=""}}),s&&(s.onclick=()=>{ge=null,i&&(i.style.display="none"),a&&(a.src="")});const l=document.getElementById("ocr-confirm-btn");l&&(l.onclick=()=>{const r=document.getElementById("ocr-edit-textarea"),c=document.getElementById("writing-question");r&&c&&(c.value=r.value.trim(),Yt(),z("ocr-edit-modal"),h("✅ Текст вставлен"))})}setupTimer(){const e=document.getElementById("writing-timer-toggle");e&&(e.onclick=Ro),Qn()}setupInputs(){const e=document.getElementById("writing-answer"),n=document.getElementById("char-count");if(e){const l=e.parentElement;if(l&&(l.style.position="relative",!l.querySelector(".kb-toggle-btn"))){const c=document.createElement("button");c.innerHTML="⌨️",c.className="btn-icon kb-toggle-btn",c.style.cssText="position: absolute; right: 10px; bottom: 10px; z-index: 5; width: 32px; height: 32px; font-size: 16px; background: var(--surface-1); border: 1px solid var(--border-color); opacity: 0.8;",c.title="Корейская клавиатура",l.appendChild(c);const d=document.createElement("div");l.appendChild(d);const u=Gn(d,e,c);u&&(c.onclick=()=>{const m=u.style.display==="grid";u.style.display=m?"none":"grid",m||setTimeout(()=>u.scrollIntoView({behavior:"smooth",block:"nearest"}),100)})}e.addEventListener("input",()=>{const c=e.value.length,d=va[me];n&&(n.style.color="var(--text-sub)",n.style.fontWeight="normal",e.style.borderColor="",e.style.boxShadow="",d&&d.max>0?(n.textContent=`${c} / ${d.max} знаков`,c<d.min?n.style.color="var(--warning)":c>d.max?(n.style.color="var(--danger)",n.style.fontWeight="bold",e.style.borderColor="var(--danger)",e.style.boxShadow="0 0 0 4px rgba(225, 29, 72, 0.1)"):n.style.color="var(--success)"):n.textContent=`${c} знаков`),Yt()});const r=bn(()=>Yt(),500);e.addEventListener("click",r),e.addEventListener("keyup",r)}const i=document.getElementById("writing-question");i&&i.addEventListener("input",Yt);const a=document.getElementById("writing-task-selector");if(a){const l=a.querySelectorAll(".segment-btn");l.forEach(r=>{r.addEventListener("click",()=>{l.forEach(c=>c.classList.remove("active")),r.classList.add("active"),me=r.dataset.task||"51",Qn(),e&&e.dispatchEvent(new Event("input"))})})}const s=document.getElementById("check-writing-btn");s&&(s.onclick=Po)}setupHistory(){const e=document.getElementById("writing-history-btn");e&&(e.onclick=Ot);const n=document.getElementById("back-to-editor-btn");n&&(n.onclick=wa);const i=document.getElementById("clear-writing-history-btn");i&&(i.onclick=Uo)}render(){}}const Mo=new Ao;function Bo(){const t=document.getElementById("writing-modal");if(!t)return;Mo.init();const e=()=>{window.matchMedia("(max-height: 500px) and (orientation: landscape)").matches&&(ba(!0),ya(!0))},n=bn(e,300);window.addEventListener("resize",n),e();const i=t.querySelector(".close-modal-btn");i&&i.addEventListener("click",a=>{const s=document.getElementById("writing-question")?.value.trim(),l=document.getElementById("writing-answer")?.value.trim();(s||l)&&(a.preventDefault(),a.stopPropagation(),le("Черновик сохранен. Закрыть окно?",()=>{bt(),z("writing-modal")},{confirmText:"Закрыть",cancelText:"Отмена"}))})}function ha(){const t=document.getElementById("writing-timer-display");if(!t)return;const e=Math.floor(ct/60),n=ct%60;t.textContent=`${String(e).padStart(2,"0")}:${String(n).padStart(2,"0")}`,ct<60?t.style.color="var(--danger)":t.style.color="var(--text-main)"}function zo(){if(fn)return;fn=!0;const t=document.getElementById("writing-timer-toggle");t&&(t.textContent="⏸️"),tn=window.setInterval(()=>{ct>0?(ct--,ha()):(bt(),h("⏰ Время вышло!"),F("failure"))},1e3)}function bt(){tn&&clearInterval(tn),tn=null,fn=!1;const t=document.getElementById("writing-timer-toggle");t&&(t.textContent="▶️")}function Ro(){fn?bt():zo()}function Qn(){bt(),ct=Lo[me]||300,ha()}function ya(t){const e=document.getElementById("writing-modal"),n=document.getElementById("writing-expand-btn");if(e){const i=t!==void 0?t:!e.classList.contains("maximized");i?e.classList.add("maximized"):e.classList.remove("maximized"),n&&(n.textContent=i?"⤓":"⤢",n.title=i?"Свернуть":"На весь экран")}}function ba(t){const e=document.getElementById("writing-modal");e&&((t!==void 0?t:!e.classList.contains("focus-mode"))?e.classList.add("focus-mode"):e.classList.remove("focus-mode"))}function qo(){const e=(nn.indexOf(Ct)+1)%nn.length;Ct=nn[e],localStorage.setItem("writing_font_size_v1",Ct),xa(),h(`Шрифт: ${Ct.toUpperCase()}`)}function xa(){const t=document.getElementById("writing-modal");t&&(nn.forEach(e=>t.classList.remove(`font-size-${e}`)),t.classList.add(`font-size-${Ct}`))}function Do(t){return new Promise((e,n)=>{const i=new FileReader;i.onloadend=()=>{const a=i.result.split(",")[1];e(a)},i.onerror=n,i.readAsDataURL(t)})}function Yt(){const t=document.getElementById("writing-question")?.value||"",e=document.getElementById("writing-answer"),n=e?.value||"",i=e?.selectionStart||0,a={taskType:me,question:t,answer:n,cursor:i,timestamp:Date.now()};localStorage.setItem(v.WRITING_DRAFT,JSON.stringify(a))}function Oo(){try{const t=localStorage.getItem(v.WRITING_DRAFT);if(!t)return;const e=JSON.parse(t);e.taskType&&(me=e.taskType,document.querySelectorAll("#writing-task-selector .segment-btn").forEach(s=>{s.dataset.task===me?s.classList.add("active"):s.classList.remove("active")}),Qn());const n=document.getElementById("writing-question");n&&(n.value=e.question||"");const i=document.getElementById("writing-answer");i&&(i.value=e.answer||"",i.dispatchEvent(new Event("input")),typeof e.cursor=="number"&&i.setSelectionRange(e.cursor,e.cursor))}catch(t){console.error("Failed to restore draft",t)}}function $o(t){try{const e=localStorage.getItem(v.WRITING_HISTORY),n=e?JSON.parse(e):[];n.unshift(t),n.length>20&&n.pop(),localStorage.setItem(v.WRITING_HISTORY,JSON.stringify(n))}catch(e){console.error("Failed to save history",e)}}function Ho(t){const e=localStorage.getItem(v.WRITING_HISTORY),n=e?JSON.parse(e):[],i=n.find(a=>a.id===t);i&&(i.isFavorite=!i.isFavorite,localStorage.setItem(v.WRITING_HISTORY,JSON.stringify(n)),Ot())}function No(t){le("Удалить эту запись?",()=>{const e=localStorage.getItem(v.WRITING_HISTORY);let n=e?JSON.parse(e):[];n=n.filter(i=>i.id!==t),localStorage.setItem(v.WRITING_HISTORY,JSON.stringify(n)),Ot(),h("Запись удалена")})}function Ot(){const t=document.getElementById("writing-editor-view"),e=document.getElementById("writing-history-view"),n=document.getElementById("writing-history-list"),i=document.getElementById("clear-writing-history-btn");if(t&&(t.style.display="none"),e&&(e.style.display="flex"),!n)return;n.innerHTML="";const a=localStorage.getItem(v.WRITING_HISTORY),s=a?JSON.parse(a):[];if(s.length===0){n.innerHTML='<div style="text-align:center; color:var(--text-sub); padding:20px;">История пуста</div>',i&&(i.style.display="none");return}i&&(i.style.display="block");let l=s;if(st==="favorites"?l=s.filter(r=>r.isFavorite):st!=="all"&&(l=s.filter(r=>r.taskType===st)),l.length===0){const r=st==="favorites"?"Нет избранных эссе":`Нет записей для задания ${st}`;n.innerHTML=`<div style="text-align:center; color:var(--text-sub); padding:20px;">${r}</div>`;return}l.forEach(r=>{const c=document.createElement("div");c.className="history-card";const d=new Date(r.timestamp).toLocaleDateString()+" "+new Date(r.timestamp).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),u=r.image?"📷 ":"",m=r.isFavorite,p=m?"var(--gold)":"var(--text-tertiary)";c.innerHTML=`
      <div class="history-card-header">
        <span>${u}Задание ${r.taskType} • <span style="opacity:0.7; font-size: 0.9em;">${d}</span></span>
        <div style="display:flex; align-items:center; gap:8px;">
            <button class="fav-history-item" style="background:none; border:none; color:${p}; cursor:pointer; font-size:18px; padding:0; line-height:1;" title="${m?"Убрать из избранного":"В избранное"}">${m?"★":"☆"}</button>
            <span class="history-card-score">${r.result.score}/10</span>
            <button class="delete-history-item" style="background:none; border:none; color:var(--text-tertiary); cursor:pointer; font-size:16px; padding:0;">✕</button>
        </div>
      </div>
      <div class="history-card-preview" style="color: var(--text-sub);">${w(r.question||(r.image?"Изображение":"Без вопроса"))}</div>
      <div class="history-card-preview" style="margin-top:4px; font-weight:500;">${w(r.answer)}</div>
    `;const g=c.querySelector(".fav-history-item");g&&(g.onclick=y=>{y.stopPropagation(),Ho(r.id)});const f=c.querySelector(".delete-history-item");f&&(f.onclick=y=>{y.stopPropagation(),No(r.id)}),c.onclick=y=>{if(y.target.closest("button"))return;wa(),Ea(r.result,r.question,r.answer);const b=document.getElementById("writing-question"),x=document.getElementById("writing-answer");b&&(b.value=r.question),x&&(x.value=r.answer,x.dispatchEvent(new Event("input"))),ge=r.image||null;const E=document.getElementById("writing-img-preview"),k=document.getElementById("writing-question-img");ge&&k&&E?(k.src=`data:${ge.mimeType};base64,${ge.data}`,E.style.display="block"):E&&(E.style.display="none"),me=r.taskType,document.querySelectorAll("#writing-task-selector .segment-btn").forEach(I=>{I.dataset.task===me?I.classList.add("active"):I.classList.remove("active")})},n.appendChild(c)})}function wa(){const t=document.getElementById("writing-editor-view"),e=document.getElementById("writing-history-view");t&&(t.style.display="flex"),e&&(e.style.display="none")}function Uo(){le("Очистить историю проверок?",()=>{localStorage.removeItem(v.WRITING_HISTORY),Ot()})}function Ea(t,e,n){const i=document.getElementById("writing-result"),a=document.getElementById("writing-feedback-content"),s=document.getElementById("writing-score");if(!i||!a||!s)return;s.textContent=`${t.score} / 10`,t.score>=8?s.style.color="var(--success)":t.score>=5?s.style.color="var(--warning)":s.style.color="var(--danger)";let l=`<div style="margin-bottom: 20px; font-size: 15px; line-height: 1.6;">${w(t.feedback)}</div>`;t.corrections&&t.corrections.length>0&&(l+='<h4 style="margin-bottom: 10px;">Исправления</h4>',t.corrections.forEach(c=>{l+=`
          <div class="writing-correction-item">
            <div style="margin-bottom: 4px;">
              <span class="writing-correction-original">${w(c.original)}</span> 
              ➜ 
              <span class="writing-correction-fixed">${w(c.corrected)}</span>
            </div>
            <span class="writing-correction-reason">${w(c.reason)}</span>
          </div>`})),t.improved_version&&(l+=`
        <div class="writing-improved-box">
          <div style="font-weight: 700; margin-bottom: 8px; color: var(--success);">Улучшенная версия:</div>
          ${w(t.improved_version)}
        </div>`),l+=`
    <button id="writing-share-btn" class="btn btn-quiz" style="width:100%; margin-top:20px; display:flex; align-items:center; justify-content:center; gap:8px;">
      📤 Поделиться / Копировать
    </button>
  `,a.innerHTML=l,i.style.display="block",i.scrollIntoView({behavior:"smooth"});const r=document.getElementById("writing-share-btn");r&&(r.onclick=()=>{const c=`🇰🇷 TOPIK Master - Writing Check

❓ **Задание:**
${e||"(Без текста)"}

✍️ **Мой ответ:**
${n}

📊 **Оценка:** ${t.score}/10

💡 **Комментарий AI:**
${t.feedback}

${t.corrections.length>0?`🛠 **Исправления:**
`+t.corrections.map(d=>`• ${d.original} ➡ ${d.corrected}
  (${d.reason})`).join(`
`)+`

`:""}${t.improved_version?`✨ **Улучшенная версия:**
`+t.improved_version:""}`;navigator.clipboard.writeText(c).then(()=>{h("📋 Результат скопирован!")}).catch(()=>{h("❌ Ошибка копирования")})})}async function Po(){const t=document.getElementById("writing-question"),e=document.getElementById("writing-answer"),n=document.getElementById("writing-result"),i=document.getElementById("check-writing-btn"),a=document.getElementById("writing-feedback-content"),s=document.getElementById("writing-score");if(!t||!e||!n||!i||!a||!s)return;const l=t.value.trim(),r=e.value.trim();if(!l&&!ge||!r){h("⚠️ Заполните тему (или фото) и ваш ответ.");return}const c=va[me];if(c&&r.length<c.min){h(`⚠️ Ответ слишком короткий (минимум ${c.min} символов).`);return}i.disabled=!0,i.innerHTML='<span class="spinner-tiny"></span> Проверка...',n.style.display="none";try{const{data:d,error:u}=await S.functions.invoke("check-essay",{body:{taskType:me,question:l,answer:r,image:ge}});if(u)throw u;if(d&&!d.success&&d.error)throw new Error(d.error);if(!d)throw new Error("No data received from server");if(typeof d.score!="number"||typeof d.feedback!="string"||!Array.isArray(d.corrections))throw new Error("Некорректный ответ сервера проверки");const m={score:d.score,feedback:d.feedback,corrections:d.corrections,improved_version:d.improved_version};$o({id:Date.now().toString(),timestamp:Date.now(),taskType:me,question:l,answer:r,image:ge||void 0,result:m}),Ea(m,l,r)}catch(d){console.error("Essay check failed:",d),h("❌ Ошибка проверки: "+(d.message||"Unknown error"))}finally{i.disabled=!1,i.textContent="✨ Проверить с AI"}}class Vo extends te{currentWord=null;isPlaying=!1;audioSpeed=1;animationId=null;currentAudio=null;observer=null;constructor(){super("listening-modal")}init(){if(!this.element.id||!document.body.contains(this.element)){const e=document.getElementById("listening-modal");e&&(this.element=e)}super.init(),this.setupControls()}show(){N("listening-modal"),this.setupObserver(),this.loadNextRound()}destroy(){super.destroy(),this.stopPlayback(),this.observer&&(this.observer.disconnect(),this.observer=null)}render(){}setupObserver(){this.observer&&this.observer.disconnect(),this.observer=new MutationObserver(e=>{for(const n of e)n.type==="attributes"&&n.attributeName==="class"&&(this.element.classList.contains("active")||this.stopPlayback())}),this.observer.observe(this.element,{attributes:!0,attributeFilter:["class"]})}setupControls(){const e=this.element.querySelector("#listening-play-btn"),n=this.element.querySelectorAll("#listening-speed-control .btn-text");e&&this.addEvent(e,"click",()=>{this.currentWord&&this.playAudio()}),n.forEach(i=>{this.addEvent(i,"click",()=>{n.forEach(a=>a.classList.remove("active")),i.classList.add("active"),this.audioSpeed=parseFloat(i.dataset.speed||"1.0")})})}loadNextRound(){if(!this.element.classList.contains("active"))return;const e=a=>{if(a.type!==o.currentType)return!1;const s=a.topic_ru||a.topic_kr,l=o.quizTopic==="all"||s===o.quizTopic,r=a.category_ru||a.category_kr,c=o.quizCategory==="all"||r===o.quizCategory,d=o.quizDifficulty==="all"||a.level===o.quizDifficulty;return l&&c&&d},n=o.dataStore.filter(a=>(a.audio_url||a.audio_male)&&e(a));if(n.length<4){const a=document.getElementById("listening-options"),s=document.getElementById("listening-status");s&&(s.textContent="Недостаточно слов в фильтре (нужно 4+)",s.style.color="var(--danger)"),a&&(a.innerHTML="");return}this.currentWord=n[Math.floor(Math.random()*n.length)];const i=[this.currentWord];for(;i.length<4;){const a=n[Math.floor(Math.random()*n.length)];i.find(s=>s.id===a.id)||i.push(a)}i.sort(()=>Math.random()-.5),this.renderUI(i),setTimeout(()=>this.playAudio(),500)}renderUI(e){const n=document.getElementById("listening-options"),i=document.getElementById("listening-status");!n||!i||(i.textContent="Прослушайте и выберите перевод",i.style.color="var(--text-sub)",n.innerHTML="",e.forEach(a=>{const s=document.createElement("button");s.className="quiz-option",s.textContent=a.translation,s.onclick=()=>this.checkAnswer(a),n.appendChild(s)}))}async playAudio(){if(!this.element.classList.contains("active")||!this.currentWord||this.isPlaying)return;const e=document.getElementById("listening-play-btn");e&&(e.textContent="⏸️",e.classList.add("playing")),this.isPlaying=!0,this.startVisualizer();const n=o.currentVoice==="male"&&this.currentWord.audio_male?this.currentWord.audio_male:this.currentWord.audio_url;try{if(n){this.currentAudio&&(this.currentAudio.pause(),this.currentAudio=null);const i=new Audio(n);this.currentAudio=i,i.playbackRate=this.audioSpeed,await i.play(),await new Promise(a=>{i.onended=a,i.onerror=a}),this.currentAudio=null}else await K(this.currentWord.word_kr,null)}catch(i){console.error("Audio play error",i)}finally{this.element.classList.contains("active")?(this.isPlaying=!1,this.stopVisualizer(),e&&(e.textContent="▶️",e.classList.remove("playing"))):(this.isPlaying=!1,this.stopVisualizer())}}checkAnswer(e){if(!this.currentWord)return;const n=e.id===this.currentWord.id,i=document.getElementById("listening-status");document.querySelectorAll("#listening-options .quiz-option").forEach(s=>s.disabled=!0),n?(F("success"),i&&(i.textContent=`Верно! ${this.currentWord.word_kr}`,i.style.color="var(--success)"),gt(this.currentWord.id,!0),vt(10),Me(),setTimeout(()=>this.loadNextRound(),1500)):(F("failure"),i&&(i.textContent=`Ошибка. Это было: ${this.currentWord.word_kr}`,i.style.color="var(--danger)"),gt(this.currentWord.id,!1),setTimeout(()=>this.loadNextRound(),2500))}startVisualizer(){const e=document.getElementById("listening-visualizer");if(!e)return;const n=e.getContext("2d");if(!n)return;const i=e.width,a=e.height,s=30,l=()=>{n.clearRect(0,0,i,a),n.fillStyle=getComputedStyle(document.body).getPropertyValue("--primary");for(let r=0;r<s;r++){const c=Math.random()*a*.8,d=r*(i/s),u=(a-c)/2;n.fillRect(d+2,u,i/s-4,c)}this.isPlaying?this.animationId=requestAnimationFrame(l):n.clearRect(0,0,i,a)};l()}stopVisualizer(){this.animationId&&cancelAnimationFrame(this.animationId);const e=document.getElementById("listening-visualizer"),n=e?.getContext("2d");n&&e&&n.clearRect(0,0,e.width,e.height)}stopPlayback(){this.currentAudio&&(this.currentAudio.pause(),this.currentAudio=null),Vi(),this.isPlaying=!1,this.stopVisualizer();const e=document.getElementById("listening-play-btn");e&&(e.textContent="▶️",e.classList.remove("playing"))}}const Sa=new Vo;function Fo(){Sa.init()}function jo(){Sa.show()}function St(){D(),ai(),Sn(),ie()}document.addEventListener("state-changed",()=>St());function ka(t){return new Promise(e=>{try{try{window.speechSynthesis.cancel()}catch{}const n=t&&(t.word_kr||t.translation)?t.word_kr:"";let i=t.audio_url;o.currentVoice==="male"&&t.audio_male&&(i=t.audio_male),n?K(n,i).then(e):e()}catch(n){console.warn("playAndSpeak error",n),e()}})}function _a(t){if(o.viewMode===t)return;const e=document.getElementById("vocabulary-grid");let n=0;e&&e.scrollHeight>0&&(n=e.scrollTop/e.scrollHeight),o.viewMode=t,localStorage.setItem("view_mode_v1",t),document.querySelectorAll(".view-btn").forEach(i=>i.classList.toggle("active",i.dataset.value===t)),ie(),e&&requestAnimationFrame(()=>{e.scrollHeight>0&&(e.scrollTop=n*e.scrollHeight)})}function Ta(){o.dataStore.sort(()=>Math.random()-.5),ie()}function Wo(t){if(!document.getElementById("error-overlay")){const i=document.createElement("div");i.innerHTML='<div id="error-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:99999;display:none;justify-content:center;align-items:center;flex-direction:column;color:white;text-align:center;padding:20px;"><div style="font-size:48px;margin-bottom:20px;">⚠️</div><div id="error-msg" style="font-size:18px;margin-bottom:20px;"></div><button onclick="location.reload()" style="padding:10px 20px;border-radius:8px;border:none;background:white;color:black;font-weight:bold;cursor:pointer;">Перезагрузить</button></div>',document.body&&document.body.appendChild(i.firstElementChild)}const e=document.getElementById("error-msg");e&&(e.innerText=t);const n=document.getElementById("error-overlay");n&&(n.style.display="flex")}const Jt=new WeakMap;function _e(t){if(!t)return;if(Jt.has(t)){const s=Jt.get(t);s&&t.removeEventListener("keydown",s),Jt.delete(t)}const e=Array.from(t.querySelectorAll(".quiz-option")).map(s=>s);let n=-1;e.forEach((s,l)=>{s.tabIndex=0,s.dataset._qi=String(l),s.classList.remove("selected")});function i(){e.forEach((s,l)=>s.classList.toggle("selected",l===n));try{n>=0&&e[n].focus()}catch{}}function a(s){s.key==="ArrowRight"||s.key==="ArrowDown"?(n=n<0?0:(n+1)%e.length,i(),s.preventDefault()):s.key==="ArrowLeft"||s.key==="ArrowUp"?(n=n<0?e.length-1:(n-1+e.length)%e.length,i(),s.preventDefault()):(s.key==="Enter"||s.key===" ")&&(s.preventDefault(),n>=0&&e[n].click())}document.activeElement&&(document.activeElement.tagName==="INPUT"||document.activeElement.tagName==="TEXTAREA")||(t.addEventListener("keydown",a),Jt.set(t,s=>a(s)),e.forEach(s=>s.addEventListener("click",()=>{e.forEach(l=>l.classList.remove("selected"))})),t.tabIndex=0)}function Go(){o.dataStore.sort((t,e)=>{const n=t.topic_ru||t.topic_kr||"zzz",i=e.topic_ru||e.topic_kr||"zzz";if(n!==i)return n.localeCompare(i);const a=t.category_ru||t.category_kr||"zzz",s=e.category_ru||e.category_kr||"zzz";return a!==s?a.localeCompare(s):(t.word_kr||"").localeCompare(e.word_kr||"")}),ie()}function Qo(){o.dataStore.sort((t,e)=>{const n=t.level||"★☆☆",i=e.level||"★☆☆";return n!==i?n.localeCompare(i):(t.word_kr||"").localeCompare(e.word_kr||"")}),ie()}function Yo(){o.dataStore.sort((t,e)=>{const n=t.created_at||"",i=e.created_at||"";return n===i?(t.word_kr||"").localeCompare(e.word_kr||""):i.localeCompare(n)}),ie()}function Ia(){const t=[...o.dataStore].sort((e,n)=>{const i=l=>{const r=o.wordHistory[l]||{attempts:0,correct:0};return r.attempts===0?0:r.correct/r.attempts},a=i(e.id),s=i(n.id);return a!==s?a-s:(e.word_kr||"").localeCompare(n.word_kr||"")});o.dataStore=t,ie()}function Bi(){const t=document.getElementById("ping-indicator");if(!t)return;const e=o.networkPing;if(e===null){t.style.display="none";return}t.style.display="flex",t.textContent=`${e}ms`;let n="good";e>400?n="bad":e>200&&(n="medium"),t.classList.contains(n)||(t.classList.remove("good","medium","bad"),t.classList.add(n))}const Jo=[{id:"item_streak_freeze",name:"Заморозка серии",description:"Защищает серию при пропуске дня. Максимум 2 в инвентаре.",price:200,type:"feature",value:"streak_freeze",icon:"❄️"},{id:"item_survival_heal",name:"Аптечка",description:"Восстанавливает 1 жизнь в режиме Выживания.",price:150,type:"feature",value:"survival_heal",icon:"❤️"},{id:"theme_blue",name:"Тема: Океан",description:"Спокойный синий дизайн.",price:150,type:"theme",value:"blue",icon:"🌊"},{id:"theme_green",name:"Тема: Лес",description:"Натуральный зеленый дизайн.",price:150,type:"theme",value:"green",icon:"🌳"},{id:"theme_orange",name:"Тема: Закат",description:"Теплый оранжевый дизайн.",price:200,type:"theme",value:"orange",icon:"🌅"},{id:"theme_pink",name:"Тема: Сакура",description:"Нежный розовый дизайн.",price:200,type:"theme",value:"pink",icon:"🌸"}],Yn=[{id:"theme_ruby",name:"Тема: Рубин",description:"Роскошный красный дизайн. Редкая награда.",price:0,type:"theme",value:"ruby",icon:"💎"},{id:"theme_amethyst",name:"Тема: Аметист",description:"Королевский фиолетовый. Редкая награда.",price:0,type:"theme",value:"amethyst",icon:"🔮"}],vc=[{day:1,type:"coins",amount:50,icon:"💰"},{day:2,type:"coins",amount:75,icon:"💰"},{day:3,type:"xp",amount:100,icon:"✨"},{day:4,type:"coins",amount:150,icon:"💰"},{day:5,type:"streakFreeze",amount:1,icon:"❄️"},{day:6,type:"coins",amount:250,icon:"💰"},{day:7,type:"mysteryBox",amount:1,icon:"🎁"}],hc=[{type:"coins",amount:500,message:"💰 500 монет!"},{type:"xp",amount:500,message:"✨ 500 XP!"},{type:"streakFreeze",amount:2,message:"❄️ 2 заморозки серии!"},{type:"rare_theme",amount:1,message:"🎨 Редкая тема!"}],$t={purple:{main:"#7c3aed",hover:"#6d28d9",light:"rgba(124, 58, 237, 0.15)",accent:"#a78bfa",bg:"#f5f3ff",surface:"#ffffff",surface2:"#ede9fe",border:"#ddd6fe",textMain:"#2e1065",textSub:"#5b21b6",textTertiary:"#7c3aed"},blue:{main:"#2563eb",hover:"#1d4ed8",light:"rgba(37, 99, 235, 0.15)",accent:"#60a5fa",bg:"linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 100%)",surface:"rgba(255, 255, 255, 0.8)",surface2:"rgba(239, 246, 255, 0.7)",border:"#bfdbfe",textMain:"#172554",textSub:"#1e40af",textTertiary:"#2563eb"},green:{main:"#059669",hover:"#047857",light:"rgba(5, 150, 105, 0.15)",accent:"#34d399",bg:"linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%)",surface:"rgba(255, 255, 255, 0.8)",surface2:"rgba(240, 253, 244, 0.7)",border:"#bbf7d0",textMain:"#022c22",textSub:"#047857",textTertiary:"#059669"},orange:{main:"#ea580c",hover:"#c2410c",light:"rgba(234, 88, 12, 0.15)",accent:"#fb923c",bg:"linear-gradient(180deg, #fffbeb 0%, #fff7ed 100%)",surface:"rgba(255, 255, 255, 0.8)",surface2:"rgba(255, 247, 237, 0.7)",border:"#fed7aa",textMain:"#431407",textSub:"#c2410c",textTertiary:"#ea580c"},pink:{main:"#db2777",hover:"#be185d",light:"rgba(219, 39, 119, 0.15)",accent:"#f472b6",bg:"linear-gradient(180deg, #fdf2f8 0%, #fce7f3 100%)",surface:"rgba(255, 255, 255, 0.8)",surface2:"rgba(252, 231, 243, 0.7)",border:"#fbcfe8",textMain:"#500724",textSub:"#be185d",textTertiary:"#db2777"},ruby:{main:"#e11d48",hover:"#be123c",light:"rgba(225, 29, 72, 0.15)",accent:"#f43f5e",bg:"#fff1f2",surface:"#ffffff",surface2:"#ffe4e6",border:"#fecdd3",textMain:"#881337",textSub:"#9f1239",textTertiary:"#be123c"},amethyst:{main:"#9333ea",hover:"#7e22ce",light:"rgba(147, 51, 234, 0.15)",accent:"#a855f7",bg:"#f5f3ff",surface:"#ffffff",surface2:"#ede9fe",border:"#ddd6fe",textMain:"#4c1d95",textSub:"#5b21b6",textTertiary:"#6d28d9"}},gn={purple:{main:"#a78bfa",hover:"#8b5cf6",light:"rgba(167, 139, 250, 0.15)",accent:"#c4b5fd",bg:"#1e1b4b",surface:"#28235e",surface2:"#312e6f",border:"#3730a3",textMain:"#ede9fe",textSub:"#a78bfa",textTertiary:"#8b5cf6"},blue:{main:"#60a5fa",hover:"#3b82f6",light:"rgba(96, 165, 250, 0.15)",accent:"#93c5fd",bg:"linear-gradient(180deg, #0c2a4d 0%, #172554 100%)",surface:"rgba(30, 58, 138, 0.7)",surface2:"rgba(30, 64, 175, 0.6)",border:"#2563eb",textMain:"#dbeafe",textSub:"#60a5fa",textTertiary:"#3b82f6"},green:{main:"#34d399",hover:"#10b981",light:"rgba(52, 211, 153, 0.15)",accent:"#6ee7b7",bg:"linear-gradient(180deg, #042f2e 0%, #064e3b 100%)",surface:"rgba(4, 78, 57, 0.7)",surface2:"rgba(5, 117, 87, 0.6)",border:"#059669",textMain:"#d1fae5",textSub:"#34d399",textTertiary:"#10b981"},orange:{main:"#fb923c",hover:"#f97316",light:"rgba(251, 146, 60, 0.15)",accent:"#fdba74",bg:"linear-gradient(180deg, #431407 0%, #7c2d12 100%)",surface:"rgba(124, 45, 18, 0.7)",surface2:"rgba(154, 52, 18, 0.6)",border:"#c2410c",textMain:"#ffedd5",textSub:"#fb923c",textTertiary:"#f97316"},pink:{main:"#f472b6",hover:"#ec4899",light:"rgba(244, 114, 182, 0.15)",accent:"#f9a8d4",bg:"linear-gradient(180deg, #581c87 0%, #701a75 100%)",surface:"rgba(134, 25, 143, 0.7)",surface2:"rgba(157, 23, 77, 0.6)",border:"#be185d",textMain:"#fce7f3",textSub:"#f472b6",textTertiary:"#ec4899"},ruby:{main:"#fb7185",hover:"#f43f5e",light:"rgba(225, 29, 72, 0.15)",accent:"#fda4af",bg:"#4c0519",surface:"#881337",surface2:"#9f1239",border:"#be123c",textMain:"#fff1f2",textSub:"#fda4af",textTertiary:"#fb7185"},amethyst:{main:"#c084fc",hover:"#a855f7",light:"rgba(147, 51, 234, 0.15)",accent:"#d8b4fe",bg:"#3b0764",surface:"#581c87",surface2:"#6b21a8",border:"#7e22ce",textMain:"#faf5ff",textSub:"#d8b4fe",textTertiary:"#c084fc"}};function ae(){o.settingsUpdatedAt=Date.now(),localStorage.setItem("settings_updated_at",String(o.settingsUpdatedAt))}class Xo extends te{constructor(){super("profile-modal")}setupStateSubscriptions(){this.listen("settings_updated",()=>{this.render()})}render(){if(!this.element.id||!document.body.contains(this.element)){const g=document.getElementById("profile-modal");g&&(this.element=g)}const e=document.getElementById("dark-mode-toggle-switch"),n=document.getElementById("auto-theme-toggle-switch"),i=document.getElementById("auto-theme-times"),a=document.getElementById("auto-theme-start"),s=document.getElementById("auto-theme-end"),l=document.getElementById("hanja-setting-check"),r=document.getElementById("background-music-check"),c=document.getElementById("auto-update-check"),d=document.getElementById("speed-slider"),u=document.getElementById("speed-val"),m=document.getElementById("background-music-volume-slider");this.ensureExtraInfoSetting();const p=document.getElementById("show-extra-info-check");if(e){e.checked=o.darkMode;const g=e.closest(".setting-item"),f=g?.querySelector(".setting-label");o.autoTheme?(e.disabled=!0,g&&(g.style.opacity="0.5"),f&&(f.textContent="Ночной режим (Авто)")):(e.disabled=!1,g&&(g.style.opacity="1"),f&&(f.textContent="Ночной режим"))}n&&(n.checked=o.autoTheme),i&&(i.style.display=o.autoTheme?"flex":"none"),a&&(a.value=String(o.autoThemeStart)),s&&(s.value=String(o.autoThemeEnd)),l&&(l.checked=o.hanjaMode),r&&(r.checked=o.backgroundMusicEnabled),c&&(c.checked=o.autoUpdate),p&&(p.checked=o.showQuizExtraInfo),d&&(d.value=String(o.audioSpeed)),u&&(u.textContent=o.audioSpeed+"x"),m&&(m.value=String(o.backgroundMusicVolume)),this.updateMusicUI(),this.updateVoiceUI(),this.updateThemePickerUI(),this.updateTrashRetentionUI()}ensureExtraInfoSetting(){if(document.getElementById("show-extra-info-check"))return;const e=document.getElementById("hanja-setting-check");if(e){const n=e.closest(".setting-item");if(n&&n.parentNode){const i=document.createElement("label");i.className="setting-item",i.innerHTML=`
                <div class="setting-left">
                    <div class="setting-icon">ℹ️</div>
                    <div class="setting-label">Доп. информация в квизе</div>
                </div>
                <div class="setting-right">
                    <label class="switch">
                        <input type="checkbox" id="show-extra-info-check" data-action="toggle-extra-info">
                        <span class="slider"></span>
                    </label>
                </div>
            `,n.parentNode.insertBefore(i,n.nextSibling)}}}updateVoiceUI(){const e=document.getElementById("voice-selection");e&&e.querySelectorAll(".segment-btn").forEach(n=>{n.getAttribute("data-value")===o.currentVoice?n.classList.add("active"):n.classList.remove("active")})}updateMusicUI(){const e=document.getElementById("background-music-volume-slider");e&&(e.disabled=!o.backgroundMusicEnabled,e.style.opacity=o.backgroundMusicEnabled?"1":"0.5",e.style.cursor=o.backgroundMusicEnabled?"pointer":"not-allowed")}updateThemePickerUI(){const e=document.getElementById("theme-picker-container");if(!e)return;const n=[{id:"theme_default",name:"Стандарт",value:"purple",price:0},...Jo.filter(i=>i.type==="theme"),...Yn];e.innerHTML="",n.forEach(i=>{const a=Yn.some(c=>c.id===i.id),s=o.purchasedItems.includes(i.id)||i.price===0&&!a,l=o.themeColor===i.value,r=document.createElement("button");if(r.className="color-option",l&&r.classList.add("active"),r.dataset.value=i.value,r.title=i.name,s)r.dataset.action="set-accent";else if(r.classList.add("locked"),r.style.opacity="0.6",r.style.filter="grayscale(1)",a)r.innerHTML='<span style="font-size: 16px;">?</span>',r.title=`${i.name} (редкая награда)`,r.onclick=c=>{c.stopPropagation(),h("🎁 Эту тему можно найти в Таинственной коробке (День 7)!")};else{const c=document.createElement("button");c.className="buy-theme-btn",c.innerHTML="💰",c.title="Купить в магазине",c.onclick=d=>{d.stopPropagation(),_(()=>import("./ui_shop-CPdhjkX7.js"),__vite__mapDeps([6,2,1,3])).then(u=>{u.openShopModal(),setTimeout(()=>u.switchShopTab("theme"),100)})},r.appendChild(c),r.title=`${i.name} (в магазине)`}e.appendChild(r)})}updateTrashRetentionUI(){const e=document.getElementById("trash-retention-options");e&&e.querySelectorAll(".segment-btn").forEach(n=>{n.classList.toggle("active",n.getAttribute("data-value")===String(o.trashRetentionDays))})}}let pe=null;function Ko(){pe=new Xo,pe.init()}function ui(){pe&&pe.render()}function Ca(t){o.hanjaMode=t.checked,localStorage.setItem(v.HANJA_MODE,String(o.hanjaMode)),H("settings_updated",{hanjaMode:o.hanjaMode}),document.dispatchEvent(new CustomEvent("state-changed")),ae(),D()}function Zo(t){o.showQuizExtraInfo=t.checked,localStorage.setItem(v.SHOW_QUIZ_EXTRA_INFO,String(o.showQuizExtraInfo)),H("settings_updated",{showQuizExtraInfo:o.showQuizExtraInfo}),ae(),D()}function La(t){if(t!=="female"&&t!=="male")return;o.currentVoice=t,localStorage.setItem(v.VOICE_PREF,o.currentVoice),vn(),h(`Голос: ${t==="female"?"Женский":"Мужской"}`),H("settings_updated",{currentVoice:o.currentVoice}),ae(),D();const e=o.dataStore.find(i=>i.word_kr==="안녕하세요"&&i.audio_url&&i.audio_male);let n=null;e&&(n=t==="male"?e.audio_male:e.audio_url),K("안녕하세요",n),document.dispatchEvent(new CustomEvent("state-changed"))}function vn(){pe&&pe.render()}function Aa(t){o.audioSpeed=typeof t=="string"?parseFloat(t):t,localStorage.setItem(v.AUDIO_SPEED,String(o.audioSpeed));const e=document.getElementById("speed-val");e&&(e.textContent=o.audioSpeed+"x"),H("settings_updated",{audioSpeed:o.audioSpeed}),ae(),D()}function Ma(t){o.ttsVolume=typeof t=="string"?parseFloat(t):t,localStorage.setItem(v.TTS_VOLUME,String(o.ttsVolume));const e=document.getElementById("tts-volume-val");e&&(e.textContent=`${Math.round(o.ttsVolume*100)}%`),H("settings_updated",{ttsVolume:o.ttsVolume}),ae(),D()}function er(t){o.autoTheme=t.checked,localStorage.setItem(v.AUTO_THEME,String(o.autoTheme));let e=!1;o.autoTheme&&(e=Ht()),e||h(`Авто-тема: ${o.autoTheme?"ВКЛ":"ВЫКЛ"}`),H("settings_updated",{autoTheme:o.autoTheme}),ae(),D()}function tr(t){let e=parseInt(t,10);isNaN(e)||(e=Math.max(0,Math.min(23,e)),o.autoThemeStart=e,localStorage.setItem(v.AUTO_THEME_START,String(e)),H("settings_updated",{autoThemeStart:e}),Ht(),ae(),D())}function nr(t){let e=parseInt(t,10);isNaN(e)||(e=Math.max(0,Math.min(23,e)),o.autoThemeEnd=e,localStorage.setItem(v.AUTO_THEME_END,String(e)),H("settings_updated",{autoThemeEnd:e}),Ht(),ae(),D())}function Ht(){if(!o.autoTheme)return!1;const t=new Date().getHours();let e=!1;return o.autoThemeStart>o.autoThemeEnd?e=t>=o.autoThemeStart||t<o.autoThemeEnd:e=t>=o.autoThemeStart&&t<o.autoThemeEnd,o.darkMode!==e?(o.darkMode=e,localStorage.setItem(v.DARK_MODE,String(o.darkMode)),xt(),h(`Авто-тема: ${e?"Ночь 🌙":"День ☀️"}`),H("settings_updated",{darkMode:o.darkMode}),!0):!1}function ir(){if(!window.matchMedia)return;const t=window.matchMedia("(prefers-color-scheme: dark)"),e=n=>{localStorage.getItem(v.DARK_MODE)===null&&!o.autoTheme&&(o.darkMode=n.matches,xt(),ui())};t.addEventListener?t.addEventListener("change",e):t.addListener(e)}function Jn(t){o.autoTheme&&(o.autoTheme=!1,localStorage.setItem(v.AUTO_THEME,"false"),h("Авто-тема отключена")),o.darkMode=t&&t.type==="checkbox"?t.checked:!o.darkMode,localStorage.setItem(v.DARK_MODE,String(o.darkMode)),xt(),H("settings_updated",{darkMode:o.darkMode}),ae(),D()}function Ba(t){o.autoUpdate=t.checked,localStorage.setItem(v.AUTO_UPDATE,String(o.autoUpdate)),h(`Автообновление: ${o.autoUpdate?"ВКЛ":"ВЫКЛ"}`),H("settings_updated",{autoUpdate:o.autoUpdate}),ae(),D()}function xt(){document.body.classList.toggle("dark-mode",o.darkMode);const t=o.darkMode?"🌙":"☀️",e=document.getElementById("header-dark-mode-toggle");e&&(e.textContent=t,e.classList.remove("rotate-icon"),e.offsetWidth,e.classList.add("rotate-icon")),mi()}function ar(t){if($t[t]){if(t!=="purple"){const e=`theme_${t}`;if(!o.purchasedItems.includes(e)){const n=Yn.some(i=>i.value===t);h(n?"🎁 Эту тему можно найти в Таинственной коробке (День 7)!":"Эта тема доступна в магазине");return}}o.themeColor=t,localStorage.setItem(v.THEME_COLOR,o.themeColor),mi(),H("settings_updated",{themeColor:o.themeColor}),ae(),D()}}function mi(){const t=o.themeColor||"purple";let e=$t[t]||$t.purple;o.darkMode&&(e=gn[t]||gn.purple);const n=document.documentElement.style;n.setProperty("--primary",e.main),n.setProperty("--primary-hover",e.hover),n.setProperty("--primary-light",e.light),n.setProperty("--accent",e.accent),n.setProperty("--bg",e.bg),n.setProperty("--surface-1",e.surface),n.setProperty("--surface-2",e.surface2),n.setProperty("--surface-3",e.border),n.setProperty("--border-color",e.border),n.setProperty("--input-bg",e.surface2),n.setProperty("--text-main",e.textMain),n.setProperty("--text-sub",e.textSub),n.setProperty("--text-tertiary",e.textTertiary),document.querySelectorAll(".color-option, .stats-color-btn").forEach(i=>{i instanceof HTMLElement&&i.classList.toggle("active",i.getAttribute("data-value")===o.themeColor)})}function sr(t){let e=$t[t]||$t.purple;o.darkMode&&(e=gn[t]||gn.purple);const n=document.documentElement.style;n.setProperty("--primary",e.main),n.setProperty("--primary-hover",e.hover),n.setProperty("--primary-light",e.light),n.setProperty("--accent",e.accent),n.setProperty("--bg",e.bg),n.setProperty("--surface-1",e.surface),n.setProperty("--surface-2",e.surface2),n.setProperty("--surface-3",e.border),n.setProperty("--border-color",e.border),n.setProperty("--input-bg",e.surface2),n.setProperty("--text-main",e.textMain),n.setProperty("--text-sub",e.textSub),n.setProperty("--text-tertiary",e.textTertiary)}function or(){pe&&pe.render()}function za(){if(o.focusMode=!o.focusMode,rr(),h(`Режим фокусировки: ${o.focusMode?"ВКЛ":"ВЫКЛ"}`),et(),H("settings_updated",{focusMode:o.focusMode}),ae(),o.viewMode!=="list"){const t=document.getElementById("vocabulary-grid"),e=t?t.scrollTop:0,n=o.focusMode?400:Math.floor(window.innerHeight*.75);if(document.dispatchEvent(new CustomEvent("state-changed")),t&&e>0){const i=o.focusMode?Math.floor(window.innerHeight*.75):400;t.scrollTop=e*(i/n)}}}function rr(){o.focusMode?(document.body.classList.add("focus-mode"),document.documentElement.classList.add("focus-mode")):(document.body.classList.remove("focus-mode"),document.documentElement.classList.remove("focus-mode"));const t=document.getElementById("focus-mode-btn");t&&t.classList.toggle("active",o.focusMode);const e=document.getElementById("exit-focus-btn");e&&(e.style.display=o.focusMode?"flex":"none")}function Ra(t){o.backgroundMusicEnabled=t?t.checked:!o.backgroundMusicEnabled,localStorage.setItem(v.MUSIC_ENABLED,String(o.backgroundMusicEnabled)),qa(),et(),h(`Музыка: ${o.backgroundMusicEnabled?"ВКЛ":"ВЫКЛ"}`),H("settings_updated",{backgroundMusicEnabled:o.backgroundMusicEnabled}),ae(),D()}function qa(){pe&&pe.render()}let Fe="a",zi=!1,it=null,at=null;function et(t=!1){const e=document.getElementById("music-player-a"),n=document.getElementById("music-player-b");if(!e||!n)return;const i=Fe==="a"?e:n,a=Fe==="a"?n:e;!zi&&o.backgroundMusicEnabled&&t&&(zi=!0,i.volume<o.backgroundMusicVolume&&Tt(i,null,o.backgroundMusicVolume,i.volume));let s="default";const l=document.getElementById("quiz-game");l&&l.style.display!=="none"?s="quiz":o.focusMode&&(s="zen");const c=o.MUSIC_TRACKS.find(m=>m.id===s);if(!c)return console.warn(`Музыкальный трек для ID "${s}" не найден.`);const d=c.filename,u=`./audio/${encodeURIComponent(d)}`;if(!o.backgroundMusicEnabled){Tt(i,a,0,0);return}if(decodeURIComponent(i.src).includes(d)&&!i.paused){i.volume=o.backgroundMusicVolume;return}decodeURIComponent(i.src).includes(d)?i.paused?(i.volume=0,i.play().then(()=>{Tt(i,null,o.backgroundMusicVolume,0)}).catch(m=>{m.name!=="AbortError"&&console.warn("Music play failed:",m)})):i.volume=o.backgroundMusicVolume:(a.src=u,a.volume=0,a.play().then(()=>{Tt(a,i,o.backgroundMusicVolume,0),Fe=Fe==="a"?"b":"a"}).catch(m=>{if(m.name!=="AbortError"){console.warn("Music play failed:",m),h(`Ошибка аудио: ${m.message}`);const p=o.MUSIC_TRACKS.find(g=>g.id!==s&&g.id==="default")||o.MUSIC_TRACKS[0];p&&p.id!==s&&(console.log("Attempting fallback track:",p.name),a.src=`./audio/${encodeURIComponent(p.filename)}`,a.play().then(()=>{Tt(a,i,o.backgroundMusicVolume,0),Fe=Fe==="a"?"b":"a"}).catch(g=>console.warn("Fallback failed:",g)))}}))}document.addEventListener("duck-music",t=>{const e=t.detail;lr(e.duck)});function lr(t){if(!o.backgroundMusicEnabled)return;const e=document.getElementById(Fe==="a"?"music-player-a":"music-player-b");if(e){const n=t?o.backgroundMusicVolume*.2:o.backgroundMusicVolume;e.volume=n}}function Tt(t,e,n,i){it&&clearInterval(it),at&&(at.volume=0,at.pause(),at=null);let a=0;const s=20,l=i!==void 0?i:t.volume,r=e?e.volume:0;at=e,it=setInterval(()=>{a++;const c=a/s;t.volume=l+(n-l)*c,e&&(e.volume=r+(0-r)*c),a>=s&&(t.volume=n,e&&(e.volume=0,e.pause()),it&&clearInterval(it),it=null,at=null)},50)}function Da(t){o.backgroundMusicVolume=typeof t=="string"?parseFloat(t):t,localStorage.setItem(v.MUSIC_VOLUME,String(o.backgroundMusicVolume));const e=document.getElementById("background-music-volume-val");e&&(e.textContent=`${Math.round(o.backgroundMusicVolume*100)}%`),H("settings_updated",{backgroundMusicVolume:o.backgroundMusicVolume}),et(!0),ae(),D()}function cr(){le("Сбросить все настройки к значениям по умолчанию?",()=>{[v.HANJA_MODE,v.VOICE_PREF,v.AUDIO_SPEED,v.DARK_MODE,v.AUTO_UPDATE,v.AUTO_THEME,v.THEME_COLOR,v.MUSIC_ENABLED,v.MUSIC_VOLUME,"focus_mode_v1",v.ZEN_MODE,v.VIEW_MODE,v.STUDY_GOAL,v.QUIZ_DIFFICULTY,v.QUIZ_TOPIC,v.QUIZ_CATEGORY,v.SHOW_QUIZ_EXTRA_INFO].forEach(e=>localStorage.removeItem(e)),Object.assign(o,{hanjaMode:!1,currentVoice:"female",audioSpeed:.9,darkMode:!1,autoUpdate:!0,autoTheme:!1,themeColor:"purple",backgroundMusicEnabled:!1,backgroundMusicVolume:.3,focusMode:!1,viewMode:"grid",settingsUpdatedAt:Date.now(),showQuizExtraInfo:!0}),H("settings_updated"),D(50),h("⚙️ Настройки сброшены. Перезагрузка..."),setTimeout(()=>location.reload(),800)})}function dr(t){const e=Number(t);[7,30,90,365].includes(e)&&(o.trashRetentionDays=e,Oa(),H("settings_updated",{trashRetentionDays:o.trashRetentionDays}),h(`Срок хранения в корзине: ${e===365?"1 год":`${e} дн.`}`),ae(),D())}function Oa(){pe&&pe.render()}function ur(){const t=[],e=new Set,n=o.dataStore.filter(i=>i.type==="word");for(const i of n){if(t.length>=5)break;if(!e.has(i.id)){if(i.synonyms){const a=i.synonyms.split(",")[0].trim(),s=n.find(l=>l.word_kr===a&&!e.has(l.id));if(s){t.push({left:i,right:s}),e.add(i.id),e.add(s.id);continue}}if(i.antonyms){const a=i.antonyms.split(",")[0].trim(),s=n.find(l=>l.word_kr===a&&!e.has(l.id));if(s){t.push({left:i,right:s}),e.add(i.id),e.add(s.id);continue}}}}if(t.length<5){const i={},a=n.filter(r=>!e.has(r.id));for(const r of a){const c=r.topic||r.topic_ru||"unknown";c!=="unknown"&&(i[c]||(i[c]=[]),i[c].push(r))}const s=5-t.length,l=Object.keys(i).filter(r=>i[r].length>=s);if(l.length>0){const r=l[Math.floor(Math.random()*l.length)],c=i[r].sort(()=>.5-Math.random());for(let d=0;d<s;d++){const u=c[d];t.push({left:u,right:u}),e.add(u.id)}}}for(;t.length<5;){const i=n.filter(s=>!e.has(s.id));if(i.length===0)break;const a=i[Math.floor(Math.random()*i.length)];t.push({left:a,right:a}),e.add(a.id)}return t}let Ve=null;function mr(){if(Ve)return Ve;const t=window.SpeechRecognition||window.webkitSpeechRecognition;return t?(Ve=new t,Ve.lang="ko-KR",Ve.interimResults=!0,Ve.maxAlternatives=1,Ve):(h("❌ Распознавание речи не поддерживается в этом браузере."),null)}function $a(t,e,n,i,a,s){const l=mr();if(!l)return;try{l.abort()}catch{}let r=null;const c=[];let d=null,u=null,m=null,p=null;(async()=>{if(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia&&typeof MediaRecorder<"u")try{if(p=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:!0,noiseSuppression:!0,autoGainControl:!0}}),(i||s)&&p)try{d=new(window.AudioContext||window.webkitAudioContext);const b=d.createMediaStreamSource(p);u=d.createAnalyser(),u.fftSize=2048,b.connect(u);const x=u.frequencyBinCount,E=new Uint8Array(x),k=i?.getContext("2d"),T=()=>{if(u){if(m=requestAnimationFrame(T),u.getByteTimeDomainData(E),s){let I=0;for(let R=0;R<x;R++){const L=(E[R]-128)/128;I+=L*L}const C=Math.sqrt(I/x);s(C)}if(k&&i){k.clearRect(0,0,i.width,i.height);const I=i.width,C=i.height;k.lineWidth=3*(window.devicePixelRatio||1);const R=getComputedStyle(document.body);k.strokeStyle=R.getPropertyValue("--primary")||"#7c3aed",k.lineCap="round",k.lineJoin="round",k.beginPath();const L=I*1/x;let q=0;for(let U=0;U<x;U++){const X=E[U]/128*C/2;U===0?k.moveTo(q,X):k.lineTo(q,X),q+=L}k.lineTo(I,C/2),k.stroke()}}};T()}catch(b){console.warn("Visualizer setup failed:",b)}r=new MediaRecorder(p),r.ondataavailable=b=>{b.data.size>0&&c.push(b.data)},r.start()}catch(b){console.warn("Recording failed:",b)}})(),e&&(e.textContent="🎤",e.disabled=!0),h("🎤 Говорите...");const f=()=>{if(m&&cancelAnimationFrame(m),d&&(d.close().catch(()=>{}),d=null),i){const b=i.getContext("2d");b&&b.clearRect(0,0,i.width,i.height)}},y=b=>{f();let x=!1;const E=T=>{x||(x=!0,b(T))},k=setTimeout(()=>{p?.getTracks().forEach(T=>T.stop()),E(void 0)},1500);if(r&&r.state!=="inactive"){r.onstop=()=>{clearTimeout(k);const T=new Blob(c,{type:"audio/webm"}),I=URL.createObjectURL(T);p?.getTracks().forEach(C=>C.stop()),E(I)};try{r.stop()}catch{clearTimeout(k),p?.getTracks().forEach(T=>T.stop()),E(void 0)}}else clearTimeout(k),p?.getTracks().forEach(T=>T.stop()),E(void 0)};l.onresult=b=>{let x="",E="";for(let X=b.resultIndex||0;X<b.results.length;++X)b.results[X].isFinal?x+=b.results[X][0].transcript:E+=b.results[X][0].transcript;if(E&&a&&a(E),!x)return;const k=x.trim(),T=X=>X.normalize("NFC").replace(/[^\p{L}\p{N}]/gu,"").toLowerCase(),I=T(k),C=T(t),R=ti(I,C),L=Math.max(0,Math.round((1-R/Math.max(1,I.length,C.length))*100)),q=`Вы сказали: "${k}"`,U=L<60?`🤔 ${L}% | ${q}`:`✅ ${L}% | ${q}`;h(U,5e3);const J=Zt(k,t);y(X=>{n&&n(L,k,X,J)})},l.onerror=b=>{let x="Ошибка распознавания";b.error==="no-speech"?x="Не удалось распознать речь. Попробуйте снова.":(b.error==="not-allowed"||b.error==="service-not-allowed")&&(x="Доступ к микрофону запрещен."),h(`❌ ${x}`),console.error("Speech recognition error:",b.error),y(()=>{n&&n(0,"")})},l.onend=()=>{e&&(e.textContent="🗣️",e.disabled=!1),f(),r&&r.state!=="inactive"&&(r.stop(),r.stream.getTracks().forEach(b=>b.stop()))},l.start()}function Ha(){const t=o.dataStore.filter(i=>i.type==="word"&&i.word_kr.length>1),e=[],n=new Set;t.sort((i,a)=>i.word_kr.length-a.word_kr.length);for(let i=0;i<t.length;i++){if(n.has(t[i].id))continue;const a=[t[i]],s=t[i].word_kr;for(let l=i+1;l<t.length;l++){const r=t[l].word_kr;if(Math.abs(r.length-s.length)>1){if(r.length>s.length+1)break;continue}ti(s,r)===1&&(a.push(t[l]),n.add(t[l].id))}if(a.length>1&&(e.push(a),n.add(t[i].id)),e.length>=50)break}return e}function An(t){if(!t)return"";const e=t.replace(/\\/g,"\\\\").replace(/'/g,"\\'");return`<button class="speak-btn" data-action="speak" data-url="${w(e)}">🔊</button>`}function It(t,e=4){const n=[t];for(;n.length<e&&o.dataStore.length>e;){const i=o.dataStore[Math.floor(Math.random()*o.dataStore.length)];i&&!n.find(a=>a.id===i.id)&&n.push(i)}return n.sort(()=>Math.random()-.5)}function be(t,e,n){e&&e.parentElement&&e.parentElement.querySelectorAll(".quiz-option").forEach(i=>{const a=i;a.disabled=!0,a.dataset.correct==="true"&&a.classList.add("correct")}),e&&e.classList.add(t?"correct":"incorrect"),!t&&e&&e.classList.add("shake"),n(t)}const Nt={"multiple-choice":{render(t,e,n,i){i.innerHTML=`<div class="quiz-question-text">${w(t.word_kr)}</div><div class="quiz-question-sub">Выберите перевод</div>`,e.innerHTML="",It(t).forEach(a=>{const s=document.createElement("button");s.className="quiz-option",s.textContent=a.translation,a.id===t.id&&(s.dataset.correct="true"),s.onclick=()=>be(a.id===t.id,s,n),e.appendChild(s)}),_e(e)}},flashcard:{render(t,e,n,i){i.innerHTML=`
        <div class="quiz-question-flipper">
            <div class="quiz-question-front">
                <div class="quiz-question-text">${w(t.word_kr)}</div>
                <div class="quiz-question-sub">Вспомните перевод</div>
            </div>
            <div class="quiz-question-back">
                <div class="quiz-question-text primary">${w(t.translation||"")}</div>
                <div class="quiz-question-sub">${w(t.word_kr)}</div>
            </div>
        </div>
      `,e.innerHTML="";const a=document.createElement("button");a.className="btn btn-quiz",a.style.width="100%",a.textContent="Показать ответ",a.onclick=()=>{F("flip");const s=i.querySelector(".quiz-question-flipper");s&&s.classList.add("is-flipped"),e.innerHTML="",e.classList.add("grid-2");const l=document.createElement("button");l.className="quiz-option flashcard-remember",l.textContent="✓ Помню отлично",l.onclick=()=>{l.disabled||(l.disabled=!0,r.disabled=!0,c.disabled=!0,n(!0,!0))};const r=document.createElement("button");r.className="quiz-option flashcard-remember",r.textContent="✓ Помню с трудом",r.onclick=()=>{r.disabled||(l.disabled=!0,r.disabled=!0,c.disabled=!0,n(!0,!0))};const c=document.createElement("button");c.className="quiz-option flashcard-forgot",c.textContent="✗ Забыл",c.onclick=()=>{c.disabled||(l.disabled=!0,r.disabled=!0,c.disabled=!0,n(!1))},e.appendChild(l),e.appendChild(r),e.appendChild(c)},e.appendChild(a)}},reverse:{render(t,e,n,i){let a=`<div class="quiz-question-text">${w(t.translation||"")}</div><div class="quiz-question-sub">Выберите корейское слово</div>`;if(t.my_notes){const s='<span class="skeleton-pulse" style="display: inline-block; width: 2.5em; height: 0.8em; background: var(--surface-3); border-radius: 4px; vertical-align: middle; margin: 0 2px;"></span>',l=w(t.my_notes),r=w(t.word_kr),c=r?l.replace(new RegExp(jt(r),"gi"),s):l;a+=`<div style="font-size:14px; color:var(--text-sub); margin-top:5px;">(${c})</div>`}i.innerHTML=a,e.innerHTML="",It(t).forEach(s=>{const l=document.createElement("button");l.className="quiz-option",l.textContent=s.word_kr,s.id===t.id&&(l.dataset.correct="true"),l.onclick=()=>be(s.id===t.id,l,n),e.appendChild(l)}),_e(e)}},sentence:{render(t,e,n,i){const a=w(t.example_kr||""),s=w(t.word_kr),l=a.includes(s)?a.replace(s,"___"):`___ ${a}`,r=An(t.example_audio);i.innerHTML=`<div class="quiz-question-text small">"${l}"</div><div class="quiz-question-sub">Вставьте пропущенное слово</div>`,t.example_audio&&i.insertAdjacentHTML("beforeend",r),e.innerHTML="",It(t).forEach(c=>{const d=document.createElement("button");d.className="quiz-option",d.textContent=c.word_kr,c.id===t.id&&(d.dataset.correct="true"),d.onclick=()=>be(c.id===t.id,d,n),e.appendChild(d)}),_e(e)}},typing:{render(t,e,n,i){let a="";if(t.image&&(a+=`<img src="${w(t.image)}" class="quiz-image" loading="lazy">`),a+=`<div class="quiz-question-text">${w(t.translation||"")}</div><div class="quiz-question-sub">Напишите на корейском</div>`,t.my_notes){const s='<span class="skeleton-pulse" style="display: inline-block; width: 2.5em; height: 0.8em; background: var(--surface-3); border-radius: 4px; vertical-align: middle; margin: 0 2px;"></span>';let l=w(t.my_notes);if(t.word_kr){const r=w(t.word_kr);l=l.replace(new RegExp(jt(r),"gi"),s)}a+=`<div style="font-size:14px; color:var(--text-sub); margin-top:5px;">(${l})</div>`}i.innerHTML=a,typeof this._renderInput=="function"&&this._renderInput(t,e,n)},_renderInput(t,e,n){e.innerHTML="";const i=document.createElement("input");i.type="text",i.className="quiz-input",i.placeholder="Корейское слово...",i.autocomplete="off";const a=document.createElement("button");a.className="btn btn-quiz",a.style.width="100%",a.textContent="Проверить";const s=document.createElement("button");s.innerHTML="⌨️",s.className="btn-icon",s.style.cssText="position: absolute; right: 10px; top: 10px; z-index: 5; width: 32px; height: 32px; font-size: 16px;";const l=document.createElement("div");l.style.position="relative",l.appendChild(i),l.appendChild(s);const r=document.createElement("div");r.className="essay-feedback";const c=()=>{if(i.disabled)return;const u=i.value.trim().toLowerCase(),m=t.word_kr.trim().toLowerCase(),p=/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(u);if(/[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(m)&&!p&&u.length>0){F("failure"),i.classList.add("shake"),setTimeout(()=>i.classList.remove("shake"),500),h("⚠️ Введите ответ на корейском языке!");return}const f=ti(u,m),y=f<=(m.length>3?1:0);i.disabled=!0;let b=!0;y?(i.classList.add("correct"),i.classList.add("pulse-green"),f>0&&(r.innerHTML=`<div style="color:var(--warning); font-weight:bold; margin-bottom:5px;">Опечатка:</div><div style="font-size:18px;">${Zt(u,m)}</div>`,e.appendChild(r),b=!1)):(i.classList.add("incorrect"),i.classList.add("shake"),r.innerHTML=`<div style="color:var(--danger); font-weight:bold; margin-bottom:5px;">Неверно! Ответ: ${w(t.word_kr)}</div><div style="font-size:18px;">${Zt(u,m)}</div>`,e.appendChild(r),b=!1),n(y,b),!b&&this._addNextBtn&&this._addNextBtn(e,n)};i.addEventListener("keydown",u=>{u.key==="Enter"&&c()}),a.onclick=c,e.appendChild(l),e.appendChild(a);const d=Gn(e,i,s);d&&(s.onclick=()=>{const u=d.style.display==="grid";d.style.display=u?"none":"grid"}),setTimeout(()=>i.focus(),100)},_addNextBtn(t,e){const n=document.createElement("button");n.className="btn btn-quiz",n.style.marginTop="15px",n.style.width="100%",n.textContent="Далее ➡",n.onclick=()=>e(null,!0,!0),t.appendChild(n),setTimeout(()=>n.focus(),100)}},essay:{render(t,e,n,i){i.innerHTML=`<div class="quiz-question-text small">"${w(t.example_ru||"...")}"</div><div class="quiz-question-sub">Переведите предложение</div>`,e.innerHTML="";const a=document.createElement("textarea");a.className="quiz-textarea",a.rows=3,a.placeholder="Ваш перевод...";const s=document.createElement("div"),l=document.createElement("button");l.innerHTML="⌨️",l.className="btn-icon",l.style.cssText="position: absolute; right: 10px; top: 10px; z-index: 5; width: 32px; height: 32px; font-size: 16px;";const r=document.createElement("div");r.style.position="relative",r.appendChild(a),r.appendChild(l);const c=document.createElement("button");c.className="btn btn-quiz",c.style.width="100%",c.textContent="Показать правильный ответ",c.onclick=()=>{a.disabled=!0,c.style.display="none",s.innerHTML="";const u=document.createElement("div");u.className="essay-feedback";const m=Zt(a.value,t.example_kr||""),p=An(t.example_audio);u.innerHTML=`
                    <div style="font-weight:bold; margin-bottom:5px;">Правильный ответ:</div>
                    <div style="font-size:18px; margin-bottom:10px; display:flex; align-items:center;"><span>${w(t.example_kr||"")}</span> ${p}</div>
                    <div style="font-weight:bold; margin-bottom:5px;">Ваш вариант (сравнение):</div>
                    <div style="font-size:18px;">${m}</div>
                `,e.appendChild(u);const g=document.createElement("button");g.className="quiz-option correct",g.textContent="✓ Верно",g.onclick=()=>n(!0);const f=document.createElement("button");f.className="quiz-option incorrect",f.textContent="✗ Неверно",f.onclick=()=>n(!1);const y=document.createElement("div");y.className="quiz-options",y.style.marginTop="15px",y.appendChild(g),y.appendChild(f),e.appendChild(y),_e(y)},e.appendChild(r),e.appendChild(s),e.appendChild(c);const d=Gn(s,a,l);d&&(l.onclick=()=>{const u=d.style.display==="grid";d.style.display=u?"none":"grid"}),setTimeout(()=>a.focus(),100)}},dictation:{render(t,e,n,i){const s=o.currentVoice==="male"&&t.audio_male?t.audio_male:t.audio_url;i.innerHTML='<div style="margin-bottom:15px;"><button class="audio-btn-lg" id="dictation-play-btn">🔊</button></div><div class="quiz-question-sub">Напишите услышанное</div>';const l=i.querySelector("#dictation-play-btn");l&&(l.onclick=()=>K(t.word_kr,s||null)),setTimeout(()=>K(t.word_kr,s||null),300);const r=Nt.typing;r&&r._renderInput&&r._renderInput(t,e,n)}},sprint:{render(t,e,n,i){let a=Math.random()>.5,s=t.translation;if(!a){let c;do c=o.dataStore[Math.floor(Math.random()*o.dataStore.length)];while(c&&c.id===t.id);c&&c.translation!==t.translation?s=c.translation:a=!0}i.innerHTML=`<div class="quiz-question-text">${w(t.word_kr)}</div><div class="quiz-question-sub primary large">${w(s||"")}</div>`,e.classList.add("grid-2"),e.innerHTML="";const l=document.createElement("button");l.className="quiz-option sprint-btn yes",l.textContent="ВЕРНО",l.innerHTML+='<div class="sprint-timer-bar" style="width: 100%"></div>',a&&(l.dataset.correct="true"),l.onclick=()=>be(a,l,n);const r=document.createElement("button");r.className="quiz-option sprint-btn no",r.textContent="НЕВЕРНО",r.innerHTML+='<div class="sprint-timer-bar" style="width: 100%"></div>',a||(r.dataset.correct="true"),r.onclick=()=>be(!a,r,n),e.appendChild(l),e.appendChild(r)}},audio:{render(t,e,n,i){const a=document.createElement("div"),s=document.createElement("button");s.className="audio-btn-lg",s.textContent="🔊";const r=o.currentVoice==="male"&&t.audio_male?t.audio_male:t.audio_url,c=()=>{s.style.transform="scale(0.95)",setTimeout(()=>s.style.transform="",150),K(t.word_kr,r||null)};s.onclick=c,a.appendChild(s),i.innerHTML="",i.appendChild(a),i.innerHTML+='<div class="quiz-question-sub" style="margin-top:15px;">Выберите перевод</div>',setTimeout(c,300),e.innerHTML="",It(t).forEach(d=>{const u=document.createElement("button");u.className="quiz-option",u.textContent=d.translation,d.id===t.id&&(u.dataset.correct="true"),u.onclick=()=>be(d.id===t.id,u,n),e.appendChild(u)}),_e(e)}},dialogue:{render(t,e,n,i){const a=t.example_kr||"",r=(new RegExp(jt(t.word_kr),"gi").test(a)?a:`${a} 

(Слово: ${t.word_kr})`).replace(new RegExp(jt(t.word_kr),"gi"),"_______");i.innerHTML=`<div style="text-align:center; margin-bottom:20px;">
                <button class="audio-btn-lg" id="dialogue-play-btn">▶️</button>
                <div id="dialogue-text" style="margin-top:15px; font-size:18px; line-height:1.5; white-space: pre-line;"></div>
                <div style="margin-top:10px; color:var(--text-sub); font-size:14px;">Какое слово пропущено?</div>
            </div>`;const c=i.querySelector("#dialogue-text");c&&(c.textContent=r);const d=i.querySelector("#dialogue-play-btn"),u=()=>K(t.example_kr||"No text",t.example_audio||null);d&&(d.onclick=u),setTimeout(u,400),It(t).forEach(m=>{const p=document.createElement("button");p.className="quiz-option",p.textContent=m.word_kr,m.id===t.id&&(p.dataset.correct="true"),p.onclick=()=>be(m.id===t.id,p,n),e.appendChild(p)}),_e(e)}},scramble:{render(t,e,n,i){const a=(t.example_kr||"").trim(),s=a.split(/\s+/).filter(f=>f);i.innerHTML=`<div id="scramble-ru" class="quiz-question-text small primary"></div>
            <div id="scramble-target" class="scramble-container" style="background:white; border-color:var(--primary);"></div>
            <div id="scramble-source" class="scramble-container"></div>`;const l=i.querySelector("#scramble-ru");l&&(l.textContent=`"${t.example_ru||"..."}"`);const r=document.getElementById("scramble-source"),c=document.getElementById("scramble-target");if(!r||!c)return;e.innerHTML="";const d=document.createElement("button");d.className="btn",d.style.cssText="margin-bottom: 15px; padding: 8px 16px; font-size: 14px; display: none; background: var(--surface-3); color: var(--text-main);",d.innerHTML="↺ Сброс";const u=document.createElement("button");u.className="btn btn-quiz",u.style.cssText="width: 100%; margin-top: 15px; display: none;",u.textContent="Проверить",d.onclick=()=>{m.length=0,c&&(c.style.background=""),c&&(c.style.borderColor=""),e.querySelectorAll(".next-btn-group").forEach(y=>y.remove()),u.disabled=!1,u.style.display="none",g()},e.appendChild(d);const m=[],p=s.map((f,y)=>({text:f,id:y})).sort(()=>Math.random()-.5),g=()=>{r&&(r.innerHTML=""),c&&(c.innerHTML=""),d.style.display=m.length>0?"inline-block":"none",u.style.display=m.length>0?"block":"none",m.forEach((f,y)=>{const b=document.createElement("div");b.className="scramble-chip",b.textContent=f.text,b.onclick=()=>{F("pop"),m.splice(y,1),g()},c&&c.appendChild(b)}),p.forEach(f=>{if(m.find(b=>b.id===f.id))return;const y=document.createElement("div");y.className="scramble-chip",y.textContent=f.text,y.onclick=()=>{F("pop"),m.push(f),g()},r&&r.appendChild(y)})};u.onclick=()=>{const y=m.map(x=>x.text).join(" ")===a;if(u.disabled=!0,y)c&&(c.style.borderColor="var(--success)",c.style.background="#d1fae5",setTimeout(()=>{K(a,t.example_audio||null)},100));else{c&&(c.style.borderColor="var(--danger)",c.style.background="#fee2e2");const x=document.createElement("div");x.className="essay-feedback";const E=An(t.example_audio);x.innerHTML=`<div style="font-weight:bold; margin-bottom:5px;">Правильный ответ:</div><div style="font-size:18px; display:flex; align-items:center;"><span>${w(a)}</span> ${E}</div>`,e.appendChild(x)}n(y,!1);const b=document.createElement("button");b.className="btn btn-quiz next-btn-group",b.style.marginTop="15px",b.style.width="100%",b.textContent="Далее ➡",b.onclick=()=>n(null,!0,!0),e.appendChild(b),u.style.display="none"},g(),e.appendChild(u)}},confusing:{render(t,e,n,i){i.innerHTML=`<div class="quiz-question-text primary">"${w(t.translation||"")}"</div><div class="quiz-question-sub">Выберите правильное слово</div>`,e.innerHTML="";let l=[...Ha().find(r=>r.find(c=>c.id===t.id))||[t]];for(;l.length<4&&o.dataStore.length>4;){const r=o.dataStore[Math.floor(Math.random()*o.dataStore.length)];r&&!l.find(c=>c.id===r.id)&&l.push(r)}l=l.slice(0,4).sort(()=>Math.random()-.5),l.forEach(r=>{const c=document.createElement("button");c.className="quiz-option",c.textContent=r.word_kr,r.id===t.id&&(c.dataset.correct="true"),c.onclick=()=>be(r.id===t.id,c,n),e.appendChild(c)}),_e(e)}},synonyms:{render(t,e,n,i){i.innerHTML=`<div class="quiz-question-text primary">${w(t.word_kr)}</div><div class="quiz-question-sub">Найдите синоним</div>`,e.innerHTML="";const a=(t.synonyms||"").split(/[,;]/).map(r=>r.trim()).filter(r=>r),l=[{text:a[Math.floor(Math.random()*a.length)],correct:!0}];for(;l.length<4&&o.dataStore.length>4;){const r=o.dataStore[Math.floor(Math.random()*o.dataStore.length)];r&&r.word_kr!==t.word_kr&&!a.includes(r.word_kr)&&!l.find(c=>c&&c.text===r.word_kr)&&l.push({text:r.word_kr,correct:!1})}l.sort(()=>Math.random()-.5),l.forEach(r=>{const c=document.createElement("button");c.className="quiz-option",c.textContent=r.text,r.correct&&(c.dataset.correct="true"),c.onclick=()=>be(r.correct,c,n),e.appendChild(c)}),_e(e)}},antonyms:{render(t,e,n,i){i.innerHTML=`<div class="quiz-question-text danger">${w(t.word_kr)}</div><div class="quiz-question-sub">Найдите антоним</div>`,e.innerHTML="";const a=(t.antonyms||"").split(/[,;]/).map(r=>r.trim()).filter(r=>r),l=[{text:a[Math.floor(Math.random()*a.length)],correct:!0}];for(;l.length<4&&o.dataStore.length>4;){const r=o.dataStore[Math.floor(Math.random()*o.dataStore.length)];r&&r.word_kr!==t.word_kr&&!a.includes(r.word_kr)&&!l.find(c=>c&&c.text===r.word_kr)&&l.push({text:r.word_kr,correct:!1})}l.sort(()=>Math.random()-.5),l.forEach(r=>{const c=document.createElement("button");c.className="quiz-option",c.textContent=r.text,r.correct&&(c.dataset.correct="true"),c.onclick=()=>be(r.correct,c,n),e.appendChild(c)}),_e(e)}},association:{render(t,e,n,i){i.innerHTML='<div class="quiz-question-sub">Соедините слово с переводом</div>',e.innerHTML="";const a=ur();if(a.length<5){i.innerText="Недостаточно слов для этого режима.",setTimeout(()=>Tn(!0),1500);return}const s=a.map(m=>m.left).sort(()=>Math.random()-.5),l=a.map(m=>m.right).sort(()=>Math.random()-.5);let r=null,c=0;const d=(m,p)=>{const g=document.createElement("div");return g.style.display="flex",g.style.flexDirection="column",g.style.gap="10px",g.style.flex="1",m.forEach(f=>{const y=document.createElement("button");y.className="quiz-option",y.textContent=p==="left"?f.word_kr:f.translation,y.style.fontSize="14px",y.onclick=()=>{if(p==="left")r&&r.classList.remove("selected"),r=y,y.classList.add("selected"),y.dataset.wordId=String(f.id);else{if(!r)return;const b=r.dataset.wordId,x=String(f.id);a.some(k=>String(k.left.id)===b&&String(k.right.id)===x)?(r&&(r.classList.add("correct"),r.disabled=!0,r.classList.remove("selected")),y.classList.add("correct"),y.disabled=!0,r=null,c++,c===a.length?n(!0):F("success",100),b&&gt(b,!0)):(F("failure",100),y.classList.add("incorrect"),r&&r.classList.add("incorrect"),setTimeout(()=>{y.classList.remove("incorrect"),r&&r.classList.remove("incorrect")},500))}},g.appendChild(y)}),g},u=document.createElement("div");u.style.display="flex",u.style.gap="20px",u.appendChild(d(s,"left")),u.appendChild(d(l,"right")),e.appendChild(u)}},pronunciation:{render(t,e,n,i){let a=t.word_kr,s=!1;const l=()=>{s?i.innerHTML=`<div class="quiz-question-text small" style="font-size: 1.4em;">"${w(t.example_kr||"")}"</div><div class="quiz-question-sub">${w(t.example_ru||"")}</div>`:i.innerHTML=`<div class="quiz-question-text">${w(t.word_kr)}</div><div class="quiz-question-sub">${w(t.translation||"")}</div>`};l(),e.innerHTML="";const r=document.createElement("div");if(r.style.display="flex",r.style.flexDirection="column",r.style.alignItems="center",r.style.margin="0 auto",r.style.width="100%",r.style.maxWidth="500px",t.example_kr&&t.example_kr.length>2){const f=document.createElement("div");f.className="segment-control",f.style.marginBottom="20px",f.style.width="100%";const y=document.createElement("button");y.className="segment-btn active",y.textContent="Слово";const b=document.createElement("button");b.className="segment-btn",b.textContent="Пример";const x=E=>{s=E,a=E?t.example_kr||"":t.word_kr,E?(y.classList.remove("active"),b.classList.add("active")):(y.classList.add("active"),b.classList.remove("active")),l();const k=r.querySelector(".essay-feedback");k&&(k.style.display="none");const T=r.querySelector(".quiz-hint");T&&(T.style.display="block",T.textContent="Нажмите и произнесите "+(E?"предложение":"слово"),T.style.color="var(--text-sub)");const I=r.querySelector(".pronunciation-controls");I&&(I.style.display="flex");const C=r.querySelector(".audio-btn-lg");C&&(C.style.backgroundColor="",C.classList.remove("pulse-red-effect"))};y.onclick=()=>x(!1),b.onclick=()=>x(!0),f.appendChild(y),f.appendChild(b),r.appendChild(f)}const c=document.createElement("div");c.className="pronunciation-controls",c.style.cssText="display: flex; gap: 20px; align-items: center; justify-content: center; width: 100%; margin-top: 10px; margin-bottom: 20px;";const d=document.createElement("button");d.className="btn-icon",d.style.cssText="width: 50px; height: 50px; font-size: 24px; background: var(--surface-2); color: var(--text-main); border: 1px solid var(--border-color);",d.innerHTML="🔊",d.onclick=()=>{const f=s?t.example_audio:o.currentVoice==="male"&&t.audio_male?t.audio_male:t.audio_url;K(a,f||null)};const u=document.createElement("button");u.className="audio-btn-lg",u.style.margin="0",u.innerHTML="🎤";const m=document.createElement("div");m.className="quiz-hint",m.style.cssText="color: var(--text-sub); margin-bottom: 20px; min-height: 24px;",m.textContent="Нажмите и произнесите слово";const p=document.createElement("canvas");p.style.width="100%",p.style.height="120px",p.style.borderRadius="12px",p.style.background="var(--surface-3)",p.style.marginBottom="20px",p.style.display="none";const g=document.createElement("div");g.className="essay-feedback",g.style.display="none",g.style.width="100%",c.appendChild(d),c.appendChild(u),r.appendChild(c),r.appendChild(m),r.appendChild(p),r.appendChild(g),e.appendChild(r),u.onclick=()=>{m.textContent="Слушаю...",m.style.color="var(--primary)",u.style.backgroundColor="var(--danger)",u.classList.add("pulse-red-effect"),p.style.display="block";const f=window.devicePixelRatio||1;p.width=p.offsetWidth*f,p.height=p.offsetHeight*f,$a(a,u,(y,b,x,E)=>{u.style.backgroundColor="",u.classList.remove("pulse-red-effect"),m.style.display="none",p.style.display="none";const k=y>=60;g.style.display="block";const T=k?"var(--success)":"var(--danger)",I=k?"✅":"❌",C=k?"Отлично!":"Попробуйте еще раз",R=E?`<div style="font-size: 18px; letter-spacing: 1px; word-break: break-all;">${E}</div>`:`<div style="font-size: 16px; font-weight: 600; color: var(--text-main);">${w(b||"...")}</div>`;g.innerHTML=`
              <div style="text-align: center; margin-bottom: 15px;">
                <div style="font-size: 40px; margin-bottom: 5px;">${I}</div>
                <div style="font-size: 20px; font-weight: 800; color: ${T};">${C}</div>
                
                <div style="margin-top: 15px; padding: 0 10px;">
                    <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 5px; font-weight: 600;">
                        <span style="color: var(--text-sub);">Точность</span>
                        <span style="color: ${T};">${y}%</span>
                    </div>
                    <div style="height: 10px; background: var(--surface-2); border-radius: 5px; overflow: hidden; border: 1px solid var(--border-color);">
                        <div style="width: ${y}%; background: ${T}; height: 100%; transition: width 1s ease-out; border-radius: 5px;"></div>
                    </div>
                </div>
              </div>
              
              <div style="background: var(--surface-2); padding: 12px; border-radius: 12px; margin-bottom: 15px; border: 1px solid var(--border-color);">
                <div style="font-size: 12px; color: var(--text-sub); margin-bottom: 4px;">Распознано:</div>
                ${R}
              </div>
            `;const L=document.createElement("div");L.style.cssText="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;";const q=document.createElement("button");if(q.className="btn",q.style.cssText="padding: 10px; font-size: 13px; background: var(--surface-3); color: var(--text-main); border: 1px solid var(--border-color); justify-content: center;",q.innerHTML="🔊 Оригинал",q.onclick=()=>{const J=s?t.example_audio:o.currentVoice==="male"&&t.audio_male?t.audio_male:t.audio_url;K(a,J||null)},L.appendChild(q),x){const J=document.createElement("button");J.className="btn",J.style.cssText="padding: 10px; font-size: 13px; background: var(--primary-light); color: var(--primary); border: 1px solid var(--primary); justify-content: center;",J.innerHTML="▶️ Моя запись";const X=new Audio(x);J.onclick=()=>X.play(),L.appendChild(J),setTimeout(async()=>{const O=s?t.example_audio:o.currentVoice==="male"&&t.audio_male?t.audio_male:t.audio_url;await K(a,O||null),setTimeout(()=>X.play().catch(()=>{}),500)},600)}else q.style.gridColumn="1 / -1";g.appendChild(L);const U=document.createElement("button");U.className="btn btn-quiz",U.style.width="100%",U.textContent="Далее ➡",U.onclick=()=>n(null,!0,!0),g.appendChild(U),c.style.display="none",n(k,!1)},p,y=>{m.textContent=y,m.style.color="var(--text-main)"})}}}};Nt["true-false"]=Nt.sprint;class tt{initialTimer=0;isTimerCountdown=!1;initialLives=0;getWords(e){const n=e.filter(a=>!o.learned.has(a.id)),i=e.filter(a=>o.learned.has(a.id));return n.sort(()=>Math.random()-.5),i.sort(()=>Math.random()-.5),n.concat(i).slice(0,10)}onTick(e,n=1){const i=e+n,a=Math.floor(i/60),s=i%60;return{gameOver:!1,nextTimer:i,ui:{text:`${String(a).padStart(2,"0")}:${String(s).padStart(2,"0")}`,barPercent:100,isDanger:!1}}}onAnswer(e,n,i){return{timeChange:0,livesChange:0,gameOver:!1,streak:0}}onEnd(e){}}class pr extends tt{initialTimer=o.userStats.sprintTimer||60;isTimerCountdown=!0;streak=0;getWords(e){const n=e.filter(s=>!o.learned.has(s.id)),i=e.filter(s=>o.learned.has(s.id));let a=n.concat(i).sort(()=>Math.random()-.5);if(a.length>0&&a.length<100){const s=[...a];for(;a.length<100;)a=a.concat(s)}return a.slice(0,100)}onTick(e,n=1){const i=e-n,a=Math.max(0,i/60*100);return{gameOver:i<=0,nextTimer:i,ui:{text:`⏳ ${i}`,barPercent:a,isDanger:i<10}}}onAnswer(e,n,i){if(e){this.streak++;let a=2,s="+2 сек!";return this.streak>=10?(a=5,s=`🔥 КОМБО x${this.streak}! +5 сек`,Ae(s)):this.streak>=5?(a=3,s=`⚡ Комбо x${this.streak}! +3 сек`,h(s,1e3)):h(s,800),{timeChange:a,livesChange:0,gameOver:!1,streak:this.streak}}else return this.streak=0,h("-5 сек!",800),{timeChange:-5,livesChange:0,gameOver:!1,streak:0}}onEnd(e){e>o.userStats.sprintRecord&&(o.userStats.sprintRecord=e,Ae(`🏆 Рекорд: ${e}!`))}}class fr extends tt{initialTimer=30;isTimerCountdown=!0;initialLives=3;streak=0;getWords(e){const n=e.filter(s=>!o.learned.has(s.id)),i=e.filter(s=>o.learned.has(s.id));let a=n.concat(i).sort(()=>Math.random()-.5);if(a.length>0&&a.length<200){const s=[...a];for(;a.length<200;)a=a.concat(s)}return a.slice(0,200)}onTick(e,n=1){const i=e-n,a=Math.min(100,Math.max(0,i/30*100));return{gameOver:i<=0,nextTimer:i,ui:{text:`⏳ ${i}s`,barPercent:a,isDanger:i<5}}}onAnswer(e,n,i){if(e){this.streak++;let a=3,s="+3 сек!";return this.streak>=10?(a=5,s=`🔥 КОМБО x${this.streak}! +5 сек`,Ae(s)):this.streak>=5?(a=4,s=`⚡ Комбо x${this.streak}! +4 сек`,h(s,1e3)):h(s,800),{timeChange:a,livesChange:0,gameOver:!1,streak:this.streak}}else return this.streak=0,i-1<=0?(h("☠️ Жизни закончились!"),{timeChange:0,livesChange:-1,gameOver:!0,streak:0}):(h("💔 Минус жизнь!",800),{timeChange:0,livesChange:-1,gameOver:!1,streak:0})}onEnd(e){e>o.userStats.survivalRecord&&(o.userStats.survivalRecord=e)}}class gr extends tt{getWords(e){const n=new Date().getDay()===0,i=n?7:3,a=n?3:2,s=i+a,l=[],r=[];for(let d=0;d<e.length;d++){const u=e[d];o.learned.has(u.id)?r.push(u):l.push(u)}l.sort(()=>Math.random()-.5),r.sort(()=>Math.random()-.5);let c=[...l.slice(0,i),...r.slice(0,a)];if(c.length<s){const d=new Set(c.map(p=>p.id)),u=[],m=[];for(let p=0;p<e.length;p++){const g=e[p];d.has(g.id)||(g.level==="★☆☆"?u.push(g):m.push(g))}u.sort(()=>Math.random()-.5),c=c.concat(u.slice(0,s-c.length)),c.length<s&&(m.sort(()=>Math.random()-.5),c=c.concat(m.slice(0,s-c.length)))}return c}onEnd(e){const n=new Date().toLocaleDateString("en-CA"),i=new Date;i.setDate(i.getDate()-1);const a=i.toLocaleDateString("en-CA");let s=o.dailyChallenge.streak||0;o.dailyChallenge.lastDate===a?s++:o.dailyChallenge.lastDate!==n&&(s=1);const r=new Date().getDay()===0?2:1,c=50*r,d=Math.min(s,7)*10*r,u=c+d,m=50*r;vt(m),o.userStats.coins+=u,Sn(),Me(),o.dailyChallenge={lastDate:n,completed:!0,streak:s},localStorage.setItem("daily_challenge_v1",JSON.stringify(o.dailyChallenge)),Ae(`🔥 Вызов пройден!
+${m} XP | +${u} 💰
Серия: ${s} дн.`);const p=window.innerWidth<768;ve({particleCount:p?80:150,spread:p?50:70,origin:{y:.6},disableForReducedMotion:!0})}}class vr extends tt{getWords(e){const n=Ha();return n.length===0?[]:n.flat().sort(()=>Math.random()-.5).slice(0,20)}}class hr extends tt{getWords(e){return Array(3).fill({id:"dummy"})}}class Xt extends tt{constructor(e){super(),this.filterFn=e}getWords(e){const n=e.filter(this.filterFn);return super.getWords(n)}}function Na(t){switch(t){case"sprint":return new pr;case"survival":return new fr;case"daily":case"super-daily":return new gr;case"confusing":return new vr;case"association":return new hr;case"scramble":case"essay":return new Xt(e=>!!(e.example_kr&&e.example_kr.length>5&&e.example_ru));case"dialogue":return new Xt(e=>e.type==="dialogue"&&!!(e.example_audio&&e.example_kr));case"synonyms":return new Xt(e=>!!(e.synonyms&&e.synonyms.trim().length>0));case"antonyms":return new Xt(e=>!!(e.antonyms&&e.antonyms.trim().length>0));default:return new tt}}let $,P=[],Y,pi,Kt,he="all",Q="all",j="all",ke="",Ee=null,dt=0,Qe=0,Te=0,He=!1,Ce=null,G=null,Ut=0,je=0,Ne=!1,ut=[],mt=null;function Ua(){const t=document.querySelector(".fire-btn");if(!t)return;const e=new Date().toLocaleDateString("en-CA"),n=new Date;n.setDate(n.getDate()-1);const i=n.toLocaleDateString("en-CA"),a=o.dailyChallenge||{lastDate:null,completed:!1,streak:0},s=a.lastDate===e&&a.completed,l=(a.streak||0)>0&&!s&&a.lastDate===i,r=(a.streak||0)>=7;new Date().getDay()===0?(t.classList.add("super-challenge"),t.innerHTML="🌟",t.title="Супер-вызов (x2 Награда)"):(t.classList.remove("super-challenge"),t.innerHTML="🔥",t.title="Ежедневный вызов"),s?(t.classList.remove("has-notification"),t.classList.remove("streak-risk")):(t.classList.add("has-notification"),l?t.classList.add("streak-risk"):t.classList.remove("streak-risk")),r?t.classList.add("streak-master"):t.classList.remove("streak-master")}function yr(){const t=new Date().toLocaleDateString("en-CA"),e=o.dailyChallenge&&o.dailyChallenge.lastDate===t&&o.dailyChallenge.completed;new Date().getDay()===0&&!e&&setTimeout(()=>{h("🌟 Сегодня доступен СУПЕР-ВЫЗОВ! (x2 Награда)",5e3)},2e3)}function br(){xr();const t=document.querySelector("#quiz-modal .modal-header");t&&(t.style.display="flex");const e=document.getElementById("quiz-game");e&&(e.style.display="none");const n=document.getElementById("quiz-mode-selector");n&&(n.style.display="flex");const i=document.getElementById("quiz-controls-wrapper");i&&i.classList.remove("hidden");const a=[{id:"mix",emoji:"🔀",label:"Микс",mode:"mix",category:"challenge"},{id:"sprint",emoji:"⚡",label:"Спринт",mode:"sprint",category:"challenge"},{id:"survival",emoji:"☠️",label:"Выживание",mode:"survival",category:"challenge"},{id:"multiple-choice",emoji:"🎯",label:"Выбор",mode:"multiple-choice",category:"basics"},{id:"reverse",emoji:"🔄",label:"Обратно",mode:"reverse",category:"basics"},{id:"flashcard",emoji:"🃏",label:"Карточки",mode:"flashcard",category:"basics"},{id:"true-false",emoji:"✅",label:"Верно/Нет",mode:"true-false",category:"basics"},{id:"typing",emoji:"⌨️",label:"Написание",mode:"typing",category:"writing"},{id:"sentence",emoji:"📝",label:"Пропуски",mode:"sentence",category:"writing"},{id:"scramble",emoji:"🧩",label:"Конструктор",mode:"scramble",category:"writing"},{id:"essay",emoji:"✍️",label:"Эссе",mode:"essay",category:"writing"},{id:"audio",emoji:"🎧",label:"Аудио",mode:"audio",category:"audio"},{id:"dictation",emoji:"✍️",label:"Диктант",mode:"dictation",category:"audio"},{id:"dialogue",emoji:"💬",label:"Аудирование",mode:"dialogue",category:"audio"},{id:"pronunciation",emoji:"🎤",label:"Речь",mode:"pronunciation",category:"audio"},{id:"association",emoji:"🔗",label:"Пары",mode:"association",category:"advanced"},{id:"confusing",emoji:"🤔",label:"Похожие",mode:"confusing",category:"advanced"},{id:"synonyms",emoji:"🤝",label:"Синонимы",mode:"synonyms",category:"advanced"},{id:"antonyms",emoji:"↔️",label:"Антонимы",mode:"antonyms",category:"advanced"}],s={challenge:"🔥 Вызовы",basics:"📚 Основы",writing:"✍️ Письмо",audio:"🎧 Аудирование",advanced:"🧠 Продвинутый"};Q=o.quizTopic||"all",j=o.quizCategory||"all",he=o.quizDifficulty||"all",ke="";const l=document.getElementById("quiz-search-input");l&&(l.parentElement&&(l.parentElement.style.display="none"),l.value="",l.oninput=c=>{const d=c.target;d&&(ke=d.value.trim().toLowerCase(),Et())}),Pa(),Va();const r=document.getElementById("quiz-mode-selector");if(r){r.innerHTML="";const c=Object.create(null);a.forEach(d=>{c[d.category]||(c[d.category]=[]),c[d.category].push(d)}),Object.entries(s).forEach(([d,u])=>{if(c[d]){const m=document.createElement("div");m.className="quiz-category-header",m.textContent=u,r.appendChild(m);const p=document.createElement("div");p.className="quiz-group-grid",c[d].forEach(g=>{const f=document.createElement("button");f.className="quiz-mode-btn",f.dataset.mode=g.mode,f.innerHTML=`<span class="mode-icon">${g.emoji}</span><span class="mode-label">${g.label}</span>`,f.onclick=y=>{wr(y,f),g.mode==="audio"?(z("quiz-modal"),setTimeout(()=>jo(),100)):setTimeout(()=>Er(g.mode),300)},p.appendChild(f)}),r.appendChild(p)}})}Et()}function xr(){const t=document.getElementById("sprint-time-select");if(!t)return;const e=[30,60,90];t.innerHTML="",e.forEach(n=>{const i=document.createElement("option");i.value=String(n),i.textContent=`${n} сек.`,t.appendChild(i)}),o.userStats.sprintTimer?t.value=String(o.userStats.sprintTimer):t.value="60",t.onchange=()=>{const n=t.value;isNaN(Number(n))||(o.userStats.sprintTimer=Number(n),localStorage.setItem("user_stats_v5",JSON.stringify(o.userStats)),h(`Время в спринте: ${n} сек.`))}}function wr(t,e){const n=document.createElement("span"),i=Math.max(e.clientWidth,e.clientHeight),a=i/2,s=e.getBoundingClientRect();n.style.width=n.style.height=`${i}px`,n.style.left=`${t.clientX-s.left-a}px`,n.style.top=`${t.clientY-s.top-a}px`,n.classList.add("ripple");const l=e.getElementsByClassName("ripple")[0];l&&l.remove(),e.appendChild(n)}function Pa(){const t=document.getElementById("quiz-topic-select");if(!t||!o.dataStore)return;const e=new Set;o.dataStore.forEach(n=>{if(n.type===o.currentType){const i=n.topic||n.topic_ru||n.topic_kr;i&&e.add(i)}}),t.innerHTML='<option value="all">Все темы</option>',Array.from(e).sort().forEach(n=>{if(n){const i=document.createElement("option");i.value=n,i.textContent=n,t.appendChild(i)}}),Q!=="all"&&!e.has(Q)&&(Q="all",o.quizTopic="all",localStorage.setItem("quiz_topic_v1","all")),t.value=Q,t.onchange=()=>{Q=t.value,j="all",o.quizTopic=Q,o.quizCategory=j,localStorage.setItem("quiz_topic_v1",Q),localStorage.setItem("quiz_category_v1",j),Ri(),Et()},Ri()}function Ri(){const t=document.getElementById("quiz-category-select");if(!t||!o.dataStore)return;const e=new Set;o.dataStore.forEach(n=>{if(n.type!==o.currentType)return;const i=n.topic||n.topic_ru||n.topic_kr;if(Q!=="all"&&i!==Q)return;const a=n.category||n.category_ru||n.category_kr;a&&e.add(a)}),t.innerHTML='<option value="all">Все категории</option>',Array.from(e).sort().forEach(n=>{if(n){const i=document.createElement("option");i.value=n,i.textContent=n,t.appendChild(i)}}),j!=="all"&&!e.has(j)&&(j="all",o.quizCategory="all",localStorage.setItem("quiz_category_v1","all")),t.value=j,t.onchange=()=>{j=t.value,o.quizCategory=j,localStorage.setItem("quiz_category_v1",j),Et()}}function Va(){const t=document.getElementById("quiz-difficulty");if(!t)return;t.innerHTML="",["all","★★★","★★☆","★☆☆"].forEach(n=>{const i=document.createElement("button");i.className="quiz-difficulty-btn",i.dataset.lvl=n,n===he&&i.classList.add("active"),i.textContent=n==="all"?"Все уровни":n,i.onclick=()=>{he=n,t.querySelectorAll(".quiz-difficulty-btn").forEach(a=>a.classList.remove("active")),i.classList.add("active"),o.quizDifficulty=n,localStorage.setItem("quiz_difficulty_v1",n),Et()},t.appendChild(i)})}function Er(t){$=t,G=Na(t),_n();const e=p=>{if(p.type!==o.currentType)return!1;const g=p.topic_ru||p.topic_kr,f=Q==="all"||g===Q,y=p.category_ru||p.category_kr,b=j==="all"||y===j,x=he==="all"||p.level===he,E=!ke||p._searchStr&&p._searchStr.includes(ke);return f&&b&&x&&E},n=o.dataStore.filter(e);if(P=G.getWords(n),P.length===0){if(t==="confusing"){h("Не найдено похожих слов для тренировки!");return}if(Q!=="all"||j!=="all"?h("Нет слов для тренировки в выбранной теме!"):P=o.dataStore.slice(0,10),P.length===0)return}const i=new Map;P.forEach(p=>{i.has(p.id)||i.set(p.id,p)}),P=Array.from(i.values()),Y=0,pi=Date.now(),Kt=Date.now(),dt=0,Ut=0,je=0,ut=[],Qe=G.initialTimer,Te=G.initialLives,He=!1,Ne=!1,mt&&clearTimeout(mt),mt=null;const a=document.getElementById("quiz-combo");a&&(a.style.display="none");const s=document.getElementById("quiz-progress-fill");s&&(s.style.transition="",s.style.background=""),G.isTimerCountdown&&s&&(s.style.transition="width 1s linear, background-color 1s linear"),Ee&&(clearInterval(Ee),Ee=null),Ee=window.setInterval(()=>{const p=Date.now();if(p-Kt<100||He||!G||!G.onTick||Ne)return;const g=Math.round((p-Kt)/1e3);if(g<1)return;const{gameOver:f,nextTimer:y,ui:b}=G.onTick(Qe,g);if(Qe=y,Kt=p,b){const x=document.getElementById("quiz-timer-display");x&&(x.innerText=b.text,x.style.color=b.isDanger?"var(--danger)":"",b.isDanger&&(F("tick"),x.style.transform="scale(1.15)",setTimeout(()=>x.style.transform="",200))),s&&(s.style.width=`${b.barPercent}%`,G.isTimerCountdown?s.style.backgroundColor=`hsl(${Math.floor(b.barPercent/100*120)}, 80%, 45%)`:s.style.backgroundColor="",!Ne&&s.style.backgroundColor==="var(--info)"&&(s.style.backgroundColor="")),document.querySelectorAll(".sprint-timer-bar").forEach(k=>{k.style.width=`${b.barPercent}%`})}f&&Ue(!1)},1e3);const l=document.getElementById("quiz-mode-selector");l&&(l.style.display="none");const r=document.querySelector("#quiz-modal .modal-header");r&&(r.style.display="none");const c=document.getElementById("quiz-controls-wrapper");c&&c.classList.add("hidden");const d=document.getElementById("quiz-game");d&&(d.style.display="flex");const u=document.querySelector("#quiz-modal .modal-body-container");u&&(u.scrollTop=0),et(!0);const m=document.querySelector("#quiz-modal .modal-content");if(m&&m.classList.add("game-active"),wt(),Xe(),t==="pronunciation"){const p="pronunciation_hint_seen";localStorage.getItem(p)||setTimeout(()=>{h("🎙️ Нажмите на микрофон и произнесите слово. Говорите четко!",5e3),localStorage.setItem(p,"true")},1e3)}}function Fa(){const t=new Date().toLocaleDateString("en-CA");if(o.dailyChallenge&&o.dailyChallenge.lastDate===t&&o.dailyChallenge.completed){ja();return}const e=()=>{const i=new Date().getDay()===0;if($=i?"super-daily":"daily",G=Na($),_n(),P=G.getWords(o.dataStore),!P||P.length===0){h("⚠️ Недостаточно слов для вызова. Добавьте больше слов в словарь.");return}Y=0,pi=Date.now(),dt=0,Ut=0,je=0,ut=[];const a=document.getElementById("quiz-mode-selector");a&&(a.style.display="none");const s=document.querySelector("#quiz-modal .modal-header");s&&(s.style.display="none");const l=document.getElementById("quiz-controls-wrapper");l&&l.classList.add("hidden");const r=document.getElementById("quiz-game");r&&(r.style.display="flex"),et(!0),wt(),Xe(),h(i?"🌟 СУПЕР-ВЫЗОВ начат! (x2 Награда)":"🔥 Ежедневный вызов начат!")},n=document.getElementById("quiz-modal");n&&!n.classList.contains("active")?(N("quiz-modal"),setTimeout(e,400)):e()}function ja(){const t=new Date,e=new Date(t.getFullYear(),t.getMonth(),t.getDate()+1),n=e.getTime()-t.getTime(),i=Math.floor(n/(1e3*60*60)),a=Math.floor(n%(1e3*60*60)/(1e3*60)),s=o.dailyChallenge.streak||0,l=e.getDay()===0,r=l?2:1,c=s+1,d=50*r,u=Math.min(c,7)*10*r,m=d+u;let p=document.getElementById("daily-status-modal");p||(p=document.createElement("div"),p.id="daily-status-modal",p.className="modal",p.setAttribute("role","dialog"),p.onclick=y=>{y.target===p&&z("daily-status-modal")},document.body.appendChild(p)),p.innerHTML=`
        <div class="modal-content modal-centered" style="text-align: center; max-width: 350px;">
            <div style="position: absolute; top: 15px; right: 15px;">
                <button class="btn btn-icon close-modal-btn" id="daily-status-close-x">✕</button>
            </div>
            <div style="font-size: 64px; margin-bottom: 10px;">${l?"🌟":"🔥"}</div>
            <div style="font-size: 24px; font-weight: 800; margin-bottom: 5px;">Серия: ${s} дн.</div>
            <div style="font-size: 14px; color: var(--text-sub); margin-bottom: 25px;">Вызов на сегодня выполнен!</div>
            
            <div style="background: var(--surface-2); padding: 20px; border-radius: 16px; margin-bottom: 25px; border: 1px solid var(--border-color);">
                <div style="font-size: 13px; font-weight: 700; color: var(--text-sub); text-transform: uppercase; margin-bottom: 10px;">
                    ${l?"🌟 Супер-награда завтра":"Награда завтра"}
                </div>
                <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                    <div style="font-size: 32px; font-weight: 900; color: var(--gold);">${m}</div>
                    <div style="font-size: 24px;">💰</div>
                </div>
                <div style="font-size: 12px; color: var(--text-sub); margin-top: 5px;">
                    (${d} база + ${u} бонус серии)
                </div>
            </div>

            <div style="font-size: 14px; color: var(--text-sub); margin-bottom: 10px;">До следующего вызова:</div>
            <div style="font-size: 28px; font-weight: 800; font-family: monospace; color: var(--primary); margin-bottom: 25px;">
                ${i}ч ${String(a).padStart(2,"0")}м
            </div>
            
            <button class="btn btn-quiz" style="width: 100%; padding: 15px; font-size: 16px;" id="daily-status-close-btn">Отлично</button>
        </div>
    `;const g=p.querySelector("#daily-status-close-x");g&&(g.onclick=()=>z("daily-status-modal"));const f=p.querySelector("#daily-status-close-btn");f&&(f.onclick=()=>z("daily-status-modal")),N("daily-status-modal")}function wt(){if(Y>=P.length){Ue();return}const t=document.getElementById("quiz-opts"),e=document.getElementById("quiz-extra-info");e&&e.remove(),t&&(t.className="quiz-options"),t&&t.querySelectorAll(".quiz-option").forEach(c=>c.disabled=!1);const n=document.getElementById("quiz-progress-fill");n&&(n.style.backgroundColor=""),Sr(),Xe();const i=P[Y],a=document.getElementById("quiz-score");a&&(a.innerText=`Вопрос ${Y+1} / ${P.length}`),$==="survival"&&a&&(a.innerText=`❤️ ${Te}`);const s=document.getElementById("quiz-q");let l=$;if($==="daily"||$==="super-daily"){const c=["multiple-choice","reverse"];(i.audio_url||i.audio_male)&&c.push("audio"),l=c[Math.floor(Math.random()*c.length)]}else if($==="mix"){const c=["multiple-choice","reverse","typing","flashcard","true-false"];(i.audio_url||i.audio_male)&&(c.push("audio"),c.push("dictation")),i.example_kr&&i.example_ru&&i.example_kr.length>5&&(c.push("sentence"),c.push("scramble")),i.synonyms&&i.synonyms.trim()&&c.push("synonyms"),i.antonyms&&i.antonyms.trim()&&c.push("antonyms"),("webkitSpeechRecognition"in window||"SpeechRecognition"in window)&&c.push("pronunciation"),l=c[Math.floor(Math.random()*c.length)]}$==="association"&&(l="association"),$==="pronunciation"&&(l="pronunciation"),$==="confusing"&&(l="confusing"),$==="synonyms"&&(l="synonyms"),$==="antonyms"&&(l="antonyms"),$==="survival"&&(l="multiple-choice"),(Nt[l]||Nt["multiple-choice"]).render(i,t,(c,d,u)=>{if(u||c===null){Y<P.length-1?(Y++,wt()):Ue(!1);return}_r(c,d)},s)}function Sr(){try{for(let t=1;t<=3;t++){const e=P[Y+t];if(e){let n=e.audio_url;if(o.currentVoice==="male"&&e.audio_male&&(n=e.audio_male),n){const i=new Audio;i.src=n,i.preload="auto"}}}}catch{}}function kr(t,e){let n=document.getElementById("mistake-explanation-modal");n||(n=document.createElement("div"),n.id="mistake-explanation-modal",n.className="modal",n.setAttribute("role","dialog"),n.innerHTML=`
      <div class="modal-content modal-centered" style="text-align: center; max-width: 350px; padding: 25px 20px;">
        <div style="font-size: 48px; margin-bottom: 15px;">❌</div>
        <div style="font-size: 20px; font-weight: 800; color: var(--danger); margin-bottom: 15px;">Неверно</div>
        <div id="mistake-word-info" style="margin-bottom: 25px; text-align: left; background: var(--surface-2); padding: 15px; border-radius: 12px; border: 1px solid var(--border-color);"></div>
        <button class="btn btn-quiz" id="mistake-continue-btn" style="width: 100%;">Продолжить</button>
      </div>
    `,document.body.appendChild(n));const i=n.querySelector("#mistake-word-info");if(i){let l=`
        <div style="font-size: 18px; font-weight: 700; color: var(--text-main); margin-bottom: 4px;">${w(t.word_kr)}</div>
        <div style="font-size: 15px; color: var(--text-sub);">${w(t.translation)}</div>
      `;t.example_kr&&(l+=`
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed var(--border-color);">
                <div style="font-size: 11px; font-weight: 700; color: var(--text-tertiary); margin-bottom: 4px; text-transform: uppercase;">Пример</div>
                <div style="font-size: 14px; color: var(--text-main); margin-bottom: 4px; line-height: 1.4;">${w(t.example_kr)}</div>
                <div style="font-size: 13px; color: var(--text-sub); line-height: 1.4;">${w(t.example_ru||"")}</div>
            </div>
          `),i.innerHTML=l}const a=n.querySelector("#mistake-continue-btn"),s=a.cloneNode(!0);a.parentNode&&a.parentNode.replaceChild(s,a),s.onclick=()=>{z("mistake-explanation-modal"),e()},N("mistake-explanation-modal"),setTimeout(()=>s.focus(),100)}function _r(t,e=!0){const n=P[Y];n.id!=="dummy"&&(gt(n.id,t),Fs());let i=!1;if(o.showQuizExtraInfo&&(n.synonyms&&n.synonyms.trim()||n.antonyms&&n.antonyms.trim())){const s=document.querySelector(".quiz-body");if(s){let l=document.getElementById("quiz-extra-info");l||(l=document.createElement("div"),l.id="quiz-extra-info",l.style.cssText="margin-top: 15px; padding: 12px; background: var(--surface-2); border-radius: 12px; text-align: center; animation: fadeIn 0.3s; border: 1px solid var(--border-color); font-size: 14px;",s.appendChild(l));let r="";n.synonyms&&n.synonyms.trim()&&(r+=`<div style="margin-bottom:8px;">
            <div style="font-size:10px; font-weight:800; color:var(--text-tertiary); text-transform:uppercase; letter-spacing:1px; margin-bottom:3px;">Синонимы</div>
            <div style="font-size:14px; font-weight:600; color:var(--primary); line-height:1.4;">${w(n.synonyms)}</div>
        </div>`),n.antonyms&&n.antonyms.trim()&&(r+=`<div>
            <div style="font-size:10px; font-weight:800; color:var(--text-tertiary); text-transform:uppercase; letter-spacing:1px; margin-bottom:3px;">Антонимы</div>
            <div style="font-size:14px; font-weight:600; color:var(--danger); line-height:1.4;">${w(n.antonyms)}</div>
        </div>`),l.innerHTML=r,i=!0}}if(t){if(dt++,o.learned.add(n.id),o.mistakes.delete(n.id),je++,o.wordHistory[n.id]&&!o.wordHistory[n.id].learnedDate&&(o.wordHistory[n.id].learnedDate=Date.now()),vt(10),Ut+=10,G){const{timeChange:s,livesChange:l}=G.onAnswer(!0,Qe,Te);Qe+=s,Te+=l}qi(je),document.body.classList.add("correct-flash"),setTimeout(()=>document.body.classList.remove("correct-flash"),700)}else{o.mistakes.add(n.id),n.id!=="dummy"&&ut.push(n),je=0,vt(-2),Ut-=2;const s=document.getElementById("quiz-q");if(s&&(s.classList.remove("shake"),s.offsetWidth,s.classList.add("shake"),setTimeout(()=>s.classList.remove("shake"),500)),G){const{timeChange:l,livesChange:r,gameOver:c}=G.onAnswer(!1,Qe,Te);Qe+=l,Te+=r;const d=document.getElementById("quiz-score");if(d&&$==="survival"&&(d.innerText=`❤️ ${Te}`),$==="survival"&&r<0&&(F("life-lost"),document.body.classList.remove("damage-flash"),document.body.offsetWidth,document.body.classList.add("damage-flash"),setTimeout(()=>document.body.classList.remove("damage-flash"),600)),c){Ue(!1);return}}document.body.classList.add("wrong-flash"),setTimeout(()=>document.body.classList.remove("wrong-flash"),700),qi(0)}Me(),St(),($!=="survival"||t)&&(t&&je>1?xs(je):F(t?"success":"failure"));const a=()=>{if(!e)return;if(!t){He=!0,kr(n,()=>{He=!1,Y<P.length-1?(Y++,wt()):Ue()});return}const s=i?3e3:1500;Ce&&clearTimeout(Ce),Ce=window.setTimeout(()=>{Y<P.length-1?(Y++,wt()):Ue()},s)};t?(He=!0,ka(n).then(()=>{He=!1,a()})):a()}function Ue(t=!1){Ee&&(clearInterval(Ee),Ee=null),Ce&&(clearTimeout(Ce),Ce=null),mt&&clearTimeout(mt),Ne=!1;const e=$==="daily"||$==="super-daily",n=!t&&P.length>0&&Y>=P.length-1;if(e&&!n?h("⚠️ Вызов прерван. Награда не получена."):G&&G.onEnd&&G.onEnd(dt),($==="daily"||$==="super-daily")&&Ua(),o.sessionActive&&P&&Y>=0){const c=Y+1;o.sessions.push({date:new Date().toISOString(),duration:Math.round((Date.now()-pi)/1e3),wordsReviewed:c,accuracy:c>0?Math.round(dt/c*100):null}),localStorage.setItem("sessions_v5",JSON.stringify(o.sessions)),D()}const i=document.getElementById("quiz-game");i&&(i.style.display="none");const a=document.getElementById("quiz-mode-selector");a&&(a.style.display="flex"),et();const s=document.querySelector("#quiz-modal .modal-content");s&&s.classList.remove("game-active");const l=document.querySelector("#quiz-modal .modal-header");l&&(l.style.display="flex");const r=document.getElementById("quiz-controls-wrapper");if(r&&r.classList.remove("hidden"),t)h("Тренировка прервана");else{let c=P.length;($==="survival"||$==="sprint")&&(c=Y+1,c=Math.min(c,P.length)),Me(),Br(dt,c,Math.max(0,Ut))}}function Tn(t=!1){const e=()=>{Ee&&(clearInterval(Ee),Ee=null),Ce&&(clearTimeout(Ce),Ce=null),Ue(!0)};if(t){e();return}He=!0,le("Вы уверены, что хотите прервать тренировку?",()=>{e()},{confirmText:"Прервать",cancelText:"Продолжить",onCancel:()=>{He=!1}})}function Xe(){const t=document.getElementById("quiz-powerups");if(!t)return;t.innerHTML="";const e=(i,a,s,l,r=!1)=>{const c=document.createElement("button");return c.className="powerup-btn",(s<=0||r)&&(c.disabled=!0),c.innerHTML=`<span class="powerup-icon">${a}</span><span class="powerup-count">${s}</span>`,c.onclick=d=>{d.stopPropagation(),s>0&&!r&&l()},c};if(G?.isTimerCountdown){const i=e("time_freeze","⏳",o.userStats.timeFreeze||0,()=>Tr());Ne&&i.classList.add("active"),t.appendChild(i)}t.appendChild(e("skip_question","⏭️",o.userStats.skipQuestion||0,()=>Ir())),document.querySelectorAll("#quiz-opts .quiz-option").length>=4&&($==="multiple-choice"||$==="survival"||$==="sprint")&&t.appendChild(e("fifty_fifty","⚖️",o.userStats.fiftyFifty||0,()=>Cr())),$==="survival"&&t.appendChild(e("survival_heal","❤️",o.userStats.survivalHealth||0,()=>Lr()))}function Tr(){if(Ne||(o.userStats.timeFreeze||0)<=0)return;o.userStats.timeFreeze=(o.userStats.timeFreeze||0)-1,D(),Ne=!0,Ae("❄️ Время заморожено!"),F("achievement-unlock");const t=document.getElementById("quiz-progress-fill");t&&(t.style.backgroundColor="var(--info)"),Xe(),mt=window.setTimeout(()=>{Ne=!1,t&&(t.style.backgroundColor=""),Xe()},1e4)}function Ir(){(o.userStats.skipQuestion||0)<=0||(o.userStats.skipQuestion=(o.userStats.skipQuestion||0)-1,D(),h("⏭️ Вопрос пропущен"),F("pop"),Y<P.length-1?(Y++,wt()):Ue(!1))}function Cr(){if((o.userStats.fiftyFifty||0)<=0)return;const e=Array.from(document.querySelectorAll("#quiz-opts .quiz-option")).filter(n=>n.dataset.correct!=="true"&&!n.disabled);if(e.length<2){h("Недостаточно вариантов для 50/50");return}o.userStats.fiftyFifty=(o.userStats.fiftyFifty||0)-1,D(),e.sort(()=>Math.random()-.5),e.slice(0,2).forEach(n=>{n.style.opacity="0.2",n.style.pointerEvents="none",n.disabled=!0}),F("pop"),Xe()}function Lr(){if((o.userStats.survivalHealth||0)<=0)return;o.userStats.survivalHealth=(o.userStats.survivalHealth||0)-1,Te++,D();const t=document.getElementById("quiz-score");t&&(t.innerText=`❤️ ${Te}`),Ae("❤️ Жизнь восстановлена!"),F("success"),Xe()}function Et(){const t=document.getElementById("quiz-count");if(!t)return;const e=a=>{if(a.type!==o.currentType)return!1;const s=a.topic||a.topic_ru||a.topic_kr,l=Q==="all"||s===Q,r=a.category||a.category_ru||a.category_kr,c=j==="all"||r===j,d=he==="all"||a.level===he,u=!ke||a._searchStr&&a._searchStr.includes(ke);return l&&c&&d&&u},n=o.dataStore.filter(e).length,i=o.dataStore.filter(a=>e(a)&&!o.learned.has(a.id)).length;t.innerHTML=`<span style="opacity:0.7">Доступно слов:</span> <b>${n}</b> <span style="margin:0 5px;opacity:0.3">|</span> <span style="color:var(--primary)">Новых: ${i}</span>`,Ar(),Mr()}function Ar(){const t=document.getElementById("quiz-mode-selector");if(!t)return;const e=t.querySelectorAll(".quiz-mode-btn"),n=a=>{if(a.type!==o.currentType)return!1;const s=a.topic||a.topic_ru||a.topic_kr,l=Q==="all"||s===Q,r=a.category||a.category_ru||a.category_kr,c=j==="all"||r===j,d=he==="all"||a.level===he,u=!ke||a._searchStr&&a._searchStr.includes(ke);return l&&c&&d&&u},i=o.dataStore.filter(n);e.forEach(a=>{const s=a,l=s.dataset.mode;let r=i.length,c="",d=1;l==="scramble"||l==="essay"?(d=5,r=i.filter(u=>u.example_kr&&u.example_kr.length>5&&u.example_ru).length,r<d&&(c=`Мало примеров (${r}/${d})`)):l==="dialogue"?(d=5,r=i.filter(u=>u.example_audio&&u.example_kr).length,r<d&&(c=`Мало аудио-диалогов (${r}/${d})`)):l==="synonyms"?(d=5,r=i.filter(u=>u.synonyms&&u.synonyms.trim().length>0).length,r<d&&(c=`Мало синонимов (${r}/${d})`)):l==="antonyms"?(d=5,r=i.filter(u=>u.antonyms&&u.antonyms.trim().length>0).length,r<d&&(c=`Мало антонимов (${r}/${d})`)):l==="confusing"||l==="association"?r=o.dataStore.length:r<1&&(c="Нет слов"),r<d?(s.disabled=!0,s.style.opacity="0.5",s.style.cursor="not-allowed",s.title=c):(s.disabled=!1,s.style.opacity="1",s.style.cursor="pointer",s.title="")})}function Mr(){const t=document.getElementById("quiz-filters");if(!t)return;let e=document.getElementById("quiz-reset-btn");Q!=="all"||j!=="all"||he!=="all"||ke!==""?(e||(e=document.createElement("button"),e.id="quiz-reset-btn",e.className="btn",e.style.padding="0 12px",e.style.animation="fadeIn 0.5s ease-out",e.innerHTML="↺",e.title="Сбросить фильтры",e.onclick=()=>{Q="all",o.quizTopic="all",localStorage.setItem("quiz_topic_v1","all"),j="all",o.quizCategory="all",localStorage.setItem("quiz_category_v1","all"),he="all",o.quizDifficulty="all",localStorage.setItem("quiz_difficulty_v1","all"),ke="";const i=document.getElementById("quiz-search-input");i&&(i.value=""),Pa(),Va(),Et()},t.appendChild(e)),e.style.display="inline-flex"):e&&(e.style.display="none")}function Br(t,e,n){let i=document.getElementById("quiz-summary-modal");i||(i=document.createElement("div"),i.id="quiz-summary-modal",i.className="modal",i.setAttribute("role","dialog"),i.onclick=d=>{d.target===i&&z("quiz-summary-modal")},document.body.appendChild(i));const a=e>0?Math.round(t/e*100):0;let s="Неплохо!",l="🙂",r="var(--text-main)";if(a===100){s="Идеально!",l="🏆",r="var(--gold)";const d=window.innerWidth<768;ve({particleCount:d?80:150,spread:d?50:70,origin:{y:.6},disableForReducedMotion:!0,zIndex:20005})}else a>=80?(s="Отлично!",l="🔥",r="var(--success)"):a>=50?(s="Хорошо",l="👍",r="var(--primary)"):(s="Надо потренироваться",l="💪",r="var(--text-sub)");let c="";if(ut.length>0){const d=ut.map(u=>`
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border-color);">
        <div style="text-align: left;">
          <div style="font-weight: 700; color: var(--text-main); font-size: 15px;">${w(u.word_kr)}</div>
          <div style="font-size: 13px; color: var(--text-sub);">${w(u.translation)}</div>
        </div>
        <div style="font-size: 18px; color: var(--danger);">✕</div>
      </div>
    `).join("");c=`
      <div style="margin-top: 20px; width: 100%; text-align: left;">
        <div style="font-size: 14px; font-weight: 700; color: var(--danger); margin-bottom: 10px;">Работа над ошибками (${ut.length})</div>
        <div style="background: var(--surface-1); padding: 5px 15px; border-radius: 16px; border: 1px solid var(--border-color); max-height: 200px; overflow-y: auto;">
          ${d}
        </div>
      </div>
    `}i.innerHTML=`
    <div class="modal-content modal-centered" style="text-align: center; max-width: 350px; padding: 30px 20px;">
        <div style="font-size: 64px; margin-bottom: 15px; animation: bounce 1s;">${l}</div>
        <div style="font-size: 24px; font-weight: 800; margin-bottom: 5px; color: ${r};">${s}</div>
        <div style="font-size: 14px; color: var(--text-sub); margin-bottom: 30px;">Тренировка завершена</div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px;">
            <div style="background: var(--surface-2); padding: 15px; border-radius: 16px; border: 1px solid var(--border-color);">
                <div style="font-size: 12px; color: var(--text-sub); margin-bottom: 5px; font-weight: 600;">Процент правильных ответов</div>
                <div style="font-size: 24px; font-weight: 900; color: ${a>=80?"var(--success)":"var(--text-main)"};">${a}%</div>
            </div>
            <div style="background: var(--surface-2); padding: 15px; border-radius: 16px; border: 1px solid var(--border-color);">
                <div style="font-size: 12px; color: var(--text-sub); margin-bottom: 5px; font-weight: 600;">XP</div>
                <div style="font-size: 24px; font-weight: 900; color: var(--gold);">+${n}</div>
            </div>
        </div>

        <div style="font-size: 15px; color: var(--text-main); margin-bottom: 25px; background: var(--surface-2); padding: 10px; border-radius: 12px;">
            Правильных ответов: <b>${t}</b> из <b>${e}</b>
        </div>
        
        ${c}
        
        <button class="btn btn-quiz" style="width: 100%; padding: 15px; font-size: 16px; border-radius: 16px;" data-action="quiz-summary-continue">Продолжить</button>
    </div>
  `,N("quiz-summary-modal")}function qi(t){const e=document.getElementById("quiz-combo");e&&(t&&t>1?(e.style.display="block",e.innerText=`🔥 ${t}`,e.classList.remove("pop"),e.offsetWidth,e.classList.add("pop")):e.style.display="none")}function zr(){z("quiz-summary-modal"),($==="daily"||$==="super-daily")&&setTimeout(()=>ja(),300)}let an=null,Xn=!1;window.addEventListener("popstate",t=>{Xn=!0;const e=t.state?.modalId;if(document.querySelectorAll(".modal.active").forEach(i=>{i.id!==e&&z(i.id)}),e){const i=document.getElementById(e);i&&!i.classList.contains("active")&&N(e,{skipPushState:!0})}Xn=!1});const Wa=["a[href]:not([disabled])","button:not([disabled])",'input:not([disabled]):not([type="hidden"])',"textarea:not([disabled])","select:not([disabled])",'[tabindex]:not([tabindex="-1"])'].join(", ");function Ga(t){if(t.key!=="Tab")return;const e=document.querySelector(".modal.active");if(!e)return;const n=Array.from(e.querySelectorAll(Wa));if(n.length===0){t.preventDefault();return}const i=n[0],a=n[n.length-1];t.shiftKey?document.activeElement===i&&(t.preventDefault(),a.focus()):document.activeElement===a&&(t.preventDefault(),i.focus())}function N(t,e){const n=document.getElementById(t);if(!n){console.warn(`Modal with id "${t}" not found.`);return}e?.skipPushState||window.history.pushState({modalId:t},""),an=document.activeElement,n.classList.add("active"),document.addEventListener("keydown",Ga);const i=n.querySelector(Wa);if(i)i.focus();else{const a=n.querySelector(".modal-content");a&&(a.setAttribute("tabindex","-1"),a.focus())}}function z(t){setTimeout(()=>{const e=document.getElementById(t);if(e){if(t==="quiz-modal"){const n=document.getElementById("quiz-game");n&&n.style.display==="flex"&&Tn(!0)}e.classList.remove("active"),!Xn&&window.history.state?.modalId===t&&window.history.back(),document.removeEventListener("keydown",Ga),an&&(an.focus(),an=null)}},0)}let sn=null;function le(t,e,n={}){const i=document.getElementById("confirm-modal"),a=document.getElementById("confirm-message"),s=document.getElementById("confirm-yes"),l=document.getElementById("confirm-no"),r=document.getElementById("confirm-input-container"),c=document.getElementById("confirm-password"),d=document.getElementById("confirm-copy-btn");if(!i||!a||!s||!l||!r||!c||!d)return;a.replaceChildren(),t.split(`
`).forEach((m,p)=>{p>0&&a.appendChild(document.createElement("br")),a.appendChild(document.createTextNode(m))}),s.textContent=n.confirmText||"Подтвердить",l.textContent=n.cancelText||"Отмена",l.style.display=n.showCancel===!1?"none":"",r.style.display=n.showInput?"block":"none",n.showInput&&(c.value="",c.placeholder=n.inputPlaceholder||"Введите для подтверждения"),sn=n.onValidate||null,d.style.display=n.showCopy&&n.copyText?"block":"none",d.onclick=()=>{navigator.clipboard.writeText(n.copyText||""),h("✅ Скопировано!")};const u=async()=>{if(n.showInput&&sn&&!await sn(c.value)){c.classList.add("shake"),setTimeout(()=>c.classList.remove("shake"),500);return}e(),Pt()};s.onclick=u,l.onclick=()=>{n.onCancel&&n.onCancel(),Pt()},c.onkeydown=m=>{m.key==="Enter"&&(m.preventDefault(),u())},N("confirm-modal",{skipPushState:!0}),n.showInput?c.focus():n.showCancel!==!1?l.focus():s.focus()}function Pt(){sn=null,z("confirm-modal")}document.addEventListener("open-modal",t=>{const e=t.detail;e&&e.id&&N(e.id)});document.addEventListener("close-modal",t=>{const e=t.detail;e&&e.id&&z(e.id)});class Rr extends te{attachments=[];selectedType="bug";selectedPriority="medium";constructor(){super("feedback-modal")}show(){if(!this.element.id||!document.body.contains(this.element)){const e=document.getElementById("feedback-modal");e&&(this.element=e)}this.resetForm(),N("feedback-modal")}render(){this.updateAttachmentsList()}setupEventListeners(){const e=this.$$(".segment-btn");e.forEach(r=>{this.addEvent(r,"click",()=>{e.forEach(c=>c.classList.remove("active")),r.classList.add("active"),this.selectedType=r.getAttribute("data-value")||"bug"})});const n=this.$$(".priority-btn");n.forEach(r=>{this.addEvent(r,"click",()=>{n.forEach(c=>c.classList.remove("active")),r.classList.add("active"),this.selectedPriority=r.getAttribute("data-value")||"medium"})});const i=this.$("#feedback-file-input"),a=this.$("#feedback-drop-zone");a&&i&&(this.addEvent(a,"click",r=>{r.target.closest("#feedback-screenshot-btn")||i.click()}),this.addEvent(i,"change",r=>this.handleFileSelect(r)),this.addEvent(a,"dragover",r=>{r.preventDefault(),r.stopPropagation(),a.classList.add("dragover")}),this.addEvent(a,"dragleave",r=>{r.preventDefault(),r.stopPropagation(),a.classList.remove("dragover")}),this.addEvent(a,"drop",r=>{r.preventDefault(),r.stopPropagation(),a.classList.remove("dragover");const c=r.dataTransfer?.files;c&&this.processFiles(c)}));const s=this.$("#feedback-screenshot-btn");s&&this.addEvent(s,"click",r=>this.captureScreenshot(r));const l=this.$("#submit-feedback-btn");l&&this.addEvent(l,"click",()=>this.submitReport())}handleFileSelect(e){const n=e.target;n.files&&this.processFiles(n.files),n.value=""}processFiles(e){if(this.attachments.length+e.length>3){h("⚠️ Максимум 3 файла");return}Array.from(e).forEach(n=>{if(n.size>50*1024*1024){h(`⚠️ Файл ${n.name} слишком большой (>50MB)`);return}const i=n.type.startsWith("video/"),a=n.type.startsWith("image/"),s=new FileReader;s.onload=l=>{this.attachments.push({file:n,previewUrl:l.target?.result,type:a?"image":i?"video":"file"}),this.updateAttachmentsList()},s.readAsDataURL(n)})}async captureScreenshot(e){e.stopPropagation(),e.preventDefault(),typeof window.html2canvas>"u"&&(document.querySelector('script[src*="html2canvas"]')&&await new Promise(i=>setTimeout(i,500)),h("⏳ Загрузка инструмента скриншотов..."),await new Promise((i,a)=>{const s=document.createElement("script");s.src="https://html2canvas.hertzen.com/dist/html2canvas.min.js",s.onload=()=>i(),s.onerror=()=>a(new Error("Failed to load html2canvas")),document.head.appendChild(s)}).catch(i=>{console.error(i),h("❌ Не удалось загрузить инструмент скриншотов")}));const n=document.getElementById("feedback-modal");n&&(n.style.opacity="0"),h("📸 Снимаем...",1e3),setTimeout(async()=>{try{const i=await window.html2canvas(document.body,{useCORS:!0,ignoreElements:a=>a.id==="feedback-modal"||a.classList.contains("modal")});n&&(n.style.opacity="1"),i.toBlob(a=>{if(a){const s=new File([a],`screenshot_${Date.now()}.png`,{type:"image/png"});this.attachments.push({file:s,previewUrl:i.toDataURL("image/png"),type:"image"}),this.updateAttachmentsList(),h("✅ Скриншот добавлен")}})}catch(i){console.error("Screenshot error:",i),n&&(n.style.opacity="1"),h("❌ Ошибка при создании скриншота")}},500)}updateAttachmentsList(){const e=this.$("#feedback-attachments-list");e&&(e.innerHTML="",this.attachments.forEach((n,i)=>{const a=document.createElement("div");a.className="attachment-thumbnail";let s="";n.type==="image"?s=`<img src="${n.previewUrl}" />`:n.type==="video"?s=`<div class="file-icon">🎥</div><div class="file-name" style="font-size:9px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:50px;">${n.file.name}</div>`:s=`<div class="file-icon">📄</div><div class="file-name" style="font-size:9px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:50px;">${n.file.name}</div>`,a.innerHTML=`
        ${s}

// Automatically open feedback modal if URL hash contains #feedback
if (window.location.hash === "#feedback") {
    uiFeedback.show();
    window.history.replaceState(null, "", window.location.pathname);
}
        <button class="remove-btn">✕</button>
      `;const l=a.querySelector(".remove-btn");l&&l.addEventListener("click",r=>{r.stopPropagation(),this.attachments.splice(i,1),this.updateAttachmentsList()}),e.appendChild(a)}))}async submitReport(){const e=this.$("#feedback-title"),n=this.$("#feedback-desc"),i=this.$("#submit-feedback-btn"),a=e?.value.trim(),s=n?.value.trim();if(!a||!s){h("⚠️ Заполните тему и описание"),a?n?.focus():e?.focus();return}i&&(i.disabled=!0,i.innerHTML='<div class="spinner-tiny"></div> Отправка...');try{const l=this.attachments.map(d=>({name:d.file.name,type:d.file.type,base64:d.previewUrl.split(",")[1]})),{data:r,error:c}=await S.functions.invoke("submit-feedback",{body:{type:this.selectedType,title:a,description:s,priority:this.selectedPriority,attachments:l}});if(c)throw c;if(r&&r.error)throw new Error(r.error);this.showSuccess()}catch(l){console.error("Feedback error:",l);const r=l instanceof Error?l.message:"Не удалось отправить";h(`❌ Ошибка: ${r}`)}finally{i&&(i.disabled=!1,i.textContent="🚀 Отправить")}}showSuccess(){F("success");const e=this.$("#submit-feedback-btn");if(e){const n=e.getBoundingClientRect(),i=(n.left+n.width/2)/window.innerWidth,a=(n.top+n.height/2)/window.innerHeight;ve({particleCount:100,spread:70,origin:{x:i,y:a},zIndex:20005})}h("✅ Спасибо! Мы получили ваше сообщение."),z("feedback-modal"),this.resetForm()}resetForm(){const e=this.$("#feedback-title"),n=this.$("#feedback-desc");e&&(e.value=""),n&&(n.value=""),this.attachments=[],this.updateAttachmentsList(),this.selectedType="bug",this.selectedPriority="medium",this.$$(".segment-btn").forEach(s=>{s.classList.toggle("active",s.getAttribute("data-value")==="bug")}),this.$$(".priority-btn").forEach(s=>{s.classList.toggle("active",s.getAttribute("data-value")==="medium")})}}const Kn=new Rr;window.openFeedbackModal=()=>Kn.show();function qr(t){let e=document.getElementById("update-notification");e||(e=document.createElement("div"),e.id="update-notification",e.innerHTML=`
            <div style="font-weight:700; font-size:14px; color:var(--text-main);">🚀 Доступна новая версия</div>
            <button class="btn btn-quiz" id="update-btn" style="padding: 6px 14px; font-size:12px; border-radius:20px; min-height: 32px;">Обновить</button>
        `,document.body.appendChild(e));const n=document.getElementById("update-btn");n&&(n.onclick=()=>t.postMessage({type:Mt.SKIP_WAITING})),setTimeout(()=>e.classList.add("show"),100)}function Dr(){let t=0,e=0;document.addEventListener("touchstart",n=>{t=n.changedTouches[0].screenX,e=n.changedTouches[0].screenY},{passive:!0}),document.addEventListener("touchend",n=>{const i=n.changedTouches[0].screenX,a=n.changedTouches[0].screenY;n.target&&Or(t,e,i,a,n.target)},{passive:!0})}function Or(t,e,n,i,a){const s=n-t,l=i-e,r=Math.abs(s),c=Math.abs(l),d=60,u=document.querySelector(".modal.active");if(u&&a instanceof Node&&u.contains(a)){let m=u.querySelector(".modal-content");const p=u.querySelector("#collections-list, #review-container, #trash-list, #mistakes-content, #grammar-content, #hanja-list, #achievements-list, #profile-scroll-container, .modal-body-container, #shop-scroll-container, #quotes-list, #image-picker-grid, .multiselect-scroll-container, #add-to-list-content");p&&(m=p),l>d&&c>r*1.5&&m&&m.scrollTop<=0&&z(u.id);return}if(!(a instanceof Element&&(a.closest(".stats-strip")||a.closest(".slider")))&&r>d&&r>c*1.5){const m=document.querySelectorAll("#type-filters .segment-btn");if(m.length<2)return;s>0&&o.currentType==="grammar"?(Rt("word",m[0]),h("📖 Слова")):s<0&&o.currentType==="word"&&(Rt("grammar",m[1]),h("📘 Грамматика"))}}function $r(){const t=document.getElementById("main-header"),e=document.getElementById("vocabulary-grid");if(!t||!e)return;let n=document.getElementById("back-to-top-btn");n||(n=document.createElement("button"),n.id="back-to-top-btn",n.className="back-to-top-btn",n.innerHTML="↑",n.title="Наверх",n.onclick=()=>{e.scrollTo({top:0,behavior:"smooth"})},document.body.appendChild(n));let i=e.scrollTop;e.addEventListener("scroll",()=>{const a=e.scrollTop;a>i&&a>50?t.classList.add("hidden"):t.classList.remove("hidden"),a>400?n?.classList.add("visible"):n?.classList.remove("visible"),i=a},{passive:!0})}function Hr(t){!t||t.length<2||(o.searchHistory=o.searchHistory.filter(e=>e!==t),o.searchHistory.unshift(t),o.searchHistory.length>5&&(o.searchHistory=o.searchHistory.slice(0,5)),localStorage.setItem(v.SEARCH_HISTORY,JSON.stringify(o.searchHistory)))}function Qa(t){if(!o.searchHistory||o.searchHistory.length===0)return;let e=document.getElementById("search-history-dropdown");e||(e=document.createElement("div"),e.id="search-history-dropdown",e.className="search-history-dropdown",t.parentNode&&t.parentNode.appendChild(e)),e.innerHTML="",o.searchHistory.forEach(n=>{const i=document.createElement("div");i.className="history-item",i.innerHTML=`<span style="opacity:0.5;">🕒</span> ${w(n)}`,i.onmousedown=s=>{s.preventDefault(),t.value=n,t.dispatchEvent(new Event("input")),hn()};const a=document.createElement("span");a.innerHTML="✕",a.className="history-del",a.onclick=s=>{s.stopPropagation(),o.searchHistory=o.searchHistory.filter(l=>l!==n),localStorage.setItem(v.SEARCH_HISTORY,JSON.stringify(o.searchHistory)),Qa(t),o.searchHistory.length===0&&hn()},i.appendChild(a),e.appendChild(i)}),e.style.display="block"}function hn(){const t=document.getElementById("search-history-dropdown");t&&(t.style.display="none")}function Nr(){if(localStorage.getItem(v.PWA_BANNER_DISMISSED))return;const t=document.getElementById("install-banner");t&&setTimeout(()=>t.classList.add("show"),4e3)}function fi(){const t=document.getElementById("install-banner");t&&t.classList.remove("show"),localStorage.setItem(v.PWA_BANNER_DISMISSED,"true")}document.addEventListener("click",t=>{const e=t.target,n=e.closest("[data-action]");n&&n.dataset.action==="open-feedback"&&Kn.show();const i=e.closest("[data-modal]");i&&i.dataset.modal==="feedback-modal"&&Kn.show()});let Lt=null;function Ur(){if("serviceWorker"in navigator){navigator.serviceWorker.register("/sw.js",{type:"classic"}).then(n=>{setInterval(()=>n.update(),3600*1e3),n.installing?console.info("SW: Installing..."):n.active&&console.info("SW: Active and ready"),navigator.serviceWorker.controller||h("✅ Приложение готово к работе офлайн!");const i=n;i.periodicSync&&i.periodicSync.register(Mt.CONTENT_SYNC,{minInterval:720*60*1e3}).then(()=>console.info("✅ Periodic Sync registered for tag: content-sync")).catch(s=>console.error("❌ Periodic Sync registration failed:",s));const a=s=>{o.autoUpdate?s.postMessage({type:Mt.SKIP_WAITING}):qr(s)};n.waiting&&a(n.waiting),n.addEventListener("updatefound",()=>{const s=n.installing;s&&s.addEventListener("statechange",()=>{s.state==="installed"&&navigator.serviceWorker.controller&&a(s)})})}).catch(n=>console.error("SW Registration Failed:",n));let e=!1;navigator.serviceWorker.addEventListener("controllerchange",()=>{e||(window.location.reload(),e=!0)}),navigator.serviceWorker.addEventListener("message",n=>{const i=n.data;i&&i.type===Mt.DOWNLOAD_QUEUE_COMPLETED&&i.count>0&&h(`✅ Докачано файлов: ${i.count}`)})}window.addEventListener("beforeinstallprompt",t=>{t.preventDefault(),Lt=t;const e=document.getElementById("install-app-btn");e&&(e.style.display="flex"),Nr()})}async function Pr(){if(fi(),!Lt)return;Lt.prompt();const{outcome:t}=await Lt.userChoice;if(t==="accepted"){Lt=null;const e=document.getElementById("install-app-btn");e&&(e.style.display="none")}}async function Vr(){if("serviceWorker"in navigator){const t=await navigator.serviceWorker.getRegistrations();for(const e of t)await e.unregister();window.location.reload()}}const ee={async getSession(){return await S.auth.getSession()},async getUser(){return await S.auth.getUser()},async updateProfile(t){return await S.auth.updateUser({data:{full_name:t}})},async uploadAvatar(t,e){const n=e.name.split(".").pop(),i=`avatars/${t}_${Date.now()}.${n}`,{error:a}=await S.storage.from(Ft.IMAGES).upload(i,e,{upsert:!0});if(a)throw a;const{data:s}=S.storage.from(Ft.IMAGES).getPublicUrl(i);return await S.auth.updateUser({data:{avatar_url:s.publicUrl}})},async deleteAvatar(t){try{const{data:e}=await S.storage.from(Ft.IMAGES).list("avatars",{search:t});if(e&&e.length>0){const n=e.map(i=>`avatars/${i.name}`);await S.storage.from(Ft.IMAGES).remove(n)}}catch(e){console.warn("Avatar cleanup warning:",e)}return await S.auth.updateUser({data:{avatar_url:null}})},async updatePassword(t){return await S.auth.updateUser({password:t})},async updateEmail(t){return await S.auth.updateUser({email:t})},async resetPasswordForEmail(t,e){return await S.auth.resetPasswordForEmail(t,{redirectTo:e})},async signInWithPassword(t,e){return await S.auth.signInWithPassword({email:t,password:e})},async signUp(t,e,n){return await S.auth.signUp({email:t,password:e,options:n})},async initUserStats(t){try{await S.from(A.USER_GLOBAL_STATS).insert([{user_id:t,xp:0,level:1}])}catch(e){console.warn("Stats init warning:",e)}},async signInWithGoogle(t){return await S.auth.signInWithOAuth({provider:"google",options:{redirectTo:t}})},async signOut(){return await S.auth.signOut()},onAuthStateChange(t){return S.auth.onAuthStateChange(t)}};function Fr(){document.querySelectorAll(".modal.active").forEach(t=>{t.id&&t.id!=="confirm-modal"&&t.id!=="quiz-summary-modal"&&z(t.id)}),le("Ваша сессия истекла. Для продолжения необходимо снова войти в систему.",()=>{S.auth.signOut(),setTimeout(()=>{window.isSessionExpired=!1},2e3)},{confirmText:"Войти",showCancel:!1})}window.sessionExpiredListenerAttached||(document.addEventListener("session-expired",Fr),window.sessionExpiredListenerAttached=!0);function Ie(t){o.currentUser=t,H("auth_changed",t);const e=document.getElementById("profile-button"),n=document.getElementById("profile-avatar"),i=document.getElementById("profile-name");if(!(!e||!n||!i))if(t){const a=t.email||"",s=t.user_metadata?.full_name||a.split("@")[0]||"Гость",l=t.user_metadata?.avatar_url;l?(n.textContent="",n.style.backgroundImage=`url('${l}')`,n.style.backgroundSize="cover",n.style.backgroundPosition="center"):(n.style.backgroundImage="",n.textContent=a.charAt(0).toUpperCase()),i.textContent=s,e.title=`Вошли как ${a}`}else n.style.backgroundImage="",n.textContent="👤",i.textContent="Профиль",e.title="Войти или зарегистрироваться"}function gi(){N("login-modal");const t=document.getElementById("auth-email");t&&(t.value="");const e=document.getElementById("auth-password"),n=document.getElementById("auth-confirm-password");if(!e||!n)return;e.value="",e.type="password",n.value="";const i=document.getElementById("strength-bar"),a=document.querySelector(".password-strength");e&&i&&a&&(i.style.width="0%",a.style.display="none",Ya(e,i,a));const s=[t,e,n];document.getElementById("auth-name")&&s.push(document.getElementById("auth-name")),s.forEach(c=>{c&&(c.addEventListener("blur",()=>Re(c)),c.addEventListener("input",()=>Jr(c)))}),yn("login");const l=document.getElementById("auth-error");l&&(l.style.display="none"),is(!1);const r=c=>{if(c.key==="Enter"){const d=document.getElementById("auth-submit-btn");d&&d.click()}};e.onkeydown=r,n.onkeydown=r}function vi(t=!1){if(o.currentUser){const e=o.currentUser,n=e.user_metadata?.full_name||e.email?.split("@")[0]||"Гость",i=document.getElementById("profile-name-display"),a=document.getElementById("profile-name-input"),s=document.getElementById("edit-profile-name-btn");i&&(i.textContent=n);const l=document.getElementById("profile-avatar-large"),r=document.getElementById("profile-avatar-img"),c=document.getElementById("profile-avatar-text"),d=document.getElementById("avatar-upload"),u=document.getElementById("delete-avatar-btn");if(l&&r&&c){const x=e.user_metadata?.avatar_url;x?(r.src=String(x),r.style.display="block",c.style.display="none",u&&(u.style.display="flex")):(r.style.display="none",c.style.display="block",c.textContent=(e.email||"U").charAt(0).toUpperCase(),u&&(u.style.display="none")),d&&(l.onclick=()=>d.click(),d.onchange=async E=>{const k=E.target.files?.[0];if(k){if(k.size>5*1024*1024){h("❌ Файл слишком большой (макс 5MB)");return}h("⏳ Загрузка аватара...");try{const{data:T,error:I}=await ee.uploadAvatar(e.id,k);if(I)throw I;T.user&&(Ie(T.user),T.user.user_metadata.avatar_url&&(r.src=T.user.user_metadata.avatar_url,r.style.display="block",c.style.display="none",u&&(u.style.display="flex")),h("✅ Аватар обновлен"))}catch(T){console.error("Avatar upload error:",T),h("❌ Ошибка загрузки: "+T.message)}}}),u&&(u.onclick=E=>{E.stopPropagation(),le("Удалить фото профиля?",async()=>{h("⏳ Удаление...");try{const{data:k,error:T}=await ee.deleteAvatar(e.id);if(T)throw T;Ie(k.user),r.style.display="none",c.style.display="block",c.textContent=(e.email||"U").charAt(0).toUpperCase(),u.style.display="none",h("✅ Фото удалено")}catch(k){console.error("Avatar delete error:",k),h("❌ Ошибка: "+k.message)}})})}if(s&&a&&i){s.onclick=()=>{i.style.display="none",s.style.display="none",a.style.display="block",a.value=n,a.focus()};const x=async()=>{const E=a.value.trim();if(E&&E!==n){const{error:k}=await ee.updateProfile(E);k?h("Ошибка обновления: "+k.message):(i.textContent=E,h("Имя обновлено"),Ie({...e,user_metadata:{...e.user_metadata,full_name:E}}))}a.style.display="none",i.style.display="block",s.style.display="inline-flex"};a.onblur=x,a.onkeydown=E=>{E.key==="Enter"&&a.blur()}}const m=document.getElementById("profile-role");if(m){const x=o.userStats.level,E=ht(x);m.textContent=`${E.icon} ${E.name} (LVL ${x})`,m.style.color=E.color,m.style.backgroundColor=E.color+"20",m.style.border=`1px solid ${E.color}30`,m.style.cursor="pointer",m.title="Нажмите, чтобы посмотреть все звания",m.onclick=()=>eo()}const p=document.getElementById("new-password"),g=document.getElementById("new-strength-bar"),f=document.getElementById("new-strength-container"),y=document.getElementById("new-email");y&&(y.value=""),p&&g&&f&&(p.value="",f.style.display="none",g.style.width="0%",Ya(p,g,f));const b=document.getElementById("profile-scroll-container");b&&(b.scrollTop=0),ui(),N("profile-modal"),t&&setTimeout(()=>{const x=document.getElementById("new-password");x&&(x.focus(),x.scrollIntoView({behavior:"smooth",block:"center"}))},300)}else Ie(null),gi()}function yn(t){const e=document.querySelector("#login-modal .auth-form");if(!e)return;e.dataset.authMode=t;const n=document.getElementById("auth-title"),i=document.getElementById("auth-desc"),a=document.getElementById("auth-submit-btn"),s=document.getElementById("auth-name-container"),l=document.getElementById("auth-password-container"),r=document.getElementById("auth-confirm-password-container"),c=document.querySelector(".password-strength"),d=document.getElementById("auth-mode-switch-container"),u=document.getElementById("auth-forgot-link"),m=document.getElementById("auth-social");s&&(s.style.display="none"),r&&(r.style.display="none"),c&&(c.style.display="none"),l&&(l.style.display="block"),m&&(m.style.display="block"),u&&(u.style.display="inline"),t==="signup"?(n&&(n.textContent="Регистрация"),i&&(i.textContent="Создайте аккаунт, чтобы сохранять прогресс и соревноваться с другими."),a&&(a.textContent="Создать аккаунт",a.setAttribute("data-value","signup")),s&&(s.style.display="block"),r&&(r.style.display="block"),c&&(c.style.display="block"),d&&(d.innerHTML='Уже есть аккаунт? <a href="#" data-action="toggle-auth-mode" data-value="login">Войти</a>'),u&&(u.style.display="none")):t==="login"?(n&&(n.textContent="Вход в профиль"),i&&(i.textContent="Войдите, чтобы сохранить прогресс в облаке и синхронизировать устройства."),a&&(a.textContent="Войти",a.setAttribute("data-value","login")),d&&(d.innerHTML='Нет аккаунта? <a href="#" data-action="toggle-auth-mode" data-value="signup">Регистрация</a>')):t==="reset"&&(n&&(n.textContent="🔑 Сброс пароля"),i&&(i.textContent="Введите Email, чтобы получить ссылку для входа."),a&&(a.textContent="Отправить ссылку",a.setAttribute("data-value","reset")),l&&(l.style.display="none"),m&&(m.style.display="none"),u&&(u.style.display="none"),d&&(d.innerHTML='<a href="#" data-action="toggle-auth-mode" data-value="login">← Назад ко входу</a>'));const p=document.getElementById("auth-error");p&&(p.style.display="none")}function Ya(t,e,n){const i=n.querySelector("span");t.oninput=()=>{const a=t.value;if(!a){n.style.display="none";return}n.style.display="flex";const{score:s,text:l,color:r}=ss(a);e.style.width=`${s}%`,e.style.backgroundColor=r,i&&(i.textContent=l,i.style.color=r)}}async function Ja(t){const e=document.getElementById("auth-email"),n=document.getElementById("auth-password");if(!e||!n)return;const i=e.value.trim(),a=n.value.trim();Qr();let s=!1;if(t==="signup"){const l=document.getElementById("auth-name"),r=document.getElementById("auth-confirm-password");if(Re(e)&&(s=!0),Re(l)&&(s=!0),Re(n)&&(s=!0),Re(r)&&(s=!0),!s){const{score:d}=ss(a);d<40&&(Yr("auth-password","Пароль слишком слабый. Используйте буквы, цифры или символы."),s=!0)}if(s){const d=document.querySelector("#login-modal .auth-input.error");d&&d.focus();return}const c=l.value.trim();await Gr(i,a,c)}else if(t==="login"){if(Re(e)&&(s=!0),Re(n)&&(s=!0),s){const l=document.querySelector("#login-modal .auth-input.error");l&&l.focus();return}await Wr(i,a)}else if(t==="reset"){if(Re(e)&&(s=!0),s){const l=document.querySelector("#login-modal .auth-input.error");l&&l.focus();return}await jr(i)}}async function jr(t){h("⏳ Отправка письма...");const e=window.location.origin+window.location.pathname;try{const{error:n}=await ee.resetPasswordForEmail(t,e);if(n)throw n;alert(`Ссылка для входа отправлена на ${t}.
Проверьте почту.`),z("login-modal")}catch(n){hi(n)}}async function Wr(t,e){h("⏳ Вход...");try{const{data:n,error:i}=await ee.signInWithPassword(t,e);if(i)throw i;n.user&&await Xa(n.user)}catch(n){hi(n)}}async function Gr(t,e,n){h("⏳ Регистрация...");try{const{data:i,error:a}=await ee.signUp(t,e,{data:{full_name:n}});if(a)throw a;i.user&&!i.session?(alert("Регистрация успешна! Проверьте почту для подтверждения."),z("login-modal")):(i.user&&await ee.initUserStats(i.user.id),i.user&&await Xa(i.user))}catch(i){hi(i)}}async function Xa(t){h("✅ Успешно!"),typeof window.confetti=="function"&&window.confetti({particleCount:150,spread:70,origin:{y:.6},zIndex:20005}),document.body.classList.add("correct-flash"),setTimeout(()=>document.body.classList.remove("correct-flash"),1e3),Ie(t),await Nn(t),xt(),vn(),ui(),St(),z("login-modal")}function hi(t){console.error("Auth Error:",t);let e=t.message||"Произошла ошибка";e.includes("Failed to fetch")||e.includes("Network request failed")||e.includes("connection error")?e="🌐 Ошибка сети. Проверьте интернет-соединение.":e.includes("already registered")?e="📧 Этот Email уже зарегистрирован. Попробуйте войти.":e.includes("Invalid login")||e.includes("Invalid credentials")?e="❌ Неверный Email или пароль.":e.includes("Email not confirmed")?e="📩 Email не подтвержден. Проверьте почту.":e.includes("Rate limit exceeded")||e.includes("Too many requests")?e="⏳ Слишком много попыток. Подождите немного.":e.includes("Password should be at least")&&(e="🔒 Пароль должен быть не менее 6 символов.");const n=document.getElementById("auth-error");n&&(n.textContent=e,n.style.display="block")}async function Ka(){const t=window.location.origin+window.location.pathname,{error:e}=await ee.signInWithGoogle(t);e&&(console.error("Google Sign-In Error:",e),alert("Ошибка Google входа: "+e.message))}async function Za(){const t=document.getElementById("new-password");if(!t)return;const e=t.value.trim();if(!e){alert("Введите новый пароль");return}if(e.length<6){alert("Пароль должен содержать минимум 6 символов");return}h("⏳ Обновление...");const{error:n}=await ee.updatePassword(e);n?(console.error("Update Password Error:",n),alert("Ошибка: "+n.message)):(h("✅ Пароль изменен"),t.value="",z("profile-modal"))}async function es(){const t=document.getElementById("new-email");if(!t)return;const e=t.value.trim();if(!e){alert("Введите новый Email");return}if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)){alert("Некорректный формат Email");return}h("⏳ Обновление...");const{error:i}=await ee.updateEmail(e);i?(console.error("Update Email Error:",i),alert("Ошибка: "+i.message)):(alert(`На адрес ${e} отправлено письмо для подтверждения.

ВАЖНО: Проверьте также старую почту, если требуется подтверждение смены.`),t.value="")}async function ts(){le("Вы уверены, что хотите выйти?",async()=>{h("👋 До встречи!");try{await pt(ee.signOut(),5e3,new Error("Logout request timed out"))}catch(t){console.error("Logout error:",t),h("⚠️ Ошибка выхода из аккаунта на сервере или таймаут. Очистка локальных данных.")}finally{Object.values(v).forEach(t=>{t!==v.VOCAB_CACHE&&t!==v.VOCAB_VERSION&&localStorage.removeItem(t)}),localStorage.removeItem("settings_updated_at"),localStorage.removeItem("sb-supabase-auth-token"),localStorage.removeItem("supabase.auth.token"),sessionStorage.clear(),location.reload()}})}async function ns(){const{data:{session:t}}=await ee.getSession();if(!t?.user){h("Вы не авторизованы");return}const n=(t.user.app_metadata?.providers||[]).includes("email");le("Удалить аккаунт навсегда? Все данные будут потеряны. Это действие нельзя отменить.",async()=>{h("⏳ Удаление данных...");const i=t.user.id;try{await ee.deleteAvatar(i);const{data:a,error:s}=await S.from(A.USER_LISTS).select("id").eq("user_id",i);if(s)throw s;if(a&&a.length>0){const c=a.map(d=>d.id);await S.from(A.LIST_ITEMS).delete().in("list_id",c)}await Promise.all([S.from(A.USER_PROGRESS).delete().eq("user_id",i),S.from(A.USER_GLOBAL_STATS).delete().eq("user_id",i),S.from(A.WORD_REQUESTS).delete().eq("user_id",i),S.from(A.USER_LISTS).delete().eq("user_id",i),S.from(A.VOCABULARY).delete().eq("created_by",i)]);const{data:l,error:r}=await S.functions.invoke("delete-user",{method:"DELETE"});r?(console.error("Edge Function delete-user error:",r),h("❌ Ошибка полного удаления аккаунта на сервере.")):console.info("✅ Edge Function delete-user success:",l),await ee.signOut(),localStorage.clear(),alert("Аккаунт и все данные удалены."),location.reload()}catch(a){console.error("Delete account error:",a),h("❌ Ошибка при удалении данных: "+a.message)}},{confirmText:"Удалить навсегда",cancelText:"Отмена",showInput:n,inputPlaceholder:"Введите пароль для подтверждения",onValidate:n?async i=>{if(!i)return h("Введите пароль"),!1;const{error:a}=await ee.signInWithPassword(t.user.email,i);return a?(h("❌ Неверный пароль"),!1):!0}:void 0})}function is(t){yn(t?"reset":"login")}function as(t){let e=null;const n=t||document.getElementById("toggle-password-btn");if(n){const i=n.getAttribute("data-value");i&&(e=document.getElementById(i))}!e||!n||(e.type==="password"?(e.type="text",n.textContent="👁️"):(e.type="password",n.textContent="🔒"))}function Di(){window.location.hash&&(window.location.hash.includes("access_token")||window.location.hash.includes("type=recovery")||window.location.hash.includes("error="))&&window.history.replaceState(null,"",window.location.pathname+window.location.search)}function ss(t){if(!t)return{score:0,text:"",color:"var(--danger)"};let e=0;t.length>5&&(e+=20),t.length>8&&(e+=20),/[A-Z]/.test(t)&&(e+=20),/[0-9]/.test(t)&&(e+=20),/[^A-Za-z0-9]/.test(t)&&(e+=20);let n="Слабый",i="var(--danger)";return e>80?(n="Отличный",i="var(--success)"):e>60?(n="Хороший",i="var(--info)"):e>=40&&(n="Средний",i="var(--warning)"),{score:e,text:n,color:i}}function Qr(){const t=document.getElementById("auth-error");t&&(t.style.display="none")}function Yr(t,e){const n=document.getElementById(t);if(!n)return;n.classList.add("error");const i=n.parentElement?.querySelector(".input-error-msg");i&&(i.textContent=e)}function Re(t){if(!t)return!1;if(!t.value.trim()){t.classList.add("error");const n=t.parentElement?.querySelector(".input-error-msg");return n&&(n.textContent="Это поле обязательно для заполнения"),!0}return!1}function Jr(t){t.classList.remove("error");const e=t.parentElement?.querySelector(".input-error-msg");e&&(e.textContent="")}function Xr(t){Object.assign(window,{openConfirm:le,closeConfirm:Pt,exportProgress:()=>_(()=>import("./ui_data-6bXqcUXy.js"),__vite__mapDeps([7,1,2,3])).then(e=>e.exportProgress()),saveAndRender:St,importProgress:e=>_(()=>import("./ui_data-6bXqcUXy.js"),__vite__mapDeps([7,1,2,3])).then(n=>n.importProgress(e)),clearData:()=>_(()=>import("./ui_data-6bXqcUXy.js"),__vite__mapDeps([7,1,2,3])).then(e=>e.clearData()),toggleSessionTimer:oa,sortByWeakWords:Ia,shuffleWords:Ta,setStarFilter:ii,setTypeFilter:Rt,handleCategoryChange:ni,toggleHanjaMode:Ca,setVoice:La,toggleFilterPanel:xn,toggleDarkMode:Jn,toggleAutoUpdate:e=>{Ba(e),o.autoUpdate&&"serviceWorker"in navigator&&navigator.serviceWorker.getRegistration().then(n=>{n&&n.waiting&&n.waiting.postMessage({type:Mt.SKIP_WAITING})})},toggleFocusMode:za,toggleViewMode:_a,toggleBackgroundMusic:e=>{Ra(e)},setBackgroundMusicVolume:Da,handleAuth:Ja,openProfileModal:vi,handleLogout:ts,handleDeleteAccount:ns,handleChangePassword:Za,handleChangeEmail:es,toggleResetMode:is,togglePasswordVisibility:as,setTtsVolume:Ma,setAudioSpeed:e=>Aa(e),signInWithGoogle:Ka,speak:K,openLoginModal:gi,openReviewMode:()=>_(()=>import("./ui_review-DXsD-XG9.js"),__vite__mapDeps([8,2,1,3])).then(e=>e.openReviewMode()),openShopModal:()=>_(()=>import("./ui_shop-CPdhjkX7.js"),__vite__mapDeps([6,2,1,3])).then(e=>e.openShopModal()),switchShopTab:e=>_(()=>import("./ui_shop-CPdhjkX7.js"),__vite__mapDeps([6,2,1,3])).then(n=>n.switchShopTab(e)),startDailyChallenge:Fa,quitQuiz:Tn,renderDetailedStats:si,checkPronunciation:(e,n,i,a,s,l)=>$a(e,n,i,a,s,l),resetSearchHandler:fa,forceUpdateSW:Vr,installApp:Pr,dismissInstallBanner:fi,deleteList:(e,n)=>_(()=>import("./ui_collections-FBsbpJ1k.js"),__vite__mapDeps([9,1,2,3])).then(i=>i.deleteList(e,n)),openEditListModal:(e,n,i)=>_(()=>import("./ui_collections-FBsbpJ1k.js"),__vite__mapDeps([9,1,2,3])).then(a=>a.openEditListModal(e,n,i)),setCollectionFilter:e=>_(()=>import("./ui_collections-FBsbpJ1k.js"),__vite__mapDeps([9,1,2,3])).then(n=>n.setCollectionFilter(e)),openEditWordModal:(e,n)=>_(()=>import("./ui_edit_word-D42SJL6z.js"),__vite__mapDeps([4,1,2,3])).then(i=>i.openEditWordModal(e,n)),restoreWord:e=>window.restoreWord(e),permanentlyDeleteWord:(e,n)=>window.permanentlyDeleteWord(e,n),toggleTrashSelection:(e,n)=>window.toggleTrashSelection(e,n),updateSearchIndex:()=>{t&&t.postMessage({type:"SET_DATA",data:o.dataStore})}})}const Kr=`<!-- Stats Modal -->
<div id="stats-modal" class="modal">
  <div class="modal-content">
    <div class="modal-header">
      <h3>📊 Статистика</h3>
      <button class="btn-icon close-modal-btn" data-close-modal="stats-modal" aria-label="Закрыть">
        ✕
      </button>
    </div>
    <div class="modal-body">
      <!-- Summary Strip -->
      <div id="stats-strip" class="stats-strip">
        <!-- Injected by stats.ts -->
      </div>

      <!-- Charts & Details -->
      <div id="stats-details" style="margin-bottom: 25px">
        <!-- Injected by stats.ts -->
      </div>

      <!-- Leaderboard Button -->
      <div class="settings-section">
        <button
          class="btn btn-quiz"
          style="
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            padding: 16px;
            border-radius: 20px;
            font-size: 16px;
          "
          data-action="open-leaderboard"
        >
          <span style="font-size: 20px">🏆</span> <span>Таблица лидеров</span>
        </button>
      </div>

      <!-- Topic Mastery -->
      <div class="settings-section">
        <div class="settings-section-title">Мастерство тем</div>
        <div id="topic-mastery-list" class="topic-mastery-list"></div>
      </div>

      <!-- Theme Picker for Share -->
      <div class="settings-section">
        <div class="settings-section-title">Поделиться</div>
        <div
          style="
            background: var(--surface-2);
            padding: 20px;
            border-radius: 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border: 1px solid var(--border-color);
          "
        >
          <div id="stats-theme-picker" style="display: flex; gap: 8px">
            <button class="stats-color-btn active" data-value="purple"></button>
            <button class="stats-color-btn" data-value="blue"></button>
            <button class="stats-color-btn" data-value="green"></button>
            <button class="stats-color-btn" data-value="orange"></button>
            <button class="stats-color-btn" data-value="pink"></button>
          </div>
          <button class="btn btn-quiz" data-action="share-stats">📤 Образ</button>
        </div>
      </div>
    </div>
  </div>
</div>
`,Zr=`<!-- Quiz Modal -->
<div
  id="quiz-modal"
  class="modal"
  role="dialog"
  aria-modal="true"
  aria-labelledby="quiz-modal-title"
  tabindex="-1"
  data-close-modal="quiz-modal"
>
  <div class="modal-content">
    <div class="modal-body-container">
      <div class="modal-header">
        <h3 id="quiz-modal-title">🎯 Режимы тренировки</h3>
        <div class="header-actions">
          <button
            class="btn btn-icon close-modal-btn"
            data-close-modal="quiz-modal"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- New Controls Wrapper -->
      <div id="quiz-controls-wrapper" class="quiz-controls-wrapper">
        <div class="input-wrapper">
          <label for="quiz-search-input" class="visually-hidden">Поиск слов</label>
          <input
            type="text"
            id="quiz-search-input"
            name="quiz-search"
            class="search-box quiz-search"
            placeholder="Поиск слов для тренировки..."
            autocomplete="off"
          />
          <span class="search-icon-overlay">🔍</span>
        </div>

        <div id="quiz-filters" class="quiz-filters-row">
          <div class="select-wrapper">
            <select id="quiz-topic-select" name="quiz-topic"></select>
          </div>
          <div class="select-wrapper">
            <select id="quiz-category-select" name="quiz-category"></select>
          </div>
        </div>

        <div id="quiz-difficulty" class="quiz-difficulty-group"></div>

        <div id="quiz-count" class="quiz-count-label">Слов: 0</div>
      </div>

      <div class="quiz-modes" id="quiz-mode-selector"></div>
      <div id="quiz-game">
        <div class="quiz-header">
          <div id="quiz-score" class="quiz-meta-item">Вопрос 1/10</div>
          <div class="quiz-progress-container">
            <div class="quiz-progress-fill" id="quiz-progress-fill"></div>
          </div>
          <div id="quiz-timer-display" class="quiz-meta-item">00:00</div>
        </div>
        <div class="quiz-body">
          <div class="quiz-question" id="quiz-q"></div>
          <div class="quiz-options" id="quiz-opts"></div>
        </div>
        <div class="quiz-footer">
          <button class="btn btn-text-only" data-action="quit-quiz">Завершить тренировку</button>
        </div>
      </div>
    </div>
  </div>
</div>
`,el=`<!-- Login Modal -->
<div
  id="login-modal"
  class="modal"
  role="dialog"
  aria-modal="true"
  aria-labelledby="auth-title"
  aria-describedby="auth-desc"
  tabindex="-1"
  data-close-modal="login-modal"
>
  <div class="modal-content modal-centered auth-modal-content">
    <div class="auth-container">
      <div class="modal-header no-border">
        <h3 id="auth-title">Вход в профиль</h3>
        <div class="header-actions">
          <button
            class="btn btn-icon close-modal-btn"
            data-close-modal="login-modal"
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
      </div>
      <div id="auth-desc" class="auth-description">
        Войдите, чтобы сохранить прогресс в облаке и синхронизировать устройства.
      </div>
      <form onsubmit="return false;" class="auth-form" data-auth-mode="login">
        <div id="auth-name-container" class="input-group" style="display: none">
          <label for="auth-name" class="visually-hidden">Ваше имя</label>
          <input
            type="text"
            id="auth-name"
            name="name"
            class="auth-input"
            placeholder="Ваше имя"
            autocomplete="name"
          />
          <div class="input-error-msg"></div>
        </div>
        <div class="input-group">
          <label for="auth-email" class="visually-hidden">Email</label>
          <input
            type="email"
            id="auth-email"
            name="email"
            class="auth-input"
            placeholder="Email"
            autocomplete="username"
          />
          <div class="input-error-msg"></div>
        </div>

        <div id="auth-password-container" class="input-group">
          <label for="auth-password" class="visually-hidden">Пароль</label>
          <input
            type="password"
            id="auth-password"
            name="password"
            class="auth-input"
            placeholder="Пароль"
            autocomplete="current-password"
          />
          <button
            type="button"
            data-action="toggle-password"
            data-value="auth-password"
            id="toggle-password-btn"
            class="password-toggle"
            title="Показать пароль"
          >
            👁️
          </button>
          <div class="password-strength" style="display: none">
            <div class="strength-bar-container"><div id="strength-bar"></div></div>
            <span id="strength-text"></span>
          </div>
          <div class="input-error-msg"></div>
        </div>

        <div id="auth-confirm-password-container" class="input-group" style="display: none">
          <label for="auth-confirm-password" class="visually-hidden">Повторите пароль</label>
          <input
            type="password"
            id="auth-confirm-password"
            name="confirm-password"
            class="auth-input"
            placeholder="Повторите пароль"
            autocomplete="new-password"
          />
          <button
            type="button"
            data-action="toggle-password"
            data-value="auth-confirm-password"
            class="password-toggle"
            title="Показать пароль"
          >
            👁️
          </button>
          <div class="input-error-msg"></div>
        </div>

        <div id="auth-buttons" class="auth-actions">
          <button
            id="auth-submit-btn"
            class="btn auth-submit-btn"
            data-action="auth"
            data-value="login"
          >
            Войти
          </button>
        </div>
      </form>

      <div id="auth-reset-buttons" style="display: none">
        <button class="btn auth-submit-btn" data-action="auth" data-value="reset">
          Отправить ссылку
        </button>
      </div>

      <div id="auth-social" class="auth-social-section">
        <div class="auth-separator"><span>ИЛИ</span></div>
        <button class="btn google-btn" data-action="auth-google">
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          <span>Войти через Google</span>
        </button>
      </div>

      <div class="auth-footer">
        <span id="auth-mode-switch-container">
          Нет аккаунта?
          <a href="#" data-action="toggle-auth-mode" data-value="signup">Регистрация</a>
        </span>
        <a href="#" id="auth-forgot-link" data-action="toggle-reset-mode" data-value="true"
          >Забыли пароль?</a
        >
      </div>
      <div id="auth-error" class="auth-error-msg"></div>
    </div>
  </div>
</div>

<!-- Profile Modal -->
<div
  id="profile-modal"
  class="modal"
  role="dialog"
  aria-modal="true"
  aria-labelledby="profile-modal-title"
  tabindex="-1"
  data-close-modal="profile-modal"
>
  <div class="modal-content" style="padding: 0; background: var(--bg)">
    <div class="modal-body-container">
      <!-- Header -->
      <div class="profile-header">
        <h3 id="profile-modal-title">Профиль</h3>
        <button
          class="btn btn-icon close-modal-btn"
          data-close-modal="profile-modal"
          aria-label="Закрыть"
        >
          ✕
        </button>
      </div>

      <div style="padding: 20px">
        <!-- User Info Card -->
        <div class="user-profile-card">
          <div style="position: relative">
            <div
              class="user-avatar-large"
              id="profile-avatar-large"
              style="position: relative; cursor: pointer; overflow: hidden"
            >
              <span id="profile-avatar-text">👤</span>
              <img
                id="profile-avatar-img"
                src=""
                alt="Avatar"
                loading="lazy"
                style="width: 100%; height: 100%; object-fit: cover; display: none"
              />
              <div class="avatar-overlay">📷</div>
            </div>
            <button
              id="delete-avatar-btn"
              style="
                position: absolute;
                top: 0;
                right: 0;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                background: var(--danger);
                color: white;
                border: 3px solid var(--surface-1);
                cursor: pointer;
                display: none;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                padding: 0;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                z-index: 10;
              "
              title="Удалить фото"
              aria-label="Удалить фото"
            >
              ✕
            </button>
          </div>
          <input type="file" id="avatar-upload" accept="image/*" style="display: none" />
          <div
            class="profile-name-container"
            style="
              display: flex;
              align-items: center;
              gap: 8px;
              justify-content: center;
              width: 100%;
            "
          >
            <div class="user-name" id="profile-name-display" style="margin-bottom: 0">
              guest@example.com
            </div>
            <button
              class="btn-icon"
              id="edit-profile-name-btn"
              title="Изменить имя"
              aria-label="Изменить имя"
              style="font-size: 14px; padding: 4px; width: 24px; height: 24px"
            >
              ✏️
            </button>
          </div>
          <label for="profile-name-input" class="visually-hidden">Новое имя профиля</label>
          <input
            type="text"
            id="profile-name-input"
            name="profile-name"
            class="search-box"
            style="display: none; text-align: center; margin-bottom: 4px; width: 80%; padding: 8px"
            maxlength="20"
          />
          <div class="user-role" id="profile-role">Студент</div>
        </div>

        <!-- Appearance -->
        <div class="settings-section">
          <div class="settings-section-title">Внешний вид</div>
          <div class="settings-list">
            <div class="setting-item">
              <div class="setting-left">
                <span class="setting-icon">🌙</span><span class="setting-label">Ночной режим</span>
              </div>
              <label class="switch">
                <input
                  type="checkbox"
                  id="dark-mode-toggle-switch"
                  data-action="toggle-dark-mode"
                />
                <span class="slider"></span>
              </label>
            </div>
            <div class="setting-item">
              <div class="setting-left">
                <span class="setting-icon">🌗</span
                ><span class="setting-label">Авто-тема (по времени)</span>
              </div>
              <label class="switch">
                <input
                  type="checkbox"
                  id="auto-theme-toggle-switch"
                  data-action="toggle-auto-theme"
                />
                <span class="slider"></span>
              </label>
            </div>
            <div
              class="setting-item column"
              id="auto-theme-times"
              style="
                display: none;
                background: var(--surface-2);
                border-top: none;
                margin-top: -10px;
                border-radius: 0 0 20px 20px;
              "
            >
              <div
                style="
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  width: 100%;
                  margin-bottom: 10px;
                "
              >
                <div class="setting-left" style="font-size: 13px; color: var(--text-sub)">
                  🌙 Начало (час)
                </div>
                <input
                  type="number"
                  id="auto-theme-start"
                  class="search-box"
                  style="width: 70px; padding: 6px; text-align: center"
                  min="0"
                  max="23"
                  data-action="set-auto-theme-start"
                />
              </div>
              <div
                style="
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  width: 100%;
                "
              >
                <div class="setting-left" style="font-size: 13px; color: var(--text-sub)">
                  ☀️ Конец (час)
                </div>
                <input
                  type="number"
                  id="auto-theme-end"
                  class="search-box"
                  style="width: 70px; padding: 6px; text-align: center"
                  min="0"
                  max="23"
                  data-action="set-auto-theme-end"
                />
              </div>
            </div>
            <div class="setting-item block">
              <div style="display: flex; justify-content: space-between; margin-bottom: 15px">
                <div class="setting-left">
                  <span class="setting-icon">🎨</span
                  ><span class="setting-label">Цветовая тема</span>
                </div>
              </div>
              <div
                id="theme-picker-container"
                style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap"
              ></div>
            </div>
          </div>
        </div>

        <!-- Learning & Audio -->
        <div class="settings-section">
          <div class="settings-section-title">Обучение</div>
          <div class="settings-list">
            <div class="setting-item">
              <div class="setting-left">
                <span class="setting-icon">🉐</span
                ><span class="setting-label">Показывать Hanja</span>
              </div>
              <label class="switch">
                <input type="checkbox" id="hanja-setting-check" data-action="toggle-hanja" />
                <span class="slider"></span>
              </label>
            </div>
            <div class="setting-item block">
              <div class="setting-left" style="margin-bottom: 10px">
                <span class="setting-icon">🗣️</span><span class="setting-label">Голос озвучки</span>
              </div>
              <div class="segment-control" id="voice-selection">
                <button class="segment-btn" data-action="set-voice" data-value="female">
                  👩 Женский
                </button>
                <button class="segment-btn" data-action="set-voice" data-value="male">
                  👨 Мужской
                </button>
              </div>
            </div>
            <div class="setting-item block">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px">
                <div class="setting-left">
                  <span class="setting-icon">⏩</span><span class="setting-label">Скорость</span>
                </div>
                <span id="speed-val" class="setting-value">1.0x</span>
              </div>
              <div style="display: flex; align-items: center; gap: 15px">
                <span style="font-size: 14px">🐢</span>
                <input
                  type="range"
                  id="speed-slider"
                  min="0.5"
                  max="1.5"
                  step="0.1"
                  value="0.9"
                  style="flex: 1"
                  data-action="set-speed"
                />
                <span style="font-size: 14px">🐇</span>
              </div>
            </div>
            <div class="setting-item">
              <div class="setting-left">
                <span class="setting-icon">🎵</span
                ><span class="setting-label">Фоновая музыка</span>
              </div>
              <label class="switch">
                <input type="checkbox" id="background-music-check" data-action="toggle-music" />
                <span class="slider"></span>
              </label>
            </div>
            <div class="setting-item">
              <div class="setting-left">
                <span class="setting-icon">🔊</span><span class="setting-label">Громкость</span>
              </div>
              <div class="setting-right" style="flex: 1; justify-content: flex-end">
                <input
                  type="range"
                  id="background-music-volume-slider"
                  min="0"
                  max="1"
                  step="0.05"
                  value="0.3"
                  style="width: 80px"
                  data-action="set-music-volume"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- App & Data -->
        <div class="settings-section">
          <div class="settings-section-title">Приложение</div>
          <div class="settings-list">
            <button
              id="install-app-btn"
              class="setting-item"
              data-action="install-app"
              style="width: 100%; display: none; color: var(--primary)"
            >
              <div class="setting-left">
                <span class="setting-icon">📲</span
                ><span class="setting-label">Установить приложение</span>
              </div>
            </button>
            <div class="setting-item">
              <div class="setting-left">
                <span class="setting-icon">🔄</span
                ><span class="setting-label">Автообновление</span>
              </div>
              <label class="switch">
                <input type="checkbox" id="auto-update-check" data-action="toggle-auto-update" />
                <span class="slider"></span>
              </label>
            </div>
            <div class="setting-item">
              <div class="setting-left">
                <span class="setting-icon">🧠</span><span class="setting-label">AI Модель</span>
              </div>
              <div class="setting-right">
                <span
                  class="setting-value"
                  style="
                    font-size: 12px;
                    background: var(--surface-3);
                    padding: 4px 8px;
                    border-radius: 6px;
                  "
                  >Gemini 2.5 Flash</span
                >
              </div>
            </div>
            <div class="setting-item" data-modal-target="quotes-modal" style="cursor: pointer">
              <div class="setting-left">
                <span class="setting-icon">📜</span
                ><span class="setting-label">Избранные цитаты</span>
              </div>
              <div class="setting-right"><span class="setting-arrow">›</span></div>
            </div>
            <div class="setting-item" data-modal-target="trash-modal" style="cursor: pointer">
              <div class="setting-left">
                <span class="setting-icon">🗑️</span><span class="setting-label">Корзина</span>
              </div>
              <div class="setting-right">
                <span id="trash-count-badge" class="badge-count" style="display: none">0</span
                ><span class="setting-arrow">›</span>
              </div>
            </div>
            <div class="setting-item block">
              <div class="setting-left" style="margin-bottom: 10px">
                <span class="setting-icon">⏳</span
                ><span class="setting-label">Хранение в корзине</span>
              </div>
              <div class="segment-control" id="trash-retention-options">
                <button class="segment-btn" data-action="set-trash-retention" data-value="7">
                  7 дн.
                </button>
                <button class="segment-btn" data-action="set-trash-retention" data-value="30">
                  30 дн.
                </button>
                <button class="segment-btn" data-action="set-trash-retention" data-value="90">
                  90 дн.
                </button>
                <button class="segment-btn" data-action="set-trash-retention" data-value="365">
                  1 год
                </button>
              </div>
            </div>
            <div
              class="setting-item"
              data-modal-target="achievements-modal"
              style="cursor: pointer"
            >
              <div class="setting-left">
                <span class="setting-icon">🏆</span><span class="setting-label">Достижения</span>
              </div>
              <div class="setting-right"><span class="setting-arrow">›</span></div>
            </div>
            <div class="setting-item" data-action="reset-onboarding" style="cursor: pointer">
              <div class="setting-left">
                <span class="setting-icon">🎓</span
                ><span class="setting-label">Повторить обучение</span>
              </div>
            </div>
            <div class="setting-item" data-action="export-data" style="cursor: pointer">
              <div class="setting-left">
                <span class="setting-icon">💾</span
                ><span class="setting-label">Экспорт данных</span>
              </div>
            </div>
            <div class="setting-item" data-action="open-failed-requests" style="cursor: pointer">
              <div class="setting-left">
                <span class="setting-icon" style="color: var(--danger)">⚠️</span
                ><span class="setting-label">Ошибки заявок</span>
              </div>
            </div>
            <div
              class="setting-item"
              onclick="document.getElementById('import-file').click()"
              style="cursor: pointer"
            >
              <div class="setting-left">
                <span class="setting-icon">📂</span><span class="setting-label">Импорт данных</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Account Actions -->
        <div class="settings-section">
          <div class="settings-section-title">Аккаунт</div>
          <div class="settings-list">
            <div class="setting-item column">
              <label for="new-email" class="setting-left" style="width: 100%"
                ><span class="setting-icon">📧</span
                ><span class="setting-label">Смена Email</span></label
              >
              <form onsubmit="return false;" style="display: flex; gap: 10px; width: 100%">
                <input
                  type="email"
                  id="new-email"
                  name="new-email"
                  class="search-box"
                  placeholder="Новый Email"
                  autocomplete="email"
                  style="flex: 1"
                />
                <button class="btn btn-quiz" data-action="change-email" style="padding: 8px 16px">
                  OK
                </button>
              </form>
            </div>
            <div class="setting-item column">
              <label for="new-password" class="setting-left" style="width: 100%"
                ><span class="setting-icon">🔐</span
                ><span class="setting-label">Смена пароля</span></label
              >
              <form onsubmit="return false;" style="display: flex; gap: 10px; width: 100%">
                <div style="position: relative; flex: 1">
                  <input
                    type="password"
                    id="new-password"
                    name="new-password"
                    class="search-box"
                    placeholder="Новый пароль"
                    autocomplete="new-password"
                    style="padding-right: 35px"
                  />
                  <button
                    type="button"
                    data-action="toggle-password"
                    data-value="new-password"
                    class="password-toggle"
                  >
                    👁️
                  </button>
                </div>
                <button
                  class="btn btn-quiz"
                  data-action="change-password"
                  style="padding: 8px 16px"
                >
                  OK
                </button>
              </form>
              <div
                class="password-strength"
                id="new-strength-container"
                style="margin-top: 8px; display: none"
              >
                <div class="strength-bar-container"><div id="new-strength-bar"></div></div>
                <span id="new-strength-text"></span>
              </div>
            </div>
            <div class="setting-item" data-action="clear-data" style="cursor: pointer">
              <div class="setting-left">
                <span class="setting-icon">🗑</span
                ><span class="setting-label" style="color: var(--danger)">Сброс прогресса</span>
              </div>
            </div>
            <div class="setting-item" data-action="logout" style="cursor: pointer">
              <div class="setting-left">
                <span class="setting-icon">🚪</span
                ><span class="setting-label" style="color: var(--danger)">Выйти из аккаунта</span>
              </div>
            </div>
            <div class="setting-item" data-action="delete-account" style="cursor: pointer">
              <div class="setting-left">
                <span class="setting-icon">💀</span
                ><span class="setting-label" style="color: var(--danger)">Удалить аккаунт</span>
              </div>
            </div>
          </div>
        </div>

        <div
          id="app-version"
          style="
            text-align: center;
            font-size: 11px;
            color: var(--text-sub);
            margin-top: 20px;
            opacity: 0.5;
          "
        ></div>
      </div>
    </div>
  </div>
</div>

<!-- Favorite Quotes Modal -->
<div
  id="quotes-modal"
  class="modal"
  role="dialog"
  aria-modal="true"
  aria-labelledby="quotes-modal-title"
  tabindex="-1"
  data-close-modal="quotes-modal"
>
  <div class="modal-content" style="max-width: 500px">
    <div class="modal-header">
      <h3 id="quotes-modal-title">📜 Избранные цитаты</h3>
      <button
        class="btn btn-icon close-modal-btn"
        data-close-modal="quotes-modal"
        aria-label="Закрыть"
      >
        ✕
      </button>
    </div>
    <div class="modal-body">
      <div id="favorite-quotes-list">
        <!-- Quotes will be rendered here by JS -->
      </div>
    </div>
  </div>
</div>
`,tl=`<!-- Collections Management Modal -->
<div id="collections-modal" class="modal">
  <div class="modal-content">
    <div class="modal-header">
      <h3>📂 Мои списки</h3>
      <button
        class="btn-icon close-modal-btn"
        data-close-modal="collections-modal"
        aria-label="Закрыть"
      >
        ✕
      </button>
    </div>
    <div class="modal-body">
      <!-- Create New List -->
      <div class="collection-create-card">
        <div class="section-title-sm" style="margin-bottom: 15px">✨ Новый список</div>
        <div style="display: flex; gap: 12px; margin-bottom: 15px; flex-wrap: wrap">
          <label for="new-list-icon" class="visually-hidden">Иконка списка</label>
          <input type="text" id="new-list-icon" placeholder="Emoji" maxlength="2" />
          <label for="new-list-title" class="visually-hidden">Название списка</label>
          <input type="text" id="new-list-title" placeholder="Название списка" />
        </div>
        <div class="collection-options">
          <label class="switch-label">
            <div class="switch">
              <input type="checkbox" id="new-list-public" />
              <span class="slider"></span>
            </div>
            <span class="switch-text" style="font-weight: 600">🌐 Публичный</span>
          </label>
          <button
            class="btn btn-quiz"
            data-action="create-list"
            style="padding: 10px 24px; border-radius: 12px"
          >
            ➕ Создать
          </button>
        </div>
      </div>

      <!-- Lists Container -->
      <div id="collections-list" class="collections-list-container">
        <!-- Lists will be injected here -->
      </div>
    </div>
  </div>
</div>

<!-- Edit List Modal -->
<div id="edit-list-modal" class="modal">
  <div class="modal-content">
    <div class="modal-header">
      <h2>✏️ Редактировать список</h2>
      <button
        class="btn-icon close-modal-btn"
        data-close-modal="edit-list-modal"
        aria-label="Закрыть"
      >
        ✕
      </button>
    </div>
    <div class="modal-body">
      <input type="hidden" id="edit-list-id" />
      <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap">
        <label for="edit-list-icon" class="visually-hidden">Иконка списка</label>
        <input
          type="text"
          id="edit-list-icon"
          class="input"
          placeholder="Emoji"
          style="width: 60px; text-align: center"
          maxlength="2"
        />
        <label for="edit-list-title" class="visually-hidden">Название списка</label>
        <input
          type="text"
          id="edit-list-title"
          class="input"
          placeholder="Название списка"
          style="flex: 1"
        />
      </div>
      <button class="btn btn-primary" style="width: 100%" data-action="save-list-changes">
        Сохранить
      </button>
    </div>
  </div>
</div>

<!-- Add To List Modal (Used in ui_card.ts and ui_bulk.ts) -->
<div id="add-to-list-modal" class="modal">
  <div class="modal-content">
    <div class="modal-header">
      <h2>📂 Добавить в список</h2>
      <button
        class="btn-icon close-modal-btn"
        data-close-modal="add-to-list-modal"
        aria-label="Закрыть"
      >
        ✕
      </button>
    </div>
    <div class="modal-body">
      <div
        id="add-to-list-content"
        style="
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 400px;
          overflow-y: auto;
        "
      >
        <!-- Checkboxes will be injected here -->
      </div>
    </div>
  </div>
</div>
`,nl=`<!-- Study Goal Modal -->
<div id="study-goal-modal" class="modal">
  <div class="modal-content modal-centered">
    <div class="modal-header">
      <h3>🎯 Учебная цель</h3>
      <button
        class="btn-icon close-modal-btn"
        data-close-modal="study-goal-modal"
        aria-label="Закрыть"
      >
        ✕
      </button>
    </div>
    <div class="modal-body">
      <p style="text-align: center; margin-bottom: 20px; color: var(--text-sub)">
        Установите ежедневную цель, чтобы поддерживать мотивацию.
      </p>
      <div class="segment-control" id="study-goal-type">
        <button class="segment-btn" data-value="words">Слова</button>
        <button class="segment-btn" data-value="minutes">Минуты</button>
      </div>
      <div style="margin: 20px 0">
        <input
          type="range"
          id="study-goal-slider"
          min="5"
          max="100"
          step="5"
          value="10"
          style="width: 100%"
        />
        <div
          id="study-goal-value"
          style="text-align: center; font-size: 24px; font-weight: 800; margin-top: 10px"
        >
          10 слов
        </div>
      </div>
      <button id="save-study-goal-btn" class="btn btn-primary" style="width: 100%">
        Сохранить
      </button>
    </div>
  </div>
</div>
`,il=`<!-- Edit Word Modal -->
<div id="edit-word-modal" class="modal">
  <div class="modal-content">
    <div class="modal-header">
      <h3>✏️ Редактировать слово</h3>
      <button
        class="btn-icon close-modal-btn"
        data-close-modal="edit-word-modal"
        aria-label="Закрыть"
      >
        ✕
      </button>
    </div>
    <div class="modal-body">
      <form id="edit-word-form" onsubmit="return false;">
        <input type="hidden" id="edit-word-id" />
        <div class="input-group">
          <label for="edit-word-kr">Слово (KR)</label>
          <input type="text" id="edit-word-kr" class="input" />
        </div>
        <div class="input-group">
          <label for="edit-word-ru">Перевод (RU)</label>
          <input type="text" id="edit-word-ru" class="input" />
        </div>
        <div class="input-group">
          <label for="edit-word-hanja">Hanja (необязательно)</label>
          <input type="text" id="edit-word-hanja" class="input" />
        </div>
        <div class="input-group">
          <label for="edit-word-topic">Тема</label>
          <input type="text" id="edit-word-topic" class="input" />
        </div>
        <div class="input-group">
          <label for="edit-word-category">Категория</label>
          <input type="text" id="edit-word-category" class="input" />
        </div>
        <div class="input-group">
          <label for="edit-word-notes">Заметки</label>
          <textarea id="edit-word-notes" class="input" rows="3"></textarea>
        </div>
        <div class="form-actions" style="display: flex; gap: 10px; margin-top: 20px">
          <button class="btn btn-danger" data-action="delete-word" style="margin-right: auto">
            🗑️ Удалить
          </button>
          <button class="btn" data-close-modal="edit-word-modal">Отмена</button>
          <button class="btn btn-primary" data-action="save-word-changes">Сохранить</button>
        </div>
      </form>
    </div>
  </div>
</div>

<!-- Add Word Modal -->
<div id="add-word-modal" class="modal">
  <div class="modal-content">
    <div class="modal-header">
      <h3>➕ Добавить слова</h3>
      <button
        class="btn-icon close-modal-btn"
        data-close-modal="add-word-modal"
        aria-label="Закрыть"
      >
        ✕
      </button>
    </div>
    <div class="modal-body">
      <div id="add-word-form-view">
        <p style="font-size: 14px; color: var(--text-sub); margin-bottom: 15px">
          Вставьте одно или несколько слов (каждое с новой строки или через запятую). AI
          автоматически найдет перевод, примеры и аудио.
        </p>
        <div class="input-group">
          <label for="new-word-input" class="visually-hidden">Слова для добавления</label>
          <textarea
            id="new-word-input"
            class="input"
            rows="4"
            placeholder="Пример: 안녕하세요, 감사합니다, 사랑해요"
          ></textarea>
        </div>
        <div class="input-group">
          <label for="new-word-target-list">Добавить в список</label>
          <select id="new-word-target-list" class="input"></select>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 10px">
          <div class="input-group" style="flex: 1">
            <label for="new-word-topic">Тема (необязательно)</label>
            <input type="text" id="new-word-topic" class="input" placeholder="Мои слова" />
          </div>
          <div class="input-group" style="flex: 1">
            <label for="new-word-category">Категория (необязательно)</label>
            <input type="text" id="new-word-category" class="input" placeholder="Урок 1" />
          </div>
        </div>
        <button
          class="btn btn-primary"
          data-action="submit-word-request"
          style="width: 100%; margin-top: 20px"
        >
          Отправить заявку
        </button>
      </div>
      <div id="add-word-progress-view" style="display: none; text-align: center; padding: 20px 0">
        <div class="spinner-wrapper" style="width: 100px; height: 100px; margin: 0 auto 20px">
          <div class="loader-circle"></div>
        </div>
        <h4 style="margin-bottom: 10px">🤖 AI обрабатывает ваш запрос...</h4>
        <p id="word-request-status-text" style="color: var(--text-sub); margin-bottom: 15px">
          Обработано: 0 из 0
        </p>
        <div class="xp-bar-container" style="max-width: 200px; margin: 0 auto 20px">
          <div id="word-request-progress-bar" class="xp-bar-fill"></div>
        </div>
        <button id="cancel-word-request-btn" class="btn">Отменить</button>
      </div>
    </div>
  </div>
</div>
`,al=`<!-- Shop Modal -->
<div id="shop-modal" class="modal">
  <div class="modal-content shop-modal-content">
    <div class="modal-header shop-header">
      <h3>🛒 Магазин</h3>
      <div class="shop-header-right">
        <div class="shop-points" id="shop-user-points">💰 0</div>
        <button class="btn-icon close-modal-btn" data-close-modal="shop-modal" aria-label="Закрыть">
          ✕
        </button>
      </div>
    </div>

    <div class="shop-tabs">
      <div class="segment-control">
        <button class="segment-btn active" data-action="switch-shop-tab" data-value="all">
          Все
        </button>
        <button class="segment-btn" data-action="switch-shop-tab" data-value="theme">Темы</button>
        <button class="segment-btn" data-action="switch-shop-tab" data-value="feature">
          Улучшения
        </button>
        <button class="segment-btn" data-action="switch-shop-tab" data-value="rewards">
          🎁 Награды
        </button>
      </div>
    </div>

    <div class="modal-body-container" id="shop-scroll-container">
      <!-- Daily Reward Section -->
      <div id="daily-reward-section" style="display: none"></div>

      <div class="shop-grid" id="shop-items-container">
        <!-- Items will be rendered here -->
      </div>
    </div>
  </div>
</div>
`,sl=`<!-- Confirm Modal -->
<div
  id="confirm-modal"
  class="modal"
  role="dialog"
  aria-modal="true"
  aria-labelledby="confirm-title"
  tabindex="-1"
  data-close-modal="confirm-modal"
>
  <div class="modal-content modal-centered">
    <div class="modal-header no-border">
      <h3 id="confirm-title">Подтверждение</h3>
      <button class="btn btn-icon close-modal-btn" data-action="close-confirm" aria-label="Закрыть">
        ✕
      </button>
    </div>
    <div class="modal-body" style="text-align: center">
      <p id="confirm-message" style="margin-bottom: 20px; line-height: 1.5"></p>
      <div id="confirm-input-container" style="display: none; margin-bottom: 20px">
        <label for="confirm-password" class="visually-hidden">Подтверждение</label>
        <input
          type="password"
          id="confirm-password"
          class="search-box"
          style="width: 100%; text-align: center"
        />
      </div>
      <div style="display: flex; gap: 10px; justify-content: center">
        <button id="confirm-no" class="btn" style="flex: 1">Отмена</button>
        <button id="confirm-yes" class="btn btn-danger" style="flex: 1">Подтвердить</button>
        <button id="confirm-copy-btn" class="btn" style="display: none">Копировать</button>
      </div>
    </div>
  </div>
</div>

<!-- Image Picker Modal -->
<div id="image-picker-modal" class="modal">
  <div class="modal-content">
    <div class="modal-header">
      <h3>🖼️ Выберите изображение</h3>
      <button
        class="btn-icon close-modal-btn"
        data-close-modal="image-picker-modal"
        aria-label="Закрыть"
      >
        ✕
      </button>
    </div>
    <div class="modal-body">
      <div id="image-picker-grid" class="image-picker-grid">
        <!-- Previews will be injected here -->
      </div>
      <button id="regenerate-again-btn" class="btn" style="width: 100%; margin-top: 15px">
        🔄 Искать еще
      </button>
    </div>
  </div>
</div>

<!-- Fullscreen Image Overlay -->
<div id="fullscreen-image-overlay" class="fullscreen-image-overlay" style="display: none">
  <img id="fullscreen-image" src="" alt="Fullscreen view" />
</div>
`,ol=`<!-- Filter Panel (hidden by default) -->
<div id="filter-panel" class="hidden">
  <div class="filter-panel-header">
    <div class="filter-header-title">
      <h3>🔍 Фильтры</h3>
      <button class="reset-filters-btn" data-action="reset-filters" title="Сбросить все">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </button>
    </div>
    <button class="btn-icon close-panel-btn" data-action="toggle-filter-panel">✕</button>
  </div>

  <div class="filter-panel-content">
    <div class="filter-group">
      <div class="filter-label">Тип контента</div>
      <div class="segment-control" id="type-filters">
        <button class="segment-btn active" data-action="set-type-filter" data-value="word">
          <span class="segment-icon">📖</span> Слова
        </button>
        <button class="segment-btn" data-action="set-type-filter" data-value="grammar">
          <span class="segment-icon">📘</span> Грамматика
        </button>
      </div>
    </div>

    <div class="filter-group">
      <div class="filter-label">Сложность и Статус</div>
      <div class="level-grid" id="level-filters">
        <button class="filter-chip level-btn active" data-action="set-star-filter" data-value="all">
          Все
        </button>
        <button class="filter-chip level-btn" data-action="set-star-filter" data-value="★★★">
          ★★★
        </button>
        <button class="filter-chip level-btn" data-action="set-star-filter" data-value="★★☆">
          ★★☆
        </button>
        <button class="filter-chip level-btn" data-action="set-star-filter" data-value="★☆☆">
          ★☆☆
        </button>
      </div>
      <div class="status-grid">
        <button
          class="filter-chip status-btn fav"
          data-action="set-star-filter"
          data-value="favorites"
        >
          <span class="status-icon">❤️</span> Избранное
        </button>
        <button
          class="filter-chip status-btn mistake"
          data-action="set-star-filter"
          data-value="mistakes"
        >
          <span class="status-icon">⚠️</span> Ошибки
        </button>
      </div>
    </div>

    <div class="filter-group">
      <div class="filter-label">Параметры</div>
      <div class="filter-select-stack">
        <button id="topic-filter-btn" class="filter-select-btn" data-modal-target="topic-modal">
          <div class="fs-icon">🏷️</div>
          <div class="fs-content">
            <span class="fs-label">Тема</span>
            <span class="fs-value">Все темы</span>
          </div>
          <div class="fs-arrow">›</div>
        </button>
        <button
          id="category-filter-btn"
          class="filter-select-btn"
          data-modal-target="category-modal"
        >
          <div class="fs-icon">🔹</div>
          <div class="fs-content">
            <span class="fs-label">Категория</span>
            <span class="fs-value">Все категории</span>
          </div>
          <div class="fs-arrow">›</div>
        </button>
        <button
          id="collection-filter-btn-panel"
          class="filter-select-btn"
          data-action="open-collections-filter"
        >
          <div class="fs-icon">📂</div>
          <div class="fs-content">
            <span class="fs-label">Коллекция</span>
            <span class="fs-value">Все слова</span>
          </div>
          <div class="fs-arrow">›</div>
        </button>
      </div>
    </div>

    <div class="filter-group">
      <div class="filter-label">Сортировка</div>
      <div class="sort-grid">
        <button class="sort-card" data-action="sort-topic">
          <span class="sort-icon">🔤</span>
          <span>По теме</span>
        </button>
        <button class="sort-card" data-action="sort-level">
          <span class="sort-icon">⭐</span>
          <span>Сложность</span>
        </button>
        <button class="sort-card" data-action="sort-weak">
          <span class="sort-icon">💪</span>
          <span>Слабые</span>
        </button>
        <button class="sort-card" data-action="shuffle">
          <span class="sort-icon">🔀</span>
          <span>Микс</span>
        </button>
      </div>
    </div>
  </div>
</div>
<div id="filter-panel-overlay"></div>
`,rl=`<!-- Bottom Navigation -->
<nav id="bottom-nav">
  <button class="nav-btn active" data-action="nav-home">
    <span class="nav-icon">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    </span>
    <span class="nav-label">Главная</span>
  </button>
  <button class="nav-btn" data-action="open-collections-filter">
    <span class="nav-icon" title="Фильтры" aria-label="Открыть панель фильтров">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path
          d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"
        />
      </svg>
    </span>
    <span class="nav-label">Списки</span>
  </button>
  <button class="nav-btn" data-modal-target="quiz-modal">
    <span class="nav-icon">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line x1="6" x2="10" y1="12" y2="12" />
        <line x1="8" x2="8" y1="10" y2="14" />
        <line x1="15" x2="15.01" y1="13" y2="13" />
        <line x1="18" x2="18.01" y1="11" y2="11" />
        <rect width="20" height="12" x="2" y="6" rx="2" />
      </svg>
    </span>
    <span class="nav-label">Тренировка</span>
  </button>
  <button class="nav-btn" data-action="open-review">
    <span class="nav-icon">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
        <path d="M16 16h5v5" />
      </svg>
    </span>
    <span class="nav-label">Повторение</span>
    <span id="srs-badge" class="badge-count" style="display: none">0</span>
  </button>
  <button class="nav-btn" data-modal-target="stats-modal">
    <span class="nav-icon">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line x1="18" x2="18" y1="20" y2="10" />
        <line x1="12" x2="12" y1="20" y2="4" />
        <line x1="6" x2="6" y1="20" y2="14" />
      </svg>
    </span>
    <span class="nav-label">Прогресс</span>
  </button>
  <button class="nav-btn" data-action="open-feedback">
    <span class="nav-icon">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path
          d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
        />
      </svg>
    </span>
    <span class="nav-label">Отчёты</span>
  </button>
</nav>
`,ll=`<!-- Main Header -->
<header id="main-header">
  <div class="header-left">
    <div class="logo-container">
      <img src="app-logo.svg" alt="Logo" class="header-logo" />
    </div>
    <div class="header-branding">
      <span class="brand-main">TOPIK</span>
      <span class="brand-sub">Master</span>
    </div>
    <div id="db-status-indicator" class="db-status" title="Проверка соединения..."></div>
  </div>

  <div class="header-right">
    <!-- XP Widget (Ring) -->
    <button
      id="xp-level-widget"
      class="header-stat-item"
      data-modal-target="stats-modal"
      title="Статистика"
      aria-label="Открыть статистику"
    >
      <div class="xp-ring-wrapper">
        <svg class="xp-circular-chart" viewBox="0 0 36 36">
          <path
            class="xp-circle-bg"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            id="xp-fill"
            class="xp-circle-fill"
            stroke-dasharray="0, 100"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <div class="xp-level-num" id="user-level">1</div>
      </div>
      <div class="xp-meta">
        <span class="xp-label">LVL</span>
        <span id="xp-text" class="xp-val-text">0 XP</span>
      </div>
    </button>

    <button class="coin-pill" data-action="open-shop" title="Магазин">
      <span class="coin-icon">💰</span>
      <span id="coins-count-header">0</span>
    </button>

    <button
      id="profile-button"
      class="profile-btn-icon"
      data-action="open-profile"
      aria-label="Открыть профиль и настройки"
    >
      <div id="profile-avatar" class="profile-avatar">👤</div>
    </button>
  </div>
</header>
`,cl=`<div id="toolbar">
  <div class="search-container">
    <input
      type="text"
      id="searchInput"
      class="search-input"
      placeholder="Поиск слов..."
      autocomplete="off"
    />
    <div class="search-icon">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
    </div>
    <button class="search-clear-btn" onclick="window.resetSearchHandler()">✕</button>
  </div>

  <div class="toolbar-actions">
    <div class="view-toggle">
      <button
        class="view-btn active"
        data-value="grid"
        onclick="window.toggleViewMode('grid')"
        title="Плитка"
        aria-label="Переключить на вид 'Плитка'"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      </button>
      <button
        class="view-btn"
        data-value="list"
        onclick="window.toggleViewMode('list')"
        title="Список"
        aria-label="Переключить на вид 'Список'"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="8" y1="6" x2="21" y2="6"></line>
          <line x1="8" y1="12" x2="21" y2="12"></line>
          <line x1="8" y1="18" x2="21" y2="18"></line>
          <line x1="3" y1="6" x2="3.01" y2="6"></line>
          <line x1="3" y1="12" x2="3.01" y2="12"></line>
          <line x1="3" y1="18" x2="3.01" y2="18"></line>
        </svg>
      </button>
    </div>

    <button
      id="collection-filter-btn"
      class="tool-btn"
      style="
        display: none;
        width: auto;
        padding: 0 12px;
        gap: 6px;
        font-size: 13px;
        font-weight: 600;
      "
      title="Списки"
      aria-label="Фильтр по спискам"
    >
      <span>Все слова</span>
    </button>

    <button
      class="tool-btn"
      data-action="toggle-filter-panel"
      onclick="window.toggleFilterPanel()"
      title="Фильтры"
      aria-label="Открыть панель фильтров"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
      </svg>
    </button>

    <button
      class="tool-btn"
      data-modal-target="writing-modal"
      title="AI Письмо"
      aria-label="Открыть режим AI Письмо"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
    </button>

    <button
      id="focus-mode-btn"
      class="tool-btn"
      onclick="window.toggleFocusMode()"
      title="Режим фокусировки"
      aria-label="Включить режим фокусировки"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10"></circle>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    </button>

    <button
      class="tool-btn fire-btn"
      onclick="window.startDailyChallenge()"
      title="Ежедневный вызов"
      aria-label="Начать ежедневный вызов"
    >
      🔥
    </button>
  </div>
</div>
`,dl=`<!-- Level Up Overlay -->
<div id="level-up-overlay" class="level-up-overlay">
  <div class="level-up-content">
    <div class="level-up-icon">🎉</div>
    <h2 class="level-up-title">Новый уровень!</h2>
    <p class="level-up-text">Вы достигли <strong id="new-level-val">2</strong> уровня!</p>
    <button class="btn" data-action="close-level-up">Продолжить</button>
  </div>
</div>

<!-- Welcome Overlay -->
<div id="welcome-overlay" class="level-up-overlay welcome-overlay">
  <div class="level-up-content welcome-content">
    <div class="welcome-header-group">
      <div class="welcome-icon">👋</div>
      <h2 class="level-up-title" id="welcome-greeting">С возвращением!</h2>
      <p class="welcome-subtitle">Рады видеть вас, <strong id="welcome-username">Гость</strong>!</p>
    </div>

    <div id="welcome-quote" class="welcome-quote-container"></div>

    <button class="welcome-btn" data-action="close-welcome">
      <span>Поехали</span>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
    </button>
  </div>
</div>

<!-- Onboarding Overlay -->
<div id="onboarding-overlay">
  <!-- Content is injected by ui_onboarding.ts -->
</div>

<!-- PWA Install Banner -->
<div id="install-banner">
  <img src="/app-logo.svg" alt="App Logo" class="install-banner-logo" />
  <div class="install-banner-text">
    <strong>Установить приложение</strong>
    <span>Для быстрого доступа и работы офлайн</span>
  </div>
  <div class="install-banner-actions">
    <button class="btn btn-primary" data-action="install-app">Установить</button>
    <button class="btn-icon" data-action="dismiss-banner" title="Закрыть">✕</button>
  </div>
</div>

<!-- Bulk Actions Bar -->
<div id="bulk-bar" class="bulk-bar">
  <div class="bulk-count">Выбрано: <span id="bulk-count-val">0</span></div>
  <div class="bulk-actions">
    <button class="btn-icon" title="Добавить в список" data-action="bulk-list">📂</button>
    <button class="btn-icon" title="Переместить" data-action="bulk-move">🏷️</button>
    <button class="btn-icon" title="Удалить" data-action="bulk-delete" style="color: var(--danger)">
      🗑️
    </button>
    <button class="btn-icon" title="Выбрать все" data-action="bulk-select-all">✅</button>
  </div>
</div>
`,ul=`<!-- Grammar Modal -->
<div id="grammar-modal" class="modal">
  <div class="modal-content">
    <div class="modal-header">
      <h3 id="grammar-title">📘 Грамматика</h3>
      <button
        class="btn-icon close-modal-btn"
        data-close-modal="grammar-modal"
        aria-label="Закрыть"
      >
        ✕
      </button>
    </div>
    <div class="modal-body">
      <div id="grammar-content" class="grammar-content-body"></div>
    </div>
  </div>
</div>
`,ml=`<!-- Hanja Explorer Modal -->
<div id="hanja-modal" class="modal">
  <div class="modal-content">
    <div class="modal-header">
      <h3 id="hanja-title">Hanja</h3>
      <button class="btn-icon close-modal-btn" data-close-modal="hanja-modal" aria-label="Закрыть">
        ✕
      </button>
    </div>
    <div class="modal-body" style="padding: 0">
      <div id="hanja-list"></div>
    </div>
  </div>
</div>
`,pl=`<!-- Trash Modal -->
<div id="trash-modal" class="modal">
  <div class="modal-content">
    <div class="modal-header">
      <h3>🗑️ Корзина</h3>
      <div class="header-actions">
        <button
          class="btn-icon close-modal-btn"
          data-close-modal="trash-modal"
          aria-label="Закрыть"
        >
          ✕
        </button>
      </div>
    </div>
    <div class="modal-body">
      <div
        id="trash-select-all-container"
        style="
          display: none;
          padding: 10px;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 10px;
          align-items: center;
        "
      >
        <input type="checkbox" id="trash-select-all-checkbox" style="margin-right: 10px" />
        <label for="trash-select-all-checkbox" style="font-size: 14px; font-weight: 600"
          >Выбрать все</label
        >
      </div>
      <div id="trash-list" class="trash-list-container">
        <!-- Injected by ui_trash.ts -->
      </div>
      <div class="trash-actions" style="margin-top: 20px; display: flex; gap: 10px">
        <button id="restore-all-btn" class="btn" style="flex: 1; display: none">
          Восстановить все
        </button>
        <button id="empty-trash-btn" class="btn btn-danger" style="flex: 1; display: none">
          Очистить корзину
        </button>
      </div>
    </div>
  </div>
</div>
`,fl=`<!-- Favorite Quotes Modal -->
<div id="quotes-modal" class="modal">
  <div class="modal-content">
    <div class="modal-header">
      <h3>📜 Избранные цитаты</h3>
      <button class="btn-icon close-modal-btn" data-close-modal="quotes-modal" aria-label="Закрыть">
        ✕
      </button>
    </div>
    <div class="modal-body">
      <div id="quotes-list" class="quotes-list">
        <!-- Injected by ui_quotes.ts -->
      </div>
    </div>
  </div>
</div>
`,gl=`<!-- Achievements Modal -->
<div id="achievements-modal" class="modal">
  <div class="modal-content">
    <div class="modal-header">
      <h3>🏆 Достижения</h3>
      <button
        class="btn-icon close-modal-btn"
        data-close-modal="achievements-modal"
        aria-label="Закрыть"
      >
        ✕
      </button>
    </div>
    <div class="modal-body">
      <div id="achievements-header" style="text-align: center; margin-bottom: 20px">
        <!-- Header injected by stats.ts -->
      </div>
      <div id="achievements-list" class="achievements-grid">
        <!-- List injected by stats.ts -->
      </div>
    </div>
  </div>
</div>
`,vl=`<!-- Topic Selection Modal -->
<div id="topic-modal" class="modal">
  <div class="modal-content">
    <div class="modal-header">
      <h3>🏷️ Выберите тему</h3>
      <button class="btn-icon close-modal-btn" data-close-modal="topic-modal" aria-label="Закрыть">
        ✕
      </button>
    </div>
    <div class="modal-body">
      <div id="topic-modal-content" class="filter-modal-body">
        <!-- Injected by ui_filters.ts -->
      </div>
    </div>
  </div>
</div>

<!-- Category Selection Modal -->
<div id="category-modal" class="modal">
  <div class="modal-content">
    <div class="modal-header">
      <h3>🔹 Выберите категорию</h3>
      <button
        class="btn-icon close-modal-btn"
        data-close-modal="category-modal"
        aria-label="Закрыть"
      >
        ✕
      </button>
    </div>
    <div class="modal-body">
      <div id="category-modal-content" class="filter-modal-body">
        <!-- Injected by ui_filters.ts -->
      </div>
    </div>
  </div>
</div>
`,hl=`<!-- Leaderboard Modal -->\r
<div id="leaderboard-modal" class="modal">\r
  <div class="modal-content">\r
    <div class="modal-header">\r
      <h3>🏆 Таблица лидеров</h3>\r
      <button\r
        class="btn-icon close-modal-btn"\r
        data-close-modal="leaderboard-modal"\r
        aria-label="Закрыть"\r
      >\r
        ✕\r
      </button>\r
    </div>\r
    <div class="modal-body">\r
      <div id="leaderboard-list" class="leaderboard-list"></div>\r
    </div>\r
  </div>\r
</div>\r
`,yl=`<!-- Reading Modal -->\r
<div id="reading-modal" class="modal">\r
  <div class="modal-content reading-modal-content">\r
    <div class="modal-header">\r
      <h3>📖 Чтение</h3>\r
      <button\r
        class="btn-icon close-modal-btn"\r
        data-close-modal="reading-modal"\r
        aria-label="Закрыть"\r
      >\r
        ✕\r
      </button>\r
    </div>\r
    <div class="modal-body">\r
      <div id="reading-list" class="reading-list"></div>\r
      <div id="reading-view" style="display: none">\r
        <button class="btn-text" id="back-to-articles" style="margin-bottom: 15px">\r
          ← Назад к списку\r
        </button>\r
        <div id="article-container">\r
          <!-- Article content injected here -->\r
        </div>\r
      </div>\r
    </div>\r
  </div>\r
</div>\r
`,bl=`<!-- Writing AI Modal -->\r
<div id="writing-modal" class="modal">\r
  <div\r
    class="modal-content"\r
    style="max-width: 700px; height: 90vh; display: flex; flex-direction: column"\r
  >\r
    <div class="modal-header">\r
      <div style="display: flex; align-items: center; gap: 10px">\r
        <h3>✍️ TOPIK Writing AI</h3>\r
        <div\r
          id="writing-timer-box"\r
          style="\r
            display: flex;\r
            align-items: center;\r
            gap: 5px;\r
            background: var(--surface-3);\r
            padding: 4px 8px;\r
            border-radius: 12px;\r
            margin-left: 5px;\r
            border: 1px solid var(--border-color);\r
          "\r
        >\r
          <span\r
            id="writing-timer-display"\r
            style="\r
              font-weight: 700;\r
              font-family: monospace;\r
              font-size: 14px;\r
              width: 45px;\r
              text-align: center;\r
              color: var(--text-main);\r
            "\r
            >--:--</span\r
          >\r
          <button\r
            id="writing-timer-toggle"\r
            style="\r
              width: 24px;\r
              height: 24px;\r
              font-size: 12px;\r
              border: none;\r
              background: transparent;\r
              cursor: pointer;\r
              border-radius: 50%;\r
              display: flex;\r
              align-items: center;\r
              justify-content: center;\r
              color: var(--primary);\r
            "\r
          >\r
            ▶️\r
          </button>\r
        </div>\r
        <button\r
          id="writing-history-btn"\r
          class="btn-icon"\r
          style="width: 32px; height: 32px; font-size: 16px"\r
          title="История проверок"\r
        >\r
          🕒\r
        </button>\r
        <button\r
          id="writing-focus-btn"\r
          class="btn-icon"\r
          style="width: 32px; height: 32px; font-size: 16px"\r
          title="Режим фокусировки"\r
        >\r
          👁️\r
        </button>\r
        <button\r
          id="writing-font-size-btn"\r
          class="btn-icon"\r
          style="width: 32px; height: 32px; font-size: 14px; font-weight: 700"\r
          title="Размер шрифта"\r
        >\r
          Aa\r
        </button>\r
        <button\r
          id="writing-expand-btn"\r
          class="btn-icon"\r
          style="width: 32px; height: 32px; font-size: 16px"\r
          title="На весь экран"\r
        >\r
          ⤢\r
        </button>\r
      </div>\r
      <button\r
        class="btn-icon close-modal-btn"\r
        data-close-modal="writing-modal"\r
        aria-label="Закрыть"\r
      >\r
        ✕\r
      </button>\r
    </div>\r
    <div class="modal-body" style="flex: 1; overflow-y: auto">\r
      <!-- Editor View -->\r
      <div id="writing-editor-view" style="display: flex; flex-direction: column; gap: 15px">\r
        <!-- Task Selection -->\r
        <div class="segment-control" id="writing-task-selector">\r
          <button class="segment-btn active" data-task="51">Задание 51</button>\r
          <button class="segment-btn" data-task="52">Задание 52</button>\r
          <button class="segment-btn" data-task="53">Задание 53</button>\r
          <button class="segment-btn" data-task="54">Задание 54</button>\r
        </div>\r
\r
        <!-- Question Input -->\r
        <div id="writing-question-container" class="input-group">\r
          <div\r
            style="\r
              display: flex;\r
              justify-content: space-between;\r
              align-items: center;\r
              margin-bottom: 8px;\r
            "\r
          >\r
            <label class="form-label" style="margin-bottom: 0"\r
              >Вопрос / Тема / Описание графика</label\r
            >\r
            <button\r
              id="writing-img-btn"\r
              class="btn-text"\r
              style="font-size: 12px; padding: 4px 8px; background: var(--surface-3)"\r
            >\r
              📷 Фото\r
            </button>\r
          </div>\r
          <textarea\r
            id="writing-question"\r
            class="auth-input"\r
            rows="3"\r
            placeholder="Введите текст задания или описание графика..."\r
          ></textarea>\r
          <div\r
            id="writing-img-preview"\r
            style="display: none; margin-top: 10px; position: relative; width: fit-content"\r
          >\r
            <img\r
              id="writing-question-img"\r
              src=""\r
              style="\r
                max-height: 150px;\r
                border-radius: 8px;\r
                border: 1px solid var(--border-color);\r
                display: block;\r
              "\r
            />\r
            <button\r
              id="remove-writing-img"\r
              style="\r
                position: absolute;\r
                top: -8px;\r
                right: -8px;\r
                background: var(--danger);\r
                color: white;\r
                border: 2px solid var(--surface-1);\r
                border-radius: 50%;\r
                width: 24px;\r
                height: 24px;\r
                font-size: 12px;\r
                cursor: pointer;\r
                display: flex;\r
                align-items: center;\r
                justify-content: center;\r
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);\r
              "\r
            >\r
              ✕\r
            </button>\r
          </div>\r
          <input type="file" id="writing-file-input" accept="image/*" style="display: none" />\r
        </div>\r
\r
        <!-- Answer Input -->\r
        <div class="input-group" style="flex: 1; display: flex; flex-direction: column">\r
          <label class="form-label"\r
            >Ваш ответ\r
            <span id="char-count" style="float: right; font-weight: normal; opacity: 0.7"\r
              >0 знаков</span\r
            ></label\r
          >\r
          <textarea\r
            id="writing-answer"\r
            class="auth-input"\r
            style="flex: 1; resize: none; min-height: 200px"\r
            placeholder="Напишите ваш ответ здесь..."\r
          ></textarea>\r
        </div>\r
\r
        <!-- Action -->\r
        <button id="check-writing-btn" class="btn btn-quiz" style="width: 100%">\r
          ✨ Проверить с AI\r
        </button>\r
\r
        <!-- Result Area (Hidden by default) -->\r
        <div\r
          id="writing-result"\r
          style="\r
            display: none;\r
            background: var(--surface-2);\r
            padding: 15px;\r
            border-radius: 16px;\r
            margin-top: 10px;\r
          "\r
        >\r
          <div\r
            style="\r
              display: flex;\r
              justify-content: space-between;\r
              align-items: center;\r
              margin-bottom: 10px;\r
            "\r
          >\r
            <h4 style="margin: 0">Результат</h4>\r
            <span id="writing-score" class="shop-points"></span>\r
          </div>\r
          <div id="writing-feedback-content"></div>\r
        </div>\r
      </div>\r
\r
      <!-- History View -->\r
      <div id="writing-history-view" style="display: none; flex-direction: column; gap: 15px">\r
        <div style="display: flex; justify-content: space-between; align-items: center">\r
          <button id="back-to-editor-btn" class="btn-text">← Назад к редактору</button>\r
          <button\r
            id="clear-writing-history-btn"\r
            class="btn-text"\r
            style="color: var(--danger); display: none"\r
          >\r
            🗑️ Очистить\r
          </button>\r
        </div>\r
        <div\r
          id="writing-history-filters"\r
          style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 2px"\r
        >\r
          <button class="history-filter-btn active" data-filter="all">Все</button>\r
          <button\r
            class="history-filter-btn"\r
            data-filter="favorites"\r
            title="Избранное"\r
            style="color: var(--gold)"\r
          >\r
            ★\r
          </button>\r
          <button class="history-filter-btn" data-filter="51">51</button>\r
          <button class="history-filter-btn" data-filter="52">52</button>\r
          <button class="history-filter-btn" data-filter="53">53</button>\r
          <button class="history-filter-btn" data-filter="54">54</button>\r
        </div>\r
        <div\r
          id="writing-history-list"\r
          style="display: flex; flex-direction: column; gap: 10px"\r
        ></div>\r
      </div>\r
    </div>\r
  </div>\r
</div>\r
\r
<!-- OCR Edit Modal (Nested or separate) -->\r
<div id="ocr-edit-modal" class="modal" style="z-index: 2100">\r
  <div class="modal-content" style="max-width: 500px">\r
    <div class="modal-header">\r
      <h3>📝 Проверка текста</h3>\r
      <button class="btn-icon close-modal-btn" data-close-modal="ocr-edit-modal">✕</button>\r
    </div>\r
    <div class="modal-body" style="padding: 20px">\r
      <p style="margin-bottom: 10px; color: var(--text-sub); font-size: 14px">\r
        Отредактируйте распознанный текст перед вставкой:\r
      </p>\r
      <textarea\r
        id="ocr-edit-textarea"\r
        class="auth-input"\r
        rows="8"\r
        style="width: 100%; resize: vertical; margin-bottom: 20px"\r
      ></textarea>\r
      <button id="ocr-confirm-btn" class="btn btn-quiz" style="width: 100%">\r
        Вставить в поле вопроса\r
      </button>\r
    </div>\r
  </div>\r
</div>\r
`,xl=`<!-- Listening Lab Modal -->\r
<div id="listening-modal" class="modal">\r
  <div class="modal-content listening-modal-content">\r
    <div class="modal-header">\r
      <h3>🎧 Аудирование</h3>\r
      <button\r
        class="btn-icon close-modal-btn"\r
        data-close-modal="listening-modal"\r
        aria-label="Закрыть"\r
      >\r
        ✕\r
      </button>\r
    </div>\r
    <div class="modal-body">\r
      <canvas id="listening-visualizer" width="600" height="120"></canvas>\r
\r
      <div class="listening-controls">\r
        <button id="listening-play-btn" class="btn-icon-lg">▶️</button>\r
        <div class="listening-speed-control" id="listening-speed-control">\r
          <button class="btn-text" data-speed="0.8">0.8x</button>\r
          <button class="btn-text active" data-speed="1.0">1.0x</button>\r
          <button class="btn-text" data-speed="1.2">1.2x</button>\r
        </div>\r
      </div>\r
\r
      <div id="listening-status" class="listening-status">Нажмите Play, чтобы прослушать</div>\r
      <div id="listening-options" class="listening-options-grid"></div>\r
    </div>\r
  </div>\r
</div>\r
`,wl=`<!-- Feedback Modal -->\r
<div id="feedback-modal" class="modal">\r
  <div class="modal-content" style="max-width: 500px">\r
    <div class="modal-header">\r
      <h3>📢 Сообщить о проблеме</h3>\r
      <button\r
        class="btn-icon close-modal-btn"\r
        data-close-modal="feedback-modal"\r
        aria-label="Закрыть"\r
      >\r
        ✕\r
      </button>\r
    </div>\r
    <div class="modal-body">\r
      <form id="feedback-form" onsubmit="return false;">\r
        <div class="input-group">\r
          <label class="form-label">Тип обращения</label>\r
          <div class="segment-control" id="feedback-type-selector">\r
            <button class="segment-btn active" data-value="bug">🐛 Баг</button>\r
            <button class="segment-btn" data-value="feature">💡 Идея</button>\r
            <button class="segment-btn" data-value="question">❓ Вопрос</button>\r
          </div>\r
        </div>\r
\r
        <div class="input-group">\r
          <label for="feedback-title" class="form-label">Тема</label>\r
          <input\r
            type="text"\r
            id="feedback-title"\r
            class="auth-input"\r
            placeholder="Кратко о проблеме..."\r
            required\r
          />\r
        </div>\r
\r
        <div class="input-group">\r
          <label for="feedback-desc" class="form-label">Описание</label>\r
          <textarea\r
            id="feedback-desc"\r
            class="auth-input"\r
            rows="4"\r
            placeholder="Подробности, шаги воспроизведения..."\r
            required\r
            style="resize: vertical"\r
          ></textarea>\r
        </div>\r
\r
        <div class="input-group">\r
          <label class="form-label">Вложения (макс 3 файла, до 10MB)</label>\r
          <div id="feedback-drop-zone" class="drop-zone">\r
            <div class="drop-zone-content">\r
              <span style="font-size: 24px; margin-bottom: 8px">📎</span>\r
              <span style="font-size: 13px; color: var(--text-sub)"\r
                >Перетащите файлы сюда или\r
                <span style="color: var(--primary); font-weight: 600; cursor: pointer"\r
                  >выберите</span\r
                ></span\r
              >\r
              <button\r
                id="feedback-screenshot-btn"\r
                class="btn-text"\r
                style="margin-top: 8px; font-size: 12px"\r
              >\r
                📸 Сделать скриншот\r
              </button>\r
            </div>\r
            <input\r
              type="file"\r
              id="feedback-file-input"\r
              multiple\r
              accept="image/*,video/*"\r
              style="display: none"\r
            />\r
          </div>\r
          <div id="feedback-attachments-list" class="attachments-grid"></div>\r
        </div>\r
\r
        <div class="input-group">\r
          <label class="form-label">Приоритет</label>\r
          <div class="priority-selector" id="feedback-priority-selector">\r
            <button class="priority-btn" data-value="low" style="--p-color: var(--success)">\r
              🟢 Низкий\r
            </button>\r
            <button class="priority-btn active" data-value="medium" style="--p-color: var(--info)">\r
              🔵 Средний\r
            </button>\r
            <button class="priority-btn" data-value="high" style="--p-color: var(--warning)">\r
              🟠 Высокий\r
            </button>\r
            <button class="priority-btn" data-value="urgent" style="--p-color: var(--danger)">\r
              🔴 Срочно\r
            </button>\r
          </div>\r
        </div>\r
\r
        <button id="submit-feedback-btn" class="btn btn-quiz" style="width: 100%; margin-top: 10px">\r
          🚀 Отправить\r
        </button>\r
      </form>\r
    </div>\r
  </div>\r
</div>\r
`,El=`<div id="admin-modal" class="modal">\r
  <div class="modal-content" style="max-width: 900px; width: 95%">\r
    <div class="modal-header">\r
      <h3>👑 Админ-панель: Отчёты</h3>\r
      <button class="btn-icon close-modal-btn" data-close-modal="admin-modal" aria-label="Закрыть">\r
        ✕\r
      </button>\r
    </div>\r
    <div class="modal-body" style="padding: 0">\r
      <div class="admin-toolbar">\r
        <button id="admin-refresh-btn" class="btn-text">🔄 Обновить</button>\r
      </div>\r
      <div id="admin-reports-list" class="admin-reports-container">\r
        <!-- Reports will be rendered here -->\r
      </div>\r
    </div>\r
  </div>\r
</div>\r
`;class Sl extends te{constructor(){super("admin-modal")}show(){this.ensureStructure(),N("admin-modal"),this.loadReports()}render(){}setupEventListeners(){const e=this.$("#admin-refresh-btn");e&&this.addEvent(e,"click",()=>this.loadReports())}ensureStructure(){document.getElementById("admin-modal")}async loadReports(){const e=this.$("#admin-reports-list");if(e){e.innerHTML='<div style="padding:20px; text-align:center;"><div class="spinner-tiny"></div></div>';try{const{data:n,error:i}=await S.functions.invoke("get-feedback-reports",{method:"GET"});if(i)throw i;if(n?.error)throw new Error(n.error);if(!n?.reports)throw new Error("Неверный ответ сервера");this.renderReports(n.reports)}catch(n){const i=n;console.error("Failed to load reports:",i),e.innerHTML=`<div style="padding:20px; text-align:center; color:var(--danger);">${i.message}</div>`}}}renderReports(e){const n=this.$("#admin-reports-list");if(n){if(e.length===0){n.innerHTML='<div style="padding:20px; text-align:center; color:var(--text-sub);">Нет отчётов.</div>';return}n.innerHTML=e.map(i=>this.renderReportCard(i)).join(""),n.querySelectorAll(".admin-status-select").forEach(i=>{this.addEvent(i,"change",a=>{const s=i.dataset.id,l=a.target.value;s&&this.updateStatus(s,l,i)})})}}renderReportCard(e){const n={low:"#2ecc71",medium:"#3498db",high:"#f39c12",urgent:"#e74c3c"},i=["open","in_progress","fixed","closed"];return`
            <div class="admin-report-card">
                <div class="admin-report-header">
                    <div>
                        <div class="admin-report-title">${w(e.title)}</div>
                        <div class="admin-report-meta">
                            <span><strong>От:</strong> ${w(e.user?.full_name||e.user?.email||"N/A")}</span>
                            <span><strong>Дата:</strong> ${new Date(e.created_at).toLocaleString()}</span>
                        </div>
                    </div>
                    <div style="text-align:right;">
                        <span class="priority-badge" style="background-color:${n[e.priority]||"#bdc3c7"}">${w(e.priority)}</span>
                        <div style="font-size:12px; margin-top:5px;">${w(e.type)}</div>
                    </div>
                </div>
                <div class="admin-report-body">${w(e.description)}</div>
                <div class="admin-report-footer">
                    <select class="admin-status-select" data-id="${w(e.id)}">
                        ${i.map(a=>`<option value="${a}" ${e.status===a?"selected":""}>${a}</option>`).join("")}
                    </select>
                </div>
            </div>
        `}async updateStatus(e,n,i){i.disabled=!0;try{const{data:a,error:s}=await S.functions.invoke("update-feedback-status",{method:"POST",body:{report_id:e,new_status:n}});if(s)throw s;if(a?.error)throw new Error(a.error);if(!a?.success)throw new Error("Статус не был обновлён");h("✅ Статус обновлён")}catch(a){h(`❌ Ошибка: ${a.message}`),this.loadReports()}finally{i.disabled=!1}}}const kl=new Sl;window.location.hash==="#admin"&&(setTimeout(()=>kl.show(),500),window.history.replaceState(null,"",window.location.pathname));class _l extends te{subscription=null;currentMode="weekly";constructor(){super("leaderboard-modal")}async show(){N("leaderboard-modal"),this.setupTabs(),await this.loadData(),this.setupRealtime()}render(){}setupRealtime(){this.subscription||(this.subscription=S.channel("leaderboard_updates").on("postgres_changes",{event:"*",schema:"public",table:A.USER_GLOBAL_STATS},()=>{this.element.classList.contains("active")&&this.loadData()}).subscribe())}destroy(){super.destroy(),this.subscription&&(S.removeChannel(this.subscription),this.subscription=null)}setupTabs(){const e=this.$(".modal-header");if(!e||e.querySelector(".lb-tabs"))return;const n=document.createElement("div");n.style.display="flex",n.style.alignItems="center",n.style.gap="10px",n.style.marginTop="10px",n.style.width="100%";const i=document.createElement("div");i.className="lb-tabs segment-control",i.style.flex="1",i.innerHTML=`
    <button class="segment-btn active" data-lb-mode="weekly">Эта неделя</button>
    <button class="segment-btn" data-lb-mode="all_time">Все время</button>
  `;const a=document.createElement("button");a.className="btn-icon",a.style.width="36px",a.style.height="36px",a.style.fontSize="18px",a.innerHTML="↻",a.setAttribute("aria-label","Обновить таблицу лидеров"),a.title="Обновить",this.addEvent(a,"click",()=>{a.classList.add("rotating"),this.loadData().finally(()=>{setTimeout(()=>a.classList.remove("rotating"),500)})}),i.querySelectorAll("button").forEach(s=>{this.addEvent(s,"click",()=>{i.querySelectorAll("button").forEach(l=>l.classList.remove("active")),s.classList.add("active"),this.currentMode=s.dataset.lbMode,this.loadData()})}),n.appendChild(i),n.appendChild(a),e.appendChild(n)}async loadData(){const e=document.getElementById("leaderboard-list");if(!e)return;e.innerHTML=`
    <div style="display: flex; justify-content: center; align-items: center; height: 200px; flex-direction: column; gap: 15px;">
      <div style="width: 40px; height: 40px; border: 4px solid var(--surface-3); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <div style="font-size: 13px; color: var(--text-sub);">Загрузка данных...</div>
    </div>
  `;let n=await lt(2e3);n||(h("⏳ База данных просыпается, подождите..."),await new Promise(i=>setTimeout(i,2e3)),n=await lt(5e3));try{let i=S.from(A.USER_GLOBAL_STATS).select("user_id, xp, weekly_xp, level, full_name, avatar_url, league");this.currentMode==="weekly"?i=i.order("weekly_xp",{ascending:!1}):i=i.order("level",{ascending:!1}).order("xp",{ascending:!1}),i=i.limit(50);const{data:a,error:s}=await pt(Promise.resolve(i),6e4,new Error("Timeout"));if(s)throw s;let l=null,r=0;const c=o.currentUser?.id;if(c&&a&&!a.find(u=>u.user_id===c)){const{data:u}=await S.from(A.USER_GLOBAL_STATS).select("user_id, xp, weekly_xp, level, full_name, avatar_url, league").eq("user_id",c).single();if(u){l=u;let m=0;if(this.currentMode==="weekly")m=(await S.from(A.USER_GLOBAL_STATS).select("user_id",{count:"exact",head:!0}).gt("weekly_xp",u.weekly_xp)).count||0;else{const p=await S.from(A.USER_GLOBAL_STATS).select("user_id",{count:"exact",head:!0}).gt("level",u.level),g=await S.from(A.USER_GLOBAL_STATS).select("user_id",{count:"exact",head:!0}).eq("level",u.level).gt("xp",u.xp);m=(p.count||0)+(g.count||0)}r=m+1}}this.renderList(a||[],l,r)}catch(i){console.error("Leaderboard error:",i);const a=i instanceof Error?i.message:i?.message||String(i);e.innerHTML=`
      <div style="text-align:center; padding:30px 20px; color: var(--text-sub);">
        <div style="font-size: 40px; margin-bottom: 10px;">📡</div>
        <div style="margin-bottom: 5px;">Не удалось загрузить таблицу лидеров</div>
        <div style="font-size: 12px; color: var(--danger); margin-bottom: 15px; max-width: 250px; margin-left: auto; margin-right: auto; line-height: 1.4;">${w(a)}</div>
        <button class="btn btn-quiz" data-action="open-leaderboard">
          ↻ Повторить
        </button>
      </div>`}}renderList(e,n,i){const a=document.getElementById("leaderboard-list");if(!a)return;if(e.length===0){a.innerHTML=`
      <div style="text-align:center; padding:40px 20px; color: var(--text-sub);">
        <div style="font-size: 40px; margin-bottom: 10px;">🏆</div>
        <div>Пока пусто. Станьте первым!</div>
      </div>`;return}let s="";const l=o.currentUser?.id;l||(s+=`
      <div style="background: rgba(124, 58, 237, 0.1); border: 1px solid rgba(124, 58, 237, 0.2); border-radius: 12px; padding: 12px; margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; font-size: 13px;">
        <span>💡 <b>Гостевой режим:</b> Войдите в аккаунт, чтобы занять место в общем рейтинге!</span>
        <button class="btn btn-primary btn-sm" data-action="open-login" style="padding: 4px 10px; font-size: 12px; white-space: nowrap;">Войти</button>
      </div>`);const r=(c,d,u)=>{const m=c.full_name||"Аноним",p=c.avatar_url,g=this.currentMode==="weekly"?c.weekly_xp||0:Ns(c.level||1,c.xp||0),f=c.level||1,y=ht(f),b=c.league||"Bronze",E={Bronze:"🥉",Silver:"🥈",Gold:"🥇",Platinum:"💠",Diamond:"💎",Master:"🔮",Grandmaster:"👑",Challenger:"👹"}[b]||"🛡️";let k=`<span class="rank-num">${d}</span>`,T="";return d===1?(k="🥇",T="rank-1"):d===2?(k="🥈",T="rank-2"):d===3&&(k="🥉",T="rank-3"),`
      <div class="leaderboard-item ${u?"is-me":""} ${T}">
          <div class="lb-rank">${k}</div>
          <div class="lb-avatar">
              <img src="${w(p||"")}" alt="Avatar" loading="lazy" width="40" height="40" style="display: ${p?"block":"none"};" onerror="this.style.display='none'; if (this.nextElementSibling) this.nextElementSibling.style.display='block';">
              <div class="lb-avatar-placeholder" style="display: ${p?"none":"block"};">${m.charAt(0).toUpperCase()}</div>
          </div>
          <div class="lb-info">
              <div class="lb-name">${w(m)} ${u?"(Вы)":""}</div>
              <div class="lb-meta">
                <span class="lb-league-badge" title="${b}">${E}</span>
                <span class="lb-level" style="color: ${y.color}">${y.icon} ${y.name}</span>
              </div>
          </div>
          <div class="lb-xp">${g.toLocaleString()} XP</div>
      </div>
    `};s+=e.map((c,d)=>r(c,d+1,c.user_id===l)).join(""),n&&(s+=`
      <div class="leaderboard-separator">
        <span>•</span><span>•</span><span>•</span>
      </div>
    `,s+=r(n,i,!0)),a.innerHTML=s}}const Tl=new _l;async function Il(){Tl.show()}function Cl(){Bl()}class Ll extends te{constructor(){super("trash-modal")}async show(){if(!this.element.id||!document.body.contains(this.element)){const e=document.getElementById("trash-modal");e&&(this.element=e)}this.ensureStructure(),N("trash-modal"),await this.loadTrashItems()}render(){}ensureStructure(){if(!this.element.id||!document.body.contains(this.element)){const i=document.getElementById("trash-modal");i&&(this.element=i)}let e=document.getElementById("trash-modal");e&&(this.element=e),e||(e=document.createElement("div"),e.id="trash-modal",e.className="modal",e.setAttribute("data-close-modal","trash-modal"),document.body.appendChild(e)),e.innerHTML=`
      <div class="modal-content">
        <div class="modal-header">
          <h3>🗑️ Корзина</h3>
          <div style="display: flex; align-items: center; gap: 10px;">
            <button class="btn-text" id="empty-trash-action" style="color: var(--danger); font-size: 13px; font-weight: 600;">Очистить всё</button>
            <button class="btn btn-icon close-modal-btn" data-close-modal="trash-modal" aria-label="Закрыть">✕</button>
          </div>
        </div>
        <div id="trash-list" class="trash-list-container">
          <div style="text-align:center; padding:20px;"><div class="spinner-tiny"></div> Загрузка...</div>
        </div>
      </div>
    `,this.element=e;const n=e.querySelector("#empty-trash-action");n&&this.addEvent(n,"click",()=>os())}async loadTrashItems(){const e=document.getElementById("trash-list");if(!e)return;e.scrollTop=0,e.innerHTML='<div style="text-align:center; padding:20px;"><div class="spinner-tiny"></div> Загрузка...</div>';let n=o.currentUser?.id;if(!n){const{data:l}=await S.auth.getSession();n=l?.session?.user?.id}let i=S.from(A.VOCABULARY).select("*").not("deleted_at","is",null).order("deleted_at",{ascending:!1});n&&(i=i.eq("created_by",n));const{data:a,error:s}=await i;if(s){console.error("Error loading trash:",s),e.innerHTML='<div style="text-align:center; color:var(--danger); padding:20px;">Ошибка загрузки</div>';return}if(!a||a.length===0){e.innerHTML='<div style="text-align:center; color:var(--text-sub); padding:20px;">Корзина пуста</div>';return}e.innerHTML=a.map(l=>`
      <div class="trash-item">
        <div class="trash-item-info">
          <div class="trash-item-word">${w(l.word_kr)}</div>
          <div class="trash-item-date">${l.deleted_at?new Date(l.deleted_at).toLocaleDateString():""}</div>
        </div>
        <div class="trash-item-actions">
          <button class="btn-icon" data-action="restore-word" data-value="${l.id}" title="Восстановить" aria-label="Восстановить">♻️</button>
          <button class="btn-icon" data-action="delete-word-permanent" data-value="${l.id}" title="Удалить навсегда" style="color:var(--danger);" aria-label="Удалить навсегда">✕</button>
        </div>
      </div>
    `).join("")}}const zt=new Ll;async function Al(t){let e=t;typeof t=="string"&&/^\d+$/.test(t)&&(e=parseInt(t,10));try{const{error:n}=await S.from(A.VOCABULARY).update({deleted_at:null}).eq("id",e);if(n)throw n;h("Слово восстановлено"),zt.loadTrashItems();const{data:i}=await S.from(A.VOCABULARY).select("*").eq("id",e).single();i&&(o.dataStore.find(a=>a.id===i.id)||(o.dataStore.unshift(i),document.dispatchEvent(new CustomEvent("state-changed")),window.updateSearchIndex&&window.updateSearchIndex()))}catch(n){h("Ошибка восстановления: "+n.message)}}async function Ml(t,e){let n=t;typeof t=="string"&&/^\d+$/.test(t)&&(n=parseInt(t,10)),le("Удалить навсегда? Это действие нельзя отменить.",async()=>{const i=e.closest(".trash-item");i&&(i.style.transition="opacity 0.3s, transform 0.3s",i.style.opacity="0",i.style.transform="translateX(20px)",await new Promise(s=>setTimeout(s,300)),i.remove());const{error:a}=await S.from(A.VOCABULARY).delete().eq("id",n);if(a)h("Ошибка удаления: "+a.message),zt.loadTrashItems();else{await S.from(A.USER_PROGRESS).delete().eq("word_id",n),h("Удалено навсегда");const s=document.getElementById("trash-list");s&&s.children.length===0&&zt&&zt.loadTrashItems()}})}async function os(){const t=document.getElementById("trash-list");if(t&&t.querySelector(".trash-item")===null){h("Корзина уже пуста");return}le("Удалить все слова из корзины навсегда? Это действие нельзя отменить.",async()=>{let e=o.currentUser?.id;if(!e){const{data:n}=await S.auth.getSession();e=n?.session?.user?.id}if(e){const{data:n}=await S.from(A.VOCABULARY).select("id").eq("created_by",e).not("deleted_at","is",null);if(n&&n.length>0){const i=n.map(a=>a.id);await S.from(A.USER_PROGRESS).delete().in("word_id",i),await S.from(A.VOCABULARY).delete().in("id",i)}}h("Корзина очищена"),zt.loadTrashItems()})}async function Bl(){if(!o.currentUser?.id)return;const t=o.trashRetentionDays||30,e=new Date;e.setDate(e.getDate()-t);const n=e.toISOString(),i=o.currentUser.id,{error:a}=await S.from(A.VOCABULARY).delete().eq("created_by",i).not("deleted_at","is",null).lt("deleted_at",n);a&&console.error("Failed to cleanup expired trash:",a)}class zl extends te{constructor(){super("mistakes-modal")}show(){if(!this.element.id||!document.body.contains(this.element)){const e=document.getElementById("mistakes-modal");e&&(this.element=e)}this.ensureStructure(),N("mistakes-modal"),this.render()}ensureStructure(){if(!this.element.id||!document.body.contains(this.element)){const n=document.getElementById("mistakes-modal");n&&(this.element=n)}let e=document.getElementById("mistakes-modal");if(e){this.element=e;return}e=document.createElement("div"),e.id="mistakes-modal",e.className="modal",e.setAttribute("data-close-modal","mistakes-modal"),e.innerHTML=`
      <div class="modal-content">
        <div class="modal-header">
          <h3>⚠️ Анализ ошибок</h3>
          <div class="header-actions">
            <button class="btn btn-icon close-modal-btn" data-close-modal="mistakes-modal" aria-label="Закрыть">✕</button>
          </div>
        </div>
        <div id="mistakes-content" class="modal-body-container"></div>
      </div>
    `,document.body.appendChild(e),this.element=e}render(){const e=document.getElementById("mistakes-content");if(!e)return;e.scrollTop=0;const n=o.dataStore.filter(d=>o.mistakes.has(d.id));if(n.length===0){e.innerHTML=`
      <div style="text-align: center; padding: 40px; color: var(--text-sub);">
        <div style="font-size: 48px; margin-bottom: 15px;">🎉</div>
        <div style="font-size: 18px; font-weight: bold;">Ошибок нет!</div>
        <div style="font-size: 14px; margin-top: 5px;">Вы отлично справляетесь.</div>
      </div>
    `;return}const i=n.length,a=Object.create(null),s=Object.create(null);n.forEach(d=>{const u=d.topic||d.topic_ru||d.topic_kr||"Other",m=d.category||d.category_ru||d.category_kr||"Other";a[u]=(a[u]||0)+1,s[m]=(s[m]||0)+1});const l=Object.entries(a).sort((d,u)=>u[1]-d[1]),r=Object.entries(s).sort((d,u)=>u[1]-d[1]),c=`
    <div style="display: flex; gap: 10px; margin-bottom: 20px;">
      <div class="stat-card-primary" style="flex: 1; border-bottom: 3px solid var(--danger);">
        <div class="stat-value-primary">${i}</div>
        <div class="stat-label-primary">Всего ошибок</div>
      </div>
      <button class="btn btn-quiz" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;" data-action="start-mistake-quiz">
        <span style="font-size: 20px;">🩹</span>
        <span style="font-size: 12px; font-weight: bold;">Работа над ошибками</span>
      </button>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 15px; margin-bottom: 20px;">
      
      <!-- By Topic -->
      <div style="background: var(--surface-2); padding: 15px; border-radius: 16px;">
        <h4 style="margin: 0 0 10px 0; font-size: 14px; color: var(--text-sub);">По темам</h4>
        ${l.slice(0,5).map(([d,u])=>`
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px;">
            <span>${w(d)}</span>
            <span style="font-weight: bold; color: var(--danger);">${u}</span>
          </div>
          <div style="height: 4px; background: var(--surface-3); border-radius: 2px; overflow: hidden;">
            <div style="height: 100%; background: var(--danger); width: ${u/i*100}%"></div>
          </div>
          <div style="margin-bottom: 8px;"></div>
        `).join("")}
      </div>

      <!-- By Part of Speech -->
      <div style="background: var(--surface-2); padding: 15px; border-radius: 16px;">
        <h4 style="margin: 0 0 10px 0; font-size: 14px; color: var(--text-sub);">По частям речи</h4>
        ${r.slice(0,5).map(([d,u])=>`
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px;">
            <span>${w(d)}</span>
            <span style="font-weight: bold; color: var(--warning);">${u}</span>
          </div>
          <div style="height: 4px; background: var(--surface-3); border-radius: 2px; overflow: hidden;">
            <div style="height: 100%; background: var(--warning); width: ${u/i*100}%"></div>
          </div>
          <div style="margin-bottom: 8px;"></div>
        `).join("")}
      </div>
    </div>

    <h4 style="margin: 0 0 10px 0; font-size: 14px; color: var(--text-sub);">Список слов</h4>
    <div style="display: flex; flex-direction: column; gap: 8px;">
      ${n.slice(0,20).map(d=>`
        <div class="list-item mistake">
          <div class="list-col-main">
            <div class="list-word">${w(d.word_kr)}</div>
            <div class="list-trans">${w(d.translation)}</div>
          </div>
          <div class="list-col-meta">
            <span class="list-badge">${d.level||"★☆☆"}</span>
          </div>
        </div>
      `).join("")}
      ${n.length>20?`<div style="text-align: center; font-size: 12px; color: var(--text-sub); margin-top: 5px;">...и еще ${n.length-20}</div>`:""}
    </div>
  `;e.innerHTML=c}}const Rl=new zl;function ql(){Rl.show()}function Dl(){z("mistakes-modal"),z("stats-modal");const t=document.querySelector(".mistake-chip");t&&ii("mistakes",t),N("quiz-modal")}class Ol extends te{constructor(){super("quotes-modal")}show(){if(!this.element.id||!document.body.contains(this.element)){const e=document.getElementById("quotes-modal");e&&(this.element=e)}N("quotes-modal"),this.render()}render(){const e=this.element.querySelector("#favorite-quotes-list")||document.getElementById("favorite-quotes-list")||document.getElementById("quotes-list");if(e){if(o.favoriteQuotes.length===0){e.innerHTML=`<div style="text-align: center; padding: 40px 20px; color: var(--text-sub);">
              <div style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;">📜</div>
              <div style="font-size: 16px; font-weight: 700;">Здесь пока пусто</div>
              <div style="font-size: 13px;">Вы можете добавлять цитаты в избранное на экране приветствия.</div>
          </div>`;return}e.innerHTML=o.favoriteQuotes.map(n=>`
          <div class="quote-item">
              <div class="quote-kr">"${w(n.quote_kr)}"</div>
              <div class="quote-ru">${w(n.quote_ru)}</div>
          </div>
      `).join("")}}}const $l=new Ol;function Hl(){$l.render()}class Nl extends te{constructor(){super("failed-requests-modal")}async show(){if(!this.element.id||!document.body.contains(this.element)){const e=document.getElementById("failed-requests-modal");e&&(this.element=e)}this.ensureStructure(),N("failed-requests-modal"),await this.loadFailedRequests()}ensureStructure(){if(!this.element.id||!document.body.contains(this.element)){const n=document.getElementById("failed-requests-modal");n&&(this.element=n)}let e=document.getElementById("failed-requests-modal");if(e){this.element=e;return}e=document.createElement("div"),e.id="failed-requests-modal",e.className="modal",e.setAttribute("data-close-modal","failed-requests-modal"),e.innerHTML=`
      <div class="modal-content">
        <div class="modal-header">
          <h3>❌ Ошибочные Заявки</h3>
          <div class="header-actions">
            <button class="btn-text" id="retry-all-failed-btn" style="color: var(--primary); font-size: 13px; font-weight: 600; display: none;">Повторить все</button>
            <button class="btn btn-icon close-modal-btn" data-close-modal="failed-requests-modal" aria-label="Закрыть">✕</button>
          </div>
        </div>
        <div id="failed-requests-list" class="trash-list-container">
          <div style="text-align:center; padding:20px;"><div class="spinner-tiny"></div> Загрузка...</div>
        </div>
      </div>
    `,document.body.appendChild(e),this.element=e}render(){}async loadFailedRequests(){const e=document.getElementById("failed-requests-list");if(!e)return;e.scrollTop=0;let n=o.currentUser?.id;if(!n){const{data:r}=await S.auth.getSession();n=r?.session?.user?.id}const i=S.from(A.WORD_REQUESTS).select("*").eq("user_id",n).eq("status",gs.ERROR),{data:a,error:s}=await i;if(s){console.error("Error loading failed requests:",s),e.innerHTML='<div style="text-align:center; color:var(--danger); padding:20px;">Ошибка загрузки</div>';return}const l=document.getElementById("retry-all-failed-btn");if(!a||a.length===0){e.innerHTML='<div style="text-align:center; color:var(--text-sub); padding:40px 20px;"><div style="font-size:40px; margin-bottom:10px; opacity:0.5;">✅</div><div>Все заявки обработаны успешно</div></div>',l&&(l.style.display="none");return}l&&(l.style.display="inline-block",l.textContent=`Повторить все (${a.length})`,l.onclick=async()=>{const r=a.map(d=>d.id);if(r.length===0)return;l.disabled=!0,l.innerHTML='<div class="spinner-tiny"></div>';const c=r.map(d=>S.functions.invoke("retry-word-request",{body:{request_id:d}}));try{const u=(await Promise.allSettled(c)).filter(m=>m.status==="rejected"||m.status==="fulfilled"&&m.value.error).length;u>0?h(`❌ ${u} из ${r.length} заявок не удалось повторить.`):h(`✅ Все ${r.length} заявок отправлены повторно.`),this.loadFailedRequests()}catch(d){h(`Критическая ошибка: ${d.message}`),l.disabled=!1}}),e.innerHTML=a.map(r=>`
            <div class="trash-item">
              <div class="trash-item-info">
                <div class="trash-item-word">${w(r.word_kr)}</div>
                <div style="font-size: 11px; opacity: 0.8;">${w(r.my_notes)}</div>
                <div class="trash-item-date">${r.created_at?new Date(r.created_at).toLocaleDateString():""}</div>
              </div>
              <div class="trash-item-actions">
                <button class="btn-icon" data-action="retry-request" data-id="${r.id}" title="Повторить отправку" aria-label="Повторить отправку">↻</button>
              </div>
            </div>
          `).join(""),e.querySelectorAll('[data-action="retry-request"]').forEach(r=>{r.addEventListener("click",async c=>{const d=c.currentTarget,u=d.dataset.id;if(u){d.disabled=!0,d.innerHTML='<div class="spinner-tiny"></div>';try{const{error:m}=await S.functions.invoke("retry-word-request",{body:{request_id:u}});if(m)throw m;h("Заявка отправлена повторно."),d.closest(".trash-item")?.remove()}catch(m){console.error("Failed to retry request:",m),h(`Ошибка: ${m.message}`),d.disabled=!1,d.innerHTML="↻"}}})})}}const Ul=new Nl;async function Pl(){Ul.show()}function Vl(){if(!document.body)return;const t=document.getElementById("main-content");t?(t.insertAdjacentHTML("beforebegin",ll),t.insertAdjacentHTML("afterbegin",cl)):console.error("❌ #main-content not found, header injection failed.");const e=document.createElement("div");e.id="injected-components",e.innerHTML=[Kr,Zr,el,tl,nl,il,al,sl,ol,rl,dl,ul,ml,pl,fl,gl,vl,hl,yl,bl,xl,wl,El].join(`
`),document.body?(document.body.appendChild(e),Bo(),Fo(),Wi(),te.initAll()):console.error("❌ document.body is null, cannot append injected components")}const Fl=`
    #custom-onboarding-overlay {
        position: fixed;
        top: 0; left: 0; width: 100%; height: 100%;
        z-index: 99999;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s ease;
        /* Убираем блокировку событий, чтобы можно было кликать сквозь оверлей */
        pointer-events: none !important; 
    }
    #custom-onboarding-overlay.active {
        opacity: 1;
    }
    
    /* Рамка-фокус вместо затемнения */
    .onboarding-spotlight {
        position: absolute;
        border-radius: 12px;
        transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
        pointer-events: none;
        z-index: 21001; /* Поверх всего, даже модалок */
        border-width: 3px;
        border-style: solid;
        animation: ob-pulse 4s infinite linear;
    }

    @keyframes ob-pulse {
        0% { border-color: #7c3aed; box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.2), 0 0 20px rgba(124, 58, 237, 0.4); transform: scale(1); }
        14% { border-color: #2563eb; box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.2), 0 0 20px rgba(37, 99, 235, 0.4); }
        28% { border-color: #059669; box-shadow: 0 0 0 4px rgba(5, 150, 105, 0.2), 0 0 20px rgba(5, 150, 105, 0.4); }
        42% { border-color: #ea580c; box-shadow: 0 0 0 4px rgba(234, 88, 12, 0.2), 0 0 20px rgba(234, 88, 12, 0.4); transform: scale(1.02); }
        57% { border-color: #db2777; box-shadow: 0 0 0 4px rgba(219, 39, 119, 0.2), 0 0 20px rgba(219, 39, 119, 0.4); }
        71% { border-color: #e11d48; box-shadow: 0 0 0 4px rgba(225, 29, 72, 0.2), 0 0 20px rgba(225, 29, 72, 0.4); }
        85% { border-color: #9333ea; box-shadow: 0 0 0 4px rgba(147, 51, 234, 0.2), 0 0 20px rgba(147, 51, 234, 0.4); }
        100% { border-color: #7c3aed; box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.2), 0 0 20px rgba(124, 58, 237, 0.4); transform: scale(1); }
    }

    .onboarding-card {
        position: absolute;
        background: var(--surface-1);
        color: var(--text-main);
        padding: 0;
        border-radius: 20px;
        width: 320px;
        max-width: 90vw;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        border: 1px solid var(--border-color);
        z-index: 21002; /* Поверх спотлайта и модалок */
        overflow: hidden;
        display: flex; flex-direction: column;
        pointer-events: auto; /* Карточка должна быть кликабельной */
        max-height: 85vh; /* Ограничение высоты для мобильных экранов */
    }
    .onboarding-card:not(.dragging) {
        transition: top 0.4s cubic-bezier(0.25, 1, 0.5, 1), left 0.4s cubic-bezier(0.25, 1, 0.5, 1), right 0.4s cubic-bezier(0.25, 1, 0.5, 1), width 0.3s ease, height 0.3s ease;
    }
    .onboarding-card.dragging {
        transition: none !important;
        box-shadow: 0 15px 50px rgba(0,0,0,0.3);
        cursor: grabbing;
    }
    .onboarding-card.minimized {
        width: auto !important;
        max-width: 220px !important;
        padding: 10px 16px !important;
        border-radius: 30px !important;
    }
    .onboarding-card.minimized .ob-body,
    .onboarding-card.minimized .ob-footer,
    .onboarding-card.minimized .ob-progress-container,
    .onboarding-card.minimized .ob-close {
        display: none !important;
    }
    .onboarding-card.minimized .ob-header {
        margin-bottom: 0;
        padding-right: 24px;
        gap: 8px;
    }
    .onboarding-card.minimized .ob-title {
        font-size: 14px;
        margin-bottom: 0;
    }
    .onboarding-card.minimized .ob-emoji {
        font-size: 20px;
        animation: none;
    }
    .onboarding-card.minimized .ob-minimize-btn {
        right: 8px; top: 50%; transform: translateY(-50%);
    }

    .ob-header {
        display: flex; align-items: center; gap: 12px;
        margin-bottom: 12px; padding-right: 24px;
        cursor: grab;
        touch-action: none; /* Важно: отключает скролл страницы при перетаскивании карточки */
    }
    .ob-header:active { cursor: grabbing; }

    .ob-emoji { font-size: 28px; animation: bounce 2s infinite; }
    .ob-title { font-weight: 800; font-size: 18px; line-height: 1.2; }
    .ob-body {
        font-size: 15px; line-height: 1.6;
        color: var(--text-sub); margin-bottom: 24px;
        overflow-y: auto; /* Разрешаем скролл текста, если он не влезает */
    }
    .ob-footer {
        display: flex; justify-content: space-between;
        align-items: center; margin-top: 10px;
    }
    .ob-progress-container {
        width: 100%; height: 4px; background: var(--surface-2);
    }
    .ob-progress-bar {
        height: 100%; background: var(--primary);
        transition: width 0.3s ease;
    }

    .ob-content { 
        padding: 20px 24px 24px 24px; position: relative;
        display: flex; flex-direction: column;
        height: 100%; overflow: hidden; /* Фиксируем структуру для скролла */
    }

    .ob-btn {
        background: var(--primary); color: white; border: none;
        padding: 10px 20px; border-radius: 12px;
        font-weight: 600; cursor: pointer; font-size: 14px;
        transition: transform 0.1s;
    }
    .ob-btn:active { transform: scale(0.95); }
    .ob-skip {
        background: transparent; color: var(--text-tertiary);
        border: none; cursor: pointer; font-size: 13px; padding: 5px;
    }
    .ob-skip:hover { color: var(--text-main); }

    .ob-close {
        position: absolute; top: 10px; right: 10px;
        background: transparent; border: none;
        color: var(--text-tertiary); cursor: pointer;
        font-size: 18px; padding: 5px; line-height: 1;
    }
    .ob-close:hover { color: var(--text-main); background: var(--surface-2); border-radius: 50%; }

    .ob-minimize-btn {
        position: absolute; top: 10px; right: 40px;
        background: transparent; border: none;
        color: var(--text-tertiary); cursor: pointer;
        font-size: 18px; padding: 5px; line-height: 1;
        width: 28px; height: 28px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
    }
    .ob-minimize-btn:hover { color: var(--text-main); background: var(--surface-2); }

    @keyframes bounce {
        0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
        40% {transform: translateY(-6px);}
        60% {transform: translateY(-3px);}
    }
`,Ye=[{emoji:"👋",title:"Добро пожаловать!",text:"Я твой гид. Покажу, что где находится.<br><br><small>💡 Меня можно перетаскивать и сворачивать.</small>",explanation:"Поехали! 🚀"},{target:".search-container",emoji:"🔎",title:"Поиск",text:"Мгновенный поиск слов.",explanation:"Работает даже офлайн.",interactive:!0},{target:".view-toggle",emoji:"👀",title:"Вид",text:"Переключение: плитка или список.",explanation:"Выбирай, как удобнее.",interactive:!0},{target:".tool-btn[data-action='toggle-filter-panel']",emoji:"🌪️",title:"Фильтры",text:"Настройки фильтрации и сортировки.",explanation:"Найди нужные слова.",interactive:!0},{target:".filter-group:nth-of-type(2)",emoji:"✨",title:"Статус",text:"Фильтр по сложности или статусу.",explanation:"Например, только 'Избранное'.",interactive:!1,cleanup:()=>{const t=document.querySelector("[data-action='toggle-filter-panel']");t&&document.getElementById("filter-panel")?.classList.contains("show")&&t.click()}},{target:"#xp-level-widget",emoji:"📈",title:"Прогресс",text:"Твой текущий уровень и опыт.",explanation:"Нажми для полной статистики.",interactive:!0},{target:"#stats-details",requiresModal:"stats-modal",emoji:"📊",title:"Статистика",text:"Графики активности и кривая забывания.",explanation:"Следи за успехами.",interactive:!1,cleanup:()=>z("stats-modal")},{target:".coin-pill",emoji:"💰",title:"Магазин",text:"Монеты и ежедневные награды.",explanation:"Покупай темы и бонусы.",interactive:!0,cleanup:()=>z("shop-modal")},{target:"#bottom-nav [data-action='open-collections-filter']",emoji:"📂",title:"Списки",text:"Твои личные словари.",explanation:"Управляй подборками слов.",interactive:!0},{target:"#collections-list",requiresModal:"collections-modal",emoji:"📝",title:"Коллекции",text:"Личные и общие списки.",explanation:"Для дорам, песен и учебы.",interactive:!1,cleanup:()=>z("collections-modal")},{target:"[data-modal-target='quiz-modal']",emoji:"🎮",title:"Тренировки",text:"15+ режимов для запоминания.",explanation:"Игры и тесты.",interactive:!0},{target:"#quiz-mode-selector",requiresModal:"quiz-modal",emoji:"🕹️",title:"Режимы",text:"Выбирай игру под настроение.",explanation:"Спринт, Выживание и другие.",interactive:!1,cleanup:()=>z("quiz-modal")},{target:"[data-action='open-review']",emoji:"🧠",title:"SRS",text:"Умное интервальное повторение.",explanation:"Алгоритм подскажет, что повторить.",interactive:!0,cleanup:()=>z("review-modal"),skipInteractionIf:()=>{try{return qt.init({dataStore:o.dataStore,wordHistory:o.wordHistory}),qt.getQueue({limit:1}).length===0}catch{return!0}}},{target:"#profile-button",emoji:"⚙️",title:"Профиль",text:"Настройки и аккаунт.",explanation:"Синхронизация и персонализация.",interactive:!0},{target:".settings-section:first-of-type",requiresModal:"profile-modal",emoji:"🎨",title:"Опции",text:"Темы, звук, скорость речи.",explanation:"Настрой приложение под себя.",interactive:!1,cleanup:()=>z("profile-modal")},{emoji:"🚀",title:"Готово!",text:"Теперь ты знаешь всё необходимое.",explanation:"Удачи в обучении! 화이팅!",interactive:!1,cleanup:()=>{}}];let ue=0,ne=null,B=null,V=null,De=null,In=!1,ot=!1;function jl(){if(document.getElementById("custom-onboarding-styles"))return;const t=document.createElement("style");t.id="custom-onboarding-styles",t.textContent=Fl,document.head.appendChild(t)}function Wl(){const t=document.getElementById("custom-onboarding-overlay");if(t){ne=t,B=t.querySelector(".onboarding-card"),V=t.querySelector(".onboarding-spotlight");return}ne=document.createElement("div"),ne.id="custom-onboarding-overlay",ne.addEventListener("click",i=>{B&&!B.contains(i.target)&&(i.preventDefault(),i.stopPropagation())}),V=document.createElement("div"),V.className="onboarding-spotlight",ne.appendChild(V),B=document.createElement("div"),B.className="onboarding-card",ne.appendChild(B),Gl(B),B.addEventListener("dblclick",i=>{i.target.closest("button")||i.target.closest(".ob-header")&&ei()});let e=0;B.addEventListener("touchend",i=>{if(i.target.closest("button"))return;const a=new Date().getTime(),s=a-e;s<300&&s>0&&i.target.closest(".ob-header")&&(i.preventDefault(),ei()),e=a}),document.body.appendChild(ne);const n=()=>{if(ne?.classList.contains("active")){const i=Ye[ue],a=Zn(i.target),s=a?a.getBoundingClientRect():null;At(s),on(s)}};window.addEventListener("resize",n),window.addEventListener("scroll",n,{capture:!0,passive:!0})}function Gl(t){let e=0,n=0,i=0,a=0;const s=c=>{if(c.target.closest("button")||!c.target.closest(".ob-header"))return;In=!0,t.classList.add("dragging");const d="touches"in c?c.touches[0].clientX:c.clientX,u="touches"in c?c.touches[0].clientY:c.clientY;e=d,n=u;const m=t.getBoundingClientRect();i=m.left,a=m.top,t.style.bottom="auto",t.style.right="auto",t.style.transform="none",t.style.left=`${i}px`,t.style.top=`${a}px`},l=c=>{if(!t.classList.contains("dragging"))return;c.preventDefault();const d="touches"in c?c.touches[0].clientX:c.clientX,u="touches"in c?c.touches[0].clientY:c.clientY,m=d-e,p=u-n;t.style.left=`${i+m}px`,t.style.top=`${a+p}px`},r=()=>t.classList.remove("dragging");t.addEventListener("mousedown",s),t.addEventListener("touchstart",s,{passive:!1}),window.addEventListener("mousemove",l),window.addEventListener("touchmove",l,{passive:!1}),window.addEventListener("mouseup",r),window.addEventListener("touchend",r)}function Zn(t){if(!t)return null;const e=document.querySelectorAll(t);for(let n=0;n<e.length;n++){const i=e[n];if(i.offsetParent!==null)return i}return null}function At(t){if(!V)return;if(!t){V.style.width="0px",V.style.height="0px",V.style.top="50%",V.style.left="50%",V.style.opacity="0",V.style.boxShadow="none",V.style.border="none";return}const e=5;V.style.width=`${t.width+e*2}px`,V.style.height=`${t.height+e*2}px`,V.style.top=`${t.top-e}px`,V.style.left=`${t.left-e}px`,V.style.opacity="1",V.style.borderWidth="3px",V.style.borderStyle="solid",V.style.borderColor="",V.style.boxShadow="",V.style.borderRadius="12px"}function on(t){if(!B||In)return;if(B.style.top="",B.style.bottom="",B.style.left="",B.style.right="",B.style.transform="",!t){B.style.top="50%",B.style.left="50%",B.style.transform="translate(-50%, -50%)";return}const e=window.innerHeight,i=t.top+t.height/2<e/2;B.style.left="50%",B.style.transform="translateX(-50%)",i?B.style.bottom="100px":B.style.top="90px"}async function yi(){if(!B||!ne)return;In=!1,ot=!1,B.classList.remove("minimized"),De&&(De.disconnect(),De=null),At(null),on(null);const t=Ye[ue];if(t.requiresModal){const m=document.getElementById(t.requiresModal);m&&!m.classList.contains("active")&&(console.info(`[Onboarding] Step requires modal '${t.requiresModal}', opening it.`),N(t.requiresModal),t.requiresModal==="stats-modal"&&si(),await new Promise(p=>setTimeout(p,350)))}let e=Zn(t.target);if(t.target&&!e)for(let m=0;m<5&&(await new Promise(p=>setTimeout(p,100)),e=Zn(t.target),!e);m++);const n=e?e.getBoundingClientRect():null;let i=!1;t.skipInteractionIf&&t.skipInteractionIf()&&(i=!0),e&&(e.scrollIntoView({behavior:"smooth",block:"center"}),De=new ResizeObserver(()=>{const m=e.getBoundingClientRect();At(m),on(m)}),De.observe(e));const a=t.title;let s=t.text;i?s+='<br><br><span style="color: var(--warning); font-size: 0.9em;">⚠️ Пока недоступно (нет данных)</span>':t.explanation&&(s+=`<br><br><span style="opacity: 0.8; font-size: 0.9em;">💡 ${t.explanation}</span>`);const l=(ue+1)/Ye.length*100;B.innerHTML=`
    <div class="ob-progress-container">
      <div class="ob-progress-bar" style="width: ${l}%"></div>
    </div>
    <div class="ob-content">
      <button class="ob-minimize-btn" id="ob-min-btn" title="Свернуть">_</button>
      <button class="ob-close" id="ob-skip-btn" title="Закрыть обучение">✕</button>
      <div class="ob-header">
        <div class="ob-emoji">${t.emoji}</div>
        <div class="ob-title">${a}</div>
      </div>
      <div class="ob-body">${s}</div>
      <div class="ob-footer">
        <div>${ue>0?'<button class="ob-skip" id="ob-prev-btn">← Назад</button>':""}</div>
        <div>${`<button class="ob-btn" id="ob-next-btn">${ue===Ye.length-1?"Поехали! 🚀":"Далее"}</button>`}
        </div>
      </div>
    </div>
  `;const r=document.getElementById("ob-next-btn");r&&(r.onclick=Ql);const c=document.getElementById("ob-skip-btn");c&&(c.onclick=rs);const d=document.getElementById("ob-prev-btn");d&&(d.onclick=Yl);const u=document.getElementById("ob-min-btn");u&&(u.onclick=ei),At(n),requestAnimationFrame(()=>{const m=e?e.getBoundingClientRect():null;At(m),on(m)})}function ei(){if(!B)return;ot=!ot,B.classList.toggle("minimized",ot);const t=document.getElementById("ob-min-btn");t&&(t.textContent=ot?"□":"_"),ot&&Xl()}function Ql(){if(ue<Ye.length-1){const t=Ye[ue];if(t.cleanup)try{t.cleanup()}catch(e){console.error("Onboarding cleanup error:",e)}ue++,setTimeout(()=>yi(),50)}else rs()}function Yl(){if(ue>0){const t=Ye[ue];if(t.cleanup)try{t.cleanup()}catch(e){console.error("Onboarding cleanup error:",e)}ue--,setTimeout(()=>yi(),50)}}function rs(){ne&&(ne.classList.remove("active"),setTimeout(()=>{ne?.remove(),ne=null},300)),localStorage.setItem(v.ONBOARDING,"true"),h("Удачи в обучении! 🍀")}function ls(){document.querySelectorAll(".modal.active").forEach(t=>{t.classList.remove("active")}),De&&(De.disconnect(),De=null),localStorage.removeItem(v.ONBOARDING),jl(),Wl(),ue=0,ne&&ne.classList.add("active"),yi()}function Jl(){localStorage.getItem(v.ONBOARDING)||setTimeout(()=>ls(),1e3)}function Xl(){if(!B)return;In=!0;const t=B.getBoundingClientRect(),e=window.innerWidth,n=window.innerHeight,i=t.left+t.width/2;let a=t.top;a=Math.max(80,Math.min(a,n-120)),B.style.transform="none",B.style.top=`${a}px`,i>e/2?(B.style.left="auto",B.style.right="20px"):(B.style.left="20px",B.style.right="auto")}console.log("🚀 App starting...");const Oi=()=>_(()=>import("./ui_collections-FBsbpJ1k.js"),__vite__mapDeps([9,1,2,3])),Kl=()=>_(()=>import("./ui_hanja-CE5eSmTt.js"),__vite__mapDeps([10,1,2,3])),Zl=()=>_(()=>import("./ui_grammar-DArDM1TU.js"),__vite__mapDeps([11,1,2,3])),$i=t=>{const e=document.getElementById("sync-status");if(!e)return;e.className=`sync-status ${t}`;const n={syncing:"⏳",synced:"✅",error:"❌",offline:"📡"};e.textContent=n[t]||""};let rn=null,fe=null;function ec(){if(!document.getElementById("error-overlay")){const t=document.createElement("div");t.innerHTML='<div id="error-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:99999;display:flex;justify-content:center;align-items:center;flex-direction:column;color:white;text-align:center;padding:20px;"><div style="font-size:48px;margin-bottom:20px;">⚠️</div><div id="error-msg" style="font-size:18px;margin-bottom:20px;">Критическая ошибка</div><button onclick="location.reload()" style="padding:10px 20px;border-radius:8px;border:none;background:white;color:black;font-weight:bold;cursor:pointer;">Перезагрузить</button></div>',document.body&&document.body.appendChild(t.firstElementChild)}}function tc(){Vi(),fe&&(clearTimeout(fe),fe=null);const t=document.getElementById("welcome-overlay");t&&(t.style.animation="flyOutUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards",t.style.pointerEvents="none",setTimeout(()=>{t.classList.remove("active"),t.style.animation="",t.style.pointerEvents="",t.style.display="none",Jl()},500))}async function Hi(){if(!o.dataStore)return!1;let t=o.currentUser;if(!t){const{data:n}=await S.auth.getUser();t=n.user}if(!t)return!1;const{data:e}=await S.from(A.VOCABULARY).select("*").eq("created_by",t.id).eq("is_public",!1);if(e){const n=new Set(o.dataStore.map(a=>a.id)),i=e.filter(a=>!n.has(a.id));if(i.length>0)return o.dataStore.push(...i),re&&re.postMessage({type:"SET_DATA",data:o.dataStore}),!0}return!1}let re=null,Mn=0;try{re=new Worker(new URL("/assets/searchWorker-OeW2JZqL.js",import.meta.url),{type:"module"}),console.log("✅ Worker initialized")}catch(t){console.error("❌ Worker failed to initialize:",t)}const nc="v56",ic="Gemini 2.5 Flash";window.onerror=function(t,e,n,i,a){return console.error("🚨 Global Error:",{msg:t,url:e,line:n,col:i,error:a}),!1};window.onunhandledrejection=function(t){console.error("🚨 Unhandled Rejection:",t.reason)};function rt(t){const e=document.getElementById("bottom-nav");if(!e)return;let n=t;n||(document.getElementById("quiz-modal")?.classList.contains("active")?n="quiz-modal":document.getElementById("stats-modal")?.classList.contains("active")?n="stats-modal":document.getElementById("collections-modal")?.classList.contains("active")?n="open-collections-filter":document.getElementById("review-modal")?.classList.contains("active")?n="open-review":n="nav-home"),e.querySelectorAll(".nav-btn").forEach(a=>{const s=a;s.getAttribute("data-action")===n||s.getAttribute("data-modal-target")===n?s.classList.add("active"):s.classList.remove("active")})}async function Ni(){if(!navigator.onLine){o.networkPing=null,Bi();return}try{const t=performance.now(),e=S.supabaseUrl,n=S.supabaseKey;if(!e)throw new Error("No URL");const i=`${e}/rest/v1/`;await fetch(i,{method:"HEAD",mode:"cors",cache:"no-store",headers:n?{apikey:n}:{}}),o.networkPing=Math.round(performance.now()-t)}catch{o.networkPing=null}Bi()}function ac(){const t=document.createElement("style");t.textContent=`
    .ping-indicator {
      display: none; align-items: center; gap: 6px; font-size: 12px; font-weight: 600;
      padding: 4px 8px; border-radius: 20px; background-color: var(--surface-2);
      transition: color 0.3s ease, background-color 0.3s ease;
    }
    .ping-indicator::before { content: ''; display: block; width: 8px; height: 8px; border-radius: 50%; background-color: currentColor; }
    .ping-indicator.good { color: var(--success); }
    .ping-indicator.medium { color: var(--warning); }
    .ping-indicator.bad { color: var(--danger); }

    /* Bottom Nav Styles */
    .nav-btn {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: none;
        border: none;
        padding: 6px 0; /* Запасной цвет #6b7280 имеет достаточный контраст (AA) */
        cursor: pointer;
        color: var(--text-sub, #6b7280);
        transition: all 0.2s ease;
        -webkit-tap-highlight-color: transparent;
    }
    .nav-btn .nav-icon {
        font-size: 24px;
        margin-bottom: 2px;
        transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .nav-btn .nav-label {
        font-size: 10px;
        font-weight: 500;
    }
    .nav-btn.active {
        color: var(--primary, #6c5ce7);
    }
    .nav-btn.active .nav-icon {
        transform: translateY(-2px) scale(1.1);
    }
  `,document.head.appendChild(t)}function sc(){console.log("🛠️ Global listeners setup started"),document.body.addEventListener("click",a=>{const s=a.target,l=s.closest("[data-modal-target]");if(l){const d=l.getAttribute("data-modal-target");d&&(N(d),rt(d),d==="quotes-modal"&&Hl(),d==="stats-modal"&&(si(),or()),d==="achievements-modal"&&Vs());return}const r=s.closest("[data-close-modal]");if(r&&(!r.classList.contains("modal")||s===r)){const u=r.getAttribute("data-close-modal");u&&(z(u),rt());return}const c=s.closest("[data-action]");if(c){if(c.tagName==="INPUT"&&["checkbox","radio"].includes(c.type))return;const d=c.getAttribute("data-action"),u=c.getAttribute("data-value");switch(d){case"toggle-favorite":u&&wo(u,c);break;case"toggle-auth-mode":(u==="login"||u==="signup")&&yn(u);break;case"speak-word":if(u){const m=o.dataStore.find(p=>String(p.id)===u);if(m){const p=c;p.classList.add("playing"),ka(m).then(()=>{p.classList.remove("playing")})}}break;case"copy-word":u&&(navigator.clipboard.writeText(u),h("📋 Скопировано!"));break;case"add-to-list":u&&Oi().then(m=>m.openAddToListModal(Number(u)));break;case"open-hanja-modal":u&&Kl().then(m=>m.openHanjaModal(u));break;case"open-grammar-modal":if(u){const m=o.dataStore.find(p=>String(p.id)===u);m&&Zl().then(p=>p.openGrammarModal(m))}break;case"nav-home":document.querySelectorAll(".modal.active").forEach(m=>{z(m.id)}),rt("nav-home"),_(()=>import("./ui_collections-FBsbpJ1k.js"),__vite__mapDeps([9,1,2,3])).then(m=>m.setCollectionFilter(null));break;case"toggle-focus":za();break;case"reload":location.reload();break;case"toggle-dark-mode":Jn();break;case"toggle-view":u&&_a(u);break;case"start-daily-challenge":Fa();break;case"toggle-filter-panel":xn();break;case"reset-filters":Gi();break;case"set-type-filter":u&&Rt(u,c);break;case"set-star-filter":if(u){o.currentStar=u;const m=document.getElementById("level-filters");m&&m.querySelectorAll(".filter-chip").forEach(p=>{p.getAttribute("data-value")===u?p.classList.add("active"):p.classList.remove("active")}),St()}break;case"sort-topic":Go();break;case"sort-level":Qo();break;case"sort-date":Yo();break;case"sort-weak":Ia();break;case"shuffle":Ta();break;case"open-review":_(()=>import("./ui_review-DXsD-XG9.js"),__vite__mapDeps([8,2,1,3])).then(m=>m.openReviewMode()),rt("open-review");break;case"open-shop":_(()=>import("./ui_shop-CPdhjkX7.js"),__vite__mapDeps([6,2,1,3])).then(m=>m.openShopModal());break;case"open-profile":vi(),Oa();break;case"open-mistakes":ql();break;case"set-accent":u&&ar(u);break;case"share-stats":{const m=document.querySelector("#stats-theme-picker .active"),p=m?m.getAttribute("data-value"):"purple";_(()=>import("./ui_share-DhJDEWt1.js"),__vite__mapDeps([12,1,2,3])).then(g=>g.shareStats(p??void 0));break}case"install-app":window.installApp&&window.installApp();break;case"dismiss-banner":fi();break;case"close-level-up":document.getElementById("level-up-overlay")?.classList.remove("active");break;case"close-welcome":tc();break;case"submit-word-request":_(()=>import("./ui_custom_words-DBisxjwX.js"),__vite__mapDeps([5,1,2,3])).then(m=>m.submitWordRequest()).catch(m=>console.error("❌ Failed to load submitWordRequest:",m));break;case"open-add-word-modal":if(_(()=>import("./ui_custom_words-DBisxjwX.js"),__vite__mapDeps([5,1,2,3])).then(m=>m.setupAddWordPreview()),N("add-word-modal"),u){const m=document.getElementById("new-word-target-list");m&&(m.value=u)}break;case"save-quote":rn&&S.auth.getUser().then(async({data:{user:m}})=>{if(!m){h("Войдите, чтобы сохранять цитаты"),gi();return}const p=rn.id;o.favoriteQuotes.some(f=>f.id===p)?(o.favoriteQuotes=o.favoriteQuotes.filter(f=>f.id!==p),c.textContent="🤍",c.classList.remove("active"),h("Цитата удалена из избранного"),await S.from(A.USER_FAVORITE_QUOTES).delete().match({user_id:m.id,quote_id:p})):(o.favoriteQuotes.push(rn),c.textContent="❤️",c.classList.add("active"),h("Цитата сохранена в избранное!"),await S.from(A.USER_FAVORITE_QUOTES).insert({user_id:m.id,quote_id:p})),En()});break;case"toggle-password":as(c);break;case"auth":u&&Ja(u);break;case"auth-google":Ka();break;case"toggle-reset-mode":yn(u==="true"?"reset":"login");break;case"set-voice":u&&La(u);break;case"export-data":_(()=>import("./ui_data-6bXqcUXy.js"),__vite__mapDeps([7,1,2,3])).then(m=>m.exportProgress());break;case"clear-data":_(()=>import("./ui_data-6bXqcUXy.js"),__vite__mapDeps([7,1,2,3])).then(m=>m.clearData());break;case"logout":ts();break;case"delete-account":ns();break;case"change-password":Za();break;case"change-email":es();break;case"open-leaderboard":console.log("🏆 Opening leaderboard..."),Il();break;case"close-confirm":if(c.classList.contains("modal")&&s!==c)break;Pt();break;case"quit-quiz":Tn();break;case"reset-settings":cr();break;case"reset-onboarding":ls();break;case"create-list":_(()=>import("./ui_collections-FBsbpJ1k.js"),__vite__mapDeps([9,1,2,3])).then(m=>m.createList());break;case"save-list-changes":_(()=>import("./ui_collections-FBsbpJ1k.js"),__vite__mapDeps([9,1,2,3])).then(m=>m.saveListChanges());break;case"save-word-changes":_(()=>import("./ui_edit_word-D42SJL6z.js"),__vite__mapDeps([4,1,2,3])).then(m=>m.saveWordChanges());break;case"delete-word":_(()=>import("./ui_edit_word-D42SJL6z.js"),__vite__mapDeps([4,1,2,3])).then(m=>m.deleteWord());break;case"open-collections-filter":N("collections-modal"),rt("open-collections-filter");break;case"open-failed-requests":Pl();break;case"toggle-select-mode":_(()=>import("./ui_bulk-D2TqyS8R.js"),__vite__mapDeps([0,1,2,3])).then(m=>m.toggleSelectMode());break;case"bulk-delete":_(()=>import("./ui_bulk-D2TqyS8R.js"),__vite__mapDeps([0,1,2,3])).then(m=>m.bulkDelete());break;case"bulk-move":_(()=>import("./ui_bulk-D2TqyS8R.js"),__vite__mapDeps([0,1,2,3])).then(m=>m.bulkMoveToTopic());break;case"bulk-list":_(()=>import("./ui_bulk-D2TqyS8R.js"),__vite__mapDeps([0,1,2,3])).then(m=>m.bulkAddToList());break;case"bulk-select-all":_(()=>import("./ui_bulk-D2TqyS8R.js"),__vite__mapDeps([0,1,2,3])).then(m=>m.selectAll());break;case"set-trash-retention":u&&dr(u);break;case"toggle-session":oa();break;case"reset-search":fa();break;case"switch-shop-tab":u&&_(()=>import("./ui_shop-CPdhjkX7.js"),__vite__mapDeps([6,2,1,3])).then(m=>m.switchShopTab(u));break;case"delete-list":u&&_(()=>import("./ui_collections-FBsbpJ1k.js"),__vite__mapDeps([9,1,2,3])).then(m=>m.deleteList(u,c));break;case"edit-list":{const m=c.getAttribute("data-title")||"",p=c.getAttribute("data-icon")||"";u&&_(()=>import("./ui_collections-FBsbpJ1k.js"),__vite__mapDeps([9,1,2,3])).then(g=>g.openEditListModal(u,m,p))}break;case"set-collection-filter":u&&Hi().then(m=>{m&&ie()}),_(()=>import("./ui_collections-FBsbpJ1k.js"),__vite__mapDeps([9,1,2,3])).then(m=>m.setCollectionFilter(u,a));break;case"edit-word":u&&_(()=>import("./ui_edit_word-D42SJL6z.js"),__vite__mapDeps([4,1,2,3])).then(m=>m.openEditWordModal(u,ie));break;case"restore-word":u&&Al(Number(u));break;case"delete-word-permanent":u&&Ml(Number(u),c);break;case"remove-from-list":u&&Oi().then(m=>m.removeWordFromCurrentList(u));break;case"bulk-add-to-list-item":u&&_(()=>import("./ui_bulk-D2TqyS8R.js"),__vite__mapDeps([0,1,2,3])).then(m=>m.handleBulkAddToList(u));break;case"bulk-remove-list":_(()=>import("./ui_bulk-D2TqyS8R.js"),__vite__mapDeps([0,1,2,3])).then(m=>m.bulkRemoveFromList());break;case"create-new-list-bulk":_(()=>import("./ui_bulk-D2TqyS8R.js"),__vite__mapDeps([0,1,2,3])).then(m=>m.createNewListForBulk());break;case"toggle-word-in-list":{const m=c.getAttribute("data-list-id"),p=c.getAttribute("data-word-id");m&&p&&_(()=>import("./ui_collections-FBsbpJ1k.js"),__vite__mapDeps([9,1,2,3])).then(g=>g.toggleWordInList(m,Number(p),c))}break;case"start-mistake-quiz":Dl();break;case"quiz-summary-continue":zr();break;case"claim-reward":_(()=>import("./ui_shop-CPdhjkX7.js"),__vite__mapDeps([6,2,1,3])).then(m=>m.claimDailyReward(c));break;case"buy-item":u&&_(()=>import("./ui_shop-CPdhjkX7.js"),__vite__mapDeps([6,2,1,3])).then(m=>m.buyItem(u,c));break;case"apply-shop-theme":u&&_(()=>import("./ui_shop-CPdhjkX7.js"),__vite__mapDeps([6,2,1,3])).then(m=>m.applyShopTheme(u));break;case"manage-my-words":Hi(),_(()=>import("./ui_collections-FBsbpJ1k.js"),__vite__mapDeps([9,1,2,3])).then(m=>m.manageMyWords(a));break;case"clear-collection-filter":_(()=>import("./ui_collections-FBsbpJ1k.js"),__vite__mapDeps([9,1,2,3])).then(m=>m.clearCollectionFilter(a));break;case"share-list":u&&_(()=>import("./ui_collections-FBsbpJ1k.js"),__vite__mapDeps([9,1,2,3])).then(m=>m.shareList(u));break;case"edit-list-title-inline":u&&_(()=>import("./ui_collections-FBsbpJ1k.js"),__vite__mapDeps([9,1,2,3])).then(m=>m.editListTitleInline(u,c,a));break;case"empty-trash":os();break;case"show-request-error":{const m=c.getAttribute("data-error")||"";_(()=>import("./ui_custom_words-DBisxjwX.js"),__vite__mapDeps([5,1,2,3])).then(p=>p.showRequestError(m));break}case"speak":{const m=c.getAttribute("data-url");m&&(c.classList.add("playing"),K(null,m).then(()=>{c.classList.remove("playing")}));break}}}}),document.body.addEventListener("mouseover",a=>{const l=a.target.closest('[data-action="set-accent"], [data-action="preview-theme"]');if(l){const r=l.getAttribute("data-value");r&&sr(r)}}),document.body.addEventListener("mouseout",a=>{const l=a.target.closest('[data-action="set-accent"], [data-action="preview-theme"]');l&&(!a.relatedTarget||!l.contains(a.relatedTarget))&&mi()}),document.body.addEventListener("input",a=>{const s=a.target,l=s.getAttribute("data-action");l==="set-speed"?Aa(s.value):l==="set-music-volume"?Da(s.value):l==="set-tts-volume"&&Ma(s.value)}),document.body.addEventListener("change",a=>{const s=a.target,l=s.getAttribute("data-action");l==="toggle-dark-mode"&&Jn(s),l==="toggle-auto-theme"&&er(s),l==="toggle-hanja"&&Ca(s),l==="toggle-music"&&Ra(s),l==="toggle-extra-info"&&Zo(s),l==="toggle-auto-update"&&(Ba(s),o.autoUpdate&&"serviceWorker"in navigator&&navigator.serviceWorker.getRegistration().then(r=>{r&&r.waiting&&r.waiting.postMessage({type:"SKIP_WAITING"})})),l==="set-auto-theme-start"&&tr(s.value),l==="set-auto-theme-end"&&nr(s.value)});const t=document.getElementById("new-list-title");t&&t.addEventListener("keydown",a=>{if(a.key==="Enter"){a.preventDefault();const s=document.querySelector('[data-action="create-list"]');s&&!s.disabled&&s.click()}});const e=a=>{const s=a.target;s.value=s.value.replace(/[^a-zA-Zа-яА-Я가-힣\u3130-\u318F0-9\s-]/g,"")};["new-word-topic","new-word-category","edit-word-topic","edit-word-category"].forEach(a=>{const s=document.getElementById(a);s&&s.addEventListener("input",e)});const n=document.getElementById("new-word-target-list");n&&n.addEventListener("change",()=>{n.value==="create-new-list"&&(n.value="",N("collections-modal"))}),document.addEventListener("keydown",a=>{if(a.key==="Escape"){const s=document.querySelector(".modal.active");s&&(s.id==="confirm-modal"?Pt():z(s.id))}});const i=document.getElementById("import-file");i&&i.addEventListener("change",a=>{_(()=>import("./ui_data-6bXqcUXy.js"),__vite__mapDeps([7,1,2,3])).then(s=>s.importProgress(a))})}function oc(){const t=document.getElementById("level-up-overlay");if(!t)return;new MutationObserver(n=>{n.forEach(i=>{if(i.type==="attributes"&&i.attributeName==="class"&&t.classList.contains("active")){const s=Date.now()+3e3,l=window.innerWidth<768;(function r(){ve({particleCount:l?2:4,angle:60,spread:55,origin:{x:0,y:0},colors:["#6c5ce7","#00b894","#ffeaa7","#ff7675","#74b9ff"],disableForReducedMotion:!0,zIndex:1e4}),ve({particleCount:l?2:4,angle:120,spread:55,origin:{x:1,y:0},colors:["#6c5ce7","#00b894","#ffeaa7","#ff7675","#74b9ff"],disableForReducedMotion:!0,zIndex:1e4}),Date.now()<s&&requestAnimationFrame(r)})()}})}).observe(t,{attributes:!0})}function Bn(t){const e=document.getElementById("welcome-overlay"),n=document.getElementById("welcome-username"),i=document.getElementById("welcome-quote");if(e&&n){let a="Гость";t&&(a=t.user_metadata?.full_name||t.email?.split("@")[0]||"Гость"),n.textContent=a;const s=new Date().getHours();let l="С возвращением!",r="rgba(0,0,0,0.85)";s>=5&&s<12?(l="Доброе утро!",r="linear-gradient(135deg, rgba(255, 180, 180, 0.95) 0%, rgba(255, 220, 240, 0.95) 100%)"):s>=12&&s<18?(l="Добрый день!",r="linear-gradient(135deg, rgba(100, 180, 255, 0.95) 0%, rgba(100, 230, 255, 0.95) 100%)"):(l="Добрый вечер!",r="linear-gradient(135deg, rgba(30, 40, 60, 0.98) 0%, rgba(50, 70, 100, 0.98) 100%)");const c=e.querySelector(".level-up-title");if(c&&(c.textContent=l),e.style.background=r,e.classList.add("active"),e.style.display="flex",e.style.zIndex="20000",e.style.visibility="visible",e.style.transition="none",e.style.opacity="1",i)i.innerHTML='<div class="skeleton-pulse" style="height: 20px; width: 60%; margin: 0 auto; border-radius: 4px;"></div>',Os().then(d=>{let u="시작이 반이다";if(d){rn=d;const m=o.favoriteQuotes.some(x=>x.id===d.id),p=m?"❤️":"🤍",g=m?"active":"";let f='<div class="welcome-quote-card">';f+=`<button class="quote-fav-btn ${g}" data-action="save-quote">${p}</button>`,f+='<div class="welcome-kr" id="welcome-quote-kr"></div>',f+='<div class="welcome-ru" id="welcome-quote-ru"></div>',d.literal_translation&&(f+=`<div class="welcome-literal" style="opacity:0; animation:fadeIn 0.8s ease 1.5s forwards">(Дословно: ${d.literal_translation})</div>`),d.explanation&&(f+=`<div class="welcome-explanation" style="opacity:0; animation:fadeIn 0.8s ease 2s forwards">💡 ${d.explanation}</div>`),f+="</div>",i.innerHTML=f,u=d.quote_kr;const y=document.getElementById("welcome-quote-kr"),b=document.getElementById("welcome-quote-ru");y&&(ki(y,`"${d.quote_kr}"`,50).then(()=>{b&&ki(b,d.quote_ru,30)}),console.log("🔊 Playing welcome audio:",u),fe&&clearTimeout(fe),fe=window.setTimeout(()=>{const x=document.querySelector(".welcome-quote-card");x&&x.classList.add("audio-playing"),fe=null},600))}else i.innerHTML='<div class="welcome-quote-card"><div class="welcome-kr">"시작이 반이다"</div><div class="welcome-ru">Начало — это уже половина дела.</div></div>',fe&&clearTimeout(fe),fe=window.setTimeout(()=>{fe=null},800)}).catch(d=>{console.warn("Failed to fetch quote:",d)});else{const d=window.innerWidth<768;ve({particleCount:d?60:100,spread:d?50:70,origin:{y:.6},disableForReducedMotion:!0,zIndex:20020})}}}function Oe(t){const e=document.getElementById("db-status-indicator");e&&(e.classList.remove("active","waking","error"),e.classList.add(t),t==="active"&&(e.title="🟢 База данных активна"),t==="waking"&&(e.title="🟡 Подключение к базе..."),t==="error"&&(e.title="🔴 Нет соединения с базой"))}function rc(){let t=document.getElementById("offline-indicator");t||(t=document.createElement("div"),t.id="offline-indicator",t.textContent="📡 Нет подключения к интернету",document.body.appendChild(t));const e=()=>{navigator.onLine?t?.classList.remove("visible"):t?.classList.add("visible")};if(window.addEventListener("online",()=>{e(),h("🌐 Соединение восстановлено"),$i("syncing"),S.realtime.connect(),Oe("waking"),lt(5e3).then(n=>Oe(n?"active":"error")),Fi(),_(()=>import("./ui_retry-D-5OhA1K.js"),__vite__mapDeps([13,1,2,3])).then(n=>n.syncOfflineRequests())}),window.addEventListener("offline",()=>{e(),h("📡 Вы перешли в офлайн режим"),Oe("error"),$i("offline")}),navigator.connection){const n=navigator.connection;n.addEventListener("change",()=>{!n.saveData&&["3g","4g"].includes(n.effectiveType)&&navigator.serviceWorker.controller&&(console.log("📶 Connection improved. Processing download queue..."),navigator.serviceWorker.controller.postMessage({type:"PROCESS_DOWNLOAD_QUEUE"}),h("📶 Интернет улучшился. Докачиваем файлы..."))})}e()}function lc(){const t=[],e=bn(()=>{if(t.length===0)return;const s=new Set(o.dataStore.map(u=>u.id)),l=[],r=new Set;for(const u of t)!s.has(u.id)&&!r.has(u.id)&&(l.push(u),r.add(u.id));if(t.length=0,l.length===0)return;console.log(`🔥 Realtime: Adding ${l.length} new words`),o.dataStore.unshift(...l),l.length===1?h(`✨ Готово: ${l[0].word_kr}`):h(`✨ Добавлено слов: ${l.length}`);const c=document.getElementById("vocabulary-grid"),d=c?c.scrollTop:0;ie(),re&&re.postMessage({type:"SET_DATA",data:o.dataStore}),c&&(c.scrollTop=d)},1e3),n=s=>{const l=s.new;if(l){if(l.is_public===!1)return;t.push(l),e()}},i=()=>{const s=S.channel("public:vocabulary");s.on("postgres_changes",{event:"INSERT",schema:"public",table:A.VOCABULARY},n).subscribe((l,r)=>{l==="SUBSCRIBED"?console.log("✅ Realtime: Подписка на 'public:vocabulary' активна."):(l==="CHANNEL_ERROR"||l==="TIMED_OUT")&&(console.warn(`❌ Realtime: Ошибка канала 'public:vocabulary' (${l})`,r),setTimeout(async()=>{console.log("🔄 Переподключение 'public:vocabulary'..."),await S.removeChannel(s),i()},5e3))})},a=()=>{const s=S.channel("public:list_items");s.on("postgres_changes",{event:"INSERT",schema:"public",table:"list_items"},async l=>{const r=l.new;if(r&&r.list_id&&r.word_id){if(!o.dataStore.some(d=>d.id===r.word_id)){const{data:d,error:u}=await S.from(A.VOCABULARY).select("*").eq("id",r.word_id).single();d&&!u&&(o.dataStore.unshift(d),re&&re.postMessage({type:"SET_DATA",data:o.dataStore}))}if(W.listItems[r.list_id]||(W.listItems[r.list_id]=new Set),W.listItems[r.list_id].add(r.word_id),W.currentCollectionFilter===r.list_id){const d=document.getElementById("vocabulary-grid"),u=d?d.scrollTop:0;ie(),d&&(d.scrollTop=u)}_(()=>import("./ui_collections-FBsbpJ1k.js"),__vite__mapDeps([9,1,2,3])).then(d=>d.updateCollectionUI())}}).subscribe((l,r)=>{l==="SUBSCRIBED"?console.log("✅ Realtime: Подписка на 'public:list_items' активна."):(l==="CHANNEL_ERROR"||l==="TIMED_OUT")&&(console.warn(`❌ Realtime: Ошибка канала 'public:list_items' (${l})`,r),setTimeout(async()=>{console.log("🔄 Переподключение 'public:list_items'..."),await S.removeChannel(s),a()},5e3))})};i(),a()}async function zn(){if(Oe("waking"),lt(5e3).then(m=>{console.log(m?"⚡ Database is active":"💤 Database might be waking up..."),Oe(m?"active":"error"),m||setTimeout(()=>lt(5e3).then(p=>Oe(p?"active":"error")),5e3)}),!document.body)throw new Error("Document body not ready");Vl(),Ko(),ac();const t=document.getElementById("db-status-indicator");t&&(t.style.cursor="pointer",t.onclick=()=>{Oe("waking"),h("🔄 Проверка соединения..."),lt(5e3).then(m=>{Oe(m?"active":"error"),m?(h("✅ База данных активна. Обновляем словарь..."),Li()):h("❌ Ошибка соединения")})});const e=document.querySelector(".header-actions");if(e&&!document.getElementById("ping-indicator")){const m=document.createElement("div");m.id="ping-indicator",m.className="ping-indicator",e.prepend(m)}const n=document.getElementById("bottom-nav");n?(n.parentElement!==document.body&&document.body.appendChild(n),n.style.setProperty("display","flex","important"),n.innerHTML=`
        <button class="nav-btn active" data-action="nav-home">
            <span class="nav-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            </span>
            <span class="nav-label">Главная</span>
        </button>
        <button class="nav-btn" data-action="open-collections-filter">
            <span class="nav-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
            </span>
            <span class="nav-label">Списки</span>
        </button>
        <button class="nav-btn" data-modal-target="quiz-modal">
            <span class="nav-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" x2="10" y1="12" y2="12"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="15" x2="15.01" y1="13" y2="13"/><line x1="18" x2="18.01" y1="11" y2="11"/><rect width="20" height="12" x="2" y="6" rx="2"/></svg>
            </span>
            <span class="nav-label">Тренировка</span>
        </button>
        <button class="nav-btn" data-action="open-review">
            <span class="nav-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
            </span>
            <span class="nav-label">Повторение</span>
        </button>
        <button class="nav-btn" data-modal-target="stats-modal">
            <span class="nav-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>
            </span>
            <span class="nav-label">Прогресс</span>
        </button>
    `,rt("nav-home")):console.error("❌ Bottom Nav NOT found in DOM after injection"),sc(),rc(),ir(),lc(),fo();try{await Li()}catch(m){throw console.error("Vocabulary fetch failed:",m),m}if(o.dataStore&&(o.dataStore=o.dataStore.filter(m=>!m.deleted_at&&m.is_public!==!1)),!o.dataStore||o.dataStore.length===0)throw new Error("Не удалось загрузить данные. Проверьте интернет.");re&&re.postMessage({type:"SET_DATA",data:o.dataStore}),re&&(re.onmessage=m=>{const{results:p,requestId:g}=m.data;g===Mn&&(o.searchResults=p,ie())}),ee.onAuthStateChange(async(m,p)=>{if(m!=="INITIAL_SESSION")try{p?.user?(Ie(p.user),m==="SIGNED_IN"&&(Di(),await Nn(p.user),xt(),vn(),St(),z("login-modal"),_(()=>import("./ui_collections-FBsbpJ1k.js"),__vite__mapDeps([9,1,2,3])).then(g=>g.loadCollections()),Bn(p.user)),m==="PASSWORD_RECOVERY"&&(vi(),h("ℹ️ Введите новый пароль"))):Ie(null)}catch(g){console.error("Auth State Change Error:",g)}});const{data:i}=await pt(S.auth.getSession(),5e3,new Error("Session check timed out")).catch(m=>(console.warn("Session check failed/timed out:",m),{data:{session:null}})),a=i.session;if(a){Ie(a.user),Di();try{await pt(Promise.all([Nn(a.user),_(()=>import("./ui_collections-FBsbpJ1k.js"),__vite__mapDeps([9,1,2,3])).then(m=>m.loadCollections())]),1e4,new Error("Загрузка данных пользователя заняла слишком много времени"))}catch(m){console.error("Init data load error:",m),h("⚠️ Не удалось загрузить часть данных. Проверьте интернет.")}Bn(a.user)}else Ie(null),Bn();Zi(),Sn(),Je(),ji(),js(),br(),ai(),qa(),vn(),xt(),_(()=>import("./ui_shop-CPdhjkX7.js"),__vite__mapDeps([6,2,1,3])).then(m=>{m.canClaimDailyReward()&&m.claimDailyReward()}),Ht(),Ua(),yr(),Ps(),setInterval(Ht,6e4),ie(),po();const s=()=>{et(!0)};window.addEventListener("click",s,{once:!0}),Dr(),$r(),Cl(),oc();const r=new URLSearchParams(window.location.search).get("share_list");r&&(window.history.replaceState(null,"",window.location.pathname+window.location.hash),setTimeout(async()=>{const{data:m,error:p}=await S.from(A.USER_LISTS).select("*").eq("id",r).single();if(p||!m){h("❌ Список не найден или он приватный");return}le(`Добавить список "${m.title}" к себе?`,async()=>{_(()=>import("./ui_collections-FBsbpJ1k.js"),__vite__mapDeps([9,1,2,3])).then(g=>{W.userLists.find(f=>f.id===m.id)||W.userLists.push(m),g.setCollectionFilter(m.id),h(`📂 Список "${m.title}" открыт`)})},{confirmText:"Открыть",cancelText:"Отмена"})},1e3)),setInterval(Ni,15e3),Ni();const c=document.getElementById("app-version");c&&(c.innerHTML=`TOPIK Master ${nc} <span style="margin: 0 5px; opacity: 0.5;">|</span> ${ic}`);const d=document.getElementById("searchInput");d&&(d.addEventListener("input",bn(m=>{const p=m.target;if(p){const g=p.value.trim().toLowerCase();Mn++,re&&re.postMessage({type:"SEARCH",query:g,requestId:Mn})}},200)),d.addEventListener("focus",()=>Qa(d)),d.addEventListener("blur",()=>setTimeout(hn,200)),d.addEventListener("keydown",m=>{if(m.key==="Enter"){const p=d.value.trim();p&&Hr(p),hn()}})),Ur();const u=document.getElementById("loading-overlay");u&&(u.style.opacity="0",setTimeout(()=>u.remove(),500)),console.log("App initialized successfully")}window.addEventListener("beforeunload",()=>{En()});const Rn=t=>{const e=document.getElementById("loading-overlay");if(e&&e.remove(),console.error("Init Error:",t),ec(),t instanceof SyntaxError&&(t.message.includes("JSON")||t.message.includes("token"))){console.warn("⚠️ Обнаружен поврежденный кэш. Очистка localStorage и перезагрузка..."),localStorage.clear(),setTimeout(()=>location.reload(),500);return}let n="Ошибка инициализации: "+t.message;(t.name==="AbortError"||t.message.includes("AbortError"))&&(n="Время ожидания истекло. Проверьте интернет."),Wo(n)};if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{try{zn().catch(Rn)}catch(t){console.error("Synchronous error in init call:",t)}});else if(document.body)try{zn().catch(Rn)}catch(t){console.error("Synchronous error in init call:",t)}else document.addEventListener("DOMContentLoaded",()=>{try{zn().catch(Rn)}catch(t){console.error("Synchronous error in init call:",t)}});Xr(re);export{pt as A,te as B,Io as C,A as D,Li as E,bn as F,En as G,vs as H,St as I,fc as J,Zi as K,v as L,hc as M,ca as N,pc as O,Yn as R,qt as S,gs as W,_,o as a,W as b,S as c,z as d,gc as e,mc as f,w as g,N as h,_n as i,Me as j,D as k,Fs as l,ar as m,H as n,le as o,F as p,xt as q,ie as r,h as s,Jo as t,ai as u,Sn as v,vc as w,vt as x,mn as y,ea as z};
