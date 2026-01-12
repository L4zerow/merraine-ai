# Merraine AI - Project Essence

## What Is This?
A recruiting tool that helps recruiters find the right candidates faster using AI-powered search and matching.

## Why Are We Building This?
Recruiters spend too much time manually searching LinkedIn, cross-referencing profiles, and guessing whether candidates are a good fit. This tool does the heavy lifting:

- **Find candidates** with natural language ("senior React developers in Austin with startup experience")
- **Get contact info** when they're ready to reach out
- **Match candidates to jobs** automatically instead of eyeballing fit

## Who Is This For?
Recruiters who:
- Need to fill roles quickly
- Want to search beyond their existing network
- Value their time over manual sourcing
- Need contact info without LinkedIn InMail limitations

## The Core Value Loop

1. **Recruiter has a role to fill**
2. **They search using plain English** → Get ranked candidates
3. **They find promising profiles** → Enrich to get emails/phones
4. **They have multiple roles** → Index jobs, auto-match incoming candidates

## What Makes This Work

The Pearch AI API handles the intelligence:
- Searches across professional profiles
- Scores relevance to queries
- Reveals verified contact info
- Matches profiles against job descriptions

We're the interface. The API is the engine.

## Credit System (Why It Matters)

Every API call costs credits. Recruiters need to:
- **See costs before they commit** - No surprise charges
- **Understand what they're paying for** - Pro search vs fast, email reveal vs phone
- **Track their usage** - Know where credits went

This isn't just a technical constraint - it's a trust feature. Recruiters are accountable for their tools budget.

## MVP Scope

### Must Have
- Search for candidates with natural language
- View and save results
- Reveal contact info (email/phone) on demand
- Add jobs and match candidates against them
- Always-visible credit tracking

### Nice to Have (Later)
- Saved searches
- Candidate lists/pipelines
- Team sharing
- Export to ATS

## Guiding Principles

1. **Respect the API** - It's doing the hard work. We present it well.

2. **Credits = Trust** - Always transparent about costs before action.

3. **Recruiter time is valuable** - Every click should feel worth it. No friction for friction's sake.

4. **Ship simple, iterate fast** - MVP means something usable today, not perfect tomorrow.

---

## API Reference (Pearch AI)

| Action | Endpoint | Cost |
|--------|----------|------|
| Search candidates | `/v2/search` | 1-5 credits/profile + add-ons |
| Enrich profile | `/v1/profile` | 1 credit + add-ons |
| Index jobs | `/v1/upsert_jobs` | 1 credit/job |
| Match to jobs | `/v1/find_matching_jobs` | 1 credit/match |
| List jobs | `/v1/list_jobs` | Free |
| Delete jobs | `/v1/delete_jobs` | Free |

### Add-on Costs (per profile)
- Insights: +1
- Scoring: +1
- High freshness: +2
- Email reveal: +2
- Phone reveal: +14
