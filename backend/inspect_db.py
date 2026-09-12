import sqlite3
conn = sqlite3.connect('saarthi.db')
cur = conn.cursor()
for table in ['users','user_profiles','resumes','user_skills','jobs','saved_jobs','goals','goal_versions','memories','decision_logs']:
    try:
        count = cur.execute(f'SELECT COUNT(*) FROM {table}').fetchone()[0]
        print(table, count)
    except Exception as e:
        print(table, 'ERROR', e)
conn.close()
