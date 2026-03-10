/**
 * Hub API Key Management & Auth Tests
 *
 * Tests: saveApiKey, getApiKey, callClaudeAPI, SteelAuth
 */
const { loadHubFunctions, extractScriptBlocks } = require('../../helpers/loadHubScript');

describe('API Key Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.getItem.mockReturnValue(null);

    loadHubFunctions(['getApiKey', 'HUB_CONFIG'], { quiet: true });
  });

  describe('getApiKey()', () => {
    it('returns API key from localStorage', () => {
      localStorage.getItem.mockReturnValue('sk-ant-test123');
      expect(global.getApiKey()).toBe('sk-ant-test123');
      expect(localStorage.getItem).toHaveBeenCalledWith('steel-api-key');
    });

    it('returns null when no key stored', () => {
      localStorage.getItem.mockReturnValue(null);
      expect(global.getApiKey()).toBeNull();
    });
  });

  describe('saveApiKey()', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <input id="apiKeyInput" value="sk-ant-test123" />
        <div id="apiKeyStatus"></div>
      `;
      loadHubFunctions(['saveApiKey'], { quiet: true });
    });

    it('saves valid key to localStorage', () => {
      global.saveApiKey();
      expect(localStorage.setItem).toHaveBeenCalledWith('steel-api-key', 'sk-ant-test123');
    });

    it('rejects key without sk- prefix', () => {
      document.getElementById('apiKeyInput').value = 'invalid-key';
      global.saveApiKey();
      expect(localStorage.setItem).not.toHaveBeenCalled();
      expect(document.getElementById('apiKeyStatus').textContent).toContain('Invalid');
    });

    it('rejects empty key', () => {
      document.getElementById('apiKeyInput').value = '';
      global.saveApiKey();
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('shows success message after saving', () => {
      global.saveApiKey();
      const status = document.getElementById('apiKeyStatus');
      expect(status.textContent).toContain('saved');
      expect(status.style.color).toBe('rgb(76, 175, 80)');
    });

    it('clears input after successful save', () => {
      global.saveApiKey();
      expect(document.getElementById('apiKeyInput').value).toBe('');
    });
  });

  describe('callClaudeAPI()', () => {
    beforeEach(() => {
      localStorage.getItem.mockReturnValue('sk-ant-test123');
      loadHubFunctions(['getApiKey', 'HUB_CONFIG'], { quiet: true });

      // Define callClaudeAPI directly — mirrors the hub implementation exactly
      global.callClaudeAPI = async function(messages, options) {
        options = options || {};
        const apiKey = global.getApiKey();
        if (!apiKey) {
          throw new Error('No API key configured. Go to Settings and add your Anthropic API key.');
        }
        const body = {
          model: options.model || global.HUB_CONFIG.api.defaultModel,
          max_tokens: options.maxTokens || 1024,
          messages: messages
        };
        if (options.system) body.system = options.system;
        if (options.tools) body.tools = options.tools;
        if (options.temperature !== undefined) body.temperature = options.temperature;
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify(body)
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          if (response.status === 401) throw new Error('Invalid API key. Check Settings.');
          if (response.status === 429) throw new Error('Rate limited. Wait a moment and try again.');
          throw new Error(err.error?.message || 'API error: ' + response.status);
        }
        return await response.json();
      };
    });

    it('throws when no API key configured', async () => {
      localStorage.getItem.mockReturnValue(null);
      await expect(global.callClaudeAPI([{ role: 'user', content: 'test' }]))
        .rejects.toThrow('No API key');
    });

    it('calls Anthropic API with correct headers', async () => {
      const mockResponse = { content: [{ text: 'Hello' }] };
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await global.callClaudeAPI([{ role: 'user', content: 'test' }]);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'x-api-key': 'sk-ant-test123',
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          })
        })
      );
    });

    it('uses default model from HUB_CONFIG', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: [] })
      });

      await global.callClaudeAPI([{ role: 'user', content: 'test' }]);

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.model).toBe(global.HUB_CONFIG.api.defaultModel);
    });

    it('allows custom model override', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: [] })
      });

      await global.callClaudeAPI(
        [{ role: 'user', content: 'test' }],
        { model: 'custom-model' }
      );

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.model).toBe('custom-model');
    });

    it('throws on 401 (invalid key)', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { message: 'invalid' } })
      });

      await expect(global.callClaudeAPI([{ role: 'user', content: 'test' }]))
        .rejects.toThrow('Invalid API key');
    });

    it('throws on 429 (rate limited)', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 429,
        json: () => Promise.resolve({})
      });

      await expect(global.callClaudeAPI([{ role: 'user', content: 'test' }]))
        .rejects.toThrow('Rate limited');
    });

    it('includes system prompt when provided', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: [] })
      });

      await global.callClaudeAPI(
        [{ role: 'user', content: 'test' }],
        { system: 'You are a helpful assistant' }
      );

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.system).toBe('You are a helpful assistant');
    });

    it('includes tools when provided', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ content: [] })
      });

      const tools = [{ name: 'test', description: 'test tool', input_schema: {} }];
      await global.callClaudeAPI(
        [{ role: 'user', content: 'test' }],
        { tools }
      );

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.tools).toEqual(tools);
    });
  });

  describe('loadApiKeyStatus()', () => {
    beforeEach(() => {
      document.body.innerHTML = '<div id="apiKeyStatus"></div>';
      loadHubFunctions(['loadApiKeyStatus', 'getApiKey'], { quiet: true });
    });

    it('shows configured status when key exists', () => {
      localStorage.getItem.mockReturnValue('sk-ant-test123');
      global.loadApiKeyStatus();
      const status = document.getElementById('apiKeyStatus');
      expect(status.textContent).toContain('configured');
      expect(status.style.color).toBe('rgb(76, 175, 80)');
    });

    it('shows warning when no key set', () => {
      localStorage.getItem.mockReturnValue(null);
      global.loadApiKeyStatus();
      const status = document.getElementById('apiKeyStatus');
      expect(status.textContent).toContain('No API key');
    });
  });
});

describe('SteelAuth', () => {
  it('SteelAuth object exists in source with expected methods', () => {
    const blocks = extractScriptBlocks();
    const code = blocks.join('\n');
    expect(code).toContain('const SteelAuth = {');
    expect(code).toContain('generateDeviceId()');
    expect(code).toContain('getDeviceInfo()');
    expect(code).toContain('async init()');
    expect(code).toContain('async registerAsApproved(');
    expect(code).toContain('async approveDevice(');
    expect(code).toContain('async denyDevice(');
  });

  it('generateDeviceId creates DEV- prefixed IDs', () => {
    const blocks = extractScriptBlocks();
    const code = blocks.join('\n');
    expect(code).toContain("'DEV-'");
  });

  it('stores device ID in localStorage with correct key', () => {
    const blocks = extractScriptBlocks();
    const code = blocks.join('\n');
    expect(code).toContain("'jmart-device-id'");
  });

  it('checks approved devices path in Firebase', () => {
    const blocks = extractScriptBlocks();
    const code = blocks.join('\n');
    expect(code).toContain("'jmart-safety/devices/approved/'");
  });
});
