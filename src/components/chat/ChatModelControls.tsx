'use client';

/**
 * @file ChatModelControls.tsx
 * @description 模型与生成参数控制栏：Provider、模型、Temperature、Max Output Tokens
 */
import { Info } from 'lucide-react';
import { SUPPORTED_PROVIDERS } from '@/src/lib/ai';
import type { ModelConfig, ModelProvider } from '@/src/types/chat';

interface ChatModelControlsProps {
  /** 当前会话的模型配置 */
  config: ModelConfig;
  /** 配置发生变化时的回调（支持部分更新） */
  onChange: (config: Partial<ModelConfig>) => void;
}

/**
 * 模型控制组件。
 *
 * 改进点：
 * 1. 数字输入框采用非受控模式（key 随 Provider/模型重置），允许用户临时清空，
 *    失焦/回车时统一校验并同步到父组件，避免受控组件无法清空的问题。
 * 2. 生成参数范围按 Provider 动态读取，切换 Provider 时若当前值越界自动回退到默认值。
 * 3. 对推理模型（如 deepseek-reasoner）禁用 temperature 并给出提示。
 */
export function ChatModelControls({ config, onChange }: ChatModelControlsProps) {
  const providerMeta = SUPPORTED_PROVIDERS[config.provider];
  const availableModels = providerMeta.models;
  const params = providerMeta.generationParams;
  const isReasoningModel = providerMeta.reasoningModels?.includes(config.model) ?? false;

  /** 处理 Provider 切换：同时检查参数范围，越界时回退到新 Provider 的默认值 */
  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProvider = e.target.value as ModelProvider;
    const newProviderMeta = SUPPORTED_PROVIDERS[newProvider];
    const changes: Partial<ModelConfig> = {
      provider: newProvider,
      model: newProviderMeta.defaultModel,
    };

    if (
      config.temperature < newProviderMeta.generationParams.temperature.min ||
      config.temperature > newProviderMeta.generationParams.temperature.max
    ) {
      changes.temperature = newProviderMeta.generationParams.temperature.default;
    }

    if (
      config.maxOutputTokens < newProviderMeta.generationParams.maxOutputTokens.min ||
      config.maxOutputTokens > newProviderMeta.generationParams.maxOutputTokens.max
    ) {
      changes.maxOutputTokens = newProviderMeta.generationParams.maxOutputTokens.default;
    }

    onChange(changes);
  };

  /** 处理模型切换；若切到推理模型，自动将 temperature 回退到默认值 */
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newModel = e.target.value;
    const changes: Partial<ModelConfig> = { model: newModel };

    if (providerMeta.reasoningModels?.includes(newModel)) {
      changes.temperature = params.temperature.default;
    }

    onChange(changes);
  };

  /** 校验并提交 temperature */
  const commitTemperature = (e: React.FocusEvent<HTMLInputElement>) => {
    const parsed = parseFloat(e.target.value);
    if (Number.isNaN(parsed)) {
      // 空值或非法值：恢复为当前已保存值
      e.target.value = String(config.temperature);
      return;
    }

    const clamped = Math.min(Math.max(parsed, params.temperature.min), params.temperature.max);
    onChange({ temperature: clamped });
    e.target.value = String(clamped);
  };

  /** 校验并提交 maxOutputTokens */
  const commitMaxTokens = (e: React.FocusEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value, 10);
    if (Number.isNaN(parsed)) {
      e.target.value = String(config.maxOutputTokens);
      return;
    }

    const clamped = Math.min(Math.max(parsed, params.maxOutputTokens.min), params.maxOutputTokens.max);
    const rounded = Math.round(clamped);
    onChange({ maxOutputTokens: rounded });
    e.target.value = String(rounded);
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
          key={`temperature-${config.provider}-${config.model}`}
          type="number"
          min={params.temperature.min}
          max={params.temperature.max}
          step={params.temperature.step}
          defaultValue={config.temperature}
          onBlur={commitTemperature}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            }
          }}
          disabled={isReasoningModel}
          className="w-16 rounded-md border border-input bg-surface px-2 py-1 text-foreground focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        />
      </div>

      {/* Max Output Tokens 控制 */}
      <div className="flex items-center gap-1.5">
        <label htmlFor="max-tokens-input" className="text-muted-foreground">最大 Tokens</label>
        <input
          id="max-tokens-input"
          key={`max-tokens-${config.provider}-${config.model}`}
          type="number"
          min={params.maxOutputTokens.min}
          max={params.maxOutputTokens.max}
          step={params.maxOutputTokens.step}
          defaultValue={config.maxOutputTokens}
          onBlur={commitMaxTokens}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.currentTarget.blur();
            }
          }}
          className="w-20 rounded-md border border-input bg-surface px-2 py-1 text-foreground focus:border-primary focus:outline-none"
        />
      </div>

      {/* 推理模型提示 */}
      {isReasoningModel && (
        <div className="flex w-full items-center gap-1 text-xs text-muted-foreground sm:w-auto">
          <Info className="h-3.5 w-3.5 shrink-0" />
          <span>当前为推理模型，Temperature 固定，修改不生效</span>
        </div>
      )}
    </div>
  );
}
