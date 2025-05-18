import React, { useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

// 타입 정의
interface Settings {
  isEnabled: boolean;
  apiKey: string;
  model: string;
  toneOptions: string[];
  selectedTone: string;
  useCustomPrompt: boolean;
  customPrompt: string;
  modelOptions?: string[];
}

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'warn' | 'error' | 'success';
  details?: string;
}

// 확장 프로그램 연결 상태 확인 함수
const checkExtensionConnection = async (): Promise<boolean> => {
  try {
    await chrome.runtime.sendMessage({ action: 'ping' });
    return true;
  } catch (error) {
    console.error('확장 프로그램 연결 오류:', error);
    return false;
  }
};

// 오류 처리가 개선된 메시지 전송 함수
const sendMessageToBackground = async (action: string, data?: any): Promise<any> => {
  try {
    const response = await chrome.runtime.sendMessage({ action, data });
    if (response && response.error) {
      throw new Error(response.error);
    }
    return response;
  } catch (error) {
    console.error(`메시지 전송 오류 (${action}):`, error);
    throw error;
  }
};

// 연결 상태 컴포넌트
const ConnectionStatus: React.FC<{ connected: boolean }> = ({ connected }) => (
  <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
    <span className="status-indicator"></span>
    <span className="status-text">{connected ? '연결됨' : '연결 끊김'}</span>
  </div>
);

// 로그 항목 컴포넌트
const LogItem: React.FC<{ log: LogEntry }> = ({ log }) => {
  const [showDetails, setShowDetails] = useState(false);
  
  // 타임스탬프를 읽기 쉬운 형식으로 변환
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString();
    } catch (e) {
      return timestamp;
    }
  };
  
  // 로그 타입에 따른 스타일 
  const getLogTypeStyle = (type: string) => {
    switch (type) {
      case 'error':
        return { color: '#e53935', fontWeight: 'bold' };
      case 'warn':
        return { color: '#fb8c00' };
      case 'success':
        return { color: '#43a047' };
      case 'info':
      default:
        return { color: '#1976d2' };
    }
  };
  
  // JSON 형식의 상세 정보가 있는 경우 파싱
  const getDetails = () => {
    if (!log.details) return null;
    
    try {
      const detailsObj = JSON.parse(log.details);
      return (
        <pre className="log-details">
          {JSON.stringify(detailsObj, null, 2)}
        </pre>
      );
    } catch (e) {
      return <pre className="log-details">{log.details}</pre>;
    }
  };
  
  return (
    <div className="log-item">
      <div 
        className="log-header" 
        onClick={() => log.details && setShowDetails(!showDetails)}
        style={{ cursor: log.details ? 'pointer' : 'default' }}
      >
        <span className="log-time">{formatTimestamp(log.timestamp)}</span>
        <span className="log-type" style={getLogTypeStyle(log.type)}>
          {log.type.toUpperCase()}
        </span>
        <span className="log-message">{log.message}</span>
        {log.details && (
          <span className="log-toggle">
            {showDetails ? '▼' : '►'}
          </span>
        )}
      </div>
      {showDetails && getDetails()}
    </div>
  );
};

