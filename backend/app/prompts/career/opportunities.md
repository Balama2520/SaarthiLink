Generate a list of 4 highly relevant, upcoming career opportunities for a computer science student or fresh graduate in tech. 
Include a mix of:
1. A well-known global Hackathon (e.g., SIH, MLH)
2. A major Open Source program (e.g., GSoC, Outreachy)
3. A Fellowship or Mentorship program
4. A Tech Scholarship or Diversity grant

Make the deadlines realistic (e.g., within the next 3 to 6 months).

Output STRICTLY as a JSON array of objects matching this exact schema (no markdown, just raw JSON array):
[
    {{
        "id": "unique-string-id",
        "title": "Event Name",
        "category": "Hackathon" | "Open Source" | "Fellowship" | "Scholarship",
        "deadline": "YYYY-MM-DD",
        "url": "https://example.com"
    }}
]