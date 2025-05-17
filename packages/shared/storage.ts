/**
 * 크롬 스토리지 API를 쉽게 사용하기 위한 유틸리티 클래스
 */
export class Storage {
  /**
   * 스토리지에서 데이터 가져오기
   * @param key 가져올 데이터의 키
   * @returns 키에 해당하는 데이터
   */
  static async get<T>(key: string): Promise<T | undefined> {
    try {
      const result = await chrome.storage.local.get(key);
      return result[key] as T;
    } catch (error) {
      console.error(`스토리지에서 데이터 가져오기 실패: ${error}`);
      return undefined;
    }
  }

  /**
   * 스토리지에 데이터 저장하기
   * @param key 저장할 키
   * @param value 저장할 값
   */
  static async set<T>(key: string, value: T): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (error) {
      console.error(`스토리지에 데이터 저장 실패: ${error}`);
    }
  }

  /**
   * 스토리지에서 데이터 삭제하기
   * @param key 삭제할 키
   */
  static async remove(key: string): Promise<void> {
    try {
      await chrome.storage.local.remove(key);
    } catch (error) {
      console.error(`스토리지에서 데이터 삭제 실패: ${error}`);
    }
  }

  /**
   * 스토리지 변경사항 감지하기
   * @param callback 변경사항이 감지될 때 호출될 콜백 함수
   */
  static onChanged(callback: (changes: { [key: string]: chrome.storage.StorageChange }) => void): void {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local') {
        callback(changes);
      }
    });
  }
} 