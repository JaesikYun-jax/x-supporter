/**
 * X 헬퍼 프롬프트 템플릿 관리
 * 
 * 이 파일은 X.com에서 AI 응답 생성을 위한 Web3 Degen 톤의 프롬프트 템플릿을 관리합니다.
 * 트윗 컨텍스트를 바탕으로 프롬프트를 생성합니다.
 */

// 프롬프트 인터페이스
export interface PromptTemplate {
  systemPrompt: string;
  userPrompt: string;
}

// Web3 Degen 페르소나 프롬프트 템플릿
export const web3DegenPrompt: PromptTemplate = {
  systemPrompt: `당신은 Web3와 암호화폐 열정가인 'Web3 Degen'의 역할로 X.com에서 트윗 컨텍스트를 기반한 답변을 작성해야 한다.
답변의 특징은 다음과 같다.

1. 'gm', 'ser', 'fren', 'wen', 'WAGMI', 'NGMI', 'alpha', 'degen', '3 commas'와 같은 Web3 슬랭과 용어를 사용하세요.
2. 토큰 가격, 커뮤니티적 교류가 중심인 상황에서 '🚀', '💎🙌', 'lfg', 'bullish'와 같은 표현을 사용하세요.
3. 대화를 시작할 때는 'gm' 또는 'gn'로 시작하는 것이 좋습니다.
4. 친근하고 격식 없는 말투를 유지하세요.
5. 첫 글자를 대문자로 사용하지 마세요. 모두 소문자로 쓰고 문법을 일부러 틀리거나 축약어를 적극적으로 사용하세요.
6. 모든 답변은 최소한의 문장으로 작성하세요.
7. 참고하는 맥락이 비슷한 말을 반복하고 있다면 그 말을 답변으로 제안해도 좋습니다.
8. 상대가 사용한 언어를 그대로 사용하세요. 예를 들어 영어로 된 트윗을 참고하고 있다면 영어로 답변하세요.
`
,
  
  userPrompt: `다음 트윗 스레드에 대한 Web3 스타일의 대답을 3가지 타입으로 생성해주세요:
전체적인 맥락을 고려하되 최종적으로는 최소한의 문장으로 답변하세요.
{{THREAD_CONTEXT}}

다음 형식으로 정확히 3개의 응답을 제공해주세요:

1/ [짧고 친근한 인사 - Web3 슬랭 사용]

2/ [트윗 내용 일부를 인용하며 동의하는 내용]

3/ [자기 비하적인 Web3/암호화폐 관련 농담]

각 응답은 정확히 "1/", "2/", "3/"로 시작해야 하며, 응답 간에는 빈 줄을 추가해주세요.
어떤 내용이든 반드시 이 형식을 따라주세요.`
};

/**
 * 스레드 컨텍스트를 문자열로 변환하는 함수
 * @param threadContext 트윗 스레드 컨텍스트 객체
 * @returns 문자열로 변환된 컨텍스트
 */
export function formatThreadContext(threadContext: any): string {
  if (!threadContext) return '대화 컨텍스트 없음';
  
  let result = '';
  
  // 메인 트윗 정보
  if (threadContext.mainTweet) {
    const mainTweet = threadContext.mainTweet;
    result += `메인 트윗 (@${mainTweet.author.username}): "${mainTweet.text}"\n\n`;
  }
  
  // 중간 답글들
  if (threadContext.intermediateReplies && threadContext.intermediateReplies.length > 0) {
    result += '중간 답글들:\n';
    threadContext.intermediateReplies.forEach((reply: any, index: number) => {
      result += `${index + 1}. @${reply.author.username}: "${reply.text}"\n`;
    });
    result += '\n';
  }
  
  // 답장 대상 트윗
  if (threadContext.replyTarget) {
    const replyTarget = threadContext.replyTarget;
    result += `답장 대상 (@${replyTarget.author.username}): "${replyTarget.text}"`;
  }
  
  return result;
}

/**
 * 스레드 컨텍스트를 기반으로 Web3 Degen 프롬프트를 생성하는 함수
 * @param threadContext 트윗 스레드 컨텍스트
 * @returns 완성된 프롬프트 템플릿
 */
export function generateWeb3DegenPrompt(threadContext: any): PromptTemplate {
  // 스레드 컨텍스트 문자열 생성
  const formattedContext = formatThreadContext(threadContext);
  
  // 프롬프트 치환
  const userPrompt = web3DegenPrompt.userPrompt.replace(/{{THREAD_CONTEXT}}/g, formattedContext);
  
  return {
    systemPrompt: web3DegenPrompt.systemPrompt,
    userPrompt: userPrompt
  };
}