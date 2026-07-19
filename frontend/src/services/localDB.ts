import localforage from "localforage";

// Initialize the local database
localforage.config({
  name: "SaarthiAI",
  storeName: "workspaces", // Should be alphanumeric, with underscores.
  description: "Local-First storage for Saarthi AI MVP",
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
  }
};
