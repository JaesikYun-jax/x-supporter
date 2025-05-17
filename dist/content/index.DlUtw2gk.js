const R=new Map,r={isContextValid:!0,reconnectAttempts:0,maxReconnectAttempts:5,initialized:!1,lastReconnectTime:0,connectionCheckInterval:null,offlineMode:!1,observerCleanup:null,async checkAndReconnect(){if(Date.now()-this.lastReconnectTime<3e3||(this.lastReconnectTime=Date.now(),this.offlineMode))return;let e=!1;try{const o=chrome.runtime.sendMessage({action:"ping"}),t=await Promise.race([o,new Promise((n,s)=>setTimeout(()=>s(new Error("Ping timeout")),1e3))]);e=!0,this.isContextValid||(console.log("확장 프로그램 연결이 복구되었습니다."),this.isContextValid=!0,this.reconnectAttempts=0,this.initialized||(this.observerCleanup&&(this.observerCleanup(),this.observerCleanup=null),await v()))}catch(o){console.error("연결 확인 오류:",o),this.isContextValid&&(console.warn("확장 프로그램 컨텍스트가 무효화되었습니다."),this.isContextValid=!1),this.reconnectAttempts<this.maxReconnectAttempts?(this.reconnectAttempts++,console.log(`재연결 시도 중... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`),setTimeout(()=>{this.isContextValid=!0,v().catch(t=>{console.error("재초기화 실패:",t),this.isContextValid=!1,this.reconnectAttempts>=this.maxReconnectAttempts&&this.enterOfflineMode()})},2e3)):this.enterOfflineMode()}return e},enterOfflineMode(){this.offlineMode||(console.warn("오프라인 모드로 전환: 백그라운드 스크립트와 연결 끊김"),this.offlineMode=!0,this.isContextValid=!1,setTimeout(()=>{try{const e=document.createElement("div");e.style.cssText=`
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
        `,document.body.appendChild(e),setTimeout(()=>{e.style.opacity="0",e.style.transition="opacity 1s",setTimeout(()=>e.remove(),1e3)},7e3)}catch(e){console.error("알림 표시 오류:",e)}},1e4))},startConnectionCheck(){this.connectionCheckInterval&&clearInterval(this.connectionCheckInterval),this.connectionCheckInterval=setInterval(()=>{this.checkAndReconnect().catch(()=>{})},1e4)},cleanup(){this.connectionCheckInterval&&(clearInterval(this.connectionCheckInterval),this.connectionCheckInterval=null),this.observerCleanup&&(this.observerCleanup(),this.observerCleanup=null)}};let y={isEnabled:!0,apiKey:"",model:"gpt-3.5-turbo",toneOptions:["친근한","전문적인","유머러스한"],selectedTone:"친근한"};async function i(e,o="info",t){if(console.log(`[${o.toUpperCase()}] ${e}`,t||""),!(!r.isContextValid||r.offlineMode))try{const n=chrome.runtime.sendMessage({action:"addLog",data:{message:e,type:o,details:t}});await Promise.race([n,new Promise((s,a)=>setTimeout(()=>a(new Error("Log send timeout")),1e3))])}catch(n){console.error("로그 전송 오류:",n),n instanceof Error&&(n.message.includes("Extension context invalidated")||n.message.includes("Receiving end does not exist"))&&(r.isContextValid=!1,setTimeout(()=>r.checkAndReconnect(),500))}}async function S(e,o){if(r.offlineMode)throw new Error("오프라인 모드: 백그라운드 스크립트와 통신할 수 없습니다.");if(!r.isContextValid&&(!await r.checkAndReconnect()||!r.isContextValid))throw new Error("확장 프로그램 컨텍스트가 무효화되었습니다. 페이지를 새로고침해 주세요.");try{const t=chrome.runtime.sendMessage({action:e,data:o});return await Promise.race([t,new Promise((s,a)=>setTimeout(()=>a(new Error("Message send timeout")),5e3))])}catch(t){throw console.error(`메시지 전송 오류 (${e}):`,t),t instanceof Error&&(t.message.includes("Extension context invalidated")||t.message.includes("Receiving end does not exist"))?(r.isContextValid=!1,setTimeout(()=>r.checkAndReconnect(),100),new Error("확장 프로그램 컨텍스트가 무효화되었습니다. 페이지를 새로고침해 주세요.")):t}}async function A(){try{const e=await S("getSettings");e&&e.settings&&(y=e.settings,await i("설정을 로드했습니다.","info"))}catch(e){console.error("설정 로드 오류:",e),await i("설정 로드 중 오류가 발생했습니다.","error",e)}}function E(){let e=null;try{e=new MutationObserver(t=>{if(!r.isContextValid){e&&(e.disconnect(),console.warn("컨텍스트 무효화로 MutationObserver 중지됨")),setTimeout(()=>r.checkAndReconnect(),500);return}try{for(const n of t)if(n.type==="childList"&&n.addedNodes.length>0)try{_()}catch(s){console.error("트윗 작성 영역 감지 오류:",s)}}catch(n){console.error("MutationObserver 콜백 오류:",n)}});try{let t=function(){!r.isContextValid&&e?(e.disconnect(),console.warn("컨텍스트 무효화로 observer 연결 해제")):r.isContextValid&&e&&setTimeout(t,1e4)};var o=t;e.observe(document.body,{childList:!0,subtree:!0}),setTimeout(t,1e4)}catch(t){console.error("DOM 감시 시작 오류:",t)}setTimeout(()=>{try{_()}catch(t){console.error("초기 트윗 작성 영역 감지 오류:",t)}},1e3),i("X.com 페이지 감시를 시작했습니다.","info").catch(()=>{console.info("X.com 페이지 감시를 시작했습니다.")})}catch(t){console.error("MutationObserver 설정 오류:",t)}try{chrome.runtime.onMessage.addListener((t,n,s)=>{if(t&&t.action==="ping"){try{s({pong:!0,timestamp:Date.now()})}catch(a){console.error("Ping 응답 오류:",a)}return!0}return!1})}catch(t){console.error("메시지 리스너 등록 오류:",t),r.isContextValid=!1}return r.checkAndReconnect().catch(()=>{}),function(){e&&(e.disconnect(),e=null)}}function _(){if(!y.isEnabled)return;const e=document.querySelectorAll('div[role="textbox"][aria-multiline="true"][data-testid="tweetTextarea_0"]');e.length>0&&i(`${e.length}개의 트윗 작성 영역을 감지했습니다.`,"info"),e.forEach(o=>{const t=`composer-${Date.now()}`;o.hasAttribute("data-x-helper-id")||(o.setAttribute("data-x-helper-id",t),k(o,t))})}function k(e,o){if(R.get(o))return;const t=e;if(!t){console.error("트윗 작성 영역을 찾을 수 없습니다"),i("트윗 작성 영역을 찾을 수 없습니다","error");return}const n=document.createElement("div");n.className="x-helper-button-container",n.style.cssText=`
    position: absolute;
    z-index: 10000;
    width: 28px;
    height: 28px;
    pointer-events: none; /* 컨테이너 자체는 이벤트를 받지 않음 */
  `;const s=document.createElement("button");s.innerHTML="🤖",s.className="x-helper-button",s.style.cssText=`
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
    transition: transform 0.2s ease;
    pointer-events: auto; /* 버튼은 클릭 이벤트를 받음 */
  `;let a=!1;s.addEventListener("click",async d=>{if(d.preventDefault(),d.stopPropagation(),await i("버튼 클릭 감지: 이벤트 처리 시작","info"),a){await i("이미 응답 생성 중입니다. 요청 무시됨","warn");return}a=!0,await i("중복 요청 방지 플래그 설정","info");try{await i("AI 응답 생성 함수 호출 시작","info"),await M(e,o),await i("AI 응답 생성 함수 호출 완료","success")}catch(m){await i("AI 응답 생성 중 오류 발생","error",m)}finally{a=!1,await i("중복 요청 방지 플래그 초기화","info")}}),n.appendChild(s);const c=t.parentElement;c?(window.getComputedStyle(c).position==="static"&&(c.style.position="relative"),c.appendChild(n)):document.body.appendChild(n);let p=!1;const h=()=>{if(!p){p=!0;try{const d=window.getSelection(),m=t.getBoundingClientRect();let g,x;if(d&&d.rangeCount>0){const w=d.getRangeAt(0);if(t.contains(w.startContainer)){const C=w.cloneRange();C.collapse(!0);const b=C.getBoundingClientRect();if(c){const T=c.getBoundingClientRect();g=b.left-T.left+5,x=b.top-T.top-n.offsetHeight/2}else g=b.left+5,x=b.top-n.offsetHeight/2}else{l(),p=!1;return}}else{l(),p=!1;return}n.style.left=`${Math.max(0,g)}px`,n.style.top=`${Math.max(0,x)}px`,n.style.display="block"}catch(d){console.error("버튼 위치 조정 중 오류:",d),i("버튼 위치 조정 중 오류","error",d),l()}finally{p=!1}}},l=()=>{if(c){c.getBoundingClientRect(),t.getBoundingClientRect();const d=10,m=10;n.style.left=`${d}px`,n.style.top=`${m}px`,n.style.display="block"}};let f=null;const u=(d,m)=>{f&&clearTimeout(f),f=setTimeout(()=>{d(),f=null},m)};t.addEventListener("keyup",()=>{u(h,100)}),t.addEventListener("mouseup",()=>{u(h,100)}),t.addEventListener("input",()=>{u(h,100)}),n.style.display="none",R.set(o,!0),t.addEventListener("focus",()=>{setTimeout(()=>{h(),n.style.display="block"},100)}),t.addEventListener("blur",d=>{d.relatedTarget!==s&&setTimeout(()=>{document.activeElement!==s&&(n.style.display="none")},200)}),l(),i(`X 헬퍼 버튼이 추가되었습니다: ${o}`,"success"),console.log("X 헬퍼 버튼이 추가되었습니다:",o)}async function M(e,o){var s,a;if(!r.isContextValid){console.warn("확장 프로그램 컨텍스트가 무효화되어 응답을 생성할 수 없습니다."),alert("X 헬퍼 확장 프로그램 컨텍스트가 무효화되었습니다. 페이지를 새로고침해 주세요.");return}const t=e.textContent||"";await i("트윗 내용 가져오기","info",{tweetText:t});const n=$();await i("트윗 스레드 컨텍스트 가져오기","info",{tweet_count:((s=n.collection_stats)==null?void 0:s.found_tweets)||0,has_main_tweet:!!n.mainTweet,has_reply_target:!!n.replyTarget});try{try{const p={user_input:t,thread_context:n,settings:{tone:y.selectedTone,model:y.model},timestamp:new Date().toISOString()},h=JSON.stringify(p,null,2),l=document.createElement("textarea");l.value=h,l.style.position="fixed",l.style.opacity="0",document.body.appendChild(l),l.select(),document.execCommand("copy"),document.body.removeChild(l),await i("컨텍스트가 클립보드에 복사되었습니다","success",{context_size:h.length,tweet_count:((a=n.collection_stats)==null?void 0:a.found_tweets)||0});const f=document.createElement("div");f.style.cssText=`
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
      `,f.textContent="트윗 컨텍스트가 클립보드에 복사되었습니다",document.body.appendChild(f),setTimeout(()=>{f.style.opacity="0",f.style.transition="opacity 0.5s",setTimeout(()=>f.remove(),500)},3e3)}catch(p){await i("컨텍스트 클립보드 복사 실패","error",p)}await i("백그라운드 스크립트에 응답 생성 요청 전송","info",{tweetText:t,threadContext:n,tone:y.selectedTone});const c=await S("generateResponse",{tweetText:t,threadContext:n,tone:y.selectedTone});c&&c.responses?(await i("응답을 받아 표시 준비","success",{responseCount:c.responses.length}),V(e,c.responses)):(await i("응답을 받지 못했거나 오류 발생","error",c),alert("응답 생성 중 오류가 발생했습니다. 로그를 확인해 주세요."))}catch(c){await i("응답 생성 중 오류 발생","error",c),c instanceof Error&&c.message.includes("확장 프로그램 컨텍스트가 무효화되었습니다")?alert("X 헬퍼 확장 프로그램 연결이 끊어졌습니다. 페이지를 새로고침해 주세요."):alert("응답 생성 중 오류가 발생했습니다. 다시 시도해 주세요.")}}function $(){const e={intermediateReplies:[],threadStructure:"",collected_at:new Date().toISOString()};try{const o=document.querySelectorAll('article[data-testid="tweet"]');if(o.length===0)return i("컨텍스트 수집: 트윗을 찾을 수 없음","warn"),{intermediateReplies:[],threadStructure:"트윗을 찾을 수 없음",collected_at:new Date().toISOString(),collection_stats:{found_tweets:0,success:!1,error:"트윗을 찾을 수 없음"}};const t=[];if(i(`컨텍스트 수집: ${o.length}개의 트윗 발견`,"info"),o.forEach((n,s)=>{var a,c,p;try{let h=n.getAttribute("data-testid-tweet-id")||((c=(a=n.querySelector('a[href*="/status/"]'))==null?void 0:a.getAttribute("href"))==null?void 0:c.split("/status/")[1])||`unknown-${s}`;const l=n.querySelector('div[data-testid="tweetText"]'),f=(l==null?void 0:l.textContent)||"(텍스트 없음)",u=n.querySelector('div[data-testid="User-Name"]'),d=((p=u==null?void 0:u.querySelector("span"))==null?void 0:p.textContent)||"알 수 없음",m=u==null?void 0:u.querySelector('span a[tabindex="-1"] span');let g=(m==null?void 0:m.textContent)||"";g&&!g.startsWith("@")&&(g="@"+g);const x=n.querySelector("time"),w=(x==null?void 0:x.getAttribute("datetime"))||"";t.push({id:h,text:f,author:{name:d,username:g},timestamp:w,isMainTweet:!1,isTargetTweet:!1,html_content:(l==null?void 0:l.innerHTML)||"",element_type:"tweet",position_index:s}),i(`트윗 수집 ${s+1}/${o.length}: ${g}의 트윗`,"info",{id:h,text_preview:f.substring(0,50)+(f.length>50?"...":"")})}catch(h){i(`트윗 수집 실패 (${s+1}/${o.length})`,"error",h)}}),t.length>0&&(t[0].isMainTweet=!0,e.mainTweet=t[0],t.length>1)){const n=t.length-1;t[n].isTargetTweet=!0,e.replyTarget=t[n],t.length>2&&(e.intermediateReplies=t.slice(1,n))}return e.threadStructure=O(t),e.collection_stats={found_tweets:t.length,has_main_tweet:!!e.mainTweet,has_reply_target:!!e.replyTarget,intermediate_replies_count:e.intermediateReplies.length,success:!0},e.debug_info={url:window.location.href,collected_at:new Date().toISOString(),browser_info:navigator.userAgent},i("트윗 스레드 컨텍스트 수집 완료","success",{tweet_count:t.length,thread_structure:e.threadStructure}),e}catch(o){return i("트윗 컨텍스트 수집 오류","error",o),{intermediateReplies:[],threadStructure:`오류 발생: ${o}`,collected_at:new Date().toISOString(),collection_stats:{found_tweets:0,success:!1,error:String(o)}}}}function O(e){if(e.length===0)return"트윗이 없음";if(e.length===1)return`독립 트윗: ${e[0].author.username}`;let o=`${e.length}개 트윗 스레드:
`;return e.forEach((t,n)=>{const s=n===0?"📌 메인: ":n===e.length-1?"⤵️ 답장 대상: ":`↪️ 답글 #${n}: `,a=t.timestamp?new Date(t.timestamp).toLocaleTimeString():"시간 정보 없음";o+=`${s}${t.author.username} (${a}): "${L(t.text,30)}"
`}),o}function L(e,o){return e.length<=o?e:e.substring(0,o)+"..."}async function V(e,o){const t=document.querySelector(".x-helper-options");t&&t.remove();const n=e.querySelector(".x-helper-button-container");if(!n){console.error("헬퍼 버튼을 찾을 수 없습니다"),await i("헬퍼 버튼을 찾을 수 없습니다","error");return}const s=n.getBoundingClientRect(),a=document.createElement("div");a.className="x-helper-options",a.style.cssText=`
    position: fixed;
    top: ${s.top-10}px;
    left: ${s.left+30}px;
    background-color: white;
    border: 1px solid #cfd9de;
    border-radius: 4px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    width: 300px;
    z-index: 10000;
    max-height: 300px;
    overflow-y: auto;
  `;const c=document.createElement("div");c.innerText="제안된 답변",c.style.cssText=`
    padding: 12px 16px;
    font-weight: bold;
    border-bottom: 1px solid #cfd9de;
  `,a.appendChild(c),o.forEach((l,f)=>{const u=document.createElement("div");u.className="x-helper-option",u.innerText=l.text,u.style.cssText=`
      padding: 12px 16px;
      cursor: pointer;
      border-bottom: 1px solid #ebeef0;
      transition: background-color 0.2s;
    `,u.addEventListener("click",async()=>{await i("사용자가 응답 옵션을 선택했습니다","success",{optionIndex:f,text:l.text}),e.textContent=l.text,a.remove(),e.focus();const d=window.getSelection(),m=document.createRange();m.selectNodeContents(e),m.collapse(!1),d==null||d.removeAllRanges(),d==null||d.addRange(m)}),u.addEventListener("mouseenter",()=>{u.style.backgroundColor="#f7f9fa"}),u.addEventListener("mouseleave",()=>{u.style.backgroundColor="transparent"}),a.appendChild(u)});const p=document.createElement("div");p.innerText="닫기",p.style.cssText=`
    padding: 12px 16px;
    text-align: center;
    cursor: pointer;
    color: #1d9bf0;
  `,p.addEventListener("click",async()=>{await i("사용자가 응답 옵션을 닫았습니다","info"),a.remove()}),a.appendChild(p),document.body.appendChild(a),await i("응답 옵션이 화면에 표시되었습니다","success",{optionCount:o.length});const h=l=>{!a.contains(l.target)&&!l.target.closest(".x-helper-button")&&(a.remove(),document.removeEventListener("click",h),i("사용자가 외부 클릭으로 응답 옵션을 닫았습니다","info"))};setTimeout(()=>{document.addEventListener("click",h)},100)}async function v(){if(r.initialized){console.log("이미 초기화되었습니다.");return}try{r.offlineMode=!1,await A(),r.observerCleanup=E();try{chrome.runtime.onMessage.addListener(e=>(e.action==="settingsUpdated"&&(A().catch(o=>console.error("설정 업데이트 오류:",o)),i("설정이 업데이트되어 재로드했습니다","info").catch(()=>{})),!0))}catch(e){console.error("설정 업데이트 리스너 등록 오류:",e)}r.initialized=!0,r.isContextValid=!0,r.reconnectAttempts=0,await i("X 헬퍼 콘텐츠 스크립트가 초기화되었습니다","success"),r.startConnectionCheck()}catch(e){console.error("초기화 오류:",e),r.isContextValid=!1,r.initialized=!1,r.reconnectAttempts<r.maxReconnectAttempts?(r.reconnectAttempts++,console.log(`초기화 재시도 중... (${r.reconnectAttempts}/${r.maxReconnectAttempts})`),setTimeout(()=>{v().catch(o=>{console.error("재초기화 실패:",o),r.reconnectAttempts>=r.maxReconnectAttempts&&r.enterOfflineMode()})},2e3)):r.enterOfflineMode()}}window.addEventListener("beforeunload",()=>{r.isContextValid=!1,r.cleanup(),console.log("페이지 언로드: X 헬퍼 콘텐츠 스크립트 정리")});v();
