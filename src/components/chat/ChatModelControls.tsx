'use client';

/**
 * @file ChatModelControls.tsx
 * @description 模型与生成参数控制栏：Provider、模型、Temperature、Max Output Tokens、System Prompt、Prompt 模板
 */
import { useState } from 'react';
import { ChevronDown, Info, Plus, Trash2 } from 'lucide-react';
import { SUPPORTED_PROVIDERS } from '@/src/lib/ai';
import { cn } from '@/src/lib/utils';
import { useChatStore } from '@/src/stores/chatStore';
import type { ModelConfig, ModelProvider, PromptTemplate } from '@/src/types/chat';

interface ChatModelControlsProps {
  /** 当前会话 ID，用于应用 Prompt 模板 */
  sessionId: string;
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
 * 4. 支持展开编辑 System Prompt，实时保存到当前会话配置。
 * 5. 支持 Prompt 模板预设：一键应用到当前会话，并提供前端本地管理（增删改）。
 */
export function ChatModelControls({ sessionId, config, onChange }: ChatModelControlsProps) {
  const providerMeta = SUPPORTED_PROVIDERS[config.provider];
  const availableModels = providerMeta.models;
  const params = providerMeta.generationParams;
  const isReasoningModel = providerMeta.reasoningModels?.includes(config.model) ?? false;
  const [isSystemPromptOpen, setIsSystemPromptOpen] = useState(false);
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState(false);
  const hasSystemPrompt = Boolean(config.systemPrompt?.trim());

  const promptTemplates = useChatStore((state) => state.promptTemplates);
  const applyPromptTemplate = useChatStore((state) => state.applyPromptTemplate);
  const addPromptTemplate = useChatStore((state) => state.addPromptTemplate);
  const updatePromptTemplate = useChatStore((state) => state.updatePromptTemplate);
  const deletePromptTemplate = useChatStore((state) => state.deletePromptTemplate);

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

  /** 应用选中的 Prompt 模板到当前会话 */
  const handleApplyTemplate = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    if (!templateId) return;
    applyPromptTemplate(sessionId, templateId);
    // 应用模板后自动展开 system prompt，方便用户查看/二次编辑
    setIsSystemPromptOpen(true);
    // 重置下拉框为占位选项，表示这是一个动作而非状态
    e.target.value = '';
  };

  /** 新建空模板 */
  const handleAddTemplate = () => {
    addPromptTemplate({
      name: '新模板',
      systemPrompt: '',
    });
  };

  // 主题相关：控制栏使用 surface / border / input / muted 等语义化 token，
  // 深浅色模式下自动适配表单控件配色。
  // 移动端适配：<sm 时字号提为 16px，避免 iOS 聚焦下拉框/数字输入框时自动放大页面；
  // 控件间用 flex-wrap 换行，窄屏下自动折行避免横向溢出。
  return (
    <div className="border-b border-border bg-surface px-3 py-2 text-base sm:text-sm">
      <div className="flex flex-wrap items-center gap-2">
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

        {/* Prompt 模板应用 */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="template-select" className="text-muted-foreground">模板</label>
          <select
            id="template-select"
            defaultValue=""
            onChange={handleApplyTemplate}
            className="rounded-md border border-input bg-surface px-2 py-1 text-foreground focus:border-primary focus:outline-none"
          >
            <option value="" disabled>应用模板…</option>
            {promptTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>

        {/* 右侧操作按钮组 */}
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsTemplateManagerOpen((open) => !open)}
            aria-expanded={isTemplateManagerOpen}
            className={cn(
              'flex items-center gap-1 rounded-md px-2 py-1 text-sm transition-colors',
              isTemplateManagerOpen
                ? 'bg-primary/10 text-primary hover:bg-primary/20'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            管理模板
            <ChevronDown
              className={cn('h-4 w-4 transition-transform', isTemplateManagerOpen && 'rotate-180')}
            />
          </button>

          <button
            type="button"
            onClick={() => setIsSystemPromptOpen((open) => !open)}
            aria-expanded={isSystemPromptOpen}
            className={cn(
              'flex items-center gap-1 rounded-md px-2 py-1 text-sm transition-colors',
              hasSystemPrompt
                ? 'bg-primary/10 text-primary hover:bg-primary/20'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            系统提示
            <ChevronDown
              className={cn('h-4 w-4 transition-transform', isSystemPromptOpen && 'rotate-180')}
            />
          </button>
        </div>

        {/* 推理模型提示 */}
        {isReasoningModel && (
          <div className="flex w-full items-center gap-1 text-xs text-muted-foreground sm:w-auto">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>当前为推理模型，Temperature 固定，修改不生效</span>
          </div>
        )}
      </div>

      {/* System Prompt 编辑区 */}
      {isSystemPromptOpen && (
        <div className="mt-2">
          <label htmlFor="system-prompt-input" className="sr-only">
            系统提示词
          </label>
          <textarea
            id="system-prompt-input"
            value={config.systemPrompt ?? ''}
            onChange={(e) => onChange({ systemPrompt: e.target.value })}
            placeholder="输入系统提示词，会作为 system message 发给模型，不会显示在聊天界面..."
            rows={3}
            className="w-full resize-y rounded-md border border-input bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
      )}

      {/* Prompt 模板管理区 */}
      {isTemplateManagerOpen && (
        <div className="mt-2 space-y-2">
          {promptTemplates.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无 Prompt 模板</p>
          ) : (
            promptTemplates.map((template) => (
              <PromptTemplateEditor
                key={template.id}
                template={template}
                onUpdate={updatePromptTemplate}
                onDelete={deletePromptTemplate}
              />
            ))
          )}
          <button
            type="button"
            onClick={handleAddTemplate}
            className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-input py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
            新建模板
          </button>
        </div>
      )}
    </div>
  );
}

/** 单个 Prompt 模板编辑器 */
interface PromptTemplateEditorProps {
  template: PromptTemplate;
  onUpdate: (id: string, updates: Partial<Omit<PromptTemplate, 'id'>>) => void;
  onDelete: (id: string) => void;
}

function PromptTemplateEditor({ template, onUpdate, onDelete }: PromptTemplateEditorProps) {
  return (
    <div className="rounded-md border border-input bg-surface p-2">
      <div className="mb-2 flex items-center gap-2">
        <input
          type="text"
          value={template.name}
          onChange={(e) => onUpdate(template.id, { name: e.target.value })}
          placeholder="模板名称"
          className="flex-1 rounded-md border border-input bg-surface px-2 py-1 text-sm text-foreground focus:border-primary focus:outline-none"
        />
        <button
          type="button"
          onClick={() => onDelete(template.id)}
          className="flex shrink-0 items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          aria-label="删除模板"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <textarea
        value={template.systemPrompt}
        onChange={(e) => onUpdate(template.id, { systemPrompt: e.target.value })}
        placeholder="输入系统提示词..."
        rows={2}
        className="w-full resize-y rounded-md border border-input bg-surface px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
      />
    </div>
  );
}
