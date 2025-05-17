// 백그라운드 스크립트
import { Storage } from '../../../packages/shared/storage';
import { PromptTemplate, generatePrompt, tonePrompts } from './prompts';

// 백그라운드 스크립트 활성 상태 관리
const BackgroundState = {
  isAlive: true,
  startTime: Date.now(),
  pingInterval: null as number | null,
  wakeInterval: null as number | null,
  pendingResponses: new Map<string, Function>(),
  
  // 백그라운드 스크립트 활성화 유지
  keepAlive() {
    // 이미 실행 중인 인터벌 제거
    if (this.wakeInterval) {
      clearInterval(this.wakeInterval);
      this.wakeInterval = null;
    }
    
    // 15초마다 활성화 신호 기록
    this.wakeInterval = setInterval(() => {
      this.isAlive = true;
      const uptime = Math.floor((Date.now() - this.startTime) / 1000);
      console.debug(`백그라운드 스크립트 활성 유지 중 (가동 시간: ${uptime}초)`);
      
      // 디버깅용 로그는 100번째 핑마다 추가 (약 25분마다)
      if (uptime > 0 && uptime % 1500 === 0) {
        Logger.addLog(`백그라운드 스크립트 가동 중 (${Math.floor(uptime / 60)}분)`, 'info');
      }
    }, 15000) as unknown as number;
    
    // 탭 핑 간격 설정 (30초)
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    this.pingInterval = setInterval(async () => {
      try {
        // 등록된 컨텐츠 스크립트 탭에 핑 전송
        await this.pingContentScriptTabs();
      } catch (error) {
        console.debug('탭 핑 오류:', error);
      }
    }, 30000) as unknown as number;
  },
  
  // 컨텐츠 스크립트 탭에 핑 전송
  async pingContentScriptTabs() {
    const contentTabs = [...ExtensionState.contentScriptTabs];
    
    for (const tabId of contentTabs) {
      try {
        await ExtensionState.isContentScriptActive(tabId);
      } catch (error) {
        console.debug(`탭 ${tabId} 핑 실패:`, error);
      }
    }
  },
  
  // 응답 추적 관리 (중복 응답 방지)
  registerPendingResponse(id: string, callback: Function) {
    this.pendingResponses.set(id, callback);
    
    // 10초 후 자동 정리
    setTimeout(() => {
      this.pendingResponses.delete(id);
    }, 10000);
  },
  
  hasPendingResponse(id: string): boolean {
    return this.pendingResponses.has(id);
  },
  
  executePendingResponse(id: string, data: any) {
    if (this.pendingResponses.has(id)) {
      try {
        const callback = this.pendingResponses.get(id)!;
        callback(data);
      } catch (error) {
        console.error('응답 콜백 실행 오류:', error);
      }
      this.pendingResponses.delete(id);
      return true;
    }
    return false;
  },
  
  // 리소스 정리
  cleanup() {
    if (this.wakeInterval) {
      clearInterval(this.wakeInterval);
      this.wakeInterval = null;
    }
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    this.pendingResponses.clear();
  }
};

// 확장 프로그램 상태 관리
const ExtensionState = {
  active: true,
  contentScriptTabs: new Set<number>(),
  
  // 콘텐츠 스크립트 연결 등록
  registerContentScript(tabId: number) {
    this.contentScriptTabs.add(tabId);
    console.log(`콘텐츠 스크립트 등록: 탭 ${tabId}`);
  },
  
  // 콘텐츠 스크립트 연결 해제
  unregisterContentScript(tabId: number) {
    this.contentScriptTabs.delete(tabId);
    console.log(`콘텐츠 스크립트 연결 해제: 탭 ${tabId}`);
  },
  
  // 모든 활성 탭에 메시지 전송
  async broadcastMessage(message: any) {
    const contentTabs = [...this.contentScriptTabs];
    
    for (const tabId of contentTabs) {
      try {
        await chrome.tabs.sendMessage(tabId, message);
      } catch (error) {
        console.warn(`탭 ${tabId}에 메시지 전송 실패:`, error);
        // 연결 끊어진 탭 제거
        this.unregisterContentScript(tabId);
      }
    }
  },
  
  // 콘텐츠 스크립트가 활성 상태인지 확인
  async isContentScriptActive(tabId: number): Promise<boolean> {
    if (!this.contentScriptTabs.has(tabId)) return false;
    
    try {
      // ping 메시지를 보내 응답 확인 (타임아웃 추가)
      const response = await Promise.race([
        chrome.tabs.sendMessage(tabId, { action: 'ping', timestamp: Date.now() }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Ping timeout')), 2000)
        )
      ]);
      
      // 응답이 있으면 활성 상태
      return true;
    } catch (error) {
      // 오류 발생 시 연결이 끊어진 것으로 간주
      console.warn(`탭 ${tabId} 연결 확인 실패:`, error);
      this.unregisterContentScript(tabId);
      return false;
    }
  },
  
  // 모든 콘텐츠 스크립트 상태 확인
  async checkAllContentScripts() {
    const contentTabs = [...this.contentScriptTabs];
    const results: { tabId: number, active: boolean }[] = [];
    
    for (const tabId of contentTabs) {
      try {
        const active = await this.isContentScriptActive(tabId);
        results.push({ tabId, active });
      } catch (error) {
        results.push({ tabId, active: false });
      }
    }
    
    return results;
  }
};

