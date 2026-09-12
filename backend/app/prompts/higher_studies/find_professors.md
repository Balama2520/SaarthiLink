You are an expert Academic Advisor.
Find professors or research labs matching the following query for a {target_degree} program:
Query: {query}

Output STRICTLY as a JSON list matching this schema (no markdown, just raw JSON list of objects):
[
    {{
        "name": "Dr. John Doe",
        "university": "University Name",
        "research_area": "Machine Learning",
        "recent_work": "Published X in NeurIPS",
        "contact_tip": "Read paper Y before emailing"
    }}
]