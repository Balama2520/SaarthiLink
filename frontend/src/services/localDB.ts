import localforage from "localforage";

// Initialize the local database
localforage.config({
  name: "SaarthiAI", // IndexedDB database name — left as-is intentionally;
                      // renaming it would orphan any data already cached in
                      // a returning user's browser rather than migrate it.
  storeName: "workspaces", // Should be alphanumeric, with underscores.
  description: "Local-First storage for SaarthiLink MVP",
});

export const localDB = {
  // --- SkillForge Pipelines ---
  async savePipeline(pipelineData: unknown) {
    try {
      await localforage.setItem("latest_skillforge_pipeline", pipelineData);
    } catch (err) {
      console.error("Failed to save pipeline locally", err);
    }
  },

  async getPipeline() {
    try {
      return await localforage.getItem("latest_skillforge_pipeline");
    } catch (err) {
      console.error("Failed to load pipeline locally", err);
      return null;
    }
  },

  // --- Resume Analysis ---
  async saveResumeAnalysis(analysisData: unknown) {
    try {
      await localforage.setItem("latest_resume_analysis", analysisData);
    } catch (err) {
      console.error("Failed to save resume analysis locally", err);
    }
  },

  async getResumeAnalysis() {
    try {
      return await localforage.getItem("latest_resume_analysis");
    } catch (err) {
      console.error("Failed to load resume analysis locally", err);
      return null;
    }
  },

  // --- Guest Chat History (AI OS Chat, unauthenticated fallback) ---
  async saveChatHistory(history: unknown) {
    try {
      await localforage.setItem("guest_chat_history", history);
    } catch (err) {
      console.error("Failed to save chat history locally", err);
    }
  },

  async getChatHistory() {
    try {
      return await localforage.getItem("guest_chat_history");
    } catch (err) {
      console.error("Failed to load chat history locally", err);
      return null;
    }
  },

  async clearChatHistory() {
    try {
      await localforage.removeItem("guest_chat_history");
    } catch (err) {
      console.error("Failed to clear chat history locally", err);
    }
  }
};
