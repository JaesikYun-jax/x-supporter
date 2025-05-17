/**
 * 콘텐츠 스크립트 
 * X.com 페이지에 삽입되어 트윗 작성 영역을 감지하고 조작합니다.
 */

// X 헬퍼 버튼 삽입 상태를 추적하는 맵
const insertedButtons = new Map<string, boolean>();

// 확장 프로그램 상태
const extensionState = {
  isContextValid: true,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
  initialized: false,
  lastReconnectTime: 0,
  connectionCheckInterval: null as number | null,
  offlineMode: false,
  observerCleanup: null as Function | null,
  
  // 컨텍스트 유효성 재설정 및 재연결 시도
  async checkAndReconnect() {
    // 이미 재연결 시도 중인 경우 무시
    if (Date.now() - this.lastReconnectTime < 3000) {
      return;
    }
    
    this.lastReconnectTime = Date.now();
    
    // 오프라인 모드에서는 확인하지 않음
    if (this.offlineMode) {
      return;
    }
    
    let connected = false;
    
    try {
      // 핑 테스트로 연결 확인 - 타임아웃 추가
      const pingPromise = chrome.runtime.sendMessage({ action: 'ping' });
      const response = await Promise.race([
        pingPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Ping timeout')), 1000)
        )
      ]);
      
      connected = true;
      
      // 연결이 정상인 경우
      if (!this.isContextValid) {
        console.log('확장 프로그램 연결이 복구되었습니다.');
        this.isContextValid = true;
        this.reconnectAttempts = 0;
        
        if (!this.initialized) {
          // observer 다시 설정
          if (this.observerCleanup) {
            this.observerCleanup();
            this.observerCleanup = null;
          }
          
          await initialize();
        }
      }
    } catch (error) {
      console.error('연결 확인 오류:', error);
      
      if (this.isContextValid) {
        console.warn('확장 프로그램 컨텍스트가 무효화되었습니다.');
        this.isContextValid = false;
      }
      
      // 재연결 시도
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`재연결 시도 중... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        // 2초 후 재초기화 시도
        setTimeout(() => {
          this.isContextValid = true;
          initialize().catch(e => {
            console.error('재초기화 실패:', e);
            this.isContextValid = false;
            
            // 최대 재시도 횟수 초과시 오프라인 모드 진입
            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
              this.enterOfflineMode();
            }
          });
        }, 2000);
      } else {
        // 재연결 실패 시 오프라인 모드로 전환
        this.enterOfflineMode();
      }
    }
    
    return connected;
  },
  
  // 오프라인 모드 진입
  enterOfflineMode() {
    if (this.offlineMode) return;
    
    console.warn('오프라인 모드로 전환: 백그라운드 스크립트와 연결 끊김');
    this.offlineMode = true;
    this.isContextValid = false;
    
    // 사용자에게 알림 (10초 후 표시하여 페이지 로딩에 방해되지 않도록)
    setTimeout(() => {
      try {
        const container = document.createElement('div');
        container.style.cssText = `
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
        `;
        container.innerHTML = `
          <div style="display: flex; align-items: center;">
            <span style="margin-right: 10px;">⚠️</span>
            <div>
              <div style="font-weight: bold; margin-bottom: 5px;">X 헬퍼 알림</div>
              <div>확장 프로그램과의 연결이 끊겼습니다. 페이지를 새로고침하거나 확장 프로그램을 다시 로드해주세요.</div>
            </div>
          </div>
        `;
        document.body.appendChild(container);
        
        // 7초 후 알림 제거
        setTimeout(() => {
          container.style.opacity = '0';
          container.style.transition = 'opacity 1s';
          setTimeout(() => container.remove(), 1000);
        }, 7000);
      } catch (e) {
        console.error('알림 표시 오류:', e);
      }
    }, 10000);
  },
  
  // 주기적 연결 확인 시작
  startConnectionCheck() {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }
    
    // 10초마다 연결 상태 확인 (더 짧은 간격으로 변경)
    this.connectionCheckInterval = setInterval(() => {
      this.checkAndReconnect().catch(() => {});
    }, 10000) as unknown as number;
  },
  
  // 정리 작업
  cleanup() {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
    
    if (this.observerCleanup) {
      this.observerCleanup();
      this.observerCleanup = null;
    }
  }
};

// 설정 객체
let settings = {
  isEnabled: true,
  apiKey: '',
  model: 'gpt-3.5-turbo',
  toneOptions: ['친근한', '전문적인', '유머러스한'],
  selectedTone: '친근한',
};

// 로그 함수 - 백그라운드 스크립트로 로그 전송
async function addLog(message: string, type: 'info' | 'warn' | 'error' | 'success' = 'info', details?: any) {
  // 콘솔에는 항상 로그 출력
  console.log(`[${type.toUpperCase()}] ${message}`, details || '');
  
  // 컨텍스트가 무효화되었거나 오프라인 모드면 백그라운드에 전송하지 않음
  if (!extensionState.isContextValid || extensionState.offlineMode) {
    return;
  }

  try {
    // 로그 전송 시도 - 타임아웃 추가
    const sendPromise = chrome.runtime.sendMessage({
      action: 'addLog',
      data: { message, type, details }
    });
    
    await Promise.race([
      sendPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Log send timeout')), 1000)
      )
    ]);
  } catch (error) {
    console.error('로그 전송 오류:', error);
    
    // Extension context invalidated 오류 처리
    if (error instanceof Error && 
        (error.message.includes('Extension context invalidated') || 
         error.message.includes('Receiving end does not exist'))) {
      
      extensionState.isContextValid = false;
      
      // 재연결 시도
      setTimeout(() => extensionState.checkAndReconnect(), 500);
    }
  }
}

// 메시지 전송 함수 - 오류 처리 개선
async function sendMessageToBackground(action: string, data?: any): Promise<any> {
  // 오프라인 모드 체크
  if (extensionState.offlineMode) {
    throw new Error('오프라인 모드: 백그라운드 스크립트와 통신할 수 없습니다.');
  }
  
  if (!extensionState.isContextValid) {
    // 연결이 끊어진 상태에서 메시지 전송 시도 시 재연결 시도
    const connected = await extensionState.checkAndReconnect();
    
    if (!connected || !extensionState.isContextValid) {
      throw new Error('확장 프로그램 컨텍스트가 무효화되었습니다. 페이지를 새로고침해 주세요.');
    }
  }
  
  try {
    // 백그라운드 스크립트가 준비되었는지 확인 - 타임아웃 추가
    const sendPromise = chrome.runtime.sendMessage({ action, data });
    
    const response = await Promise.race([
      sendPromise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Message send timeout')), 5000)
      )
    ]);
    
    return response;
  } catch (error) {
    console.error(`메시지 전송 오류 (${action}):`, error);
    
    // Extension context invalidated 오류 처리
    if (error instanceof Error && 
        (error.message.includes('Extension context invalidated') || 
         error.message.includes('Receiving end does not exist'))) {
      
      extensionState.isContextValid = false;
      
      // 즉시 재연결 시도
      setTimeout(() => extensionState.checkAndReconnect(), 100);
      
      throw new Error('확장 프로그램 컨텍스트가 무효화되었습니다. 페이지를 새로고침해 주세요.');
    }
    
    throw error;
  }
}

// 설정 로드
async function loadSettings() {
  try {
    const response = await sendMessageToBackground('getSettings');
    if (response && response.settings) {
      settings = response.settings;
      await addLog('설정을 로드했습니다.', 'info');
    }
  } catch (error) {
    console.error('설정 로드 오류:', error);
    await addLog('설정 로드 중 오류가 발생했습니다.', 'error', error);
  }
}

// DOM 변경 감지 및 헬퍼 버튼 삽입
function observeTwitterDOM() {
  let observer: MutationObserver | null = null;
  
  try {
    // 변경 감지를 위한 MutationObserver 설정
    observer = new MutationObserver((mutations) => {
      // 확장 프로그램 컨텍스트 유효성 확인
      if (!extensionState.isContextValid) {
        // 컨텍스트가 무효화되었으면 Observer 정지
        if (observer) {
          observer.disconnect();
          console.warn('컨텍스트 무효화로 MutationObserver 중지됨');
        }
        // 재연결 시도
        setTimeout(() => extensionState.checkAndReconnect(), 500);
        return;
      }
      
      try {
        // 변경된 노드 처리
        for (const mutation of mutations) {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            // 트윗 작성 영역 감지 - 오류 처리로 래핑
            try {
              detectTweetComposers();
            } catch (innerError) {
              console.error('트윗 작성 영역 감지 오류:', innerError);
            }
          }
        }
      } catch (e) {
        console.error('MutationObserver 콜백 오류:', e);
      }
    });

    // 전체 문서 감시 시작 - try-catch로 래핑
    try {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
      
      // 상태 확인용 내부 함수
      function checkObserverStatus() {
        if (!extensionState.isContextValid && observer) {
          observer.disconnect();
          console.warn('컨텍스트 무효화로 observer 연결 해제');
        } else if (extensionState.isContextValid && observer) {
          // 10초마다 상태 확인
          setTimeout(checkObserverStatus, 10000);
        }
      }
      
      // 초기 상태 확인 시작
      setTimeout(checkObserverStatus, 10000);
      
    } catch (observeError) {
      console.error('DOM 감시 시작 오류:', observeError);
    }

    // 페이지 로드 시 이미 존재하는 트윗 작성 영역 감지
    setTimeout(() => {
      try {
        detectTweetComposers();
      } catch (e) {
        console.error('초기 트윗 작성 영역 감지 오류:', e);
      }
    }, 1000);
    
    addLog('X.com 페이지 감시를 시작했습니다.', 'info').catch(() => {
      console.info('X.com 페이지 감시를 시작했습니다.');
    });
  } catch (error) {
    console.error('MutationObserver 설정 오류:', error);
  }
  
  // 확장 프로그램 컨텍스트 무효화 감지 리스너
  try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // 백그라운드에서 ping 메시지를 받으면 pong으로 응답
      if (message && message.action === 'ping') {
        try {
          sendResponse({ pong: true, timestamp: Date.now() });
        } catch (e) {
          console.error('Ping 응답 오류:', e);
        }
        return true; // 비동기 응답을 위해 true 반환
      }
      
      return false; // 다른 메시지는 처리하지 않음
    });
  } catch (listenerError) {
    console.error('메시지 리스너 등록 오류:', listenerError);
    extensionState.isContextValid = false;
  }
  
  // 모든 작업 완료 후 컨텍스트 무효화 여부 한 번 더 확인
  extensionState.checkAndReconnect().catch(() => {});
  
  // 정리 함수 반환 - 초기화 정리 시 호출
  return function cleanup() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  };
}

// 트윗 작성 영역 감지
function detectTweetComposers() {
  if (!settings.isEnabled) return;

  // 트윗 작성 영역 선택자 - X.com의 DOM 구조 변경에 따라 업데이트 필요할 수 있음
  const composers = document.querySelectorAll('div[role="textbox"][aria-multiline="true"][data-testid="tweetTextarea_0"]');
  
  if (composers.length > 0) {
    addLog(`${composers.length}개의 트윗 작성 영역을 감지했습니다.`, 'info');
  }
  
  composers.forEach((composer) => {
    const composerId = `composer-${Date.now()}`;
    
    // 이미 처리된 작성 영역인지 확인
    if (composer.hasAttribute('data-x-helper-id')) {
      return;
    }
    
    // 작성 영역에 식별자 추가
    composer.setAttribute('data-x-helper-id', composerId);
    
    // 헬퍼 버튼 삽입
    insertHelperButton(composer as HTMLElement, composerId);
  });
}

// X 헬퍼 버튼 삽입
function insertHelperButton(composer: HTMLElement, composerId: string) {
  if (insertedButtons.get(composerId)) return;
  
  // 텍스트 영역 자체를 대상으로 합니다
  const textArea = composer;
  
  if (!textArea) {
    console.error('트윗 작성 영역을 찾을 수 없습니다');
    addLog('트윗 작성 영역을 찾을 수 없습니다', 'error');
    return;
  }
  
  // 버튼 컨테이너를 텍스트 영역 바깥에 생성
  const helperButtonContainer = document.createElement('div');
  helperButtonContainer.className = 'x-helper-button-container';
  helperButtonContainer.style.cssText = `
    position: absolute;
    z-index: 10000;
    width: 28px;
    height: 28px;
    pointer-events: none; /* 컨테이너 자체는 이벤트를 받지 않음 */
  `;
  
  // 헬퍼 버튼 생성
  const helperButton = document.createElement('button');
  helperButton.innerHTML = '🤖'; // 로봇 이모지
  helperButton.className = 'x-helper-button';
  helperButton.style.cssText = `
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
  `;
  
  // 버튼 클릭 이벤트 - 중복 실행 방지를 위한 플래그 추가
  let isGeneratingResponse = false;
  helperButton.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 단계 1: 클릭 이벤트 실행 및 중복 방지
    await addLog('버튼 클릭 감지: 이벤트 처리 시작', 'info');
    
    // 중복 실행 방지
    if (isGeneratingResponse) {
      await addLog('이미 응답 생성 중입니다. 요청 무시됨', 'warn');
      return;
    }
    
    isGeneratingResponse = true;
    await addLog('중복 요청 방지 플래그 설정', 'info');
    
    try {
      // 단계 2: 응답 생성 함수 호출
      await addLog('AI 응답 생성 함수 호출 시작', 'info');
      await generateResponses(composer, composerId);
      await addLog('AI 응답 생성 함수 호출 완료', 'success');
    } catch (error) {
      await addLog('AI 응답 생성 중 오류 발생', 'error', error);
    } finally {
      // 단계 7: 플래그 초기화
      isGeneratingResponse = false;
      await addLog('중복 요청 방지 플래그 초기화', 'info');
    }
  });
  
  // 버튼 컨테이너에 버튼 추가
  helperButtonContainer.appendChild(helperButton);
  
  // 텍스트 영역의 부모에 버튼 컨테이너 추가
  const textAreaParent = textArea.parentElement;
  if (textAreaParent) {
    // 텍스트 영역의 부모는 position: relative 설정이 필요함
    if (window.getComputedStyle(textAreaParent).position === 'static') {
      textAreaParent.style.position = 'relative';
    }
    textAreaParent.appendChild(helperButtonContainer);
  } else {
    // 부모가 없는 경우 body에 추가하고 절대 위치 사용
    document.body.appendChild(helperButtonContainer);
  }
  
  // 무한 루프 방지를 위한 플래그
  let isUpdatingPosition = false;
  
  // 커서 위치 업데이트 함수
  const updateButtonPosition = () => {
    if (isUpdatingPosition) return;
    
    isUpdatingPosition = true;
    
    try {
      // 커서 위치를 찾기 위해 selection 객체 사용
      const selection = window.getSelection();
      
      // 텍스트 영역의 좌표 계산
      const textAreaRect = textArea.getBoundingClientRect();
      let left, top;
      
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // 선택 영역이 텍스트 영역 내부인지 확인
        if (textArea.contains(range.startContainer)) {
          // 커서 위치의 좌표 계산
          const clonedRange = range.cloneRange();
          clonedRange.collapse(true);
          const rect = clonedRange.getBoundingClientRect();
          
          if (textAreaParent) {
            const parentRect = textAreaParent.getBoundingClientRect();
            // 커서 위치에 버튼을 배치 (부모 요소 기준 상대 위치)
            left = rect.left - parentRect.left + 5; // 약간의 오프셋 추가
            top = rect.top - parentRect.top - helperButtonContainer.offsetHeight / 2;
          } else {
            // body 기준 절대 위치
            left = rect.left + 5;
            top = rect.top - helperButtonContainer.offsetHeight / 2;
          }
        } else {
          // 텍스트 영역 내에 커서가 없는 경우 기본 위치 설정
          setDefaultButtonPosition();
          isUpdatingPosition = false;
          return;
        }
      } else {
        // selection이 없는 경우 기본 위치 설정
        setDefaultButtonPosition();
        isUpdatingPosition = false;
        return;
      }
      
      // 버튼 위치 업데이트
      helperButtonContainer.style.left = `${Math.max(0, left)}px`;
      helperButtonContainer.style.top = `${Math.max(0, top)}px`;
      
      // 버튼 표시
      helperButtonContainer.style.display = 'block';
    } catch (e) {
      console.error('버튼 위치 조정 중 오류:', e);
      addLog('버튼 위치 조정 중 오류', 'error', e);
      
      // 오류 발생 시 기본 위치 설정
      setDefaultButtonPosition();
    } finally {
      isUpdatingPosition = false;
    }
  };
  
  // 기본 버튼 위치 설정 함수 (커서가 없거나 오류 발생 시 사용)
  const setDefaultButtonPosition = () => {
    if (textAreaParent) {
      const parentRect = textAreaParent.getBoundingClientRect();
      const textAreaRect = textArea.getBoundingClientRect();
      
      // 텍스트 영역의 좌상단에서 약간 떨어진 위치에 배치
      const left = 10; // 왼쪽 여백
      const top = 10;  // 상단 여백
      
      helperButtonContainer.style.left = `${left}px`;
      helperButtonContainer.style.top = `${top}px`;
      helperButtonContainer.style.display = 'block';
    }
  };
  
  // 디바운스 함수 구현
  let debounceTimer: number | null = null;
  const debounce = (callback: Function, delay: number) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      callback();
      debounceTimer = null;
    }, delay) as unknown as number;
  };
  
  // 글자 입력 시 버튼 위치 조정을 위한 이벤트 리스너
  // MutationObserver 대신 키 이벤트와 마우스 이벤트를 사용
  textArea.addEventListener('keyup', () => {
    debounce(updateButtonPosition, 100);
  });
  
  textArea.addEventListener('mouseup', () => {
    debounce(updateButtonPosition, 100);
  });
  
  textArea.addEventListener('input', () => {
    debounce(updateButtonPosition, 100);
  });
  
  // 처음에는 버튼 숨기기
  helperButtonContainer.style.display = 'none';
  
  // 삽입 상태 추적 업데이트
  insertedButtons.set(composerId, true);
  
  // 포커스 이벤트 리스너 추가 - 포커스 시 버튼 표시
  textArea.addEventListener('focus', () => {
    // 잠시 후 위치 업데이트 및 표시 (포커스 후 커서 위치 설정 대기)
    setTimeout(() => {
      updateButtonPosition();
      helperButtonContainer.style.display = 'block';
    }, 100);
  });
  
  // 포커스 아웃 시 버튼 숨기기
  textArea.addEventListener('blur', (e) => {
    // 버튼 클릭 중인 경우는 숨기지 않음 (관련 타겟 확인)
    if (e.relatedTarget === helperButton) {
      return;
    }
    
    // 약간의 지연 후 버튼 숨기기 (다른 이벤트 처리 시간 확보)
    setTimeout(() => {
      // 다시 한번 버튼이 활성화되었는지 확인
      if (document.activeElement !== helperButton) {
        helperButtonContainer.style.display = 'none';
      }
    }, 200);
  });
  
  // 초기 위치 설정 시도
  setDefaultButtonPosition();
  
  addLog(`X 헬퍼 버튼이 추가되었습니다: ${composerId}`, 'success');
  console.log('X 헬퍼 버튼이 추가되었습니다:', composerId);
}

// 트윗 타입 정의
interface TweetData {
  id: string;           // 트윗 ID
  text: string;         // 트윗 텍스트
  author: {
    name: string;       // 작성자 표시 이름
    username: string;   // 작성자 ID (@username)
  };
  timestamp: string;    // 타임스탬프
  isMainTweet: boolean; // 메인 트윗 여부
  isTargetTweet: boolean; // 답장 대상 트윗 여부
  html_content?: string; // HTML 콘텐츠 (이모지, 링크 등을 포함)
  element_type?: string; // 요소 타입 (tweet, quote 등)
  position_index?: number; // 트윗의 위치 인덱스
}

// 컨텍스트 타입 정의
interface ThreadContext {
  mainTweet?: TweetData;        // 스레드 시작 트윗
  replyTarget?: TweetData;      // 답장 대상 트윗
  intermediateReplies: TweetData[]; // 중간 답글들
  threadStructure: string;      // 스레드 구조 요약
  collected_at?: string;        // 수집 시간
  collection_stats?: {          // 수집 통계
    found_tweets: number;       // 발견된 트윗 수
    has_main_tweet?: boolean;   // 메인 트윗 존재 여부
    has_reply_target?: boolean; // 응답 대상 트윗 존재 여부
    intermediate_replies_count?: number; // 중간 답글 수
    success: boolean;           // 수집 성공 여부
    error?: string;             // 오류 메시지
  };
  debug_info?: {                // 디버그 정보
    url: string;                // 현재 URL
    collected_at: string;       // 수집 시간
    browser_info: string;       // 브라우저 정보
  };
}

// AI 응답 생성 요청
async function generateResponses(composer: HTMLElement, composerId: string) {
  if (!extensionState.isContextValid) {
    console.warn('확장 프로그램 컨텍스트가 무효화되어 응답을 생성할 수 없습니다.');
    // 사용자에게 알림
    alert('X 헬퍼 확장 프로그램 컨텍스트가 무효화되었습니다. 페이지를 새로고침해 주세요.');
    return;
  }

  // 단계 3: 트윗 내용 가져오기
  const tweetText = composer.textContent || '';
  await addLog('트윗 내용 가져오기', 'info', { tweetText });
  
  // 단계 4: 이전 트윗(답글인 경우) 가져오기
  const threadContext = getTweetThreadContext();
  await addLog('트윗 스레드 컨텍스트 가져오기', 'info', {
    tweet_count: threadContext.collection_stats?.found_tweets || 0,
    has_main_tweet: threadContext.mainTweet ? true : false,
    has_reply_target: threadContext.replyTarget ? true : false
  });
  
  try {
    // 단계 4-1: 수집된 컨텍스트를 클립보드에 복사 (개발/디버깅용)
    try {
      const fullContext = {
        user_input: tweetText,
        thread_context: threadContext,
        settings: {
          tone: settings.selectedTone,
          model: settings.model
        },
        timestamp: new Date().toISOString()
      };
      
      const contextJSON = JSON.stringify(fullContext, null, 2);
      
      // execCommand 사용하여 클립보드에 복사 (더 호환성이 좋음)
      const textarea = document.createElement('textarea');
      textarea.value = contextJSON;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      
      await addLog('컨텍스트가 클립보드에 복사되었습니다', 'success', {
        context_size: contextJSON.length,
        tweet_count: threadContext.collection_stats?.found_tweets || 0
      });
      
      // 사용자에게 안내 (작은 토스트 메시지)
      const toast = document.createElement('div');
      toast.style.cssText = `
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
      `;
      toast.textContent = '트윗 컨텍스트가 클립보드에 복사되었습니다';
      document.body.appendChild(toast);
      
      // 3초 후 토스트 제거
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s';
        setTimeout(() => toast.remove(), 500);
      }, 3000);
    } catch (copyError) {
      await addLog('컨텍스트 클립보드 복사 실패', 'error', copyError);
    }
    
    // 단계 5: 응답 생성 요청
    await addLog('백그라운드 스크립트에 응답 생성 요청 전송', 'info', { 
      tweetText, 
      threadContext,
      tone: settings.selectedTone
    });
    
    const response = await sendMessageToBackground('generateResponse', {
      tweetText,
      threadContext,
      tone: settings.selectedTone,
    });
    
    // 단계 6: 응답 표시
    if (response && response.responses) {
      await addLog('응답을 받아 표시 준비', 'success', { responseCount: response.responses.length });
      displayResponseOptions(composer, response.responses);
    } else {
      await addLog('응답을 받지 못했거나 오류 발생', 'error', response);
      alert('응답 생성 중 오류가 발생했습니다. 로그를 확인해 주세요.');
    }
  } catch (error) {
    await addLog('응답 생성 중 오류 발생', 'error', error);
    
    // 사용자에게 친절한 오류 메시지 표시
    if (error instanceof Error && error.message.includes('확장 프로그램 컨텍스트가 무효화되었습니다')) {
      alert('X 헬퍼 확장 프로그램 연결이 끊어졌습니다. 페이지를 새로고침해 주세요.');
    } else {
      alert('응답 생성 중 오류가 발생했습니다. 다시 시도해 주세요.');
    }
  }
}

// 트윗 스레드 컨텍스트 가져오기
function getTweetThreadContext(): ThreadContext {
  const context: ThreadContext = {
    intermediateReplies: [],
    threadStructure: '',
    collected_at: new Date().toISOString()
  };

  try {
    // X.com의 DOM 구조 변경에 따라 업데이트 필요할 수 있음
    const tweets = document.querySelectorAll('article[data-testid="tweet"]');
    
    if (tweets.length === 0) {
      addLog('컨텍스트 수집: 트윗을 찾을 수 없음', 'warn');
      return {
        intermediateReplies: [],
        threadStructure: '트윗을 찾을 수 없음',
        collected_at: new Date().toISOString(),
        collection_stats: {
          found_tweets: 0,
          success: false,
          error: '트윗을 찾을 수 없음'
        }
      };
    }
    
    // 트윗 정보를 배열로 변환
    const tweetDataArray: TweetData[] = [];
    
    addLog(`컨텍스트 수집: ${tweets.length}개의 트윗 발견`, 'info');
    
    tweets.forEach((tweet, index) => {
      try {
        // 트윗 ID 추출 (DOM 구조에서 찾기)
        let tweetId = tweet.getAttribute('data-testid-tweet-id') || 
                     tweet.querySelector('a[href*="/status/"]')?.getAttribute('href')?.split('/status/')[1] || 
                     `unknown-${index}`;
        
        // 트윗 텍스트 추출
        const tweetTextElement = tweet.querySelector('div[data-testid="tweetText"]');
        const tweetText = tweetTextElement?.textContent || '(텍스트 없음)';
        
        // 작성자 정보 추출
        const authorElement = tweet.querySelector('div[data-testid="User-Name"]');
        const authorName = authorElement?.querySelector('span')?.textContent || '알 수 없음';
        const usernameElement = authorElement?.querySelector('span a[tabindex="-1"] span');
        let username = usernameElement?.textContent || '';
        
        // '@' 문자가 없으면 추가
        if (username && !username.startsWith('@')) {
          username = '@' + username;
        }
        
        // 타임스탬프 추출
        const timestampElement = tweet.querySelector('time');
        const timestamp = timestampElement?.getAttribute('datetime') || '';
        
        // 이 정보를 배열에 추가
        tweetDataArray.push({
          id: tweetId,
          text: tweetText,
          author: {
            name: authorName,
            username: username
          },
          timestamp: timestamp,
          isMainTweet: false,  // 기본값, 아래에서 업데이트
          isTargetTweet: false, // 기본값, 아래에서 업데이트
          html_content: tweetTextElement?.innerHTML || '',
          element_type: 'tweet',
          position_index: index
        });
        
        addLog(`트윗 수집 ${index+1}/${tweets.length}: ${username}의 트윗`, 'info', {
          id: tweetId,
          text_preview: tweetText.substring(0, 50) + (tweetText.length > 50 ? '...' : '')
        });
      } catch (err) {
        addLog(`트윗 수집 실패 (${index+1}/${tweets.length})`, 'error', err);
      }
    });
    
    // 스레드 구조 분석 (가장 첫 번째는 메인 트윗, 가장 마지막은 답장 대상)
    if (tweetDataArray.length > 0) {
      // 첫 번째 트윗을 메인 트윗으로 설정
      tweetDataArray[0].isMainTweet = true;
      context.mainTweet = tweetDataArray[0];
      
      // 마지막 트윗을 답장 대상으로 설정
      if (tweetDataArray.length > 1) {
        const lastIndex = tweetDataArray.length - 1;
        tweetDataArray[lastIndex].isTargetTweet = true;
        context.replyTarget = tweetDataArray[lastIndex];
        
        // 중간 트윗들을 중간 답글로 설정
        if (tweetDataArray.length > 2) {
          context.intermediateReplies = tweetDataArray.slice(1, lastIndex);
        }
      }
    }
    
    // 스레드 구조 요약 생성
    context.threadStructure = generateThreadStructureSummary(tweetDataArray);
    
    // 수집 통계 추가
    context.collection_stats = {
      found_tweets: tweetDataArray.length,
      has_main_tweet: !!context.mainTweet,
      has_reply_target: !!context.replyTarget,
      intermediate_replies_count: context.intermediateReplies.length,
      success: true
    };
    
    // 디버그 정보 추가
    context.debug_info = {
      url: window.location.href,
      collected_at: new Date().toISOString(),
      browser_info: navigator.userAgent
    };
    
    addLog('트윗 스레드 컨텍스트 수집 완료', 'success', {
      tweet_count: tweetDataArray.length,
      thread_structure: context.threadStructure
    });
    
    return context;
  } catch (error) {
    addLog('트윗 컨텍스트 수집 오류', 'error', error);
    return {
      intermediateReplies: [],
      threadStructure: `오류 발생: ${error}`,
      collected_at: new Date().toISOString(),
      collection_stats: {
        found_tweets: 0,
        success: false,
        error: String(error)
      }
    };
  }
}

// 스레드 구조 요약 생성
function generateThreadStructureSummary(tweets: TweetData[]): string {
  if (tweets.length === 0) {
    return '트윗이 없음';
  }
  
  if (tweets.length === 1) {
    return `독립 트윗: ${tweets[0].author.username}`;
  }
  
  // 스레드 요약 생성
  let summary = `${tweets.length}개 트윗 스레드:\n`;
  
  tweets.forEach((tweet, index) => {
    const prefix = index === 0 ? '📌 메인: ' :
                  index === tweets.length - 1 ? '⤵️ 답장 대상: ' : 
                  `↪️ 답글 #${index}: `;
                  
    const timestamp = tweet.timestamp ? new Date(tweet.timestamp).toLocaleTimeString() : '시간 정보 없음';
    
    summary += `${prefix}${tweet.author.username} (${timestamp}): "${truncateText(tweet.text, 30)}"\n`;
  });
  
  return summary;
}

