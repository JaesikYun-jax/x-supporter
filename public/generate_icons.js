const fs = require('fs');
const path = require('path');

// 아이콘 사이즈 정의
const sizes = [16, 48, 128];

// 간단한 SVG 템플릿 생성 (X 로고를 단순화한 파란색 사각형에 흰색 X)
function generateSvg(size) {
  const strokeWidth = size / 16;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${size}" height="${size}" rx="${size/8}" fill="#1d9bf0" />
    <path d="M${size/4} ${size/4} L${size*3/4} ${size*3/4} M${size*3/4} ${size/4} L${size/4} ${size*3/4}" 
          stroke="white" stroke-width="${strokeWidth}" />
  </svg>`;
}

// SVG를 PNG로 변환하는 코드 (실제로는 외부 라이브러리가 필요할 수 있음)
// 지금은 SVG 파일만 생성하겠습니다
function saveSvgIcon(size) {
  const svg = generateSvg(size);
  const filePath = path.join(__dirname, `icon${size}.svg`);
  
  fs.writeFileSync(filePath, svg);
  console.log(`생성된 아이콘: ${filePath}`);
}

// 모든 크기의 아이콘 생성
sizes.forEach(size => saveSvgIcon(size));

console.log('\n아이콘 생성 완료! 이 SVG 파일들을 PNG로 변환하거나 그대로 사용할 수 있습니다.'); 