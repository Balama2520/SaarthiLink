import requests, time, json
base='http://127.0.0.1:2520/api'
username='e2e_test_user'
password='E2Epass123!'
print('BASE', base)
# 1. Register (ignore if exists)
try:
    r = requests.post(f"{base}/auth/register", json={'username':username,'password':password}, timeout=5)
    print('REGISTER', r.status_code, r.text[:500])
except Exception as e:
    print('REGISTER ERROR', e)

# 2. Login
token=None
try:
    r = requests.post(f"{base}/auth/login", data={'username':username,'password':password}, timeout=5)
    print('LOGIN', r.status_code, r.text[:500])
    try:
        j=r.json()
        token = j.get('access_token') or j.get('token') or j.get('accessToken')
        print('TOKEN FOUND', bool(token))
    except Exception as e:
        print('LOGIN JSON ERR', e)
except Exception as e:
    print('LOGIN ERROR', e)

headers = {}
if token:
    headers['Authorization']=f'Bearer {token}'

# 3. Create session
session_id=None
try:
    r = requests.post(f"{base}/sessions/", json={'title':'E2E Test'}, headers=headers, timeout=5)
    print('CREATE SESSION', r.status_code, r.text[:500])
    if r.ok:
        session_id = r.json().get('id') or r.json().get('session_id')
        print('SESSION ID', session_id)
except Exception as e:
    print('SESSION ERROR', e)

if not session_id:
    # try list sessions and pick first
    try:
        r = requests.get(f"{base}/sessions/", headers=headers, timeout=5)
        print('LIST SESSIONS', r.status_code, r.text[:500])
        if r.ok and isinstance(r.json(), list) and r.json():
            session_id = r.json()[0].get('id')
            print('PICKED SESSION', session_id)
    except Exception as e:
        print('LIST SESSIONS ERROR', e)

# 4. Chat stream
if session_id:
    try:
        payload = {'message':'Hello Saarthi, give a brief test reply.','session_id':session_id,'model':None,'personality':'default'}
        print('POST CHAT STREAM')
        r = requests.post(f"{base}/chat", json=payload, headers=headers, stream=True, timeout=60)
        print('CHAT STATUS', r.status_code)
        if r.status_code==200:
            full=''
            for line in r.iter_lines(chunk_size=1024, decode_unicode=True):
                if line:
                    try:
                        print('CHUNK:', line[:300])
                        full += line
                    except Exception as e:
                        print('DECODE ERR', e)
            print('\nFULL RESPONSE:\n', full[:2000])
        else:
            print('CHAT ERROR BODY', r.text[:1000])
    except Exception as e:
        print('CHAT REQ ERROR', e)
else:
    print('NO SESSION, SKIPPING CHAT')
