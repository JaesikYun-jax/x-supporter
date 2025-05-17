import { ThreadContext, TweetData } from './types';

// 로깅 함수
function log(message: string, level: 'info' | 'success' | 'warn' | 'error' = 'info'): void {
  console.log(`[X 헬퍼] ${message}`);
  
  // 로그를 백그라운드 스크립트로 전송
  try {
    chrome.runtime.sendMessage({
      action: 'addLog',
      message,
      type: level,
      data: { location: 'content_script' }
    });
  } catch (error) {
    console.error('[X 헬퍼] 로그 전송 중 오류:', error);
  }
}

// 백그라운드 스크립트로 로그 전송
function sendLog(message: string, level: 'info' | 'success' | 'warn' | 'error' = 'info', data: any = {}): void {
  try {
    chrome.runtime.sendMessage({
      action: 'addLog',
      message,
      type: level,
      data: { ...data, location: 'content_script' }
    });
  } catch (error) {
    console.error('[X 헬퍼] 로그 전송 중 오류:', error);
  }
}

/**
 * 현재 트윗 스레드의 컨텍스트를 수집합니다.
 * 메인 트윗, 답장 대상, 중간 답글 등을 포함합니다.
 */
function getTweetThreadContext(): ThreadContext {
  try {
    log('getTweetThreadContext 함수 시작...');
    
    // 현재 페이지에서 모든 트윗 요소 찾기
    const tweetElements = document.querySelectorAll('[data-testid="tweet"]');
    log(`페이지에서 ${tweetElements.length}개의 트윗 요소 발견`);
    
    if (tweetElements.length === 0) {
      log('트윗 요소가 없습니다. 빈 컨텍스트를 반환합니다.', 'warn');
      return {
        threadStructure: 'unknown',
        collected_at: new Date().toISOString(),
        collection_stats: {
          found_tweets: 0,
          errors: ['No tweet elements found on page'],
          success: false
        }
      };
    }
    
    // 결과를 저장할 객체
    const result: ThreadContext = {
      threadStructure: 'unknown',
      intermediateReplies: [],
      collected_at: new Date().toISOString(),
      collection_stats: {
        found_tweets: 0,
        errors: [],
        success: true
      }
    };
    
    // 발견된 모든 트윗 파싱
    const tweets: TweetData[] = [];
    tweetElements.forEach((element, index) => {
      try {
        const tweet = parseTweet(element);
        if (tweet) {
          tweets.push(tweet);
          log(`트윗 ${index + 1} 파싱 성공: ${tweet.author.name} (@${tweet.author.username})`);
        }
      } catch (error) {
        log(`트윗 ${index + 1} 파싱 실패: ${error}`, 'error');
        if (result.collection_stats?.errors) {
          result.collection_stats.errors.push(`Tweet ${index + 1} parsing error: ${error}`);
        }
      }
    });
    
    log(`${tweets.length}개의 트윗을 성공적으로 파싱했습니다.`);
    
    // 총 텍스트 길이 계산
    const totalTextLength = tweets.reduce((sum, tweet) => sum + tweet.text.length, 0);
    if (result.collection_stats) {
      result.collection_stats.found_tweets = tweets.length;
      result.collection_stats.total_text_length = totalTextLength;
    }
    
    // 트윗이 없으면 빈 컨텍스트 반환
    if (tweets.length === 0) {
      log('파싱된 트윗이 없습니다. 빈 컨텍스트를 반환합니다.', 'warn');
      if (result.collection_stats) {
        result.collection_stats.success = false;
      }
      return result;
    }
    
    // 스레드 구조 판별
    if (tweets.length === 1) {
      // 단일 트윗
      result.threadStructure = 'main-tweet';
      result.mainTweet = tweets[0];
      log('단일 트윗(메인 트윗) 구조로 감지되었습니다.');
      if (result.collection_stats) {
        result.collection_stats.has_main_tweet = true;
        result.collection_stats.has_reply_target = false;
        result.collection_stats.intermediate_replies_count = 0;
      }
    } else {
      // 2개 이상의 트윗이 있는 경우 - 답장 구조로 가정
      result.threadStructure = 'reply';
      
      // 마지막 트윗이 메인 트윗(현재 사용자가 쓰고 있는 트윗)
      result.mainTweet = tweets[tweets.length - 1];
      
      // 첫 번째 트윗이 답장 대상 (스레드 시작점)
      result.replyTarget = tweets[0];
      
      // 컬렉션 통계 업데이트
      if (result.collection_stats) {
        result.collection_stats.has_main_tweet = !!result.mainTweet;
        result.collection_stats.has_reply_target = !!result.replyTarget;
      }
      
      // 중간 트윗들은 모든 중간 답글
      if (tweets.length > 2) {
        result.intermediateReplies = tweets.slice(1, tweets.length - 1);
        log(`답장 구조 감지: 메인 트윗, 답장 대상, ${result.intermediateReplies.length}개의 중간 답글`);
        if (result.collection_stats) {
          result.collection_stats.intermediate_replies_count = result.intermediateReplies.length;
        }
      } else {
        result.intermediateReplies = [];
        log('답장 구조 감지: 메인 트윗과 답장 대상만 존재');
        if (result.collection_stats) {
          result.collection_stats.intermediate_replies_count = 0;
        }
      }
    }
    
    log('컨텍스트 수집 완료');
    sendLog('컨텍스트 수집 완료', 'success', {
      structure: result.threadStructure,
      tweet_count: result.collection_stats?.found_tweets,
      text_length: result.collection_stats?.total_text_length
    });
    return result;
  } catch (error) {
    log(`컨텍스트 수집 중 오류 발생: ${error}`, 'error');
    sendLog('컨텍스트 수집 실패', 'error', { error: String(error) });
    
    // 에러가 있더라도 부분적인 결과라도 반환
    return {
      threadStructure: 'unknown',
      collected_at: new Date().toISOString(),
      collection_stats: {
        found_tweets: 0,
        errors: [String(error)],
        success: false
      }
    };
  }
}

