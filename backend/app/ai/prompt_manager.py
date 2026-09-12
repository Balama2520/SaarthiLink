import os
import logging
import string

logger = logging.getLogger(__name__)

class SafeDict(dict):
    def __missing__(self, key):
        return '{' + key + '}'

class PromptManager:
    @staticmethod
    def load(name: str, **kwargs) -> str:
        """
        Load a prompt from the app/prompts directory and format it.
        Example: PromptManager.load("career/ats", resume_text="...", job_title="...")
        """
        base_dir = os.path.dirname(os.path.dirname(__file__))
        prompt_path = os.path.join(base_dir, "prompts", f"{name}.md")
        
        if not os.path.exists(prompt_path):
            logger.error(f"Prompt file not found: {prompt_path}")
            return f"Error: Prompt template '{name}' not found."
            
        with open(prompt_path, "r", encoding="utf-8") as f:
            template = f.read()
            
        try:
            # Use string.Formatter with a safe dict to ignore missing keys (useful for JSON templates containing {})
            formatter = string.Formatter()
            return formatter.vformat(template, (), SafeDict(**kwargs))
        except Exception as e:
            logger.error(f"Error formatting prompt '{name}': {e}")
            return template