// 디버그 로그 컴포넌트
const DebugLogs: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);
  const refreshIntervalRef = useRef<number | null>(null);
  
  // 로그 로드
  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 먼저 연결 확인
      const isConnected = await checkExtensionConnection();
      setConnected(isConnected);
      
      if (!isConnected) {
        setError('확장 프로그램과 연결이 끊어졌습니다. 페이지를 새로고침해 주세요.');
        setLoading(false);
        return;
      }
      
      const response = await sendMessageToBackground('getLogs');
      if (response && response.logs) {
        setLogs(response.logs);
      }
    } catch (error) {
      console.error('로그 로드 오류:', error);
      setError('로그를 로드하는 중 오류가 발생했습니다.');
    }
    setLoading(false);
  };
  
  // 로그 초기화
  const clearLogs = async () => {
    setError(null);
    try {
      // 먼저 연결 확인
      const isConnected = await checkExtensionConnection();
      setConnected(isConnected);
      
      if (!isConnected) {
        setError('확장 프로그램과 연결이 끊어졌습니다. 페이지를 새로고침해 주세요.');
        return;
      }
      
      await sendMessageToBackground('clearLogs');
      setLogs([]);
    } catch (error) {
      console.error('로그 초기화 오류:', error);
      setError('로그를 초기화하는 중 오류가 발생했습니다.');
    }
  };

  // 자동 새로고침 토글
  const toggleAutoRefresh = () => {
    if (autoRefresh) {
      // 자동 새로고침 중지
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    } else {
      // 자동 새로고침 시작
      refreshIntervalRef.current = window.setInterval(loadLogs, 3000) as unknown as number;
    }
    setAutoRefresh(!autoRefresh);
  };
  
  // 컴포넌트 마운트 시 로그 로드
  useEffect(() => {
    loadLogs();
    
    // 컴포넌트 언마운트 시 인터벌 정리
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);
  
  // 새 로그 메시지 수신 리스너
  useEffect(() => {
    const handleLogUpdate = (message: any) => {
      if (message.action === 'logUpdated') {
        loadLogs();
      }
    };
    
    chrome.runtime.onMessage.addListener(handleLogUpdate);
    
    return () => {
      chrome.runtime.onMessage.removeListener(handleLogUpdate);
    };
  }, []);
  
  // 연결 상태 주기적 확인
  useEffect(() => {
    const checkConnection = async () => {
      const isConnected = await checkExtensionConnection();
      setConnected(isConnected);
    };
    
    // 10초마다 연결 상태 확인
    const interval = setInterval(checkConnection, 10000);
    
    return () => clearInterval(interval);
  }, []);
  
  if (loading && logs.length === 0) {
    return <div className="logs-loading">로그 로딩 중...</div>;
  }
  
  return (
    <div className="debug-logs">
      <div className="logs-header">
        <div className="header-title">
          <h2>디버그 로그</h2>
          <ConnectionStatus connected={connected} />
        </div>
        <div className="logs-actions">
          <button onClick={loadLogs} className="refresh-button">새로고침</button>
          <button 
            onClick={toggleAutoRefresh} 
            className={`auto-refresh-button ${autoRefresh ? 'active' : ''}`}
          >
            {autoRefresh ? '자동 새로고침 중지' : '자동 새로고침'}
          </button>
          <button onClick={clearLogs} className="clear-button">초기화</button>
        </div>
      </div>
      
      {error && (
        <div className="log-error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}
      
      <div className="logs-container">
        {logs.length === 0 ? (
          <div className="no-logs">로그가 없습니다.</div>
        ) : (
          logs.map((log, index) => (
            <LogItem key={index} log={log} />
          ))
        )}
      </div>
    </div>
  );
};

// 메인 팝업 컴포넌트
const Popup: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    isEnabled: true,
    apiKey: "",
    model: "gpt-3.5-turbo",
    toneOptions: ["친근한", "전문적인", "유머러스한", "학술적인"],
    selectedTone: "친근한",
    useCustomPrompt: false,
    customPrompt: "",
    modelOptions: ['gpt-4o-mini', 'gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);
  const [activeTab, setActiveTab] = useState<'settings' | 'logs' | 'context'>('settings');
  const [lastContext, setLastContext] = useState<any>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);

  // 연결 상태 확인
  const checkConnection = async () => {
    const isConnected = await checkExtensionConnection();
    setConnected(isConnected);
    return isConnected;
  };

  // 마지막 컨텍스트 가져오기
  const fetchLastContext = async () => {
    setIsLoadingContext(true);
    setError(null);
    
    try {
      const response = await sendMessageToBackground('getLastContext');
      if (response && response.context) {
        setLastContext(response.context);
      } else if (response && response.error) {
        setError(`컨텍스트 로드 오류: ${response.error}`);
      } else {
        setLastContext(null);
      }
    } catch (error) {
      console.error("컨텍스트 로드 오류:", error);
      setError("컨텍스트를 로드하는 중 오류가 발생했습니다.");
    }
    
    setIsLoadingContext(false);
  };

  // 컨텍스트 복사
  const copyContextToClipboard = () => {
    if (!lastContext) return;
    
    const textToCopy = JSON.stringify(lastContext, null, 2);
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        setStatusMessage("컨텍스트가 클립보드에 복사되었습니다.");
        setTimeout(() => setStatusMessage(""), 2000);
      })
      .catch(err => {
        setError("클립보드 복사 중 오류가 발생했습니다.");
        console.error("클립보드 복사 오류:", err);
      });
  };

  // 설정 로드
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // 먼저 연결 확인
        const isConnected = await checkConnection();
        if (!isConnected) {
          setError('확장 프로그램과 연결이 끊어졌습니다. 페이지를 새로고침해 주세요.');
          setIsLoading(false);
          return;
        }
        
        const response = await sendMessageToBackground('getSettings');
        if (response && response.settings) {
          setSettings(response.settings);
        }
      } catch (error) {
        console.error("설정 로드 오류:", error);
        setError("설정을 로드하는 중 오류가 발생했습니다.");
      }
      setIsLoading(false);
    };

    loadSettings();
    
    // 10초마다 연결 상태 확인
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, []);

  // 컨텍스트 탭이 활성화되면 컨텍스트 로드
  useEffect(() => {
    if (activeTab === 'context') {
      fetchLastContext();
    }
  }, [activeTab]);

  // 설정 저장
  const saveSettings = async () => {
    setIsLoading(true);
    setError(null);
    setStatusMessage("");
    
    try {
      // 먼저 연결 확인
      const isConnected = await checkConnection();
      if (!isConnected) {
        setError('확장 프로그램과 연결이 끊어졌습니다. 페이지를 새로고침해 주세요.');
        setIsLoading(false);
        return;
      }
      
      await sendMessageToBackground('saveSettings', settings);
      setStatusMessage("설정이 저장되었습니다.");
      
      // 설정 변경 알림 - 개선된 오류 처리
      try {
        // 현재 활성 탭이 X.com인지 확인
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0]?.id) {
          // 탭 URL이 X.com인 경우에만 메시지 전송 시도
          const tabUrl = tabs[0].url || '';
          if (tabUrl.includes('twitter.com') || tabUrl.includes('x.com')) {
            // 메시지 전송 시 타임아웃 설정
            const messagePromise = chrome.tabs.sendMessage(tabs[0].id, { action: "settingsUpdated" });
            await Promise.race([
              messagePromise,
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('알림 전송 타임아웃')), 1000)
              )
            ]);
            console.log("설정 변경 알림 성공적으로 전송됨");
          } else {
            console.log("현재 탭이 X.com이 아니므로 알림 전송 생략");
          }
        }
      } catch (error) {
        // 오류가 발생해도 설정 저장에는 영향 없음
        console.log("설정 변경 알림 실패 (무시됨):", error);
        // 사용자에게 오류를 표시하지 않음 - 이는 중요하지 않은 작업이므로
      }
      
      setTimeout(() => {
        setStatusMessage("");
      }, 2000);
    } catch (error) {
      console.error("설정 저장 오류:", error);
      setError("설정을 저장하는 중 오류가 발생했습니다.");
    }
    setIsLoading(false);
  };

  // 입력 변경 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setSettings({
      ...settings,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    });
  };

  // 폼 제출 핸들러
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings();
  };

  if (isLoading && activeTab === 'settings') {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <div className="popup-container">
      <header className="popup-header">
        <div className="title-container">
          <h1>X 헬퍼</h1>
          <ConnectionStatus connected={connected} />
        </div>
        <div className="tabs">
          <button 
            className={activeTab === 'settings' ? 'active' : ''} 
            onClick={() => setActiveTab('settings')}
          >
            설정
          </button>
          <button 
            className={activeTab === 'logs' ? 'active' : ''} 
            onClick={() => setActiveTab('logs')}
          >
            로그
          </button>
          <button 
            className={activeTab === 'context' ? 'active' : ''} 
            onClick={() => setActiveTab('context')}
          >
            컨텍스트
          </button>
        </div>
      </header>
      
      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}
      
      {activeTab === 'settings' ? (
        <form onSubmit={handleSubmit} className="settings-form">
          <div className="form-group">
            <label htmlFor="isEnabled" className="toggle-label">
              <span>익스텐션 활성화</span>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  id="isEnabled"
                  name="isEnabled"
                  checked={settings.isEnabled}
                  onChange={handleInputChange}
                />
                <span className="toggle-slider"></span>
              </div>
            </label>
          </div>
          
          <div className="form-group">
            <label htmlFor="apiKey">OpenAI API 키 (선택사항)</label>
            <input
              type="password"
              id="apiKey"
              name="apiKey"
              value={settings.apiKey}
              onChange={handleInputChange}
              placeholder="sk-..."
            />
            <small>자신의 API 키를 사용하면 더 빠른 응답을 받을 수 있습니다.</small>
          </div>
          
          <div className="form-group">
            <label htmlFor="model">AI 모델</label>
            <select id="model" name="model" value={settings.model} onChange={handleInputChange}>
              {settings.modelOptions ? (
                // modelOptions가 있으면 그것을 사용
                settings.modelOptions.map((model) => (
                  <option key={model} value={model}>
                    {model === 'gpt-4o-mini' ? 'GPT-4o-mini (추천)' :
                     model === 'gpt-3.5-turbo' ? 'GPT-3.5 Turbo (빠름)' :
                     model === 'gpt-4' ? 'GPT-4 (더 정확함)' :
                     model === 'gpt-4-turbo' ? 'GPT-4 Turbo (빠름 + 정확함)' : model}
                  </option>
                ))
              ) : (
                // 기본 옵션 폴백
                <>
                  <option value="gpt-4o-mini">GPT-4o-mini (추천)</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo (빠름)</option>
                  <option value="gpt-4">GPT-4 (더 정확함)</option>
                </>
              )}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="selectedTone">기본 톤</label>
            <select id="selectedTone" name="selectedTone" value={settings.selectedTone} onChange={handleInputChange}>
              {settings.toneOptions.map((tone) => (
                <option key={tone} value={tone}>
                  {tone}
                </option>
              ))}
            </select>
            <small>선택한 톤에 맞게 생성된 응답의 스타일이 달라집니다.</small>
          </div>
          
          <div className="settings-section">
            <h3>프롬프트 설정</h3>
            
            <div className="form-group">
              <label htmlFor="useCustomPrompt" className="toggle-label">
                <span>사용자 지정 프롬프트 사용</span>
                <div className="toggle-switch">
                  <input
                    type="checkbox"
                    id="useCustomPrompt"
                    name="useCustomPrompt"
                    checked={settings.useCustomPrompt}
                    onChange={handleInputChange}
                  />
                  <span className="toggle-slider"></span>
                </div>
              </label>
              <small>자신만의 프롬프트를 사용하고 싶을 때 활성화하세요.</small>
            </div>
            
            {settings.useCustomPrompt && (
              <div className="form-group">
                <label htmlFor="customPrompt">사용자 지정 프롬프트</label>
                <textarea
                  id="customPrompt"
                  name="customPrompt"
                  value={settings.customPrompt}
                  onChange={handleInputChange}
                  placeholder="&#123;&#123;THREAD_CONTEXT&#125;&#125;와 &#123;&#123;USER_INPUT&#125;&#125; 태그를 사용하여 프롬프트를 작성하세요."
                  rows={6}
                />
                <small>
                  <code>&#123;&#123;THREAD_CONTEXT&#125;&#125;</code>: 트윗 스레드의 컨텍스트<br />
                  <code>&#123;&#123;USER_INPUT&#125;&#125;</code>: 사용자가 입력한 텍스트
                </small>
              </div>
            )}
            
            <div className="prompt-info">
              <h4>기본 프롬프트</h4>
              <p>각 톤별로 미리 정의된 프롬프트가 있으며, 다음과 같은 특징을 가집니다:</p>
              <ul>
                <li><strong>친근한</strong>: 일상적인 언어, 이모지 사용, 공감적 표현</li>
                <li><strong>전문적인</strong>: 객관적 정보, 논리적 구조, 정중한 표현</li>
                <li><strong>유머러스한</strong>: 재치있는 표현, 창의적 비유, 가벼운 농담</li>
                <li><strong>학술적인</strong>: 깊이 있는 분석, 논리적 근거, 전문 용어</li>
              </ul>
            </div>
          </div>
          
          <button type="submit" className="save-button" disabled={!connected}>
            설정 저장
          </button>
          
          {statusMessage && <div className="status-message">{statusMessage}</div>}
        </form>
      ) : activeTab === 'logs' ? (
        <DebugLogs />
      ) : (
        <ContextViewer 
          context={lastContext} 
          isLoading={isLoadingContext} 
          onRefresh={fetchLastContext}
          onCopy={copyContextToClipboard}
          statusMessage={statusMessage}
        />
      )}
      
      <footer className="popup-footer">
        <p>X 헬퍼 v{chrome.runtime.getManifest().version}</p>
      </footer>
    </div>
  );
};

