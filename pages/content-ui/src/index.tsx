import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

// 타입 정의
interface ResponseOption {
  text: string;
  type: string;
}

interface XHelperProps {
  show: boolean;
  responses: ResponseOption[];
  position: {
    top: number;
    left: number;
  };
  onSelect: (response: ResponseOption) => void;
  onClose: () => void;
}

// 메인 컴포넌트
const XHelper: React.FC<XHelperProps> = ({ show, responses, position, onSelect, onClose }) => {
  if (!show) return null;

  return (
    <div
      className="x-helper-container"
      style={{
        position: "absolute",
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: "300px",
        backgroundColor: "white",
        border: "1px solid #cfd9de",
        borderRadius: "4px",
        boxShadow: "0 2px 12px rgba(0, 0, 0, 0.1)",
        zIndex: 10000,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div
        className="x-helper-header"
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #cfd9de",
          fontWeight: "bold",
        }}
      >
        제안된 답변
      </div>
      <div
        className="x-helper-options"
        style={{
          maxHeight: "300px",
          overflowY: "auto",
        }}
      >
        {responses.map((response, index) => (
          <div
            key={index}
            className={`x-helper-option x-helper-option-${response.type}`}
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #ebeef0",
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
            onClick={() => onSelect(response)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#f7f9fa";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            {response.text}
          </div>
        ))}
      </div>
      <div
        className="x-helper-footer"
        style={{
          padding: "12px 16px",
          textAlign: "center",
          color: "#1d9bf0",
          cursor: "pointer",
        }}
        onClick={onClose}
      >
        닫기
      </div>
    </div>
  );
};

// 메인 앱 컴포넌트
const App: React.FC = () => {
  const [showHelper, setShowHelper] = useState(false);
  const [responses, setResponses] = useState<ResponseOption[]>([]);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    // 컨텐츠 스크립트로부터 메시지 수신
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "x-helper-show") {
        setResponses(event.data.responses || []);
        setPosition(event.data.position || { top: 0, left: 0 });
        setShowHelper(true);
      } else if (event.data && event.data.type === "x-helper-hide") {
        setShowHelper(false);
      }
    };

    // 메시지 리스너 등록
    window.addEventListener("message", handleMessage);

    // 클린업 함수
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const handleSelect = (response: ResponseOption) => {
    // 선택한 응답을 컨텐츠 스크립트로 전달
    window.postMessage(
      {
        type: "x-helper-select",
        response,
      },
      "*"
    );
    setShowHelper(false);
  };

  const handleClose = () => {
    // 헬퍼 닫기
    setShowHelper(false);
    window.postMessage(
      {
        type: "x-helper-close",
      },
      "*"
    );
  };

  return (
    <XHelper
      show={showHelper}
      responses={responses}
      position={position}
      onSelect={handleSelect}
      onClose={handleClose}
    />
  );
};

// 루트 요소 생성 및 렌더링
const root = document.createElement("div");
root.id = "x-helper-root";
document.body.appendChild(root);
createRoot(root).render(<App />); 