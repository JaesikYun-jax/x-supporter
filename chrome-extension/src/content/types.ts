// 트윗 저자 정보
export interface TweetAuthor {
  name: string;
  username: string;
  profileUrl?: string;
}

// 트윗 미디어 정보
export interface TweetMedia {
  type: 'image' | 'video' | 'gif' | 'unknown';
  url?: string;
}

// 트윗 데이터
export interface TweetData {
  id?: string;
  author: TweetAuthor;
  text: string;
  timestamp?: string;
  media?: TweetMedia[];
}

// 스레드 컨텍스트
export interface ThreadContext {
  threadStructure: 'main-tweet' | 'reply' | 'unknown';
  mainTweet?: TweetData;
  replyTarget?: TweetData;
  intermediateReplies?: TweetData[];
  collected_at?: string; // 수집 시간 추가
  collection_stats?: {
    found_tweets: number;
    errors?: string[];
    total_text_length?: number;
    has_main_tweet?: boolean;
    has_reply_target?: boolean;
    intermediate_replies_count?: number;
    success: boolean;
    error?: string;
  };
} 