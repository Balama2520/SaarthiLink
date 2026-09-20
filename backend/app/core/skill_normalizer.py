"""
Skill Normalization Utility
===========================
Ensures that canonical skill names are stored consistently regardless of how users
or seed data spell them.

Examples of normalization:
  "C++"          → "cpp"
  "C Plus Plus"  → "cpp"
  "NodeJS"       → "nodejs"
  "node.js"      → "nodejs"
  "Machine Learning" → "machine learning"
  "ML"           → "machine learning"
"""

import re
import logging

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Canonical alias map: every alias key maps to its canonical skill name.
# Keys are already lowercased + stripped for fast lookup.
# ---------------------------------------------------------------------------
SKILL_ALIASES: dict[str, str] = {
    # C / C++
    "c++": "cpp",
    "c plus plus": "cpp",
    "cplusplus": "cpp",
    "c/c++": "cpp",
    # JavaScript ecosystem
    "javascript": "javascript",
    "js": "javascript",
    "node.js": "nodejs",
    "nodejs": "nodejs",
    "node js": "nodejs",
    "reactjs": "react",
    "react.js": "react",
    "react js": "react",
    "vuejs": "vue.js",
    "vue js": "vue.js",
    "angular js": "angular",
    "angularjs": "angular",
    "next.js": "nextjs",
    "nextjs": "nextjs",
    # Python
    "python3": "python",
    "python 3": "python",
    "py": "python",
    # Machine Learning
    "ml": "machine learning",
    "machine-learning": "machine learning",
    "deep learning": "deep learning",
    "dl": "deep learning",
    "nlp": "natural language processing",
    "natural-language-processing": "natural language processing",
    "cv": "computer vision",
    "computer-vision": "computer vision",
    # Cloud
    "aws": "amazon web services",
    "amazon web services": "amazon web services",
    "gcp": "google cloud platform",
    "google cloud": "google cloud platform",
    "azure": "microsoft azure",
    # Databases
    "postgresql": "postgresql",
    "postgres": "postgresql",
    "mysql": "mysql",
    "mongo": "mongodb",
    "mongo db": "mongodb",
    # Devops / Tools
    "ci/cd": "ci cd",
    "ci-cd": "ci cd",
    "github actions": "github actions",
    "kubernetes": "kubernetes",
    "k8s": "kubernetes",
    "docker": "docker",
    # Java
    "java se": "java",
    "java ee": "java",
    "springboot": "spring boot",
    "spring-boot": "spring boot",
}


def normalize_skill(raw: str) -> str:
    """
    Normalize a raw skill string to its canonical form.

    Args:
        raw: The raw skill name as entered by a user or from a dataset.

    Returns:
        A lowercase canonical skill name suitable for DB storage and comparison.
    """
    if not raw or not raw.strip():
        return ""

    # Lowercase + collapse whitespace
    cleaned = re.sub(r"\s+", " ", raw.strip().lower())

    # Remove trailing/leading punctuation (e.g. "Python." → "Python")
    cleaned = re.sub(r"[^\w\s\+\#\./]", "", cleaned).strip()

    canonical = SKILL_ALIASES.get(cleaned, cleaned)
    if canonical != cleaned:
        logger.debug("Skill normalized: '%s' → '%s'", raw, canonical)
    return canonical


def normalize_skills(raw_skills: list[str]) -> list[str]:
    """
    Normalize a list of raw skill strings, removing empties and deduplicating.

    Args:
        raw_skills: List of raw skill name strings.

    Returns:
        Deduplicated list of canonical skill names.
    """
    seen: set[str] = set()
    result: list[str] = []
    for skill in raw_skills:
        canonical = normalize_skill(skill)
        if canonical and canonical not in seen:
            seen.add(canonical)
            result.append(canonical)
    return result
