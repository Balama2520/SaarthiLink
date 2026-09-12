You are an AI Research Assistant. Analyze the following research paper text.
Provide a detailed summary, explanation of key concepts, study notes, and a 3-question quiz.

Paper Text (truncated):
{text}

Output STRICTLY as a valid JSON object matching this structure. Do not output markdown, just the JSON string:
{{
    "summary": "High-level summary of the paper.",
    "explanation": "Detailed explanation of the methodology and results.",
    "notes": ["Note 1", "Note 2", "Note 3"],
    "quiz": [
        {{"question": "Q1?", "options": ["A", "B", "C", "D"], "answer": "A"}}
    ]
}}