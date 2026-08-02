'use client';

/**
 * @file ChatModelControls.tsx
 * @description 模型与生成参数控制栏：Provider、模型、Temperature、Max Output Tokens
 */
import { SUPPORTED_PROVIDERS } from '@/src/lib/ai';
import type { ModelConfig, ModelProvider } from '@/src/types/chat';

interface ChatModelControlsProps {
  /** 当前会话的模型配置 */
  config: ModelConfig;
  /** 配置发生变化时的回调（支持部分更新） */
  onChange: (config: Partial<ModelConfig>) => void;
}

/** temperature 输入允许的最小/最大值 */
const TEMPERATURE_MIN = 0;
const TEMPERATURE_MAX = 2;

/** maxOutputTokens 输入允许的最小/最大值 */
const MAX_TOKENS_MIN = 1;
const MAX_TOKENS_MAX = 8192;

/**
 * 模型控制组件。
 * Provider 切换时自动回退到该 Provider 的默认模型，避免选中不存在的模型组合。
 */
export function ChatModelControls({ config, onChange }: ChatModelControlsProps) {
  const providerMeta = SUPPORTED_PROVIDERS[config.provider];
  const availableModels = providerMeta.models;

  /** 处理 Provider 切换 */
  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value as ModelProvider;
    const newDefaultModel = SUPPORTED_PROVIDERS[newProvider].defaultModel;
    onChange({ provider: newProvider, model: newDefaultModel });
  };

  /** 处理模型切换 */
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ model: e.target.value });
  };

  /** 处理 temperature 数值变化，超出范围时按边界截断 */
  const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseFloat(e.target.value);
    if (Number.isNaN(raw)) return;
    const clamped = Math.min(Math.max(raw, TEMPERATURE_MIN), TEMPERATURE_MAX);
    onChange({ temperature: clamped });
  };

  /** 处理 maxOutputTokens 数值变化，超出范围时按边界截断 */
  const handleMaxTokensChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = parseInt(e.target.value, 10);
    if (Number.isNaN(raw)) return;
    const clamped = Math.min(Math.max(raw, MAX_TOKENS_MIN), MAX_TOKENS_MAX);
    onChange({ maxOutputTokens: clamped });
  };

  // 主题相关：控制栏使用 surface / border / input / muted 等语义化 token，
  // 深浅色模式下自动适配表单控件配色。
  // 移动端适配：<sm 时字号提为 16px，避免 iOS 聚焦下拉框/数字输入框时自动放大页面；
  // 控件间用 flex-wrap 换行，窄屏下自动折行避免横向溢出。
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-3 py-2 text-base sm:text-sm">
      {/* Provider 选择 */}
      <div className="flex items-center gap-1.5">
        <label htmlFor="provider-select" className="text-muted-foreground">Provider</label>
        <select
          id="provider-select"
          value={config.provider}
          onChange={handleProviderChange}
          className="rounded-md border border-input bg-surface px-2 py-1 text-foreground focus:border-primary focus:outline-none"
        >
          {(Object.keys(SUPPORTED_PROVIDERS) as ModelProvider[]).map((provider) => (
            <option key={provider} value={provider}>
              {SUPPORTED_PROVIDERS[provider].label}
            </option>
          ))}
        </select>
      </div>

      {/* 模型选择 */}
      <div className="flex items-center gap-1.5">
        <label htmlFor="model-select" className="text-muted-foreground">模型</label>
        <select
          id="model-select"
          value={config.model}
          onChange={handleModelChange}
          className="rounded-md border border-input bg-surface px-2 py-1 text-foreground focus:border-primary focus:outline-none"
        >
          {availableModels.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </div>

      {/* Temperature 控制 */}
      <div className="flex items-center gap-1.5">
        <label htmlFor="temperature-input" className="text-muted-foreground">Temperature</label>
        <input
          id="temperature-input"
          type="number"
          min={TEMPERATURE_MIN}
          max={TEMPERATURE_MAX}
          step={0.1}
          value={config.temperature}
          onChange={handleTemperatureChange}
          className="w-16 rounded-md border border-input bg-surface px-2 py-1 text-foreground focus:border-primary focus:outline-none"
        />
      </div>

      {/* Max Output Tokens 控制 */}
      <div className="flex items-center gap-1.5">
        <label htmlFor="max-tokens-input" className="text-muted-foreground">最大 Tokens</label>
        <input
          id="max-tokens-input"
          type="number"
          min={MAX_TOKENS_MIN}
          max={MAX_TOKENS_MAX}
          step={1}
          value={config.maxOutputTokens}
          onChange={handleMaxTokensChange}
          className="w-20 rounded-md border border-input bg-surface px-2 py-1 text-foreground focus:border-primary focus:outline-none"
        />
      </div>
    </div>
  );
}
