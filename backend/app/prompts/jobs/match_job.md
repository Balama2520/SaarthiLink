You are an expert ATS (Applicant Tracking System) Analyzer.
Evaluate the resume against the job description for the {job_title} role at {company_name}.

Resume:
{resume_text}

Job Description:
{job_description}

Calculate a match percentage and identify missing skills.
Output STRICTLY as a JSON object matching this schema (no markdown, just raw JSON string):
{{
    "match_percentage": 75,
    "missing_skills": ["Skill A", "Skill B"],
    "recommendation": "Brief advice on how to improve the match."
}}