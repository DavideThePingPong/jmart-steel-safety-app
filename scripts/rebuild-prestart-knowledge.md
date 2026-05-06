# Rebuilding `prestart_knowledge.json`

The `prestartAutofill` Cloud Function does RAG over a static knowledge base
of past J&M prestart records, embedded with `Xenova/all-MiniLM-L6-v2`. The
bundle lives at `functions/data/prestart_knowledge.json` (~2.4 MB, 230 records,
384-dim vectors, also marked-`text/plain` in firebase.json `ignore` list so
it's tracked in git but not picked up by lint).

## When to refresh

- New prestart patterns (site types, work categories) emerge that aren't in
  the existing 230 records.
- Quarterly cadence is reasonable; more often if J&M takes on substantially
  new kinds of work.
- Symptom check: if `prestartAutofill` starts returning generic / unhelpful
  suggestions for valid task descriptions, the KB is stale relative to current
  jobs.

## Pipeline (manual today, scriptable later)

1. **Source data** — export the relevant historical prestarts from
   SafetyCulture as PDFs or JSON. Aim for 250–500 records covering the
   work types J&M actually does.

2. **Extract structured fields** — for each record, pull out at minimum:
   - `task` (free-text task description, the field the user types into)
   - `site` or `site_type` (e.g. "high-rise commercial", "industrial fitout")
   - `methodology` (the autofill target field 1)
   - `machinery` (target field 2)
   - `hazards` (target field 3)
   - `permits` (target field 4)

   Strip PII: employee names, exact site addresses, ABN, customer names.
   Keep job category / site type at categorical-fidelity only.

3. **Embed each `task` field** with `Xenova/all-MiniLM-L6-v2`:
   ```python
   from sentence_transformers import SentenceTransformer
   m = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
   embs = m.encode(tasks, normalize_embeddings=True)  # (N, 384)
   ```

4. **Compose** the JSON bundle:
   ```json
   {
     "model": "sentence-transformers/all-MiniLM-L6-v2",
     "dim": 384,
     "generated_at": "<ISO timestamp>",
     "records": [
       {
         "id": "<stable id>",
         "task": "<task description>",
         "site": "<site type>",
         "methodology": "...",
         "machinery": "...",
         "hazards": "...",
         "permits": "...",
         "embedding": [<384 floats>]
       },
       ...
     ]
   }
   ```

5. **Replace** `functions/data/prestart_knowledge.json` (overwrite the existing
   tracked file). Keep a `.bak` if you want a one-step rollback (already
   gitignored as `functions/data/*.bak`).

6. **Deploy:**
   ```
   firebase deploy --only functions:prestartAutofill --project jmart-steel-safety
   ```
   The predeploy hook only protects hosting — for functions you're on your own.
   Smoke-test by hitting `/api/prestart-autofill` with a task description that
   should match a new record and confirming the new record shows up in the
   `sources[]` array.

## Don't break the schema

The Cloud Function expects exactly the structure above. Specifically:

- Top-level `model`, `dim`, `records[]` keys are required.
- Each record needs `task` (string) and `embedding` (array of length `dim`).
- The other fields (`methodology`, `machinery`, `hazards`, `permits`, `site`)
  appear in the prompt context, so missing-but-defined-as-empty-string is
  better than absent.
- `embedding` values must be normalised to unit length (the function does
  cosine similarity by dot product).

## Cost note

Re-embedding 500 records on a laptop CPU takes ~30 seconds with
`sentence-transformers`. Zero API spend — runs entirely locally.
The Cloud Function uses the same model on the embedded query at request time,
so the embeddings always live in the same vector space.

## Future: automation

If this becomes a quarterly thing, wire it into the Mac mini cron:
- launchd plist `com.davide.prestart-kb-refresh` quarterly
- Pulls latest SafetyCulture export from a Drive folder
- Runs the embed-and-bundle step
- Uploads the new `prestart_knowledge.json` to git via `gh api`
- Triggers a function-only redeploy

Skeleton script `scripts/rebuild-prestart-knowledge.py` would be the
implementation. Not yet written — punted until a refresh is actually needed.
Tracked in Gio's MEMORY.md punch-list.
