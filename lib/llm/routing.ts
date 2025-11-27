import { AgentId } from "../agents/types";
import { ModelConfig } from "./types";

const generalModel: ModelConfig = {
  model: process.env.LLM_MODEL_GENERAL ?? "general-model",
  temperature: 0.2,
  maxTokens: 1500,
};

const codeModel: ModelConfig = {
  model: "gpt-4o-mini",
  provider: "openai",
  fallbackModel: "claude-3-5-sonnet-20241022",
  fallbackProvider: "anthropic",
  temperature: 0.1,
  maxTokens: 2000,
};

const web3Model: ModelConfig = {
  model: process.env.LLM_MODEL_WEB3 ?? codeModel.model,
  temperature: 0.15,
  maxTokens: 1800,
};

const auditModel: ModelConfig = {
  model: "claude-3-5-sonnet-20241022",
  provider: "anthropic",
  temperature: 0,
  maxTokens: 1200,
};

const summaryModel: ModelConfig = {
  model: process.env.LLM_MODEL_SUMMARY ?? generalModel.model,
  temperature: 0.3,
  maxTokens: 800,
};

const agentModelMap: Partial<Record<AgentId, ModelConfig>> = {
  mia: generalModel,
  jordan: generalModel,
  riley: generalModel,
  ava: generalModel,
  liam: codeModel,
  noah: codeModel,
  sophia: codeModel,
  kai: web3Model,
  iris: generalModel,
  nova: codeModel,
  ethan: codeModel,
  grace: auditModel,
  owen: codeModel,
  chloe: summaryModel,
};

export function getAgentModelConfig(agentId: AgentId): ModelConfig {
  return agentModelMap[agentId] ?? generalModel;
}
