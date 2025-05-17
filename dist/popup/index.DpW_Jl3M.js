import"../modulepreload-polyfill-B5Qt9EMX.js";import{c as z,j as e,r as o}from"../client-DXcH-vAE.js";const k=async()=>{try{return await chrome.runtime.sendMessage({action:"ping"}),!0}catch(t){return console.error("확장 프로그램 연결 오류:",t),!1}},C=async(t,x)=>{try{const c=await chrome.runtime.sendMessage({action:t,data:x});if(c&&c.error)throw new Error(c.error);return c}catch(c){throw console.error(`메시지 전송 오류 (${t}):`,c),c}},E=({connected:t})=>e.jsxs("div",{className:`connection-status ${t?"connected":"disconnected"}`,children:[e.jsx("span",{className:"status-indicator"}),e.jsx("span",{className:"status-text",children:t?"연결됨":"연결 끊김"})]}),R=({log:t})=>{const[x,c]=o.useState(!1),d=i=>{try{return new Date(i).toLocaleTimeString()}catch{return i}},p=i=>{switch(i){case"error":return{color:"#e53935",fontWeight:"bold"};case"warn":return{color:"#fb8c00"};case"success":return{color:"#43a047"};case"info":default:return{color:"#1976d2"}}},h=()=>{if(!t.details)return null;try{const i=JSON.parse(t.details);return e.jsx("pre",{className:"log-details",children:JSON.stringify(i,null,2)})}catch{return e.jsx("pre",{className:"log-details",children:t.details})}};return e.jsxs("div",{className:"log-item",children:[e.jsxs("div",{className:"log-header",onClick:()=>t.details&&c(!x),style:{cursor:t.details?"pointer":"default"},children:[e.jsx("span",{className:"log-time",children:d(t.timestamp)}),e.jsx("span",{className:"log-type",style:p(t.type),children:t.type.toUpperCase()}),e.jsx("span",{className:"log-message",children:t.message}),t.details&&e.jsx("span",{className:"log-toggle",children:x?"▼":"►"})]}),x&&h()]})},O=()=>{const[t,x]=o.useState([]),[c,d]=o.useState(!0),[p,h]=o.useState(!1),[i,n]=o.useState(null),[v,f]=o.useState(!0),s=o.useRef(null),l=async()=>{d(!0),n(null);try{const a=await k();if(f(a),!a){n("확장 프로그램과 연결이 끊어졌습니다. 페이지를 새로고침해 주세요."),d(!1);return}const u=await C("getLogs");u&&u.logs&&x(u.logs)}catch(a){console.error("로그 로드 오류:",a),n("로그를 로드하는 중 오류가 발생했습니다.")}d(!1)},m=async()=>{n(null);try{const a=await k();if(f(a),!a){n("확장 프로그램과 연결이 끊어졌습니다. 페이지를 새로고침해 주세요.");return}await C("clearLogs"),x([])}catch(a){console.error("로그 초기화 오류:",a),n("로그를 초기화하는 중 오류가 발생했습니다.")}},b=()=>{p?s.current&&(clearInterval(s.current),s.current=null):s.current=window.setInterval(l,3e3),h(!p)};return o.useEffect(()=>(l(),()=>{s.current&&clearInterval(s.current)}),[]),o.useEffect(()=>{const a=u=>{u.action==="logUpdated"&&l()};return chrome.runtime.onMessage.addListener(a),()=>{chrome.runtime.onMessage.removeListener(a)}},[]),o.useEffect(()=>{const u=setInterval(async()=>{const w=await k();f(w)},1e4);return()=>clearInterval(u)},[]),c&&t.length===0?e.jsx("div",{className:"logs-loading",children:"로그 로딩 중..."}):e.jsxs("div",{className:"debug-logs",children:[e.jsxs("div",{className:"logs-header",children:[e.jsxs("div",{className:"header-title",children:[e.jsx("h2",{children:"디버그 로그"}),e.jsx(E,{connected:v})]}),e.jsxs("div",{className:"logs-actions",children:[e.jsx("button",{onClick:l,className:"refresh-button",children:"새로고침"}),e.jsx("button",{onClick:b,className:`auto-refresh-button ${p?"active":""}`,children:p?"자동 새로고침 중지":"자동 새로고침"}),e.jsx("button",{onClick:m,className:"clear-button",children:"초기화"})]})]}),i&&e.jsxs("div",{className:"log-error-message",children:[e.jsx("span",{className:"error-icon",children:"⚠️"}),i]}),e.jsx("div",{className:"logs-container",children:t.length===0?e.jsx("div",{className:"no-logs",children:"로그가 없습니다."}):t.map((a,u)=>e.jsx(R,{log:a},u))})]})},_=()=>{const[t,x]=o.useState({isEnabled:!0,apiKey:"",model:"gpt-3.5-turbo",toneOptions:["친근한","전문적인","유머러스한","학술적인"],selectedTone:"친근한",useCustomPrompt:!1,customPrompt:""}),[c,d]=o.useState(!0),[p,h]=o.useState(""),[i,n]=o.useState(null),[v,f]=o.useState(!0),[s,l]=o.useState("settings"),[m,b]=o.useState(null),[a,u]=o.useState(!1),w=async()=>{const r=await k();return f(r),r},S=async()=>{u(!0),n(null);try{const r=await C("getLastContext");r&&r.context?b(r.context):r&&r.error?n(`컨텍스트 로드 오류: ${r.error}`):b(null)}catch(r){console.error("컨텍스트 로드 오류:",r),n("컨텍스트를 로드하는 중 오류가 발생했습니다.")}u(!1)},L=()=>{if(!m)return;const r=JSON.stringify(m,null,2);navigator.clipboard.writeText(r).then(()=>{h("컨텍스트가 클립보드에 복사되었습니다."),setTimeout(()=>h(""),2e3)}).catch(j=>{n("클립보드 복사 중 오류가 발생했습니다."),console.error("클립보드 복사 오류:",j)})};o.useEffect(()=>{(async()=>{d(!0),n(null);try{if(!await w()){n("확장 프로그램과 연결이 끊어졌습니다. 페이지를 새로고침해 주세요."),d(!1);return}const y=await C("getSettings");y&&y.settings&&x(y.settings)}catch(g){console.error("설정 로드 오류:",g),n("설정을 로드하는 중 오류가 발생했습니다.")}d(!1)})();const j=setInterval(w,1e4);return()=>clearInterval(j)},[]),o.useEffect(()=>{s==="context"&&S()},[s]);const I=async()=>{var r;d(!0),n(null),h("");try{if(!await w()){n("확장 프로그램과 연결이 끊어졌습니다. 페이지를 새로고침해 주세요."),d(!1);return}await C("saveSettings",t),h("설정이 저장되었습니다.");try{const g=await chrome.tabs.query({active:!0,currentWindow:!0});(r=g[0])!=null&&r.id&&await chrome.tabs.sendMessage(g[0].id,{action:"settingsUpdated"})}catch(g){console.warn("설정 변경 알림 실패:",g)}setTimeout(()=>{h("")},2e3)}catch(j){console.error("설정 저장 오류:",j),n("설정을 저장하는 중 오류가 발생했습니다.")}d(!1)},N=r=>{const{name:j,value:g,type:y}=r.target;x({...t,[j]:y==="checkbox"?r.target.checked:g})},P=r=>{r.preventDefault(),I()};return c&&s==="settings"?e.jsx("div",{className:"loading",children:"로딩 중..."}):e.jsxs("div",{className:"popup-container",children:[e.jsxs("header",{className:"popup-header",children:[e.jsxs("div",{className:"title-container",children:[e.jsx("h1",{children:"X 헬퍼"}),e.jsx(E,{connected:v})]}),e.jsxs("div",{className:"tabs",children:[e.jsx("button",{className:s==="settings"?"active":"",onClick:()=>l("settings"),children:"설정"}),e.jsx("button",{className:s==="logs"?"active":"",onClick:()=>l("logs"),children:"로그"}),e.jsx("button",{className:s==="context"?"active":"",onClick:()=>l("context"),children:"컨텍스트"})]})]}),i&&e.jsxs("div",{className:"error-message",children:[e.jsx("span",{className:"error-icon",children:"⚠️"}),i]}),s==="settings"?e.jsxs("form",{onSubmit:P,className:"settings-form",children:[e.jsx("div",{className:"form-group",children:e.jsxs("label",{htmlFor:"isEnabled",className:"toggle-label",children:[e.jsx("span",{children:"익스텐션 활성화"}),e.jsxs("div",{className:"toggle-switch",children:[e.jsx("input",{type:"checkbox",id:"isEnabled",name:"isEnabled",checked:t.isEnabled,onChange:N}),e.jsx("span",{className:"toggle-slider"})]})]})}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{htmlFor:"apiKey",children:"OpenAI API 키 (선택사항)"}),e.jsx("input",{type:"password",id:"apiKey",name:"apiKey",value:t.apiKey,onChange:N,placeholder:"sk-..."}),e.jsx("small",{children:"자신의 API 키를 사용하면 더 빠른 응답을 받을 수 있습니다."})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{htmlFor:"model",children:"AI 모델"}),e.jsxs("select",{id:"model",name:"model",value:t.model,onChange:N,children:[e.jsx("option",{value:"gpt-3.5-turbo",children:"GPT-3.5 Turbo (빠름)"}),e.jsx("option",{value:"gpt-4",children:"GPT-4 (더 정확함)"}),e.jsx("option",{value:"gpt-4-turbo",children:"GPT-4 Turbo (빠름 + 정확함)"})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{htmlFor:"selectedTone",children:"기본 톤"}),e.jsx("select",{id:"selectedTone",name:"selectedTone",value:t.selectedTone,onChange:N,children:t.toneOptions.map(r=>e.jsx("option",{value:r,children:r},r))}),e.jsx("small",{children:"선택한 톤에 맞게 생성된 응답의 스타일이 달라집니다."})]}),e.jsxs("div",{className:"settings-section",children:[e.jsx("h3",{children:"프롬프트 설정"}),e.jsxs("div",{className:"form-group",children:[e.jsxs("label",{htmlFor:"useCustomPrompt",className:"toggle-label",children:[e.jsx("span",{children:"사용자 지정 프롬프트 사용"}),e.jsxs("div",{className:"toggle-switch",children:[e.jsx("input",{type:"checkbox",id:"useCustomPrompt",name:"useCustomPrompt",checked:t.useCustomPrompt,onChange:N}),e.jsx("span",{className:"toggle-slider"})]})]}),e.jsx("small",{children:"자신만의 프롬프트를 사용하고 싶을 때 활성화하세요."})]}),t.useCustomPrompt&&e.jsxs("div",{className:"form-group",children:[e.jsx("label",{htmlFor:"customPrompt",children:"사용자 지정 프롬프트"}),e.jsx("textarea",{id:"customPrompt",name:"customPrompt",value:t.customPrompt,onChange:N,placeholder:"{{THREAD_CONTEXT}}와 {{USER_INPUT}} 태그를 사용하여 프롬프트를 작성하세요.",rows:6}),e.jsxs("small",{children:[e.jsx("code",{children:"{{THREAD_CONTEXT}}"}),": 트윗 스레드의 컨텍스트",e.jsx("br",{}),e.jsx("code",{children:"{{USER_INPUT}}"}),": 사용자가 입력한 텍스트"]})]}),e.jsxs("div",{className:"prompt-info",children:[e.jsx("h4",{children:"기본 프롬프트"}),e.jsx("p",{children:"각 톤별로 미리 정의된 프롬프트가 있으며, 다음과 같은 특징을 가집니다:"}),e.jsxs("ul",{children:[e.jsxs("li",{children:[e.jsx("strong",{children:"친근한"}),": 일상적인 언어, 이모지 사용, 공감적 표현"]}),e.jsxs("li",{children:[e.jsx("strong",{children:"전문적인"}),": 객관적 정보, 논리적 구조, 정중한 표현"]}),e.jsxs("li",{children:[e.jsx("strong",{children:"유머러스한"}),": 재치있는 표현, 창의적 비유, 가벼운 농담"]}),e.jsxs("li",{children:[e.jsx("strong",{children:"학술적인"}),": 깊이 있는 분석, 논리적 근거, 전문 용어"]})]})]})]}),e.jsx("button",{type:"submit",className:"save-button",disabled:!v,children:"설정 저장"}),p&&e.jsx("div",{className:"status-message",children:p})]}):s==="logs"?e.jsx(O,{}):e.jsx(A,{context:m,isLoading:a,onRefresh:S,onCopy:L,statusMessage:p}),e.jsx("footer",{className:"popup-footer",children:e.jsxs("p",{children:["X 헬퍼 v",chrome.runtime.getManifest().version]})})]})},A=({context:t,isLoading:x,onRefresh:c,onCopy:d,statusMessage:p})=>{var n,v,f;const h=()=>{if(!t||!t.thread_context)return null;const s=t.thread_context,l=s.mainTweet,m=s.replyTarget;return e.jsxs("div",{className:"thread-structure",children:[e.jsx("h3",{children:"트윗 스레드 구조"}),e.jsx("div",{className:"thread-summary",children:s.threadStructure}),l&&e.jsxs("div",{className:"tweet-card main-tweet",children:[e.jsxs("div",{className:"tweet-header",children:[e.jsx("strong",{children:"메인 트윗"})," - ",l.author.username,e.jsx("span",{className:"tweet-time",children:i(l.timestamp)})]}),e.jsx("div",{className:"tweet-content",children:l.text})]}),s.intermediateReplies&&s.intermediateReplies.length>0&&e.jsxs(e.Fragment,{children:[e.jsxs("h4",{children:["중간 답글 (",s.intermediateReplies.length,"개)"]}),s.intermediateReplies.map((b,a)=>e.jsxs("div",{className:"tweet-card intermediate-reply",children:[e.jsxs("div",{className:"tweet-header",children:[b.author.username,e.jsx("span",{className:"tweet-time",children:i(b.timestamp)})]}),e.jsx("div",{className:"tweet-content",children:b.text})]},a))]}),m&&e.jsxs("div",{className:"tweet-card reply-target",children:[e.jsxs("div",{className:"tweet-header",children:[e.jsx("strong",{children:"답장 대상 트윗"})," - ",m.author.username,e.jsx("span",{className:"tweet-time",children:i(m.timestamp)})]}),e.jsx("div",{className:"tweet-content",children:m.text})]})]})},i=s=>{if(!s)return"";try{return new Date(s).toLocaleString()}catch{return s}};return x?e.jsx("div",{className:"context-loading",children:"컨텍스트 로딩 중..."}):e.jsxs("div",{className:"context-viewer",children:[e.jsxs("div",{className:"context-header",children:[e.jsx("h2",{children:"트윗 컨텍스트"}),e.jsxs("div",{className:"context-actions",children:[e.jsx("button",{onClick:c,className:"refresh-button",children:"새로고침"}),e.jsx("button",{onClick:d,className:"copy-button",disabled:!t,children:"복사"})]})]}),p&&e.jsx("div",{className:"context-status-message",children:p}),t?e.jsxs("div",{className:"context-content",children:[e.jsxs("div",{className:"context-stats",children:[e.jsxs("div",{className:"stat-item",children:[e.jsx("strong",{children:"수집 시간:"})," ",i(t.timestamp)]}),e.jsxs("div",{className:"stat-item",children:[e.jsx("strong",{children:"트윗 개수:"})," ",((v=(n=t.thread_context)==null?void 0:n.collection_stats)==null?void 0:v.found_tweets)||0]}),e.jsxs("div",{className:"stat-item",children:[e.jsx("strong",{children:"사용자 입력:"})," ",t.user_input?t.user_input:"(없음)"]}),e.jsxs("div",{className:"stat-item",children:[e.jsx("strong",{children:"톤:"})," ",((f=t.settings)==null?void 0:f.tone)||"기본"]})]}),h(),e.jsxs("div",{className:"raw-context",children:[e.jsx("h3",{children:"원본 컨텍스트 데이터"}),e.jsxs("details",{children:[e.jsx("summary",{children:"JSON 데이터 보기"}),e.jsx("pre",{className:"context-json",children:JSON.stringify(t,null,2)})]})]})]}):e.jsxs("div",{className:"no-context",children:[e.jsx("p",{children:"수집된 컨텍스트가 없습니다."}),e.jsx("p",{className:"small-text",children:"X.com에서 로봇 버튼을 클릭하면 컨텍스트가 수집됩니다."})]})]})},D=()=>{const t=document.createElement("style");t.textContent=`
    .debug-logs {
      padding: 10px;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    .logs-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    
    .logs-header h2 {
      margin: 0;
      font-size: 16px;
    }
    
    .logs-actions {
      display: flex;
      gap: 5px;
    }
    
    .logs-actions button {
      padding: 5px 10px;
      background: #f0f0f0;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    
    .refresh-button:hover {
      background: #e0e0e0;
    }
    
    .clear-button {
      background: #ffebee;
      color: #c62828;
    }
    
    .clear-button:hover {
      background: #ffcdd2;
    }
    
    .logs-container {
      flex: 1;
      overflow-y: auto;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      background: #f9f9f9;
      max-height: 300px;
    }
    
    .log-item {
      padding: 6px 8px;
      border-bottom: 1px solid #eee;
      font-size: 12px;
    }
    
    .log-item:last-child {
      border-bottom: none;
    }
    
    .log-header {
      display: flex;
      gap: 6px;
      align-items: flex-start;
    }
    
    .log-time {
      color: #757575;
      min-width: 70px;
    }
    
    .log-type {
      font-weight: bold;
      min-width: 60px;
    }
    
    .log-message {
      flex: 1;
      word-break: break-word;
    }
    
    .log-toggle {
      color: #757575;
      cursor: pointer;
    }
    
    .log-details {
      margin: 5px 0 0 76px;
      padding: 8px;
      background: #f0f0f0;
      border-radius: 4px;
      font-size: 11px;
      overflow-x: auto;
      max-height: 150px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    
    .no-logs {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100px;
      color: #757575;
      font-style: italic;
    }
    
    .logs-loading {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100px;
    }
    
    .tabs {
      display: flex;
      margin-top: 5px;
    }
    
    .tabs button {
      padding: 6px 12px;
      border: none;
      background: none;
      cursor: pointer;
      border-bottom: 2px solid transparent;
    }
    
    .tabs button.active {
      border-bottom: 2px solid #1d9bf0;
      font-weight: bold;
    }
    
    .auto-refresh-button {
      background: #e3f2fd;
      color: #1565c0;
    }
    
    .auto-refresh-button.active {
      background: #bbdefb;
      font-weight: bold;
    }
    
    .connection-status {
      display: flex;
      align-items: center;
      font-size: 12px;
      margin-left: 10px;
    }
    
    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 5px;
    }
    
    .connected .status-indicator {
      background-color: #4caf50;
    }
    
    .disconnected .status-indicator {
      background-color: #f44336;
    }
    
    .title-container {
      display: flex;
      align-items: center;
    }
    
    .error-message,
    .log-error-message {
      background-color: #ffebee;
      color: #c62828;
      padding: 8px 12px;
      margin-bottom: 10px;
      border-radius: 4px;
      font-size: 13px;
      display: flex;
      align-items: center;
    }
    
    .error-icon {
      margin-right: 8px;
    }
    
    /* 컨텍스트 뷰어 스타일 */
    .context-viewer {
      padding: 10px;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    .context-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    
    .context-header h2 {
      margin: 0;
      font-size: 16px;
    }
    
    .context-actions {
      display: flex;
      gap: 5px;
    }
    
    .context-actions button {
      padding: 5px 10px;
      background: #f0f0f0;
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    
    .copy-button {
      background: #e3f2fd;
      color: #1565c0;
    }
    
    .copy-button:hover {
      background: #bbdefb;
    }
    
    .copy-button:disabled {
      background: #f0f0f0;
      color: #9e9e9e;
      cursor: not-allowed;
    }
    
    .context-loading {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100px;
    }
    
    .no-context {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100px;
      color: #757575;
      text-align: center;
    }
    
    .small-text {
      font-size: 12px;
      margin-top: 5px;
    }
    
    .context-content {
      flex: 1;
      overflow-y: auto;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      background: #f9f9f9;
      padding: 10px;
      max-height: 350px;
    }
    
    .context-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 15px;
      background: #f0f0f0;
      padding: 10px;
      border-radius: 4px;
    }
    
    .stat-item {
      font-size: 12px;
      flex: 1 1 calc(50% - 8px);
    }
    
    .thread-structure {
      margin: 15px 0;
    }
    
    .thread-structure h3, .thread-structure h4 {
      margin: 10px 0 5px;
      font-size: 14px;
    }
    
    .thread-summary {
      font-family: monospace;
      white-space: pre-wrap;
      background: #f5f5f5;
      padding: 8px;
      border-radius: 4px;
      font-size: 12px;
      margin-bottom: 10px;
    }
    
    .tweet-card {
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      padding: 8px;
      margin-bottom: 8px;
      background: white;
    }
    
    .main-tweet {
      border-left: 3px solid #1d9bf0;
    }
    
    .reply-target {
      border-left: 3px solid #4caf50;
    }
    
    .intermediate-reply {
      border-left: 3px solid #ff9800;
      margin-left: 15px;
    }
    
    .tweet-header {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 5px;
      color: #616161;
    }
    
    .tweet-time {
      font-size: 11px;
      color: #9e9e9e;
    }
    
    .tweet-content {
      font-size: 13px;
    }
    
    .raw-context {
      margin-top: 15px;
    }
    
    .raw-context h3 {
      margin: 5px 0;
      font-size: 14px;
    }
    
    .raw-context summary {
      cursor: pointer;
      padding: 5px;
      background: #f0f0f0;
      border-radius: 4px;
    }
    
    .context-json {
      background: #f5f5f5;
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
      max-height: 150px;
      font-size: 11px;
      white-space: pre-wrap;
      word-break: break-word;
      margin-top: 5px;
    }
    
    .context-status-message {
      background-color: #e8f5e9;
      color: #2e7d32;
      padding: 8px 12px;
      margin-bottom: 10px;
      border-radius: 4px;
      font-size: 13px;
      text-align: center;
    }
  `,document.head.appendChild(t)};D();const T=document.getElementById("app");T&&z(T).render(e.jsx(_,{}));
