Analyze the resume text against the target job title: "{job_title}".
Identify critical missing keywords, technical skills, and terms the ATS would look for.

Resume Text:
{resume_text}

Output STRICTLY as a JSON object with this schema:
{{
    "missing_keywords": ["Keyword 1", "Keyword 2"],
    "critical_skills": ["Skill 1", "Skill 2"],
    "recommendation": "Brief advice on keyword integration."
}}