// 텍스트 길이 제한 함수
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
}

// 응답 옵션 표시
async function displayResponseOptions(composer: HTMLElement, responses: Array<{ text: string, type: string }>) {
  // 이전 응답 옵션 제거
  const existingOptions = document.querySelector('.x-helper-options');
  if (existingOptions) {
    existingOptions.remove();
  }
  
  // 버튼 위치 가져오기
  const helperButton = composer.querySelector('.x-helper-button-container');
  if (!helperButton) {
    console.error('헬퍼 버튼을 찾을 수 없습니다');
    await addLog('헬퍼 버튼을 찾을 수 없습니다', 'error');
    return;
  }
  
  const buttonRect = helperButton.getBoundingClientRect();
  
  // 옵션 컨테이너 생성
  const optionsContainer = document.createElement('div');
  optionsContainer.className = 'x-helper-options';
  optionsContainer.style.cssText = `
    position: fixed;
    top: ${buttonRect.top - 10}px;
    left: ${buttonRect.left + 30}px;
    background-color: white;
    border: 1px solid #cfd9de;
    border-radius: 4px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    width: 300px;
    z-index: 10000;
    max-height: 300px;
    overflow-y: auto;
  `;
  
  // 제목 추가
  const title = document.createElement('div');
  title.innerText = '제안된 답변';
  title.style.cssText = `
    padding: 12px 16px;
    font-weight: bold;
    border-bottom: 1px solid #cfd9de;
  `;
  optionsContainer.appendChild(title);
  
  // 각 응답 옵션 추가
  responses.forEach((response, index) => {
    const option = document.createElement('div');
    option.className = 'x-helper-option';
    option.innerText = response.text;
    option.style.cssText = `
      padding: 12px 16px;
      cursor: pointer;
      border-bottom: 1px solid #ebeef0;
      transition: background-color 0.2s;
    `;
    
    // 응답 클릭 시 작성 영역에 삽입
    option.addEventListener('click', async () => {
      await addLog('사용자가 응답 옵션을 선택했습니다', 'success', { optionIndex: index, text: response.text });
      composer.textContent = response.text;
      optionsContainer.remove();
      
      // 포커스 설정
      composer.focus();
      
      // 커서를 텍스트 끝으로 이동
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(composer);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
    
    // 호버 효과
    option.addEventListener('mouseenter', () => {
      option.style.backgroundColor = '#f7f9fa';
    });
    option.addEventListener('mouseleave', () => {
      option.style.backgroundColor = 'transparent';
    });
    
    optionsContainer.appendChild(option);
  });
  
  // 닫기 버튼
  const closeButton = document.createElement('div');
  closeButton.innerText = '닫기';
  closeButton.style.cssText = `
    padding: 12px 16px;
    text-align: center;
    cursor: pointer;
    color: #1d9bf0;
  `;
  closeButton.addEventListener('click', async () => {
    await addLog('사용자가 응답 옵션을 닫았습니다', 'info');
    optionsContainer.remove();
  });
  optionsContainer.appendChild(closeButton);
  
  // 옵션 컨테이너를 body에 추가 (fixed 포지션이므로)
  document.body.appendChild(optionsContainer);
  await addLog('응답 옵션이 화면에 표시되었습니다', 'success', { optionCount: responses.length });
  
  // 클릭 이벤트 외부에서 옵션 닫기
  const handleOutsideClick = (e: MouseEvent) => {
    if (!optionsContainer.contains(e.target as Node) && 
        !(e.target as Element).closest('.x-helper-button')) {
      optionsContainer.remove();
      document.removeEventListener('click', handleOutsideClick);
      addLog('사용자가 외부 클릭으로 응답 옵션을 닫았습니다', 'info');
    }
  };
  
  // 지연 시간을 두어 버튼 클릭 자체가 이벤트를 트리거하지 않도록 함
  setTimeout(() => {
    document.addEventListener('click', handleOutsideClick);
  }, 100);
}

// 초기화 함수
async function initialize() {
  if (extensionState.initialized) {
    console.log('이미 초기화되었습니다.');
    return;
  }
  
  try {
    extensionState.offlineMode = false; // 초기화 시 오프라인 모드 해제
    
    await loadSettings();
    
    // MutationObserver 설정 및 정리 함수 저장
    extensionState.observerCleanup = observeTwitterDOM();
    
    // 설정 변경 시 재로드
    try {
      chrome.runtime.onMessage.addListener((request) => {
        if (request.action === 'settingsUpdated') {
          loadSettings().catch(e => console.error('설정 업데이트 오류:', e));
          addLog('설정이 업데이트되어 재로드했습니다', 'info').catch(() => {});
        }
        return true;
      });
    } catch (listenerError) {
      console.error('설정 업데이트 리스너 등록 오류:', listenerError);
    }
    
    extensionState.initialized = true;
    extensionState.isContextValid = true;
    extensionState.reconnectAttempts = 0;
    await addLog('X 헬퍼 콘텐츠 스크립트가 초기화되었습니다', 'success');
    
    // 주기적 연결 확인 시작
    extensionState.startConnectionCheck();
  } catch (error) {
    console.error('초기화 오류:', error);
    extensionState.isContextValid = false;
    extensionState.initialized = false;
    
    // 초기화 실패 시 2초 후 재시도
    if (extensionState.reconnectAttempts < extensionState.maxReconnectAttempts) {
      extensionState.reconnectAttempts++;
      console.log(`초기화 재시도 중... (${extensionState.reconnectAttempts}/${extensionState.maxReconnectAttempts})`);
      
      setTimeout(() => {
        initialize().catch(e => {
          console.error('재초기화 실패:', e);
          
          // 최대 재시도 횟수 초과시 오프라인 모드 진입
          if (extensionState.reconnectAttempts >= extensionState.maxReconnectAttempts) {
            extensionState.enterOfflineMode();
          }
        });
      }, 2000);
    } else {
      extensionState.enterOfflineMode();
    }
  }
}

// 페이지 언로드 시 정리 작업
window.addEventListener('beforeunload', () => {
  extensionState.isContextValid = false;
  extensionState.cleanup();
  console.log('페이지 언로드: X 헬퍼 콘텐츠 스크립트 정리');
});

// 콘텐츠 스크립트 실행
initialize(); 