// 트윗 데이터 인터페이스
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
}

// 스레드 컨텍스트 인터페이스
interface ThreadContext {
  mainTweet?: TweetData;        // 스레드 시작 트윗
  replyTarget?: TweetData;      // 답장 대상 트윗
  intermediateReplies: TweetData[]; // 중간 답글들
  threadStructure: string;      // 스레드 구조 요약
}

// 초기 설정 값
const defaultSettings = {
  isEnabled: true,
  apiKey: '',
  model: 'gpt-3.5-turbo',
  toneOptions: ['친근한', '전문적인', '유머러스한', '학술적인'],
  selectedTone: '친근한',
  useCustomPrompt: false,
  customPrompt: '',
};

/**
 * 디버그 로그 관리 객체
 */
const Logger = {
  // 최대 로그 항목 수
  MAX_LOGS: 100,
  
  // 세션 로그 저장
  async addLog(message: string, type: 'info' | 'warn' | 'error' | 'success' = 'info', details?: any): Promise<void> {
    const logs = await this.getLogs();
    const newLog = {
      timestamp: new Date().toISOString(),
      message,
      type,
      details: details ? JSON.stringify(details) : undefined
    };
    
    // 최대 로그 수를 유지하기 위해 오래된 로그 제거
    logs.unshift(newLog);
    if (logs.length > this.MAX_LOGS) {
      logs.pop();
    }
    
    // 로그 저장
    await Storage.set('debug_logs', logs);
    console.log(`[${type.toUpperCase()}] ${message}`, details || '');
    
    // 열려있는 팝업에 로그 업데이트 알림
    this.notifyLogUpdate();
  },
  
  // 로그 조회
  async getLogs(): Promise<any[]> {
    const logs = await Storage.get('debug_logs');
    return Array.isArray(logs) ? logs : [];
  },
  
  // 로그 초기화
  async clearLogs(): Promise<void> {
    await Storage.set('debug_logs', []);
    this.notifyLogUpdate();
  },
  
  // 팝업에 로그 업데이트 알림
  notifyLogUpdate(): void {
    try {
      chrome.runtime.sendMessage({ action: 'logUpdated' });
    } catch (error) {
      // 팝업이 열려있지 않으면 오류가 발생할 수 있으므로 무시
      console.debug('로그 업데이트 알림 실패 (팝업이 열려있지 않을 수 있음)');
    }
  }
};

/**
 * 컨텍스트 저장을 위한 변수
 * 나중에 OpenAI API 사용 시 이 데이터를 활용할 수 있음
 */
const contextCache: { [key: string]: any } = {};