/**
 * AI 응답을 생성합니다.
 * @param options 응답 생성 옵션
 */
async function generateResponses(options: {
  tweetText: string;
  tone?: string;
  model?: string;
}) {
  try {
    log('응답 생성 시작...');
    
    // 트윗 컨텍스트 수집
    const threadContext = getTweetThreadContext();
    
    // 컨텍스트를 로컬에 저장
    const fullContext = {
      tweetText: options.tweetText,
      threadContext,
      tone: options.tone || 'default',
      model: options.model || 'default',
      timestamp: new Date().toISOString()
    };
    
    // 클립보드에 컨텍스트 복사 (디버깅용)
    try {
      const contextJSON = JSON.stringify(fullContext, null, 2);
      await copyTextToClipboard(contextJSON);
      log('컨텍스트를 클립보드에 복사했습니다.');
      
      // 토스트 메시지로 사용자에게 알림
      showToast('컨텍스트를 클립보드에 복사했습니다.', 'success');
    } catch (clipboardError) {
      log(`클립보드 복사 실패: ${clipboardError}`, 'error');
      showToast('클립보드 복사 실패', 'error');
    }
    
    // 백그라운드로 생성 요청
    chrome.runtime.sendMessage({
      action: 'generateResponse',
      ...fullContext
    }, (response) => {
      if (chrome.runtime.lastError) {
        log(`백그라운드 응답 오류: ${chrome.runtime.lastError.message}`, 'error');
        showToast('응답 생성 오류: 백그라운드 스크립트에 연결할 수 없습니다.', 'error');
        return;
      }
      
      if (response.error) {
        log(`응답 생성 오류: ${response.error}`, 'error');
        showToast(`응답 생성 오류: ${response.error}`, 'error');
        return;
      }
      
      log('응답이 생성되었습니다.');
      
      // 응답 데이터 처리
      const generatedTexts = response.responses || [];
      if (generatedTexts.length === 0) {
        log('생성된 텍스트가 없습니다.', 'warn');
        showToast('생성된 텍스트가 없습니다.', 'warn');
        return;
      }
      
      // 첫 번째 생성된 텍스트를 입력 필드에 붙여넣기
      const firstResponse = generatedTexts[0];
      const inputField = getCurrentInputField();
      
      if (inputField) {
        // 현재 입력 필드에 응답 텍스트를 삽입
        inputField.focus();
        document.execCommand('selectAll', false);
        document.execCommand('insertText', false, firstResponse);
        log('응답 텍스트를 입력 필드에 삽입했습니다.');
        
        // 토스트 메시지 표시
        showToast('응답이 생성되었습니다.', 'success');
      } else {
        log('입력 필드를 찾을 수 없습니다.', 'error');
        showToast('입력 필드를 찾을 수 없습니다.', 'error');
      }
    });
  } catch (error) {
    log(`응답 생성 중 오류 발생: ${error}`, 'error');
    showToast('응답 생성 중 오류가 발생했습니다.', 'error');
    sendLog('응답 생성 중 오류', 'error', { error: String(error) });
  }
}

