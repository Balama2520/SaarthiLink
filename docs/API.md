# Saarthi AI API Reference

Base URL: `http://localhost:2520`

## Authentication

### Register
`POST /auth/register`
- Body: `{"username": "...", "password": "..."}`
- Returns: `{"access_token": "...", "token_type": "bearer"}`

### Login
`POST /auth/login`
- Body: `username=...&password=...` (Form-data)
- Returns: `{"access_token": "...", "token_type": "bearer"}`

## Sessions

### List Sessions
`GET /sessions/`
- Header: `Authorization: Bearer <token>`
- Returns: List of valid chat sessions.

### Create Session
`POST /sessions/`
- Header: `Authorization: Bearer <token>`
- Body: `{"title": "My Chat"}`
- Returns: Created session object.

### Get Messages
`GET /sessions/{session_id}/messages`
- Header: `Authorization: Bearer <token>`
- Returns: History of messages for the session.

## System

### Health Check
`GET /health`
- Returns: `{"status": "online", "time": "...", "target_ollama": "..."}`
