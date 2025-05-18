const k=new Map,s={isContextValid:!0,reconnectAttempts:0,maxReconnectAttempts:5,initialized:!1,lastReconnectTime:0,connectionCheckInterval:null,offlineMode:!1,observerCleanup:null,async checkAndReconnect(){if(Date.now()-this.lastReconnectTime<3e3||(this.lastReconnectTime=Date.now(),this.offlineMode))return;let e=!1;try{const o=chrome.runtime.sendMessage({action:"ping"}),n=await Promise.race([o,new Promise((t,r)=>setTimeout(()=>r(new Error("Ping timeout")),2e3))]);e=!0,this.isContextValid||(console.log("확장 프로그램 연결이 복구되었습니다."),this.isContextValid=!0,this.reconnectAttempts=0,this.initialized||(this.observerCleanup&&(this.observerCleanup(),this.observerCleanup=null),await T()))}catch(o){console.error("연결 확인 오류:",o),this.isContextValid&&(console.warn("확장 프로그램 컨텍스트가 무효화되었습니다."),this.isContextValid=!1),this.reconnectAttempts<this.maxReconnectAttempts?(this.reconnectAttempts++,console.log(`재연결 시도 중... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`),setTimeout(()=>{this.isContextValid=!0,T().catch(n=>{console.error("재초기화 실패:",n),this.isContextValid=!1,this.reconnectAttempts>=this.maxReconnectAttempts&&this.enterOfflineMode()})},2e3)):this.enterOfflineMode()}return e},enterOfflineMode(){this.offlineMode||(console.warn("오프라인 모드로 전환: 백그라운드 스크립트와 연결 끊김"),this.offlineMode=!0,this.isContextValid=!1,setTimeout(()=>{try{const e=document.createElement("div");e.style.cssText=`
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 10px 15px;
          border-radius: 5px;
          z-index: 10000;
          font-size: 14px;
          max-width: 300px;
        `,e.innerHTML=`
          <div style="display: flex; align-items: center;">
            <span style="margin-right: 10px;">⚠️</span>
            <div>
              <div style="font-weight: bold; margin-bottom: 5px;">X 헬퍼 알림</div>
              <div>확장 프로그램과의 연결이 끊겼습니다. 페이지를 새로고침하거나 확장 프로그램을 다시 로드해주세요.</div>
            </div>
          </div>
        `,document.body.appendChild(e),setTimeout(()=>{e.style.opacity="0",e.style.transition="opacity 1s",setTimeout(()=>e.remove(),1e3)},7e3)}catch(e){console.error("알림 표시 오류:",e)}},1e4))},startConnectionCheck(){this.connectionCheckInterval&&clearInterval(this.connectionCheckInterval),this.connectionCheckInterval=setInterval(()=>{this.checkAndReconnect().catch(()=>{})},3e4)},cleanup(){this.connectionCheckInterval&&(clearInterval(this.connectionCheckInterval),this.connectionCheckInterval=null),this.observerCleanup&&(this.observerCleanup(),this.observerCleanup=null)}};let v={isEnabled:!0,apiKey:"",model:"gpt-3.5-turbo",toneOptions:["친근한","전문적인","유머러스한"],selectedTone:"친근한"};async function a(e,o="info",n){if(console.log(`[${o.toUpperCase()}] ${e}`,n||""),!(!s.isContextValid||s.offlineMode))try{const t=chrome.runtime.sendMessage({action:"addLog",data:{message:e,type:o,details:n}});await Promise.race([t,new Promise((r,l)=>setTimeout(()=>l(new Error("Log send timeout")),1e3))])}catch(t){console.error("로그 전송 오류:",t),t instanceof Error&&(t.message.includes("Extension context invalidated")||t.message.includes("Receiving end does not exist"))&&(s.isContextValid=!1,setTimeout(()=>s.checkAndReconnect(),500))}}async function M(e,o){if(s.offlineMode)return console.warn("오프라인 모드: 백그라운드 스크립트와 통신할 수 없습니다."),{error:"오프라인 모드"};if(!s.isContextValid&&(!await s.checkAndReconnect()||!s.isContextValid))return console.warn("확장 프로그램 컨텍스트가 무효화되었습니다. 재연결을 시도합니다."),{error:"연결 끊김"};try{const n=chrome.runtime.sendMessage({action:e,data:o});return await Promise.race([n,new Promise((r,l)=>setTimeout(()=>l(new Error("Message send timeout")),5e3))])}catch(n){const t=n instanceof Error?n.message:String(n);return t.includes("Extension context invalidated")||t.includes("Receiving end does not exist")?(console.warn(`메시지 전송 중 연결 오류 (${e}): ${t}`),s.isContextValid=!1,setTimeout(()=>s.checkAndReconnect(),100),{error:"연결 오류",errorType:"connection"}):(console.error(`메시지 전송 오류 (${e}):`,n),{error:t,errorType:"unknown"})}}async function E(){try{const e=await M("getSettings");e&&e.settings&&(v=e.settings,await a("설정을 로드했습니다.","info"))}catch(e){console.error("설정 로드 오류:",e),await a("설정 로드 중 오류가 발생했습니다.","error",e)}}function _(){let e=null;try{e=new MutationObserver(n=>{if(!s.isContextValid){e&&(e.disconnect(),console.warn("컨텍스트 무효화로 MutationObserver 중지됨")),setTimeout(()=>s.checkAndReconnect(),500);return}try{for(const t of n)if(t.type==="childList"&&t.addedNodes.length>0)try{A()}catch(r){console.error("트윗 작성 영역 감지 오류:",r)}}catch(t){console.error("MutationObserver 콜백 오류:",t)}});try{let n=function(){!s.isContextValid&&e?(e.disconnect(),console.warn("컨텍스트 무효화로 observer 연결 해제")):s.isContextValid&&e&&setTimeout(n,1e4)};var o=n;e.observe(document.body,{childList:!0,subtree:!0}),setTimeout(n,1e4)}catch(n){console.error("DOM 감시 시작 오류:",n)}setTimeout(()=>{try{A()}catch(n){console.error("초기 트윗 작성 영역 감지 오류:",n)}},1e3),a("X.com 페이지 감시를 시작했습니다.","info").catch(()=>{console.info("X.com 페이지 감시를 시작했습니다.")})}catch(n){console.error("MutationObserver 설정 오류:",n)}try{chrome.runtime.onMessage.addListener((n,t,r)=>{if(n&&n.action==="ping"){try{r({pong:!0,timestamp:Date.now()})}catch(l){console.error("Ping 응답 오류:",l)}return!0}return!1})}catch(n){console.error("메시지 리스너 등록 오류:",n),s.isContextValid=!1}return s.checkAndReconnect().catch(()=>{}),function(){e&&(e.disconnect(),e=null)}}function A(){if(!v.isEnabled)return;const e=document.querySelectorAll('div[role="textbox"][aria-multiline="true"][data-testid="tweetTextarea_0"]');e.length>0&&a(`${e.length}개의 트윗 작성 영역을 감지했습니다.`,"info"),e.forEach(o=>{const n=`composer-${Date.now()}`;o.hasAttribute("data-x-helper-id")||(o.setAttribute("data-x-helper-id",n),$(o,n))})}function $(e,o){if(k.get(o))return;const n=e;if(!n){console.error("트윗 작성 영역을 찾을 수 없습니다"),a("트윗 작성 영역을 찾을 수 없습니다","error");return}const t=document.createElement("div");t.className="x-helper-button-container",t.style.cssText=`
    position: absolute;
    z-index: 10000;
    width: 28px;
    height: 28px;
    pointer-events: none; /* 컨테이너 자체는 이벤트를 받지 않음 */
  `;const r=document.createElement("button");r.innerHTML="🤖",r.className="x-helper-button",r.style.cssText=`
    background-color: #1d9bf0;
    color: white;
    border: none;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 16px;
    position: absolute;
    top: 0;
    left: 0;
    transition: transform 0.2s ease, background-color 0.3s ease;
    pointer-events: auto; /* 버튼은 클릭 이벤트를 받음 */
  `;let l=!1;r.addEventListener("click",async m=>{if(m.preventDefault(),m.stopPropagation(),await a("버튼 클릭 감지: 이벤트 처리 시작","info"),l){await a("이미 응답 생성 중입니다. 요청 무시됨","warn");return}l=!0,await a("중복 요청 방지 플래그 설정","info");const f=r.innerHTML;r.innerHTML='<div class="x-helper-spinner"></div>',r.style.backgroundColor="#0f84d0";const h=document.createElement("style");h.textContent=`
      .x-helper-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top-color: white;
        animation: x-helper-spin 0.8s linear infinite;
      }
      
      @keyframes x-helper-spin {
        to { transform: rotate(360deg); }
      }
    `,document.head.appendChild(h);try{await a("AI 응답 생성 함수 호출 시작","info"),await L(e,o),await a("AI 응답 생성 함수 호출 완료","success")}catch(y){await a("AI 응답 생성 중 오류 발생","error",y),alert("응답 생성 중 오류가 발생했습니다. 다시 시도해주세요.")}finally{l=!1,r.innerHTML=f,r.style.backgroundColor="#1d9bf0",await a("중복 요청 방지 플래그 초기화","info")}}),t.appendChild(r);const i=n.parentElement;i?(window.getComputedStyle(i).position==="static"&&(i.style.position="relative"),i.appendChild(t)):document.body.appendChild(t);let c=!1;const d=()=>{if(!c){c=!0;try{const m=window.getSelection(),f=n.getBoundingClientRect();let h,y;if(m&&m.rangeCount>0){const w=m.getRangeAt(0);if(n.contains(w.startContainer)){const b=w.cloneRange();b.collapse(!0);const x=b.getBoundingClientRect();if(i){const C=i.getBoundingClientRect();h=x.left-C.left+5,y=x.top-C.top-t.offsetHeight/2}else h=x.left+5,y=x.top-t.offsetHeight/2}else{p(),c=!1;return}}else{p(),c=!1;return}t.style.left=`${Math.max(0,h)}px`,t.style.top=`${Math.max(0,y)}px`,t.style.display="block"}catch(m){console.error("버튼 위치 조정 중 오류:",m),a("버튼 위치 조정 중 오류","error",m),p()}finally{c=!1}}},p=()=>{if(i){i.getBoundingClientRect(),n.getBoundingClientRect();const m=10,f=10;t.style.left=`${m}px`,t.style.top=`${f}px`,t.style.display="block"}};let g=null;const u=(m,f)=>{g&&clearTimeout(g),g=setTimeout(()=>{m(),g=null},f)};n.addEventListener("keyup",()=>{u(d,100)}),n.addEventListener("mouseup",()=>{u(d,100)}),n.addEventListener("input",()=>{u(d,100)}),t.style.display="none",k.set(o,!0),n.addEventListener("focus",()=>{setTimeout(()=>{d(),t.style.display="block"},100)}),n.addEventListener("blur",m=>{m.relatedTarget!==r&&setTimeout(()=>{document.activeElement!==r&&(t.style.display="none")},200)}),p(),a(`X 헬퍼 버튼이 추가되었습니다: ${o}`,"success"),console.log("X 헬퍼 버튼이 추가되었습니다:",o)}function R(e){var n;let o=`--- X 헬퍼: 트윗 스레드 컨텍스트 ---

`;if(e.mainTweet){const t=e.mainTweet;o+=`■ 메인 트윗 (${t.author.name} - ${t.author.username||"사용자명 없음"}):
`,o+=`${t.text}

`}if(e.replyTarget){const t=e.replyTarget;o+=`■ 답장 대상 트윗 (${t.author.name} - ${t.author.username||"사용자명 없음"}):
`,o+=`${t.text}

`}if(e.collection_stats){const t=e.collection_stats.found_tweets,r=((n=e.intermediateReplies)==null?void 0:n.length)||0;r>0&&(o+=`※ 총 ${t}개의 트윗이 포함된 스레드`,o+=r>0?` (기타 답글 ${r}개 포함)
`:`
`)}return o}async function L(e,o){var r,l;if(!s.isContextValid){console.warn("확장 프로그램 컨텍스트가 무효화되어 응답을 생성할 수 없습니다."),alert("X 헬퍼 확장 프로그램 연결이 끊어졌습니다. 페이지를 새로고침해 주세요.");return}const n=e.textContent||"";await a("트윗 내용 가져오기","info",{tweetText:n});const t=S();await a("트윗 스레드 컨텍스트 가져오기","info",{tweet_count:((r=t.collection_stats)==null?void 0:r.found_tweets)||0,has_main_tweet:!!t.mainTweet,has_reply_target:!!t.replyTarget});try{try{const c=R(t),d=document.createElement("textarea");d.value=c,d.style.position="fixed",d.style.opacity="0",document.body.appendChild(d),d.select(),document.execCommand("copy"),document.body.removeChild(d),await a("컨텍스트가 클립보드에 복사되었습니다","success",{context_size:c.length,tweet_count:((l=t.collection_stats)==null?void 0:l.found_tweets)||0});const p=document.createElement("div");p.style.cssText=`
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 4px;
        z-index: 10000;
        font-size: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
      `,p.innerHTML=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="white"/>
      </svg> 클립보드에 복사되었습니다`,document.body.appendChild(p),setTimeout(()=>{p.style.opacity="0",p.style.transition="opacity 0.5s ease",setTimeout(()=>p.remove(),500)},3e3)}catch(c){await a("컨텍스트 클립보드 복사 실패","error",c)}await a("백그라운드 스크립트에 응답 생성 요청 전송","info",{tweetText:n,threadContext:t,tone:v.selectedTone});const i=await M("generateResponse",{tweetText:n,threadContext:t,tone:v.selectedTone});if(i&&i.error)if(i.errorType==="connection"){await a("백그라운드 스크립트와 연결 끊김","warn",i),await s.checkAndReconnect();const c=document.createElement("div");c.style.cssText=`
          position: fixed;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 10px 20px;
          border-radius: 4px;
          z-index: 10000;
          font-size: 14px;
        `,c.textContent="백그라운드 연결 재시도 중... 잠시 후 다시 시도해주세요.",document.body.appendChild(c),setTimeout(()=>{c.style.opacity="0",c.style.transition="opacity 0.5s ease",setTimeout(()=>c.remove(),5e3)},5e3);return}else{await a("응답 생성 중 오류 발생","error",i),alert("응답 생성 중 오류가 발생했습니다. 다시 시도해주세요.");return}i&&i.responses?(await a("응답을 받아 표시 준비","success",{responseCount:i.responses.length}),V(e,i.responses)):(await a("응답을 받지 못했거나 오류 발생","error",i),alert("응답 생성 중 오류가 발생했습니다. 로그를 확인해 주세요."))}catch(i){await a("응답 생성 중 오류 발생","error",i),i instanceof Error&&i.message.includes("확장 프로그램 컨텍스트가 무효화되었습니다")?alert("X 헬퍼 확장 프로그램 연결이 끊어졌습니다. 페이지를 새로고침해 주세요."):alert("응답 생성 중 오류가 발생했습니다. 다시 시도해 주세요.")}}function S(){const e={intermediateReplies:[],threadStructure:"",collected_at:new Date().toISOString()};try{const o=document.querySelectorAll('article[data-testid="tweet"]');if(o.length===0)return a("컨텍스트 수집: 트윗을 찾을 수 없음","warn"),{intermediateReplies:[],threadStructure:"트윗을 찾을 수 없음",collected_at:new Date().toISOString(),collection_stats:{found_tweets:0,success:!1,error:"트윗을 찾을 수 없음"}};const n=[];if(a(`컨텍스트 수집: ${o.length}개의 트윗 발견`,"info"),o.forEach((t,r)=>{var l,i,c;try{let d=t.getAttribute("data-testid-tweet-id")||((i=(l=t.querySelector('a[href*="/status/"]'))==null?void 0:l.getAttribute("href"))==null?void 0:i.split("/status/")[1])||`unknown-${r}`;const p=t.querySelector('div[data-testid="tweetText"]'),g=(p==null?void 0:p.textContent)||"(텍스트 없음)",u=t.querySelector('div[data-testid="User-Name"]'),m=((c=u==null?void 0:u.querySelector("span"))==null?void 0:c.textContent)||"알 수 없음",f=u==null?void 0:u.querySelector('span a[tabindex="-1"] span');let h=(f==null?void 0:f.textContent)||"";h&&!h.startsWith("@")&&(h="@"+h);const y=t.querySelector("time"),w=(y==null?void 0:y.getAttribute("datetime"))||"";n.push({id:d,text:g,author:{name:m,username:h},timestamp:w,isMainTweet:!1,isTargetTweet:!1,html_content:(p==null?void 0:p.innerHTML)||"",element_type:"tweet",position_index:r}),a(`트윗 수집 ${r+1}/${o.length}: ${h}의 트윗`,"info",{id:d,text_preview:g.substring(0,50)+(g.length>50?"...":"")})}catch(d){a(`트윗 수집 실패 (${r+1}/${o.length})`,"error",d)}}),n.length>0){n[0].isMainTweet=!0,e.mainTweet=n[0];const r=window.location.href.match(/\/status\/(\d+)/),l=r?r[1]:null;let i=1;if(l){const c=n.findIndex(d=>d.id.includes(l));c!==-1&&(i=c)}if(i>=0&&i<n.length){n[i].isTargetTweet=!0,e.replyTarget=n[i];const c=1,d=n.length;c<d&&(e.intermediateReplies=n.slice(c,d).filter((p,g)=>c+g!==i))}else n.length>1&&(n[1].isTargetTweet=!0,e.replyTarget=n[1],n.length>2&&(e.intermediateReplies=n.slice(2)))}return e.threadStructure=z(n),e.collection_stats={found_tweets:n.length,has_main_tweet:!!e.mainTweet,has_reply_target:!!e.replyTarget,intermediate_replies_count:e.intermediateReplies.length,success:!0},e.debug_info={url:window.location.href,collected_at:new Date().toISOString(),browser_info:navigator.userAgent},a("트윗 스레드 컨텍스트 수집 완료","success",{tweet_count:n.length,thread_structure:e.threadStructure}),e}catch(o){return a("트윗 컨텍스트 수집 오류","error",o),{intermediateReplies:[],threadStructure:`오류 발생: ${o}`,collected_at:new Date().toISOString(),collection_stats:{found_tweets:0,success:!1,error:String(o)}}}}function z(e){if(e.length===0)return"트윗이 없음";if(e.length===1)return`독립 트윗: ${e[0].author.username}`;let o=`${e.length}개 트윗 스레드:
`;return e.forEach((n,t)=>{const r=t===0?"📌 메인: ":t===e.length-1?"⤵️ 답장 대상: ":`↪️ 답글 #${t}: `,l=n.timestamp?new Date(n.timestamp).toLocaleTimeString():"시간 정보 없음";o+=`${r}${n.author.username} (${l}): "${I(n.text,30)}"
`}),o}function I(e,o){return e.length<=o?e:e.substring(0,o)+"..."}async function V(e,o){const n=document.querySelector(".x-helper-options");n&&n.remove();const t=document.createElement("div");t.className="x-helper-overlay",t.style.cssText=`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 10000;
    display: flex;
    justify-content: center;
    align-items: center;
    animation: fadeIn 0.2s ease;
  `;const r=document.createElement("style");r.textContent=`
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    
    .x-helper-option:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(29, 155, 240, 0.2);
    }
  `,document.head.appendChild(r);const l=document.createElement("div");l.className="x-helper-options",l.style.cssText=`
    background-color: white;
    border-radius: 12px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
    animation: slideUp 0.3s ease;
    position: relative;
  `;const i=document.createElement("div");i.innerText="제안된 답변",i.style.cssText=`
    padding: 16px 20px;
    font-weight: bold;
    font-size: 16px;
    border-bottom: 1px solid #ebeef0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: sticky;
    top: 0;
    background-color: white;
    border-top-left-radius: 12px;
    border-top-right-radius: 12px;
    z-index: 1;
  `;const c=document.createElement("button");c.innerHTML="×",c.style.cssText=`
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #536471;
    line-height: 1;
    padding: 0 6px;
  `,c.addEventListener("click",async()=>{await a("사용자가 응답 옵션을 닫았습니다","info"),t.style.opacity="0",t.style.transition="opacity 0.2s ease",setTimeout(()=>t.remove(),200)}),i.appendChild(c),l.appendChild(i);const d={greeting:"#1d9bf0",agreement:"#00ba7c",joke:"#8759f2"};o.forEach((u,m)=>{const f=document.createElement("div");f.className="x-helper-option";const h=document.createElement("div"),y=u.type==="greeting"?"인사":u.type==="agreement"?"내용":u.type==="joke"?"유머":"응답";h.innerText=y,h.style.cssText=`
      font-size: 12px;
      font-weight: 600;
      color: ${d[u.type]||"#536471"};
      margin-bottom: 8px;
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      background-color: ${d[u.type]?`${d[u.type]}15`:"#f7f9fa"};
    `;const w=document.createElement("div");w.innerText=u.text,w.style.cssText=`
      line-height: 1.4;
      color: #0f1419;
    `,f.appendChild(h),f.appendChild(w),f.style.cssText=`
      padding: 16px 20px;
      cursor: pointer;
      border-bottom: 1px solid #ebeef0;
      transition: transform 0.2s, box-shadow 0.2s, background-color 0.2s;
      position: relative;
    `,f.addEventListener("click",async()=>{await a("사용자가 응답 옵션을 선택했습니다","success",{optionIndex:m,type:u.type,text:u.text});try{await navigator.clipboard.writeText(u.text);const x=document.createElement("div");x.style.cssText=`
          position: fixed;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 10px 20px;
          border-radius: 4px;
          z-index: 10000;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        `,x.innerHTML=`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="white"/>
        </svg> 클립보드에 복사되었습니다`,document.body.appendChild(x),setTimeout(()=>{x.style.opacity="0",x.style.transition="opacity 0.5s ease",setTimeout(()=>x.remove(),500)},3e3),t.style.opacity="0",t.style.transition="opacity 0.2s ease",setTimeout(()=>t.remove(),200)}catch(x){console.error("텍스트 복사 오류:",x),alert("텍스트를 클립보드에 복사하지 못했습니다.")}const b=document.createElement("div");b.style.cssText=`
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(29, 155, 240, 0.15);
        z-index: 9999;
        pointer-events: none;
      `,document.body.appendChild(b),setTimeout(()=>{b.style.opacity="0",b.style.transition="opacity 0.5s ease",setTimeout(()=>b.remove(),500)},100)}),f.addEventListener("mouseenter",()=>{f.style.backgroundColor="#f7f9fa"}),f.addEventListener("mouseleave",()=>{f.style.backgroundColor="white"}),l.appendChild(f)});const p=document.createElement("div");p.innerText="답변을 클릭하면 자동으로 입력창에 삽입됩니다",p.style.cssText=`
    padding: 12px 20px;
    text-align: center;
    color: #536471;
    font-size: 13px;
  `,l.appendChild(p),t.appendChild(l),document.body.appendChild(t),await a("응답 옵션이 오버레이로 표시되었습니다","success",{optionCount:o.length}),t.addEventListener("click",u=>{u.target===t&&(t.style.opacity="0",t.style.transition="opacity 0.2s ease",setTimeout(()=>t.remove(),200),a("사용자가 오버레이 배경 클릭으로 응답 옵션을 닫았습니다","info"))});const g=u=>{u.key==="Escape"&&(t.style.opacity="0",t.style.transition="opacity 0.2s ease",setTimeout(()=>t.remove(),200),a("사용자가 ESC 키로 응답 옵션을 닫았습니다","info"),document.removeEventListener("keydown",g))};document.addEventListener("keydown",g)}async function T(){if(s.initialized){console.log("이미 초기화되었습니다.");return}try{s.offlineMode=!1,await E(),s.observerCleanup=_();try{chrome.runtime.onMessage.addListener(e=>(e.action==="settingsUpdated"&&(E().catch(o=>console.error("설정 업데이트 오류:",o)),a("설정이 업데이트되어 재로드했습니다","info").catch(()=>{})),!0))}catch(e){console.error("설정 업데이트 리스너 등록 오류:",e)}s.initialized=!0,s.isContextValid=!0,s.reconnectAttempts=0,await a("X 헬퍼 콘텐츠 스크립트가 초기화되었습니다","success"),s.startConnectionCheck()}catch(e){console.error("초기화 오류:",e),s.isContextValid=!1,s.initialized=!1,s.reconnectAttempts<s.maxReconnectAttempts?(s.reconnectAttempts++,console.log(`초기화 재시도 중... (${s.reconnectAttempts}/${s.maxReconnectAttempts})`),setTimeout(()=>{T().catch(o=>{console.error("재초기화 실패:",o),s.reconnectAttempts>=s.maxReconnectAttempts&&s.enterOfflineMode()})},2e3)):s.enterOfflineMode()}}window.addEventListener("beforeunload",()=>{s.isContextValid=!1,s.cleanup(),console.log("페이지 언로드: X 헬퍼 콘텐츠 스크립트 정리")});T();