/**
 * 토스트 메시지를 표시합니다.
 * @param message 표시할 메시지
 * @param type 메시지 타입 (info, success, warn, error)
 */
function showToast(message: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') {
  try {
    // 이미 존재하는 토스트 제거
    const existingToast = document.getElementById('x-helper-toast');
    if (existingToast) {
      existingToast.remove();
    }
    
    // 새 토스트 생성
    const toast = document.createElement('div');
    toast.id = 'x-helper-toast';
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.padding = '12px 16px';
    toast.style.borderRadius = '8px';
    toast.style.zIndex = '10000';
    toast.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    toast.style.fontSize = '14px';
    toast.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    toast.style.transition = 'all 0.3s ease';
    toast.style.maxWidth = '80%';
    toast.style.wordBreak = 'break-word';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '8px';
    
    // 타입별 스타일 지정
    switch (type) {
      case 'success':
        toast.style.backgroundColor = '#10B981';
        toast.style.color = 'white';
        toast.style.border = '1px solid #047857';
        toast.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 0C3.6 0 0 3.6 0 8C0 12.4 3.6 16 8 16C12.4 16 16 12.4 16 8C16 3.6 12.4 0 8 0ZM7 11.4L3.6 8L5 6.6L7 8.6L11 4.6L12.4 6L7 11.4Z" fill="white"/>
        </svg>${message}`;
        break;
      case 'error':
        toast.style.backgroundColor = '#EF4444';
        toast.style.color = 'white';
        toast.style.border = '1px solid #B91C1C';
        toast.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 0C3.6 0 0 3.6 0 8C0 12.4 3.6 16 8 16C12.4 16 16 12.4 16 8C16 3.6 12.4 0 8 0ZM12 10.4L10.4 12L8 9.6L5.6 12L4 10.4L6.4 8L4 5.6L5.6 4L8 6.4L10.4 4L12 5.6L9.6 8L12 10.4Z" fill="white"/>
        </svg>${message}`;
        break;
      case 'warn':
        toast.style.backgroundColor = '#F59E0B';
        toast.style.color = 'white';
        toast.style.border = '1px solid #B45309';
        toast.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 0C3.6 0 0 3.6 0 8C0 12.4 3.6 16 8 16C12.4 16 16 12.4 16 8C16 3.6 12.4 0 8 0ZM9 12H7V10H9V12ZM9 9H7V4H9V9Z" fill="white"/>
        </svg>${message}`;
        break;
      case 'info':
      default:
        toast.style.backgroundColor = '#3B82F6';
        toast.style.color = 'white';
        toast.style.border = '1px solid #1D4ED8';
        toast.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 0C3.6 0 0 3.6 0 8C0 12.4 3.6 16 8 16C12.4 16 16 12.4 16 8C16 3.6 12.4 0 8 0ZM9 12H7V7H9V12ZM8 6C7.4 6 7 5.6 7 5C7 4.4 7.4 4 8 4C8.6 4 9 4.4 9 5C9 5.6 8.6 6 8 6Z" fill="white"/>
        </svg>${message}`;
    }
    
    // 토스트 추가 및 애니메이션
    document.body.appendChild(toast);
    
    // 3초 후 토스트 제거
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  } catch (error) {
    console.error('토스트 표시 중 오류:', error);
  }
}