// 컨텍스트 저장을 위한 객체
const ContextManager = {
  lastContext: null as any,
  contextHistory: [] as any[],
  MAX_HISTORY_SIZE: 10,

  // 새 컨텍스트 저장
  saveContext(context: any, tabId?: number) {
    this.lastContext = context;
    
    // 컨텍스트 히스토리 저장
    this.contextHistory.unshift(context);
    if (this.contextHistory.length > this.MAX_HISTORY_SIZE) {
      this.contextHistory.pop();
    }
    
    // 옵션: 로컬 스토리지에도 저장 (나중에 확장 프로그램 재시작 후에도 사용 가능)
    try {
      Storage.set('last_context', context);
      Storage.set('context_history', this.contextHistory);
    } catch (error) {
      console.error('컨텍스트 저장 오류:', error);
    }
    
    // 컨텍스트 세부정보 로깅
    try {
      const tweetCount = context.thread_context?.collection_stats?.found_tweets || 0;
      const mainTweetAuthor = context.thread_context?.mainTweet?.author?.username || 'N/A';
      const replyTargetAuthor = context.thread_context?.replyTarget?.author?.username || 'N/A';
      
      Logger.addLog('컨텍스트가 저장되었습니다', 'success', {
        tweet_count: tweetCount,
        main_tweet_author: mainTweetAuthor,
        reply_target_author: replyTargetAuthor,
        timestamp: context.timestamp
      });
    } catch (err) {
      console.error('컨텍스트 로깅 오류:', err);
    }
  },
  
  // 컨텍스트 가져오기
  getLastContext() {
    return this.lastContext;
  },
  
  // 컨텍스트 히스토리 가져오기
  getContextHistory() {
    return this.contextHistory;
  },
  
  // 초기화 (확장 프로그램 시작 시)
  async initialize() {
    try {
      // 이전에 저장된 컨텍스트 로드
      const lastContext = await Storage.get('last_context');
      if (lastContext) {
        this.lastContext = lastContext;
      }
      
      const contextHistory = await Storage.get('context_history');
      if (Array.isArray(contextHistory)) {
        this.contextHistory = contextHistory;
      }
    } catch (error) {
      console.error('컨텍스트 초기화 오류:', error);
    }
  }
};

// 익스텐션 설치 시 초기 설정
chrome.runtime.onInstalled.addListener(async (details) => {
  const reason = details.reason; // install, update, chrome_update, shared_module_update
  console.log(`X 헬퍼가 ${reason}되었습니다.`);
  
  // 초기 설정 저장
  await Storage.set('settings', defaultSettings);
  
  // 로그 초기화
  await Logger.clearLogs();
  await Logger.addLog(`X 헬퍼가 ${reason}되었습니다.`, 'info');
  
  // 컨텍스트 초기화
  await ContextManager.initialize();
  
  // 백그라운드 스크립트 활성화 유지
  BackgroundState.keepAlive();
});

// 확장 프로그램 활성화 시
chrome.runtime.onStartup.addListener(() => {
  console.log('X 헬퍼가 시작되었습니다.');
  Logger.addLog('X 헬퍼가 시작되었습니다.', 'info');
  
  // 백그라운드 스크립트 활성화 유지
  BackgroundState.keepAlive();
});

// 탭 닫힘 이벤트 처리
chrome.tabs.onRemoved.addListener((tabId) => {
  ExtensionState.unregisterContentScript(tabId);
  delete contextCache[tabId.toString()];
});

// 에러 안전한 응답 함수
function safeResponse(sendResponse: Function, data: any) {
  try {
    sendResponse(data);
  } catch (error) {
    console.error('응답 전송 오류:', error);
  }
}

// 메시지 ID 생성
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

