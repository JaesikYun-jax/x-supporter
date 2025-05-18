import packageJson from '../../package.json';

const manifest = {
  manifest_version: 3,
  name: 'X 헬퍼',
  version: packageJson.version,
  description: 'X.com(구 Twitter)에서 AI 기반 답변을 제안해주는 크롬 익스텐션',
  icons: {
    16: 'icon16.svg',
    48: 'icon48.svg',
    128: 'icon128.svg',
  },
  background: {
    service_worker: 'background.js',
    type: 'module',
  },
  action: {
    default_popup: 'pages/popup/index.html',
    default_icon: {
      16: 'icon16.svg',
      48: 'icon48.svg',
      128: 'icon128.svg',
    },
  },
  options_page: 'pages/options/index.html',
  content_scripts: [
    {
      matches: ['https://x.com/*', 'https://twitter.com/*'],
      js: ['content.js']
    },
  ],
  web_accessible_resources: [
    {
      resources: ['content-ui.js', 'icon16.svg', 'icon48.svg', 'icon128.svg'],
      matches: ['https://x.com/*', 'https://twitter.com/*'],
    },
  ],
  permissions: [
    'storage',
    'scripting',
    'activeTab',
    'clipboardWrite',
  ],
  host_permissions: ['https://x.com/*', 'https://twitter.com/*', 'https://api.openai.com/*'],
};

export default manifest; 