/**
 * 텍스트를 클립보드에 복사합니다.
 * @param text 복사할 텍스트
 */
async function copyTextToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    log('클립보드에 텍스트 복사 성공');
    return Promise.resolve();
  } catch (err) {
    log('클립보드 복사 API 사용 실패, fallback 방식 시도', 'warn');
    
    // fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    textarea.style.top = '-999999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    
    return new Promise<void>((resolve, reject) => {
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          log('fallback 클립보드 복사 성공');
          resolve();
        } else {
          log('fallback 클립보드 복사 실패', 'error');
          reject(new Error('클립보드 복사 실패'));
        }
      } catch (err) {
        log(`클립보드 복사 중 오류: ${err}`, 'error');
        reject(err);
      } finally {
        document.body.removeChild(textarea);
      }
    });
  }
}

/**
 * 현재 활성화된 텍스트 입력 필드를 가져옵니다.
 */
function getCurrentInputField(): HTMLElement | null {
  try {
    // 트위터 컴포즈 영역 찾기
    const tweetBoxes = document.querySelectorAll('[data-testid="tweetTextarea_0"]');
    if (tweetBoxes.length > 0) {
      // 가장 마지막 것을 사용 (여러 개가 있을 경우)
      return tweetBoxes[tweetBoxes.length - 1] as HTMLElement;
    }
    
    // 답글 영역 찾기
    const replyBoxes = document.querySelectorAll('[data-testid="tweetTextarea_0_label"]');
    if (replyBoxes.length > 0) {
      // 각 replyBox에 대해 편집 가능한 div 찾기
      for (let i = 0; i < replyBoxes.length; i++) {
        const editableDiv = replyBoxes[i].querySelector('[contenteditable="true"]');
        if (editableDiv) {
          return editableDiv as HTMLElement;
        }
      }
    }
    
    // 댓글 입력 영역 찾기
    const commentBoxes = document.querySelectorAll('[data-testid="tweet-reply-input"]');
    if (commentBoxes.length > 0) {
      return commentBoxes[0] as HTMLElement;
    }
    
    log('입력 필드를 찾을 수 없습니다.', 'warn');
    return null;
  } catch (error) {
    log(`입력 필드 찾기 중 오류: ${error}`, 'error');
    return null;
  }
}

