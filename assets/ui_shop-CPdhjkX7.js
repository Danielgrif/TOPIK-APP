import{m as S,q as g,n as b,s as l,t as z,a as s,o as x,p,v as y,k as T,w as f,x as D,M as $,R as F,B as M,h as R}from"./index-BmGu2LOk.js";import{c as B}from"./vendor-confetti-oQXWb4Lk.js";import"./vendor-supabase-GG-Sp6Hl.js";import"./vendor-charts-IK6Vv9H5.js";class E extends M{currentTab="all";constructor(){super("shop-modal")}setupStateSubscriptions(){this.listen("stats_updated",()=>this.render()),this.listen("settings_updated",()=>this.render())}show(){if(!this.element.id||!document.body.contains(this.element)){const t=document.getElementById("shop-modal");t&&(this.element=t)}this.ensureStructure(),R("shop-modal"),this.render(),this.renderDailyRewardUI();const e=document.getElementById("shop-scroll-container");e&&(e.scrollTop=0)}switchTab(e){this.currentTab=e,this.render();const t=document.getElementById("shop-scroll-container");t&&(t.scrollTop=0)}ensureStructure(){if(!this.element.id||!document.body.contains(this.element)){const d=document.getElementById("shop-modal");d&&(this.element=d)}let e=document.getElementById("shop-modal");const t=e?.querySelector(".shop-tabs"),a=!document.getElementById("shop-user-points")||!document.getElementById("shop-items-container")||!t;if(e&&!a){this.element=e;return}e||(e=document.createElement("div"),e.id="shop-modal",e.className="modal",e.setAttribute("data-close-modal","shop-modal"),document.body.appendChild(e)),e.innerHTML=`
        <div class="modal-content shop-modal-content">
            <div class="modal-header shop-header">
                <h3>🛒 Магазин</h3>
                <div class="shop-header-right">
                    <div class="shop-points" id="shop-user-points">💰 ${s.userStats.coins||0}</div>
                    <button class="btn-icon close-modal-btn" data-close-modal="shop-modal" aria-label="Закрыть">✕</button>
                </div>
            </div>
            
            <div class="shop-tabs">
                <div class="segment-control">
                    <button class="segment-btn active" data-action="switch-shop-tab" data-value="all">Все</button>
                    <button class="segment-btn" data-action="switch-shop-tab" data-value="theme">Темы</button>
                    <button class="segment-btn" data-action="switch-shop-tab" data-value="feature">Улучшения</button>
                    <button class="segment-btn" data-action="switch-shop-tab" data-value="rewards">🎁 Награды</button>
                </div>
            </div>

            <div class="modal-body-container" id="shop-scroll-container">
                <!-- Daily Reward Section (Hidden by default unless tab is active) -->
                <div id="daily-reward-section" style="display: none;"></div>

                <div class="shop-grid" id="shop-items-container">
                    <!-- Items will be rendered here -->
                </div>
            </div>
        </div>
    `,this.element=e}render(){const e=document.getElementById("shop-items-container"),t=document.getElementById("shop-user-points"),a=document.getElementById("daily-reward-section"),d=document.querySelectorAll(".shop-tabs .segment-btn");if(!e||!t||!a)return;if(t.innerHTML=`💰 ${s.userStats.coins||0}`,d.forEach(n=>{n.getAttribute("data-value")===this.currentTab?n.classList.add("active"):n.classList.remove("active")}),this.currentTab==="rewards"){e.style.display="none",a.style.display="flex",this.renderDailyRewardUI();return}e.style.display="grid",a.style.display="none";const o=z.filter(n=>this.currentTab==="all"?!0:n.type===this.currentTab);if(o.length===0){e.innerHTML='<p style="text-align: center; color: var(--text-sub);">В этой категории пока ничего нет.</p>';return}e.innerHTML=o.map((n,i)=>this.renderItem(n,i)).join("")}renderItem(e,t){const a=s.purchasedItems.includes(e.id),d=(s.userStats.coins||0)>=e.price,o=e.type==="theme"&&s.themeColor===e.value;let n="";if(a&&e.type==="theme")o?n='<button class="btn purchased" disabled style="width:100%; padding:10px; border-radius:12px; font-size:13px; font-weight:700;">✓ Используется</button>':n=`<button class="btn btn-quiz" data-action="apply-shop-theme" data-value="${e.value}" style="width:100%; padding:10px; border-radius:12px;">Применить</button>`;else if(e.value==="streak_freeze"||e.value==="survival_heal"){const i=e.value==="streak_freeze"?s.userStats.streakFreeze||0:s.userStats.survivalHealth||0;n=`<button class="btn btn-quiz shop-item-buy-btn" data-action="buy-item" data-value="${e.id}" ${d?"":"disabled"}>
                💰 ${e.price} <span style="font-size: 0.8em; opacity: 0.8; margin-left: 5px;">(У вас: ${i})</span>
            </button>`}else a?n='<button class="btn purchased" disabled style="width:100%; padding:10px; border-radius:12px; font-size:13px; font-weight:700;">✓ Куплено</button>':n=`<button class="btn btn-quiz shop-item-buy-btn" data-action="buy-item" data-value="${e.id}" ${d?"":"disabled"}>
                💰 ${e.price}
            </button>`;return`
            <div class="shop-item-card ${!d&&!a?"disabled":""}" style="animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${t*.05}s backwards;">
                <div class="shop-item-icon">${e.icon}</div>
                <div style="flex-grow: 1; display: flex; flex-direction: column; align-items: center; width: 100%;">
                    <h3 class="shop-item-name">${e.name}</h3>
                    <p class="shop-item-desc">${e.description}</p>
                </div>
                ${n}
            </div>
        `}renderDailyRewardUI(){const e=document.getElementById("daily-reward-section");if(!e)return;const{streak:t}=I(),a=k(),d=f.map((i,u)=>{const m=u+1;let c="reward-day";u<t?c+=" claimed":u===t&&a?c+=" available":c+=" future";const h=i.type==="mysteryBox"?"Приз":i.amount;return`
        <div class="${c}">
          <div class="day-number">День ${m}</div>
          <div class="day-icon">${i.icon}</div>
          <div class="day-amount">${h}</div>
        </div>
      `}).join("");let o="";if(a)o='<button id="claim-reward-btn" class="btn btn-quiz" data-action="claim-reward">🎁 Получить награду</button>';else{const i=new Date,m=new Date(i.getFullYear(),i.getMonth(),i.getDate()+1).getTime()-i.getTime(),c=Math.floor(m/(1e3*60*60)),h=Math.floor(m%(1e3*60*60)/(1e3*60));o=`<div style="text-align:center;"><div id="next-reward-timer">⏳ Следующая награда: ${c}ч ${h}м</div></div>`}const n=$.map(i=>i.message.replace("!","")).join(", ");e.innerHTML=`
      <div class="daily-reward-header">📅 Ежедневная награда</div>
      <div class="daily-reward-calendar">${d}</div>
      <div class="daily-reward-note">🎁 День 7: ${n}, 🎨 Редкая тема</div>
      ${o}
    `}}const v=new E;v.init();function U(){v.show()}function P(r){v.switchTab(r)}function j(){}function W(r,e){const t=z.find(a=>a.id===r);if(t){if(s.purchasedItems.includes(r)&&t.type==="theme"){l("Вы уже купили это");return}if((s.userStats.coins||0)<t.price){l("Недостаточно монет!");return}x(`Купить «${t.name}» за 💰 ${t.price}?`,()=>{if((s.userStats.coins||0)<t.price){l("Недостаточно монет!");return}s.userStats.coins=(s.userStats.coins||0)-t.price,t.value==="streak_freeze"?(s.userStats.streakFreeze=(s.userStats.streakFreeze||0)+1,l(`❄️ Заморозка добавлена! Всего: ${s.userStats.streakFreeze}`)):t.value==="survival_heal"?(s.userStats.survivalHealth=(s.userStats.survivalHealth||0)+1,l(`❤️ Жизнь добавлена! Всего доп. жизней: ${s.userStats.survivalHealth}`)):t.type==="theme"&&(s.purchasedItems.push(t.id),l(`🎉 Поздравляем! Вы купили «${t.name}»`),_(t.value)),p("cash-register"),b("stats_updated",s.userStats),y(),T()},{confirmText:"Купить",cancelText:"Отмена"})}}function _(r){S(r),g(),b("settings_updated",{themeColor:r}),l("Тема применена!")}function w(r,e){const t=new Date(r),a=new Date(e);return t.getFullYear()===a.getFullYear()&&t.getMonth()===a.getMonth()&&t.getDate()===a.getDate()}function C(r,e){const t=new Date(e),a=new Date(t);return a.setDate(t.getDate()-1),w(r,a.getTime())}function I(){const{lastDailyReward:r,dailyRewardStreak:e=0,streakFreeze:t=0,lastFreezeDate:a}=s.userStats;if(r&&!w(r,Date.now())&&!C(r,Date.now())){const d=new Date().toLocaleDateString("en-CA"),n=(a?new Date(a).toLocaleDateString("en-CA"):null)===d;return t>0||n?{streak:e,savedByFreeze:!0,freezeConsumed:!n}:{streak:0,savedByFreeze:!1,freezeConsumed:!1}}return{streak:e,savedByFreeze:!1,freezeConsumed:!1}}function k(){const{lastDailyReward:r}=s.userStats;return r?!w(r,Date.now()):!0}function H(){const r=$.filter(a=>a.type!=="rare_theme"),e=F.filter(a=>!s.purchasedItems.includes(a.id));let t;if(e.length>0&&Math.random()<.25){const a=e[Math.floor(Math.random()*e.length)];t={type:"theme",item:a,message:`🎨 Редкая тема: «${a.name}»!`}}else t=r[Math.floor(Math.random()*r.length)];if(t.type==="coins")s.userStats.coins=(s.userStats.coins||0)+(t.amount||0);else if(t.type==="xp")D(t.amount||0);else if(t.type==="streakFreeze")s.userStats.streakFreeze=(s.userStats.streakFreeze||0)+(t.amount||0);else if(t.type==="theme"&&t.item){const a=t.item;s.purchasedItems.includes(a.id)||(s.purchasedItems.push(a.id),S(a.value),g())}return`Таинственная коробка! Вы выиграли: ${t.message}`}function X(r){if(!k()){l("Вы уже получили награду сегодня");return}const{streak:e,savedByFreeze:t,freezeConsumed:a}=I();t&&(a&&(s.userStats.streakFreeze=(s.userStats.streakFreeze||1)-1,s.userStats.lastFreezeDate=Date.now()),l("❄️ Заморозка спасла вашу серию ежедневных наград!",3e3),p("achievement-unlock"),y());const d=e%f.length,o=f[d];let n="";o.type==="coins"?(s.userStats.coins=(s.userStats.coins||0)+o.amount,n=`Вы получили ${o.amount} монет!`):o.type==="xp"?(D(o.amount),n=`Вы получили ${o.amount} XP!`):o.type==="streakFreeze"?(s.userStats.streakFreeze=(s.userStats.streakFreeze||0)+o.amount,n=`Вы получили ${o.amount} заморозку серии!`):o.type==="mysteryBox"&&(n=H()),s.userStats.lastDailyReward=Date.now(),s.userStats.dailyRewardStreak=e+1,l(`🎁 ${n}`,4e3),p("achievement-unlock");const i=window.innerWidth<768;B({particleCount:i?80:150,spread:i?60:80,origin:{y:.6},disableForReducedMotion:!0,zIndex:20005}),T(),y(),b("stats_updated",s.userStats)}export{_ as applyShopTheme,W as buyItem,k as canClaimDailyReward,X as claimDailyReward,U as openShopModal,P as switchShopTab,j as updateShopUI};
