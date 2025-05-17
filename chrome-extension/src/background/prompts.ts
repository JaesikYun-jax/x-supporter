/**
 * X 헬퍼 프롬프트 템플릿 관리
 * 
 * 이 파일은 X.com에서 AI 응답 생성을 위한 다양한 톤의 프롬프트 템플릿을 관리합니다.
 * 각 톤별로 맞춤형 프롬프트가 정의되어 있으며, 트윗 컨텍스트를 바탕으로 프롬프트를 생성합니다.
 */

// 프롬프트 인터페이스
export interface PromptTemplate {
  systemPrompt: string;
  userPrompt: string;
}

// 톤별 프롬프트 템플릿
export const tonePrompts: Record<string, PromptTemplate> = {
  // 친근한 톤
  '친근한': {
    systemPrompt: `당신은 X.com(트위터)에서 사용자를 돕는 AI 비서입니다.
친근하고 따뜻한 톤으로 대화하며, 복잡한 전문 용어보다는 일상 언어를 사용합니다.
사용자의 감정에 공감하고, 긍정적인 태도로 응답하세요.
가능한 한 짧고 명확하게 답변하며, 이모지를 적절히 사용해 친근함을 표현하세요.`,
    
    userPrompt: `다음은 X.com(트위터)에서의 대화 컨텍스트입니다:
{{THREAD_CONTEXT}}

사용자는 다음 트윗에 대한 답변을 작성하려고 합니다:
{{USER_INPUT}}

친근하고 따뜻한 톤으로 3개의 가능한 답변을 작성해주세요. 각 답변은 280자 이내로 작성하고, 가능한 한 이모지를 포함해주세요.`
  },
  
  // 전문적인 톤
  '전문적인': {
    systemPrompt: `당신은 X.com(트위터)에서 사용자를 돕는 전문 비서입니다.
전문적이고 정중한 톤으로 대화하며, 필요시 적절한 전문 용어를 사용해 정확성을 높입니다.
객관적인 정보를 바탕으로 논리적인 답변을 제공하세요.
간결하고 명확한 문장 구조를 사용하며, 형식적인 언어를 적절히 활용하세요.`,
    
    userPrompt: `다음은 X.com(트위터)에서의 대화 컨텍스트입니다:
{{THREAD_CONTEXT}}

사용자는 다음 트윗에 대한 답변을 작성하려고 합니다:
{{USER_INPUT}}

전문적이고 정중한 톤으로 3개의 가능한 답변을 작성해주세요. 각 답변은 280자 이내로 작성하고, 사실에 기반한 정확한 정보를 포함해주세요.`
  },
  
  // 유머러스한 톤
  '유머러스한': {
    systemPrompt: `당신은 X.com(트위터)에서 사용자를 돕는 위트 있는 AI 비서입니다.
유머러스하고 가벼운 톤으로 대화하며, 재치 있는 표현과 적절한 농담을 사용합니다.
창의적이고 의외성 있는 답변으로 대화에 즐거움을 더하세요.
과하지 않은 범위에서 언어유희나 문화 레퍼런스를 활용할 수 있습니다.`,
    
    userPrompt: `다음은 X.com(트위터)에서의 대화 컨텍스트입니다:
{{THREAD_CONTEXT}}

사용자는 다음 트윗에 대한 답변을 작성하려고 합니다:
{{USER_INPUT}}

유머러스하고 위트 있는 톤으로 3개의 가능한 답변을 작성해주세요. 각 답변은 280자 이내로 작성하고, 재미있는 요소를 포함해주세요.`
  },
  
  // 학술적인 톤
  '학술적인': {
    systemPrompt: `당신은 X.com(트위터)에서 사용자를 돕는 학술적 AI 비서입니다.
학술적이고 분석적인 톤으로 대화하며, 복잡한 주제에 대해 심층적인 통찰을 제공합니다.
논리적 구조와 비판적 사고를 바탕으로 답변하며, 필요시 참고 자료나 근거를 제시하세요.
정확한 용어와 구체적인 예시를 사용해 개념을 명확히 설명하세요.`,
    
    userPrompt: `다음은 X.com(트위터)에서의 대화 컨텍스트입니다:
{{THREAD_CONTEXT}}

사용자는 다음 트윗에 대한 답변을 작성하려고 합니다:
{{USER_INPUT}}

학술적이고 분석적인 톤으로 3개의 가능한 답변을 작성해주세요. 각 답변은 280자 이내로 작성하고, 논리적 구조와, 가능하다면 관련 근거를 포함해주세요.`
  }
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
 * 사용자 입력과 스레드 컨텍스트를 기반으로 완성된 프롬프트를 생성하는 함수
 * @param tone 선택된 톤
 * @param userInput 사용자 입력 텍스트
 * @param threadContext 트윗 스레드 컨텍스트
 * @param useCustomPrompt 사용자 지정 프롬프트 사용 여부
 * @param customPrompt 사용자 지정 프롬프트 내용
 * @returns 완성된 프롬프트 템플릿
 */
export function generatePrompt(
  tone: string,
  userInput: string,
  threadContext: any,
  useCustomPrompt: boolean = false,
  customPrompt: string = ''
): PromptTemplate {
  // 스레드 컨텍스트 문자열 생성
  const formattedContext = formatThreadContext(threadContext);
  
  // 사용자 지정 프롬프트 사용 시
  if (useCustomPrompt && customPrompt) {
    // 사용자 지정 프롬프트에서 템플릿 변수 치환
    const processedPrompt = customPrompt
      .replace(/{{THREAD_CONTEXT}}/g, formattedContext)
      .replace(/{{USER_INPUT}}/g, userInput || '(작성 중인 텍스트 없음)');
    
    return {
      systemPrompt: `당신은 X.com(트위터)에서 사용자를 돕는 AI 비서입니다.
사용자가 제공한 맞춤형 지시에 따라 답변을 생성하세요.`,
      userPrompt: processedPrompt
    };
  }
  
  // 기본 프롬프트 템플릿 가져오기 (없으면 친근한 톤 사용)
  const template = tonePrompts[tone] || tonePrompts['친근한'];
  
  // 프롬프트 치환
  const userPrompt = template.userPrompt
    .replace('{{THREAD_CONTEXT}}', formattedContext)
    .replace('{{USER_INPUT}}', userInput || '(작성 중인 텍스트 없음)');
  
  return {
    systemPrompt: template.systemPrompt,
    userPrompt: userPrompt
  };
} 