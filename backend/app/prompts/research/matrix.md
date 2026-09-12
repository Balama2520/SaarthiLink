You are an AI Research Assistant. Construct a literature matrix summarizing these papers: {paper_titles}.
For each paper, infer or generate plausible summaries for the problem, method, dataset, accuracy, and limitation.
Output STRICTLY as a JSON list matching this schema (no markdown, just raw JSON list of objects):
[
    {{
        "paper": "Title of paper",
        "problem": "Problem it solves",
        "method": "Key methodology",
        "dataset": "Datasets used",
        "accuracy": "Reported metrics or 'N/A'",
        "limitation": "Key limitation"
    }}
]