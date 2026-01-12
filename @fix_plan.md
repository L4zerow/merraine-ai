# Merraine AI - Fix Plan

## High Priority (MVP Core) - COMPLETED

### Project Setup
- [x] Initialize Next.js 14 project with TypeScript and Tailwind
- [x] Set up project structure (app/, components/, lib/)
- [x] Create environment config for PEARCH_API_KEY

### Core Library
- [x] Create lib/pearch.ts - API client with types
- [x] Create lib/credits.ts - Credit tracking system

### API Routes
- [x] POST /api/search - Candidate search
- [x] GET /api/enrich - Profile enrichment
- [x] POST /api/jobs - Upsert jobs
- [x] GET /api/jobs - List jobs
- [x] DELETE /api/jobs - Delete jobs
- [x] POST /api/match - Match candidates to jobs

### Pages
- [x] Layout with navigation and credit display
- [x] Search page - Natural language candidate search
- [x] Jobs page - Manage indexed jobs
- [x] Matches page - Match profiles against jobs

### UI Components
- [x] Base glass components (Card, Button, Input)
- [x] CreditTracker - Always visible credit balance
- [x] Profile display in search results

## Medium Priority (Polish)
- [ ] Cost preview before API calls
- [x] Search options (pro/fast, insights, scoring)
- [x] Email/phone reveal toggles
- [x] Error states and loading indicators
- [ ] Usage history display

## Low Priority (Later)
- [ ] Saved searches
- [ ] Export functionality
- [ ] Advanced filters

## Completed
- [x] Project initialization (Ralph setup)
- [x] PROJECT_ESSENCE.md created
- [x] Full MVP implementation
- [x] API integration tested and working

## Notes
- Reference implementation at: /Users/laz/Documents/WADL/Dev/Recruiting Test/recruiting-demo/
- MVP is complete and functional
- Search API tested and returning real results
- Jobs API may have temporary Pearch API issues (500 errors)
