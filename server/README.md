# Aura server

Backend for the Aura chat assistant: a Groq model that answers credit-card questions by
calling WalletWise's own engine (`../src/engine`) and a verified card knowledge base (RAG).
The Groq key stays here; the phone app never sees it.

```
App (Aura screen) ──POST /aura/chat──▶ server ──▶ Groq (LLM, tool calling, streaming)
                                         ├──▶ tools → WalletWise engine (best card, points, trips, updates)
                                         └──▶ search_card_knowledge → embeddings (all-MiniLM-L6-v2) → Chroma
```

## Setup (once)

Requires Node 22.6 or newer (Node 24 recommended) and Python 3.10+ for Chroma.

```bash
cd server
npm install
python -m venv .venv
.venv/Scripts/python -m pip install "chromadb==1.5.9"    # Windows
# .venv/bin/python -m pip install "chromadb==1.5.9"      # macOS / Linux
```

Add these lines to the project's `.env` (one folder up, next to the app's other keys).
Variables without `EXPO_PUBLIC_` are never put into the app.

```
GROQ_API_KEY=your_groq_key
GROQ_MODEL=openai/gpt-oss-120b
```

## Run

From the project folder (not `server/`), one command starts everything:

```bash
npm start
```

It starts Chroma (if installed and not already running), builds the knowledge index on the
first run, starts the Aura server, then starts Expo with its QR code. The Aura server restarts
by itself when server or engine code changes, and an older Aura server left running is
replaced. `npm start -- -c` clears the Metro cache. Ctrl+C stops everything.

Your phone and computer must be on the same Wi-Fi, and Windows Firewall must allow Node
(Windows asks the first time). If the server runs elsewhere, set `EXPO_PUBLIC_AURA_API_URL` in `.env`.

Check: `http://localhost:8787/health` shows `groqKeySet: true` and your model.

Run pieces separately if needed: `npm run aura:chroma`, `npm run aura:server`,
`npm run aura:ingest` (rebuild the index after `npm run build:data` or editing `knowledge/`),
`npm run start:expo` (the app only).

## Tests

```bash
npm test     # agent loop (with a scripted fake model), tools, request validation, streaming route, RAG
```

## Files

| Path | What it does |
|---|---|
| `src/llm/LLMClient.ts` | Provider interface, error types, exponential backoff |
| `src/llm/groqClient.ts` | Groq implementation (streaming, tool calls) |
| `src/llm/index.ts` | Picks the provider from `LLM_PROVIDER` |
| `src/agent/aura.system.md` | System prompt |
| `src/agent/agent.ts` | Agent loop: model → tools → model, max 4 model calls |
| `src/agent/tools.ts` | Tool schemas and wrappers around the engine |
| `src/rag/*` | Embeddings, Chroma store, chunking, card-name check, documents, ingest, search |
| `src/routes/auraChat.ts` | `POST /aura/chat`, streams newline-delimited JSON |
| `knowledge/cards/*.md` | Hand-written seed docs (5 cards) |
| `knowledge/general/*.md` | Credit-card basics |

## Questions to try

1. Tell me about Diners Black International
2. Tell me about the Zorbit Platinum Ultra card (unknown card: should say it has no verified info)
3. What is the capital of France? (off-topic: should decline)
4. Which card is good? (vague: should ask one question back)
5. Which card for ₹1,500 at Swiggy? (calculation through get_best_card, with a Best Card map button)
6. Any changes to my cards?
7. How should I use my Infinia points?
8. Flight to Goa for ₹6,500: can my points pay for it? (Trip Planner button)
9. What is the annual fee of SBI Cashback and when is it waived?
10. What happens if I pay only the minimum amount due?