// 직접 컨텍스트 수집 버튼 추가
function addContextCollectionButton() {
  try {
    // 이미 있는 버튼 제거
    const existingButton = document.getElementById('x-helper-context-button');
    if (existingButton) {
      existingButton.remove();
    }
    
    // 버튼 생성
    const button = document.createElement('button');
    button.id = 'x-helper-context-button';
    button.innerHTML = '📋 컨텍스트 수집';
    button.style.position = 'fixed';
    button.style.bottom = '70px';
    button.style.right = '20px';
    button.style.padding = '8px 12px';
    button.style.backgroundColor = '#1DA1F2';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '20px';
    button.style.fontWeight = 'bold';
    button.style.fontSize = '14px';
    button.style.cursor = 'pointer';
    button.style.zIndex = '9999';
    button.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
    button.style.transition = 'all 0.2s ease';
    
    // 호버 효과
    button.onmouseover = () => {
      button.style.backgroundColor = '#0C7ABF';
      button.style.transform = 'translateY(-2px)';
    };
    button.onmouseout = () => {
      button.style.backgroundColor = '#1DA1F2';
      button.style.transform = 'translateY(0)';
    };
    
    // 클릭 이벤트
    button.onclick = async () => {
      try {
        log('컨텍스트 수집 버튼 클릭');
        button.disabled = true;
        button.style.opacity = '0.7';
        button.innerHTML = '수집 중...';
        
        // 컨텍스트 수집
        const threadContext = getTweetThreadContext();
        
        // 컨텍스트 저장 포맷
        const fullContext = {
          tweetText: "",
          threadContext,
          timestamp: new Date().toISOString()
        };
        
        // 클립보드에 컨텍스트 복사
        const contextJSON = JSON.stringify(fullContext, null, 2);
        await copyTextToClipboard(contextJSON);
        
        // 컨텍스트 정보 로깅
        log('컨텍스트 수집 완료', 'success');
        sendLog('컨텍스트 수집 완료', 'success', {
          tweet_count: threadContext.collection_stats?.found_tweets || 0,
          structure: threadContext.threadStructure
        });
        
        // 토스트 메시지
        showToast('컨텍스트를 클립보드에 복사했습니다.', 'success');
        
        // 버튼 상태 초기화
        setTimeout(() => {
          button.disabled = false;
          button.style.opacity = '1';
          button.innerHTML = '📋 컨텍스트 수집';
        }, 1000);
      } catch (error) {
        log(`컨텍스트 수집 중 오류: ${error}`, 'error');
        showToast('컨텍스트 수집 중 오류가 발생했습니다.', 'error');
        
        // 버튼 상태 초기화
        button.disabled = false;
        button.style.opacity = '1';
        button.innerHTML = '📋 재시도';
      }
    };
    
    // 버튼 추가
    document.body.appendChild(button);
    log('컨텍스트 수집 버튼이 추가되었습니다.');
  } catch (error) {
    log(`컨텍스트 수집 버튼 추가 중 오류: ${error}`, 'error');
  }
}

// 페이지 로드 시 컨텍스트 수집 버튼 추가
window.addEventListener('load', () => {
  setTimeout(addContextCollectionButton, 2000);
  
  // 페이지 URL 변경 감지
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // URL 변경 시 버튼 다시 추가
      setTimeout(addContextCollectionButton, 2000);
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
});

/**
 * 트윗 요소에서 트윗 정보를 추출합니다.
 * @param element 트윗 DOM 요소
 * @returns 추출된 트윗 데이터
 */
function parseTweet(element: Element): TweetData | null {
  try {
    // 작성자 정보 찾기
    const authorElement = element.querySelector('[data-testid="User-Name"]');
    if (!authorElement) {
      log('트윗에서 작성자 정보를 찾을 수 없습니다.', 'warn');
      return null;
    }
    
    // 작성자 이름
    const nameElement = authorElement.querySelector('span');
    const name = nameElement ? nameElement.textContent || 'Unknown' : 'Unknown';
    
    // 작성자 유저네임
    const usernameElement = authorElement.querySelector('a[href*="/"] span');
    const username = usernameElement 
      ? usernameElement.textContent?.replace('@', '') || 'unknown'
      : 'unknown';
    
    // 트윗 텍스트
    const textElement = element.querySelector('[data-testid="tweetText"]');
    const text = textElement ? textElement.textContent || '' : '';
    
    // 미디어 찾기 (선택적)
    const mediaElements = element.querySelectorAll('[data-testid="tweetPhoto"], [data-testid="videoPlayer"]');
    const media = Array.from(mediaElements).map(mediaElement => {
      const type = mediaElement.matches('[data-testid="videoPlayer"]') ? 'video' : 'image';
      return { type } as const;
    });
    
    return {
      author: {
        name,
        username
      },
      text,
      media: media.length > 0 ? media : undefined
    };
  } catch (error) {
    log(`트윗 파싱 중 오류: ${error}`, 'error');
    return null;
  }
} 