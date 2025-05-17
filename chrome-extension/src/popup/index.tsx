import React, { useState, useEffect } from 'react';
import './index.css';

const Popup = () => {
  const [settings, setSettings] = useState({
    apiKey: '',
    model: 'gpt-3.5-turbo',
    tone: 'professional',
  });
  
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [activeTab, setActiveTab] = useState<'settings' | 'logs' | 'context'>('settings');
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [lastContext, setLastContext] = useState<any>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  
  // 설정 변경 핸들러
  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };
  
  // 설정 저장
  const saveSettings = () => {
    chrome.runtime.sendMessage({ action: 'saveSettings', settings }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError);
        setIsConnected(false);
        return;
      }
      
      if (response && response.success) {
        alert('설정이 저장되었습니다.');
      } else {
        alert('설정 저장 중 오류가 발생했습니다.');
      }
    });
  };
  
  // 로그 가져오기
  const fetchLogs = () => {
    setIsLoadingLogs(true);
    chrome.runtime.sendMessage({ action: 'getLogs' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError);
        setIsConnected(false);
        setIsLoadingLogs(false);
        return;
      }
      
      if (response && Array.isArray(response.logs)) {
        setLogs(response.logs);
      } else {
        console.error('Invalid logs response:', response);
      }
      setIsLoadingLogs(false);
    });
  };
  
  // 컨텍스트 가져오기
  const fetchLastContext = () => {
    setIsLoadingContext(true);
    chrome.runtime.sendMessage({ action: 'getLastContext' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError);
        setIsConnected(false);
        setIsLoadingContext(false);
        return;
      }
      
      if (response && response.context) {
        setLastContext(response.context);
      } else {
        console.error('Invalid context response:', response);
        setLastContext(null);
      }
      setIsLoadingContext(false);
    });
  };
  
  // 로그 지우기
  const clearLogs = () => {
    if (!confirm('모든 로그를 지우시겠습니까?')) return;
    
    chrome.runtime.sendMessage({ action: 'clearLogs' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError);
        setIsConnected(false);
        return;
      }
      
      if (response && response.success) {
        setLogs([]);
        alert('로그가 삭제되었습니다.');
      } else {
        alert('로그 삭제 중 오류가 발생했습니다.');
      }
    });
  };
  
  // 컨텍스트를 클립보드에 복사
  const copyContextToClipboard = () => {
    if (!lastContext) return;
    
    try {
      const contextStr = JSON.stringify(lastContext, null, 2);
      navigator.clipboard.writeText(contextStr).then(
        () => {
          alert('컨텍스트가 클립보드에 복사되었습니다.');
        },
        (err) => {
          console.error('클립보드 복사 실패:', err);
          alert('클립보드 복사에 실패했습니다.');
        }
      );
    } catch (error) {
      console.error('컨텍스트 복사 중 오류:', error);
      alert('컨텍스트 복사 중 오류가 발생했습니다.');
    }
  };
  
  // 연결 상태 확인
  const checkConnection = () => {
    chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Connection error:', chrome.runtime.lastError);
        setIsConnected(false);
      } else {
        setIsConnected(true);
      }
    });
  };
  
  // 초기 설정 로드
  useEffect(() => {
    chrome.runtime.sendMessage({ action: 'getSettings' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError);
        setIsConnected(false);
        return;
      }
      
      if (response && response.settings) {
        setSettings(response.settings);
      }
    });
    
    // 연결 상태 주기적으로 확인
    checkConnection();
    const connectionInterval = setInterval(checkConnection, 5000);
    
    return () => clearInterval(connectionInterval);
  }, []);
  
  // 활성 탭에 따라 데이터 불러오기
  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    } else if (activeTab === 'context') {
      fetchLastContext();
    }
  }, [activeTab]);
  
  // 로그가 열려 있을 때 주기적으로 새로고침
  useEffect(() => {
    if (activeTab === 'logs') {
      const logsInterval = setInterval(fetchLogs, 3000);
      return () => clearInterval(logsInterval);
    }
    
    if (activeTab === 'context') {
      const contextInterval = setInterval(fetchLastContext, 3000);
      return () => clearInterval(contextInterval);
    }
  }, [activeTab]);
  
  // 로그 토글
  const toggleLogExpanded = (id: string) => {
    setExpandedLogs(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  return (
    <div className="popup">
      <header className="header">
        <h1>X 헬퍼</h1>
        {!isConnected && (
          <div className="connection-error">
            연결 오류: 백그라운드 스크립트에 연결할 수 없습니다.
            <button onClick={checkConnection}>재연결</button>
          </div>
        )}
      </header>
      
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          설정
        </button>
        <button 
          className={`tab ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          로그
        </button>
        <button 
          className={`tab ${activeTab === 'context' ? 'active' : ''}`}
          onClick={() => setActiveTab('context')}
        >
          컨텍스트
        </button>
      </div>
      
      <div className="tab-content">
        {activeTab === 'settings' && (
          <div className="settings">
            <div className="form-group">
              <label htmlFor="apiKey">API 키</label>
              <input
                type="password"
                id="apiKey"
                name="apiKey"
                value={settings.apiKey}
                onChange={handleSettingsChange}
                placeholder="OpenAI API 키를 입력하세요"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="model">모델</label>
              <select 
                id="model" 
                name="model" 
                value={settings.model}
                onChange={handleSettingsChange}
              >
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                <option value="gpt-4">GPT-4</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="tone">톤</label>
              <select 
                id="tone" 
                name="tone" 
                value={settings.tone}
                onChange={handleSettingsChange}
              >
                <option value="professional">전문적</option>
                <option value="casual">친근한</option>
                <option value="humorous">유머러스</option>
                <option value="academic">학술적</option>
              </select>
            </div>
            
            <button className="save-button" onClick={saveSettings}>
              설정 저장
            </button>
          </div>
        )}
        
        {activeTab === 'logs' && (
          <div className="logs">
            <div className="logs-header">
              <h2>로그</h2>
              <div className="logs-actions">
                <button onClick={fetchLogs} disabled={isLoadingLogs}>
                  {isLoadingLogs ? "로딩 중..." : "새로고침"}
                </button>
                <button onClick={clearLogs}>모두 지우기</button>
              </div>
            </div>
            
            {isLoadingLogs && logs.length === 0 ? (
              <div className="loading">로그를 불러오는 중...</div>
            ) : logs.length === 0 ? (
              <div className="empty-logs">로그가 없습니다.</div>
            ) : (
              <div className="logs-list">
                {logs.map((log, index) => (
                  <div 
                    key={index} 
                    className={`log-item ${log.type}`}
                    onClick={() => toggleLogExpanded(log.id)}
                  >
                    <div className="log-header">
                      <span className={`log-type ${log.type}`}>
                        {log.type === 'info' && 'ℹ️'}
                        {log.type === 'success' && '✅'}
                        {log.type === 'warn' && '⚠️'}
                        {log.type === 'error' && '❌'}
                      </span>
                      <span className="log-message">{log.message}</span>
                      <span className="log-time">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    {log.data && expandedLogs[log.id] && (
                      <div className="log-data">
                        <pre>{JSON.stringify(log.data, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'context' && (
          <div className="context">
            <div className="context-header">
              <h2>트윗 컨텍스트</h2>
              <div className="context-actions">
                <button onClick={fetchLastContext} disabled={isLoadingContext}>
                  {isLoadingContext ? "로딩 중..." : "새로고침"}
                </button>
                <button onClick={copyContextToClipboard} disabled={!lastContext}>
                  클립보드에 복사
                </button>
              </div>
            </div>
            
            {isLoadingContext && !lastContext ? (
              <div className="loading">컨텍스트를 불러오는 중...</div>
            ) : !lastContext ? (
              <div className="empty-context">
                <p>저장된 컨텍스트가 없습니다.</p>
                <p>트위터에서 컨텍스트 수집 버튼을 클릭하여 컨텍스트를 수집하세요.</p>
              </div>
            ) : (
              <ContextViewer context={lastContext} />
            )}
          </div>
        )}
      </div>
      
      <footer className="footer">
        <p>X 헬퍼 v0.1.0 - 버그 및 개선 문의는 개발자에게 연락해주세요.</p>
      </footer>
    </div>
  );
};

// 컨텍스트 뷰어 컴포넌트
const ContextViewer = ({ context }: { context: any }) => {
  if (!context || !context.thread_context) {
    return <div className="context-error">컨텍스트 데이터가 유효하지 않습니다.</div>;
  }
  
  const threadContext = context.thread_context;
  const timestamp = context.timestamp ? new Date(context.timestamp).toLocaleString() : '알 수 없음';
  const structure = threadContext.threadStructure || '알 수 없음';
  const tweetCount = threadContext.collection_stats?.found_tweets || 0;
  
  return (
    <div className="context-viewer">
      <div className="context-info">
        <div className="context-info-item">
          <strong>수집 시간:</strong> {timestamp}
        </div>
        <div className="context-info-item">
          <strong>스레드 구조:</strong> {structure}
        </div>
        <div className="context-info-item">
          <strong>트윗 수:</strong> {tweetCount}
        </div>
        {context.settings && (
          <div className="context-info-item">
            <strong>설정:</strong> 모델: {context.settings.model}, 톤: {context.settings.tone}
          </div>
        )}
      </div>
      
      <div className="context-tweets">
        <h3>트윗 구조</h3>
        
        {/* 메인 트윗 */}
        {threadContext.mainTweet && (
          <div className="context-tweet main-tweet">
            <h4>메인 트윗</h4>
            <div className="tweet-author">
              <strong>{threadContext.mainTweet.author.name}</strong>
              <span className="username">@{threadContext.mainTweet.author.username}</span>
            </div>
            <div className="tweet-text">{threadContext.mainTweet.text}</div>
            {threadContext.mainTweet.media && threadContext.mainTweet.media.length > 0 && (
              <div className="tweet-media">
                <span>🖼️ {threadContext.mainTweet.media.length}개의 미디어 첨부됨</span>
              </div>
            )}
          </div>
        )}
        
        {/* 중간 답글들 */}
        {threadContext.intermediateReplies && threadContext.intermediateReplies.length > 0 && (
          <div className="intermediate-replies">
            <h4>중간 답글 ({threadContext.intermediateReplies.length}개)</h4>
            {threadContext.intermediateReplies.map((reply: any, index: number) => (
              <div className="context-tweet reply-tweet" key={index}>
                <div className="tweet-author">
                  <strong>{reply.author.name}</strong>
                  <span className="username">@{reply.author.username}</span>
                </div>
                <div className="tweet-text">{reply.text}</div>
                {reply.media && reply.media.length > 0 && (
                  <div className="tweet-media">
                    <span>🖼️ {reply.media.length}개의 미디어 첨부됨</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* 답장 대상 */}
        {threadContext.replyTarget && (
          <div className="context-tweet reply-target">
            <h4>답장 대상</h4>
            <div className="tweet-author">
              <strong>{threadContext.replyTarget.author.name}</strong>
              <span className="username">@{threadContext.replyTarget.author.username}</span>
            </div>
            <div className="tweet-text">{threadContext.replyTarget.text}</div>
            {threadContext.replyTarget.media && threadContext.replyTarget.media.length > 0 && (
              <div className="tweet-media">
                <span>🖼️ {threadContext.replyTarget.media.length}개의 미디어 첨부됨</span>
              </div>
            )}
          </div>
        )}
        
        {/* 사용자 입력 */}
        {context.user_input && (
          <div className="user-input">
            <h4>사용자 입력</h4>
            <div className="input-text">{context.user_input}</div>
          </div>
        )}
      </div>
      
      {/* 컨텍스트 수집 통계 */}
      {threadContext.collection_stats && (
        <div className="collection-stats">
          <h3>수집 통계</h3>
          <div className="stats-item">
            <strong>찾은 트윗:</strong> {threadContext.collection_stats.found_tweets}개
          </div>
          {threadContext.collection_stats.total_text_length !== undefined && (
            <div className="stats-item">
              <strong>총 텍스트 길이:</strong> {threadContext.collection_stats.total_text_length}자
            </div>
          )}
          {threadContext.collection_stats.errors && threadContext.collection_stats.errors.length > 0 && (
            <div className="stats-errors">
              <strong>오류 ({threadContext.collection_stats.errors.length}):</strong>
              <ul>
                {threadContext.collection_stats.errors.map((error: string, index: number) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {/* 전체 JSON 데이터 */}
      <div className="raw-context">
        <h3>전체 JSON 데이터</h3>
        <div className="json-data">
          <pre>{JSON.stringify(context, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
};

export default Popup; 