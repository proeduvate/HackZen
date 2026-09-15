# Presentation Content

## Slide 1: Title

- Hackathon Portal AI Backend
- FastAPI, OpenRouter, RAG, and memory-driven mentoring

## Slide 2: Problem

- Hackathon teams need fast, contextual guidance
- Static FAQs are not enough during live competition
- Mentors are not always available in real time

## Slide 3: Solution

- AI assistant that guides users Socratically
- Hackathon-specific retrieval from text datasets
- Session memory across multiple conversations

## Slide 4: Architecture

- FastAPI routes for chat, query, history, memory, upload, and health
- OpenRouter client for model access
- RAG index for similarity search
- JSON-backed session memory store

## Slide 5: AI Behavior

- Ask guiding questions
- Offer hints before final answers
- Break problems into steps
- Support reasoning instead of dumping solutions

## Slide 6: Retrieval Flow

- User submits a question
- Relevant dataset chunks are retrieved
- Context is injected into the system prompt
- OpenRouter generates the guided answer

## Slide 7: Memory Flow

- Save every user and assistant turn
- Load prior session history for continuity
- Support clearing and updating memory
- Track hackathon-specific context

## Slide 8: Security

- Input validation and sanitization
- Rate limiting
- Secret management through environment variables
- Graceful error handling and logging

## Slide 9: Frontend Integration

- Compatible with React, Next.js, Vue, and plain HTML/JS
- JSON responses for easy rendering
- Supports session IDs and loading states

## Slide 10: Deployment

- Install dependencies
- Configure `.env`
- Run with Uvicorn or Docker
- Monitor logs and persist memory storage

