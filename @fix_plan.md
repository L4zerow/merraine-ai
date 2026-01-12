# Merraine AI - Fix Plan

## High Priority (MVP Core)

### Project Setup
- [ ] Initialize Next.js 14 project with TypeScript and Tailwind
- [ ] Set up project structure (app/, components/, lib/)
- [ ] Create environment config for PEARCH_API_KEY

### Core Library
- [ ] Create lib/pearch.ts - API client with types
- [ ] Create lib/credits.ts - Credit tracking system

### API Routes
- [ ] POST /api/search - Candidate search
- [ ] GET /api/enrich - Profile enrichment
- [ ] POST /api/jobs - Upsert jobs
- [ ] GET /api/jobs - List jobs
- [ ] DELETE /api/jobs - Delete jobs
- [ ] POST /api/match - Match candidates to jobs

### Pages
- [ ] Layout with navigation and credit display
- [ ] Search page - Natural language candidate search
- [ ] Jobs page - Manage indexed jobs
- [ ] Matches page - Match profiles against jobs

### UI Components
- [ ] Base glass components (Card, Button, Input)
- [ ] CreditTracker - Always visible credit balance
- [ ] SearchResults - Display candidate profiles
- [ ] JobCard - Display job listings

## Medium Priority (Polish)
- [ ] Cost preview before API calls
- [ ] Search options (pro/fast, insights, scoring)
- [ ] Email/phone reveal toggles
- [ ] Error states and loading indicators
- [ ] Usage history display

## Low Priority (Later)
- [ ] Saved searches
- [ ] Export functionality
- [ ] Advanced filters

## Completed
- [x] Project initialization (Ralph setup)
- [x] PROJECT_ESSENCE.md created

## Notes
- Reference implementation at: /Users/laz/Documents/WADL/Dev/Recruiting Test/recruiting-demo/
- This is MVP - ship working, iterate later
- Always show credit cost before actions