// 콘텐츠 스크립트로부터 메시지 수신
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 응답 ID 체크
  if (request && request.responseId && BackgroundState.hasPendingResponse(request.responseId)) {
    BackgroundState.executePendingResponse(request.responseId, request.data);
    return false;
  }
  
  const { action, data } = request;
  
  // 콘텐츠 스크립트 연결 등록
  if (sender.tab?.id) {
    ExtensionState.registerContentScript(sender.tab.id);
  }
  
  if (action === 'ping') {
    // 상태 확인용 ping에 응답
    safeResponse(sendResponse, { 
      pong: true, 
      timestamp: Date.now(),
      uptime: Math.floor((Date.now() - BackgroundState.startTime) / 1000)
    });
    return true;
  }
  
  if (action === 'getSettings') {
    Storage.get('settings').then(settings => {
      safeResponse(sendResponse, { settings: settings || defaultSettings });
    }).catch(error => {
      console.error('설정 로드 오류:', error);
      safeResponse(sendResponse, { error: '설정 로드 중 오류가 발생했습니다.' });
    });
    return true; // 비동기 응답을 위해 true 반환
  }
  
  if (action === 'saveSettings') {
    Storage.set('settings', data).then(() => {
      Logger.addLog('설정이 업데이트되었습니다.', 'info', data);
      safeResponse(sendResponse, { success: true });
    }).catch(error => {
      console.error('설정 저장 오류:', error);
      safeResponse(sendResponse, { error: '설정 저장 중 오류가 발생했습니다.' });
    });
    return true;
  }
  
  if (action === 'addLog') {
    try {
      const { message, type, details } = data;
      Logger.addLog(message, type, details).then(() => {
        safeResponse(sendResponse, { success: true });
      }).catch(error => {
        console.error('로그 추가 오류:', error);
        safeResponse(sendResponse, { error: '로그 추가 중 오류가 발생했습니다.' });
      });
    } catch (error) {
      console.error('로그 데이터 처리 오류:', error);
      safeResponse(sendResponse, { error: '로그 데이터 처리 중 오류가 발생했습니다.' });
    }
    return true;
  }
  
  if (action === 'getLogs') {
    Logger.getLogs().then(logs => {
      safeResponse(sendResponse, { logs });
    }).catch(error => {
      console.error('로그 조회 오류:', error);
      safeResponse(sendResponse, { error: '로그 조회 중 오류가 발생했습니다.' });
    });
    return true;
  }
  
  if (action === 'clearLogs') {
    Logger.clearLogs().then(() => {
      safeResponse(sendResponse, { success: true });
    }).catch(error => {
      console.error('로그 초기화 오류:', error);
      safeResponse(sendResponse, { error: '로그 초기화 중 오류가 발생했습니다.' });
    });
    return true;
  }
  
  if (action === 'getLastContext') {
    try {
      const context = ContextManager.getLastContext();
      safeResponse(sendResponse, { context });
    } catch (error) {
      console.error('컨텍스트 조회 오류:', error);
      safeResponse(sendResponse, { error: '컨텍스트 조회 중 오류가 발생했습니다.' });
    }
    return true;
  }
  
  if (action === 'getContextHistory') {
    try {
      const history = ContextManager.getContextHistory();
      safeResponse(sendResponse, { history });
    } catch (error) {
      console.error('컨텍스트 히스토리 조회 오류:', error);
      safeResponse(sendResponse, { error: '컨텍스트 히스토리 조회 중 오류가 발생했습니다.' });
    }
    return true;
  }
  
  if (action === 'generateResponse') {
    try {
      // 로그 추가: 응답 생성 시작
      Logger.addLog('AI 응답 생성 요청 수신', 'info', data);
      
      // 탭 유효성 확인
      const tabId = sender.tab?.id;
      if (!tabId) {
        Logger.addLog('탭 ID를 찾을 수 없습니다.', 'error');
        safeResponse(sendResponse, { error: '탭 ID를 찾을 수 없습니다.' });
        return true;
      }
      
      // 컨텍스트 저장
      const contextToSave = {
        user_input: data.tweetText,
        thread_context: data.threadContext,
        settings: {
          tone: data.tone,
          model: data.model
        },
        timestamp: new Date().toISOString()
      };
      
      ContextManager.saveContext(contextToSave, tabId);
      
      // 스레드 컨텍스트 분석 및 로깅
      if (data.threadContext) {
        const context = data.threadContext;
        
        // 스레드 구조 로깅
        Logger.addLog('트윗 스레드 구조 분석', 'info', {
          structure: context.threadStructure,
          tweetCount: (context.intermediateReplies?.length || 0) + 
                      (context.mainTweet ? 1 : 0) + 
                      (context.replyTarget ? 1 : 0)
        });
        
        // 메인 트윗 로깅
        if (context.mainTweet) {
          Logger.addLog('메인 트윗 감지됨', 'info', {
            author: context.mainTweet.author.username,
            text: context.mainTweet.text.substring(0, 100) + (context.mainTweet.text.length > 100 ? '...' : '')
          });
        }
        
        // 답장 대상 트윗 로깅
        if (context.replyTarget) {
          Logger.addLog('답장 대상 트윗 감지됨', 'info', {
            author: context.replyTarget.author.username,
            text: context.replyTarget.text.substring(0, 100) + (context.replyTarget.text.length > 100 ? '...' : '')
          });
        }
        
        // 중간 답글 개수 로깅
        if (context.intermediateReplies && context.intermediateReplies.length > 0) {
          Logger.addLog(`${context.intermediateReplies.length}개의 중간 답글 감지됨`, 'info');
        }
      }
      
      // context 데이터 캐싱
      if (tabId) {
        contextCache[tabId.toString()] = data;
      }
      
      // API 응답 생성 함수
      const generateResponses = async () => {
        try {
          // 프롬프트 생성 및 설정 가져오기
          let userTone = data.tone || '친근한';
          let userCustomPrompt = false;
          let customPromptText = '';
          
          try {
            const settingsData = await Storage.get('settings');
            if (settingsData) {
              const userSettings = settingsData as typeof defaultSettings;
              userTone = data.tone || userSettings.selectedTone || '친근한';
              userCustomPrompt = userSettings.useCustomPrompt || false;
              customPromptText = userSettings.customPrompt || '';
            }
          } catch (error) {
            Logger.addLog('설정 로드 중 오류 발생, 기본값 사용', 'warn', error);
          }
          
          const prompt = generatePrompt(
            userTone, 
            data.tweetText, 
            data.threadContext,
            userCustomPrompt,
            customPromptText
          );
          
          Logger.addLog('프롬프트 생성 완료', 'info', {
            tone: userTone,
            customPrompt: userCustomPrompt,
            promptLength: prompt.userPrompt.length
          });
          
          // 목업 응답 생성 - 스레드 컨텍스트 기반으로 개선
          setTimeout(() => {
            try {
              let mockResponses = [];
              
              // 메인 트윗과 답장 대상 트윗이 있는지 확인
              const hasMainTweet = data.threadContext?.mainTweet != null;
              const hasReplyTarget = data.threadContext?.replyTarget != null;
              
              if (hasReplyTarget) {
                // 답장 대상자의 사용자명
                const targetUsername = data.threadContext.replyTarget.author.username || '';
                
                // 톤에 따른 응답 생성
                if (userTone === '친근한') {
                  mockResponses = [
                    { 
                      text: `${targetUsername} 네, 말씀해주신 내용에 동의합니다! 좋은 의견 감사해요 😊`, 
                      type: 'friendly' 
                    },
                    { 
                      text: `${targetUsername} 흥미로운 관점이네요~ 더 자세히 알려주실 수 있을까요? 🤔`, 
                      type: 'curious' 
                    },
                    { 
                      text: `${targetUsername} 좋은 지적이에요! 저도 비슷한 생각을 했었는데 공감되네요 👍`, 
                      type: 'agree' 
                    }
                  ];
                } else if (userTone === '전문적인') {
                  mockResponses = [
                    { 
                      text: `${targetUsername} 귀하의 의견에 동의합니다. 해당 관점은 이 분야에서 중요한 시사점을 제공합니다.`, 
                      type: 'professional' 
                    },
                    { 
                      text: `${targetUsername} 흥미로운 관점입니다. 추가적인 데이터나 근거가 있으시면 논의를 더 발전시킬 수 있을 것 같습니다.`, 
                      type: 'analytical' 
                    },
                    { 
                      text: `${targetUsername} 정확한 지적입니다. 이 부분에 대해서는 최근 연구에서도 유사한 결론이 도출되었습니다.`, 
                      type: 'informative' 
                    }
                  ];
                } else if (userTone === '유머러스한') {
                  mockResponses = [
                    { 
                      text: `${targetUsername} 당신 말이 너무 맞아서 제 키보드가 박수를 치려다 망가졌어요! 😂 완전 동의합니다!`, 
                      type: 'funny' 
                    },
                    { 
                      text: `${targetUsername} 그 의견은 피자처럼 완벽해요 - 아무리 접어도 맛있죠! 🍕 더 자세히 말해주실래요?`, 
                      type: 'witty' 
                    },
                    { 
                      text: `${targetUsername} 저도 그 생각을 하고 있었는데! 위대한 마음이 같이 움직인다고 하죠... 아니면 그냥 둘 다 멋진가요? 😎`, 
                      type: 'playful' 
                    }
                  ];
                } else if (userTone === '학술적인') {
                  mockResponses = [
                    { 
                      text: `${targetUsername} 귀하의 주장은 상당히 설득력이 있습니다. 특히 이론적 관점에서 볼 때 기존 패러다임에 중요한 질문을 제기합니다.`, 
                      type: 'scholarly' 
                    },
                    { 
                      text: `${targetUsername} 흥미로운 가설입니다. 이 현상에 대한 체계적 분석을 위해서는 추가 데이터가 필요할 것으로 보입니다.`, 
                      type: 'analytical' 
                    },
                    { 
                      text: `${targetUsername} 해당 관점은 문헌에서 지지되는 바, Smith(2023)와 Johnson(2024)의 연구에서도 유사한 결론이 도출되었습니다.`, 
                      type: 'referenced' 
                    }
                  ];
                } else {
                  // 기본 응답
                  mockResponses = [
                    { 
                      text: `${targetUsername} 좋은 의견 감사합니다!`, 
                      type: 'default' 
                    },
                    { 
                      text: `${targetUsername} 흥미로운 관점이네요. 더 설명해주실 수 있나요?`, 
                      type: 'curious' 
                    },
                    { 
                      text: `${targetUsername} 동의합니다. 추가 의견이 있으시면 말씀해주세요.`, 
                      type: 'agree' 
                    }
                  ];
                }
              } else {
                // 기본 응답 (특정 대상이 없는 경우)
                if (userTone === '친근한') {
                  mockResponses = [
                    { 
                      text: '네, 말씀해주신 내용에 동의합니다! 좋은 의견 감사해요 😊', 
                      type: 'friendly' 
                    },
                    { 
                      text: '흥미로운 관점이네요~ 더 자세히 알려주실 수 있을까요? 🤔', 
                      type: 'curious' 
                    },
                    { 
                      text: '좋은 지적이에요! 저도 비슷한 생각을 했었는데 공감되네요 👍', 
                      type: 'agree' 
                    }
                  ];
                } else if (userTone === '전문적인') {
                  mockResponses = [
                    { 
                      text: '귀하의 의견에 동의합니다. 해당 관점은 이 분야에서 중요한 시사점을 제공합니다.', 
                      type: 'professional' 
                    },
                    { 
                      text: '흥미로운 관점입니다. 추가적인 데이터나 근거가 있으시면 논의를 더 발전시킬 수 있을 것 같습니다.', 
                      type: 'analytical' 
                    },
                    { 
                      text: '정확한 지적입니다. 이 부분에 대해서는 최근 연구에서도 유사한 결론이 도출되었습니다.', 
                      type: 'informative' 
                    }
                  ];
                } else if (userTone === '유머러스한') {
                  mockResponses = [
                    { 
                      text: '당신 말이 너무 맞아서 제 키보드가 박수를 치려다 망가졌어요! 😂 완전 동의합니다!', 
                      type: 'funny' 
                    },
                    { 
                      text: '그 의견은 피자처럼 완벽해요 - 아무리 접어도 맛있죠! 🍕 더 자세히 말해주실래요?', 
                      type: 'witty' 
                    },
                    { 
                      text: '저도 그 생각을 하고 있었는데! 위대한 마음이 같이 움직인다고 하죠... 아니면 그냥 둘 다 멋진가요? 😎', 
                      type: 'playful' 
                    }
                  ];
                } else if (userTone === '학술적인') {
                  mockResponses = [
                    { 
                      text: '귀하의 주장은 상당히 설득력이 있습니다. 특히 이론적 관점에서 볼 때 기존 패러다임에 중요한 질문을 제기합니다.', 
                      type: 'scholarly' 
                    },
                    { 
                      text: '흥미로운 가설입니다. 이 현상에 대한 체계적 분석을 위해서는 추가 데이터가 필요할 것으로 보입니다.', 
                      type: 'analytical' 
                    },
                    { 
                      text: '해당 관점은 문헌에서 지지되는 바, 최근 연구에서도 유사한 결론이 도출되었습니다.', 
                      type: 'referenced' 
                    }
                  ];
                } else {
                  // 기본 응답
                  mockResponses = [
                    { 
                      text: '네, 말씀해주신 내용에 동의합니다. 좋은 의견 감사합니다!', 
                      type: 'default' 
                    },
                    { 
                      text: '흥미로운 관점이네요. 더 설명해주실 수 있나요?', 
                      type: 'curious' 
                    },
                    { 
                      text: '동의합니다. 추가 의견이 있으시면 말씀해주세요.', 
                      type: 'agree' 
                    }
                  ];
                }
              }
              
              // 디버깅용 프롬프트 정보 추가
              mockResponses.push({
                text: `// 프롬프트 정보: 톤=${userTone}, 길이=${prompt.userPrompt.length}자`,
                type: 'debug'
              });
              
              Logger.addLog('AI 응답 생성 완료', 'success', mockResponses);
              
              // 콘텐츠 스크립트 연결 확인 후 응답 전송
              ExtensionState.isContentScriptActive(tabId).then(isActive => {
                if (isActive) {
                  safeResponse(sendResponse, { responses: mockResponses });
                } else {
                  Logger.addLog('콘텐츠 스크립트 연결이 끊어졌습니다.', 'error');
                  safeResponse(sendResponse, { error: '콘텐츠 스크립트 연결이 끊어졌습니다.' });
                }
              }).catch(() => {
                safeResponse(sendResponse, { responses: mockResponses });
              });
            } catch (error) {
              Logger.addLog('응답 생성 중 오류 발생', 'error', error);
              safeResponse(sendResponse, { error: '응답 생성 중 오류가 발생했습니다.' });
            }
          }, 500);
        } catch (error) {
          Logger.addLog('설정 및 프롬프트 생성 중 오류', 'error', error);
          safeResponse(sendResponse, { error: '응답 생성 중 오류가 발생했습니다.' });
        }
      };
      
      // API 호출 실행
      generateResponses();
    } catch (error) {
      Logger.addLog('응답 생성 요청 처리 중 오류', 'error', error);
      safeResponse(sendResponse, { error: '응답 생성 요청 처리 중 오류가 발생했습니다.' });
    }
    return true;
  }
  
  if (action === 'copyContext') {
    const tabId = request.tabId?.toString();
    if (tabId && contextCache[tabId]) {
      const contextJSON = JSON.stringify(contextCache[tabId], null, 2);
      copyTextToClipboard(contextJSON).then(() => {
        Logger.addLog('컨텍스트가 클립보드에 복사되었습니다.', 'success');
        safeResponse(sendResponse, { success: true, message: '컨텍스트가 클립보드에 복사되었습니다.' });
      }).catch(error => {
        Logger.addLog('클립보드 복사 실패', 'error', error);
        safeResponse(sendResponse, { error: '클립보드 복사 중 오류가 발생했습니다.' });
      });
    } else {
      Logger.addLog('사용 가능한 컨텍스트가 없습니다.', 'error');
      safeResponse(sendResponse, { success: false, message: '사용 가능한 컨텍스트가 없습니다.' });
    }
    return true;
  }

  // 처리되지 않은 액션에 대한 응답
  safeResponse(sendResponse, { error: `지원되지 않는 액션: ${action}` });
  return true;
});

