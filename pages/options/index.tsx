import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

// 타입 정의
interface Settings {
  isEnabled: boolean;
  apiKey: string;
  model: string;
  toneOptions: string[];
  selectedTone: string;
}

// 설정 컴포넌트
const OptionsPage: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    isEnabled: true,
    apiKey: "",
    model: "gpt-3.5-turbo",
    toneOptions: ["친근한", "전문적인", "유머러스한"],
    selectedTone: "친근한",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [customTone, setCustomTone] = useState("");

  // 설정 로드
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await chrome.runtime.sendMessage({ action: "getSettings" });
        if (response && response.settings) {
          setSettings(response.settings);
        }
        setIsLoading(false);
      } catch (error) {
        console.error("설정 로드 오류:", error);
        setStatusMessage("설정을 로드하는 중 오류가 발생했습니다.");
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // 설정 저장
  const saveSettings = async () => {
    setIsLoading(true);
    try {
      await chrome.runtime.sendMessage({
        action: "saveSettings",
        data: settings,
      });
      setStatusMessage("설정이 저장되었습니다.");
      setTimeout(() => {
        setStatusMessage("");
      }, 2000);
    } catch (error) {
      console.error("설정 저장 오류:", error);
      setStatusMessage("설정을 저장하는 중 오류가 발생했습니다.");
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

  // 커스텀 톤 추가
  const addCustomTone = () => {
    if (customTone.trim() && !settings.toneOptions.includes(customTone)) {
      setSettings({
        ...settings,
        toneOptions: [...settings.toneOptions, customTone],
      });
      setCustomTone("");
    }
  };

  // 톤 삭제
  const removeTone = (tone: string) => {
    // 선택된 톤이 삭제되는 경우 기본값으로 변경
    const newToneOptions = settings.toneOptions.filter((t) => t !== tone);
    const newSelectedTone = settings.selectedTone === tone ? newToneOptions[0] || "친근한" : settings.selectedTone;
    
    setSettings({
      ...settings,
      toneOptions: newToneOptions,
      selectedTone: newSelectedTone,
    });
  };

  if (isLoading) {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <div className="options-container">
      <header className="options-header">
        <h1>X 헬퍼 상세 설정</h1>
        <p>X.com에서 AI 기반 답변을 제안하는 익스텐션입니다.</p>
      </header>

      <div className="options-content">
        <form onSubmit={handleSubmit} className="settings-form">
          <div className="form-section">
            <h2>기본 설정</h2>
            
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
              <label htmlFor="apiKey">OpenAI API 키</label>
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
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo (빠름)</option>
                <option value="gpt-4">GPT-4 (더 정확함)</option>
              </select>
            </div>
          </div>

          <div className="form-section">
            <h2>톤 설정</h2>
            
            <div className="form-group">
              <label htmlFor="selectedTone">기본 톤</label>
              <select id="selectedTone" name="selectedTone" value={settings.selectedTone} onChange={handleInputChange}>
                {settings.toneOptions.map((tone) => (
                  <option key={tone} value={tone}>
                    {tone}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="tones-list">
              {settings.toneOptions.map((tone) => (
                <div key={tone} className="tone-item">
                  <span>{tone}</span>
                  {settings.toneOptions.length > 1 && (
                    <button
                      type="button"
                      className="remove-tone-btn"
                      onClick={() => removeTone(tone)}
                      disabled={settings.toneOptions.length <= 1}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            <div className="form-group custom-tone-group">
              <label htmlFor="customTone">커스텀 톤 추가</label>
              <div className="custom-tone-input">
                <input
                  type="text"
                  id="customTone"
                  value={customTone}
                  onChange={(e) => setCustomTone(e.target.value)}
                  placeholder="새로운 톤 이름"
                />
                <button type="button" className="add-tone-btn" onClick={addCustomTone} disabled={!customTone.trim()}>
                  추가
                </button>
              </div>
            </div>
          </div>

          <button type="submit" className="save-button">
            설정 저장
          </button>
          
          {statusMessage && <div className="status-message">{statusMessage}</div>}
        </form>
      </div>

      <footer className="options-footer">
        <p>X 헬퍼 v{chrome.runtime.getManifest().version}</p>
        <p>
          <a href="https://github.com/yourusername/x-helper" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          {" | "}
          <a href="mailto:your-email@example.com">문의하기</a>
        </p>
      </footer>
    </div>
  );
};

// 루트에 렌더링
const container = document.getElementById("app");
if (container) {
  const root = createRoot(container);
  root.render(<OptionsPage />);
} 