// 컨텍스트 뷰어 컴포넌트
const ContextViewer: React.FC<{
  context: any;
  isLoading: boolean;
  onRefresh: () => void;
  onCopy: () => void;
  statusMessage: string;
}> = ({ context, isLoading, onRefresh, onCopy, statusMessage }) => {
  const renderThreadStructure = () => {
    if (!context || !context.thread_context) return null;
    
    const threadContext = context.thread_context;
    const mainTweet = threadContext.mainTweet;
    const replyTarget = threadContext.replyTarget;
    
    return (
      <div className="thread-structure">
        <h3>트윗 스레드 구조</h3>
        <div className="thread-summary">
          {threadContext.threadStructure}
        </div>
        
        {mainTweet && (
          <div className="tweet-card main-tweet">
            <div className="tweet-header">
              <strong>메인 트윗</strong> - {mainTweet.author.username}
              <span className="tweet-time">{formatTime(mainTweet.timestamp)}</span>
            </div>
            <div className="tweet-content">{mainTweet.text}</div>
          </div>
        )}
        
        {threadContext.intermediateReplies && threadContext.intermediateReplies.length > 0 && (
          <>
            <h4>중간 답글 ({threadContext.intermediateReplies.length}개)</h4>
            {threadContext.intermediateReplies.map((reply: any, index: number) => (
              <div key={index} className="tweet-card intermediate-reply">
                <div className="tweet-header">
                  {reply.author.username}
                  <span className="tweet-time">{formatTime(reply.timestamp)}</span>
                </div>
                <div className="tweet-content">{reply.text}</div>
              </div>
            ))}
          </>
        )}
        
        {replyTarget && (
          <div className="tweet-card reply-target">
            <div className="tweet-header">
              <strong>답장 대상 트윗</strong> - {replyTarget.author.username}
              <span className="tweet-time">{formatTime(replyTarget.timestamp)}</span>
            </div>
            <div className="tweet-content">{replyTarget.text}</div>
          </div>
        )}
      </div>
    );
  };
  
  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (e) {
      return timestamp;
    }
  };
  
  if (isLoading) {
    return <div className="context-loading">컨텍스트 로딩 중...</div>;
  }
  
  return (
    <div className="context-viewer">
      <div className="context-header">
        <h2>트윗 컨텍스트</h2>
        <div className="context-actions">
          <button onClick={onRefresh} className="refresh-button">새로고침</button>
          <button onClick={onCopy} className="copy-button" disabled={!context}>복사</button>
        </div>
      </div>
      
      {statusMessage && <div className="context-status-message">{statusMessage}</div>}
      
      {!context ? (
        <div className="no-context">
          <p>수집된 컨텍스트가 없습니다.</p>
          <p className="small-text">X.com에서 로봇 버튼을 클릭하면 컨텍스트가 수집됩니다.</p>
        </div>
      ) : (
        <div className="context-content">
          <div className="context-stats">
            <div className="stat-item">
              <strong>수집 시간:</strong> {formatTime(context.timestamp)}
            </div>
            <div className="stat-item">
              <strong>트윗 개수:</strong> {context.thread_context?.collection_stats?.found_tweets || 0}
            </div>
            <div className="stat-item">
              <strong>사용자 입력:</strong> {context.user_input ? context.user_input : "(없음)"}
            </div>
            <div className="stat-item">
              <strong>톤:</strong> {context.settings?.tone || "기본"}
            </div>
          </div>
          
          {renderThreadStructure()}
          
          <div className="raw-context">
            <h3>원본 컨텍스트 데이터</h3>
            <details>
              <summary>JSON 데이터 보기</summary>
              <pre className="context-json">{JSON.stringify(context, null, 2)}</pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
};

// 로그 항목 및 디버그 영역을 위한 CSS 스타일 추가
const addStyles = () => {
  const style = document.createElement('style');
  style.textContent = `
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
  `;
  document.head.appendChild(style);
};

// 스타일 추가
addStyles();

// 루트에 렌더링
const container = document.getElementById("app");
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
} 