/**
 * 텍스트를 클립보드에 복사하는 함수
 */
async function copyTextToClipboard(text: string): Promise<void> {
  try {
    // navigator.clipboard API는 백그라운드 스크립트에서 직접 사용할 수 없음
    // 대신 임시 탭을 생성하여 클립보드에 복사
    const tab = await chrome.tabs.create({ url: 'about:blank', active: false });
    const tabId = tab.id;
    if (!tabId) throw new Error('탭 ID를 찾을 수 없습니다.');
    
    // 임시 탭이 로드되면 스크립트 실행
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (textToCopy) => {
        navigator.clipboard.writeText(textToCopy)
          .then(() => console.log('클립보드에 복사 성공'))
          .catch(err => console.error('클립보드 복사 실패:', err));
      },
      args: [text]
    });
    
    // 스크립트 실행 후 탭 닫기
    await new Promise(resolve => setTimeout(resolve, 500));
    await chrome.tabs.remove(tabId);
  } catch (error) {
    console.error('클립보드 복사 함수 오류:', error);
    throw error;
  }
}

// 서비스 워커 활성화 유지 - 세부 이벤트 핸들러
chrome.runtime.onSuspend.addListener(() => {
  console.log('서비스 워커가 일시 중단됩니다.');
  Logger.addLog('서비스 워커가 일시 중단됩니다.', 'warn');
  
  // 정리 작업
  BackgroundState.cleanup();
});

// 서비스 워커 재개
chrome.runtime.onSuspendCanceled.addListener(() => {
  console.log('서비스 워커 중단이 취소되었습니다.');
  Logger.addLog('서비스 워커 중단이 취소되었습니다.', 'info');
  
  // 다시 활성화
  BackgroundState.keepAlive();
});

// 백그라운드 페이지 초기화 - 스크립트 로드 시 실행
BackgroundState.keepAlive(); 