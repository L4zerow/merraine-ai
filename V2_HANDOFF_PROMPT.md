# V2 Development Prompt - Merraine AI Production Platform

## Mission

You are building **Merraine AI V2**, a production-ready, multi-tenant recruiting platform. This repo contains the V1 proof of concept that validated the core idea. Your job is to:

1. **Extract the essence** - Understand what makes V1 work
2. **Document the patterns** - Create structured context files
3. **Architect V2** - Design production-ready system
4. **Build systematically** - Ship production-quality code

---

## Phase 1: V1 Analysis & Context Extraction

### Your Analysis Task

Before writing ANY code, thoroughly analyze this V1 repository and create comprehensive context documentation.

### Required Context Files

Create these files in the V2 repository:

#### 1. `V2_CORE_THEORY.md`
**Purpose:** Capture the "why" behind V1's design decisions

Extract and document:
- **Business Model** - What problem does this solve? Who pays? Why?
- **Value Loop** - How does the user flow create value?
- **Credit Economics** - Why does the credit system matter?
- **Pearch API Philosophy** - Why did V1 proxy everything? What's the relationship?
- **Core Principles** - What are the 3-5 guiding principles that made V1 work?

**Sources in V1:**
- `/PROJECT_ESSENCE.md` - Business context
- `/PROMPT.md` - Development principles
- `/README.md` - Features and usage patterns

#### 2. `V2_PATTERNS_LIBRARY.md`
**Purpose:** Document reusable technical patterns from V1

Extract these patterns:

| Pattern | V1 Location | What to Extract |
|---------|-------------|-----------------|
| **API Client** | `lib/pearch.ts` | How to structure Pearch API client, error handling, request/response flow |
| **Cost Calculation** | `lib/pearch.ts:98-114` | `calculateSearchCost()`, `calculateEnrichCost()` - the formulas matter |
| **Rate Limiting** | `lib/rateLimit.ts`, `app/api/*/route.ts` | Implementation pattern, limits per endpoint |
| **Response Transformation** | `app/api/search/route.ts:15-59` | How to normalize Pearch API responses |
| **Credit Tracking** | `lib/credits.ts` | Client-side credit management approach |
| **Search Caching** | `lib/searchCache.ts` | Why 1-hour TTL? What gets cached? |
| **Find Similar** | `lib/findSimilar.ts` | The algorithm for candidate similarity |
| **Export System** | `lib/exportSearchResults.ts` | Multi-format export patterns |
| **Auth Pattern** | `app/api/*/route.ts:62-70` | Simple but effective auth check |

For EACH pattern, document:
- **What it does** - Purpose and business value
- **How it works** - Implementation approach
- **Why this way** - Design rationale
- **V2 evolution** - How should this change for production?

#### 3. `V2_ARCHITECTURE_DECISIONS.md`
**Purpose:** V1 limitations and V2 architectural improvements

Structure:

```markdown
## V1 Analysis

### What V1 Got Right
- [List architectural wins that should carry forward]

### V1 Limitations
- [Technical debt, shortcuts, MVP decisions]

### Production Requirements
- [What needs to change for multi-tenant production use]

## V2 Architecture

### Infrastructure
- Database strategy (V1 used localStorage - V2 needs real DB)
- Auth system (V1 used simple cookies - V2 needs proper auth)
- Multi-tenancy approach
- API security patterns

### Data Model
- User/Account structure
- Credit management (per-account tracking)
- Search history
- Saved candidates (proper DB, not localStorage)

### Scalability Patterns
- Rate limiting (per-tenant, not per-IP)
- Credit pooling/limits per account
- Search result caching strategy
- API cost optimization

### UI/UX Evolution
- Component library choice
- Design system requirements
- Responsive patterns
- Performance targets
```

#### 4. `V2_API_INTEGRATION_GUIDE.md`
**Purpose:** Complete Pearch API integration reference

Extract from V1:
- All API endpoints used (`/v2/search`, `/v1/profile`, etc.)
- Request/response schemas (from `lib/pearch.ts` types)
- Credit costs (from `PROJECT_ESSENCE.md:73-89`)
- Error handling patterns (from `lib/pearch.ts` and API routes)
- Rate limits and best practices discovered

Add for V2:
- Production error handling strategy
- Retry logic patterns
- API monitoring/logging approach
- Cost optimization strategies

#### 5. `V2_FEATURE_PARITY.md`
**Purpose:** Track what V1 had, what V2 must have, what V2 will add

```markdown
## V1 Features (Must Carry Forward)

### Core Features
- [ ] Natural language candidate search
- [ ] Location filtering
- [ ] Contact reveal (email/phone)
- [ ] Find Similar candidates
- [ ] Save candidates
- [ ] Export (CSV, MD, JSON)
- [ ] Credit tracking UI
- [ ] Cost transparency (show before action)

### Technical Features
- [ ] Search result caching
- [ ] Rate limiting
- [ ] Simple authentication

## V2 Enhancements

### New Production Features
- [ ] Multi-tenant support
- [ ] Team collaboration
- [ ] Advanced search history
- [ ] Pipeline management
- [ ] ATS integrations
- [ ] [Add more based on vision]

### Infrastructure
- [ ] Production database
- [ ] Proper authentication (OAuth, etc.)
- [ ] Usage analytics
- [ ] Billing system
```

---

## Phase 2: V2 Development Approach

### Before Writing Code

Once you've created all context files:

1. **Review with Laz** - Get approval on the extracted patterns and V2 architecture
2. **Prioritize features** - Start with MVP parity, then add production features
3. **Set up project structure** - Modern Next.js 15+, proper DB, auth system
4. **Create technical specs** - One feature at a time, with clear acceptance criteria

### Development Principles

**Carry forward from V1:**
- ✅ **Respect the API** - Pearch does the intelligence, we present it well
- ✅ **Credits = Trust** - Always show costs before actions
- ✅ **Recruiter time is valuable** - Every click should feel worth it
- ✅ **Keep it simple** - Don't over-engineer

**Add for V2:**
- ✅ **Production-quality from day 1** - No "we'll fix it later" shortcuts
- ✅ **Multi-tenant by design** - Architecture supports multiple companies
- ✅ **Observability built-in** - Logging, monitoring, error tracking from start
- ✅ **Security-first** - Proper auth, input validation, rate limiting per tenant

### Tech Stack Considerations

**V1 used:**
- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- localStorage for state
- Simple cookie auth

**V2 should consider:**
- Next.js 15+ (latest stable)
- TypeScript (keep this)
- Modern styling system (Tailwind or alternative)
- **Real database** (Postgres, MySQL, or Supabase)
- **Proper auth** (NextAuth, Clerk, Supabase Auth, or Auth.js)
- **State management** (React Query for server state, Zustand for client state)
- **Multi-tenancy** (org-based isolation)

---

## Critical Questions to Answer Before Building

Document answers to these in your context files:

### Business Model
1. Is this per-seat pricing or per-credit pricing?
2. Do credits pool at the company level or per-user?
3. What's the billing cycle?
4. Free tier or trial?

### User Model
1. Can users belong to multiple organizations?
2. What permission levels exist (admin, recruiter, viewer)?
3. How does candidate sharing work within a team?

### Data Ownership
1. Do saved candidates belong to the user or the organization?
2. Can search results be shared?
3. What's the data retention policy?

### API Strategy
1. Do we pass through Pearch API costs 1:1?
2. Is there a markup on credits?
3. How do we handle Pearch API downtime?

---

## Analysis Checklist

Before moving to V2 development, verify you've:

- [ ] Read and understood `PROJECT_ESSENCE.md`
- [ ] Analyzed `lib/pearch.ts` completely
- [ ] Studied all API routes (`app/api/**/route.ts`)
- [ ] Examined credit calculation logic
- [ ] Understood rate limiting approach
- [ ] Reviewed Find Similar algorithm
- [ ] Analyzed export system
- [ ] Mapped component structure
- [ ] Created all 5 context files
- [ ] Identified V1 patterns to evolve
- [ ] Identified V1 patterns to keep exactly
- [ ] Listed production requirements not in V1
- [ ] Drafted V2 architecture proposal
- [ ] Got Laz's approval on direction

---

## Working with Laz

### Communication Style
- Be direct and concise
- Show, don't tell (code examples over explanations)
- Ask clarifying questions early
- Present options with trade-offs, not just recommendations

### When to Check In
- After completing Phase 1 analysis (before any V2 code)
- Before major architectural decisions
- When V1 patterns are unclear or seem wrong
- When business model questions block progress

### What Laz Cares About
- **Shipping fast** - But not at the cost of quality
- **Production-ready** - V2 needs to work for real customers
- **Multi-tenant** - This needs to scale to multiple recruiting companies
- **Credit transparency** - Don't break the trust model

---

## Success Criteria

You've completed Phase 1 successfully when:

1. All 5 context files are created and comprehensive
2. V2 architecture is clearly defined
3. All V1 patterns are documented with evolution path
4. Technical questions are answered or flagged for Laz
5. You can explain V1's "why" not just "what"
6. Laz approves the V2 direction

You're ready to build V2 when:

1. Project structure is set up
2. Database schema is designed
3. Auth system is chosen and configured
4. First feature spec is written
5. Laz says "ship it"

---

## Reference: V1 Repository Structure

```
merraine-ai/ (V1)
├── PROJECT_ESSENCE.md      # Business context - READ FIRST
├── PROMPT.md               # Development instructions
├── @AGENT.md               # Build instructions
├── README.md               # User-facing documentation
│
├── app/
│   ├── api/
│   │   ├── search/route.ts     # Candidate search endpoint
│   │   └── enrich/route.ts     # Profile enrichment endpoint
│   ├── search/page.tsx         # Main search interface
│   ├── saved/page.tsx          # Saved candidates
│   └── page.tsx                # Dashboard
│
├── lib/
│   ├── pearch.ts               # API client - STUDY THIS
│   ├── credits.ts              # Credit tracking
│   ├── rateLimit.ts            # Rate limiting
│   ├── findSimilar.ts          # Similarity algorithm
│   ├── searchCache.ts          # Result caching
│   └── exportSearchResults.ts  # Export utilities
│
└── components/
    ├── ui/                     # Reusable components
    └── search/                 # Search-specific components
```

---

## Your First Steps

1. Read this entire prompt carefully
2. Read `PROJECT_ESSENCE.md` in V1 repo
3. Start with `V2_CORE_THEORY.md` - extract the "why"
4. Move through all 5 context files systematically
5. When complete, present findings to Laz
6. Wait for approval before writing V2 code

**Remember:** V1 is proof that this works. V2 is making it production-ready and scalable. Don't lose what made V1 great while adding what V2 needs.

Good luck! 🚀
