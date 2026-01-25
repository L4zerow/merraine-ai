# Strategic Brief - Production Recruiting Platform

## What You're Building

A **production-ready, white-label recruiting platform** that will be licensed to recruiting companies. This is not an iteration—this is a new product inspired by a proof of concept.

You have complete creative freedom to architect something exceptional.

---

## The V1 Context

This repository contains a working proof of concept that validated core assumptions:
- Recruiters will pay for AI-powered candidate search
- Natural language > boolean search
- Transparent credit costs build trust
- Pearch API provides the intelligence layer

**Your job:** Extract the lessons, discard the limitations, build something production-worthy.

---

## Your Mission (3 Phases)

### Phase 1: Strategic Analysis
Analyze V1 to understand **what worked and why**, not to copy it.

Create these strategic documents in your V2 repo:

#### 1. `PRODUCT_STRATEGY.md`
Answer these questions by studying V1:

**Market Position**
- What job is this product hired to do? (V1 answer: replace manual LinkedIn sourcing)
- Who pays? Why? How much? (Study `PROJECT_ESSENCE.md`)
- What's the competitive moat? (V1 answer: Pearch API + transparent UX)

**Value Proposition**
- What's the core value loop? (Recruiter has role → finds candidates → reveals contact → fills role)
- What makes this different from competitors?
- Why would a recruiting company license this over building themselves?

**Business Model Options**
Based on V1's credit system, propose:
- Pricing model (per-seat? per-credit? hybrid?)
- Multi-tenant approach (separate instances? shared DB with org isolation?)
- Credit economics (pass-through? markup? packages?)

#### 2. `TECHNICAL_LEARNINGS.md`
Extract V1's technical patterns—but question everything:

| V1 Pattern | File Location | What It Teaches | Should V2 Keep It? |
|------------|---------------|-----------------|-------------------|
| Pearch API client | `lib/pearch.ts` | How to integrate Pearch API | Study implementation, then decide |
| Cost calculation | `lib/pearch.ts:98-114` | Credit math is business-critical | Yes - but may need per-tenant logic |
| Rate limiting | `lib/rateLimit.ts` | IP-based limiting works for MVP | No - needs per-tenant limits |
| Response transformation | `app/api/search/route.ts:15-59` | Pearch responses need normalization | Study pattern, improve for V2 |
| Credit tracking | `lib/credits.ts` | localStorage approach | No - needs real DB and multi-tenant |
| Find Similar | `lib/findSimilar.ts` | Algorithm for candidate similarity | Study logic, evaluate if it's good enough |
| Search caching | `lib/searchCache.ts` | 1-hour TTL, localStorage | No - needs Redis or similar for production |

For each pattern, document:
- **What V1 did**
- **Why it worked (or didn't)**
- **What V2 should do instead**

#### 3. `ARCHITECTURE_VISION.md`
This is where you get creative. Propose a production architecture that:

**Solves Multi-Tenancy**
- How do multiple recruiting companies use this?
- Data isolation strategy
- Per-tenant credit pools
- White-label considerations

**Scales Intelligently**
- Database strategy (V1 used localStorage!)
- Caching layer (Redis? Upstash? Something else?)
- Background jobs (search indexing, export generation)
- API rate limiting per tenant

**Delivers Exceptional UX**
- What makes this recruiting platform feel different?
- Real-time features? (live search? collaborative candidate reviews?)
- Mobile strategy?
- Performance targets (Core Web Vitals)

**Prioritizes Security**
- Multi-tenant auth approach
- API key management (customers get their own Pearch keys? or we proxy?)
- Data retention and compliance
- Rate limiting and abuse prevention

---

### Phase 2: Architectural Decisions

After strategic analysis, make bold architectural choices:

#### UI/UX Philosophy
V1 used Tailwind + simple components. You decide:
- Component library? (shadcn/ui? custom design system?)
- Design philosophy (minimal? data-dense? collaborative?)
- What makes this feel premium vs commodity?
- Real-time features to differentiate?

#### Backend Architecture
V1 used Next.js API routes with localStorage. You design:
- Monolith or services? (probably monolith to start, but designed for extraction)
- Database (Postgres? MySQL? Supabase?)
- Auth system (NextAuth? Clerk? Supabase Auth? Auth0?)
- Job queue (Inngest? BullMQ? Trigger.dev?)
- Caching strategy
- Observability (logging, metrics, errors)

#### Pearch API Integration Strategy
V1 proxied everything through Next.js API routes. Consider:
- Do customers bring their own Pearch API keys?
- Or do we manage one key and charge markup?
- How to handle Pearch rate limits across tenants?
- Cost optimization (caching, deduplication)
- Monitoring Pearch API health

#### Data Model Design
V1 had no real data model. You design:
- Organizations / Accounts
- Users & Permissions
- Credit pools & usage tracking
- Candidates (saved, notes, status)
- Searches (history, sharing)
- Jobs (optional - V1 had this but barely used)

#### Deployment & DevOps
V1 was single-instance. You design for:
- Hosting strategy (Vercel? Railway? AWS?)
- Multi-region? (probably not MVP, but consider)
- Database hosting (Neon? Supabase? RDS?)
- CI/CD approach
- Environment management (dev, staging, prod per customer?)

---

### Phase 3: Build Systematically

Once architecture is defined and approved:

1. **Set up project structure**
   - Next.js 15+ (or other framework if you have strong reasoning)
   - Database with migrations
   - Auth system configured
   - Proper TypeScript setup

2. **Build MVP feature set** (in priority order)
   - Multi-tenant auth & onboarding
   - Candidate search (parity with V1, but better)
   - Credit tracking (per-organization, real DB)
   - Save & manage candidates
   - Export functionality
   - Admin panel (manage orgs, credits, usage)

3. **Add differentiators** (what makes this special)
   - Your choice based on market analysis
   - Could be: collaboration features, pipeline management, ATS integrations, AI insights beyond Pearch, etc.

---

## What V1 Got Right (Don't Lose This)

Study these principles in `PROJECT_ESSENCE.md`:

✅ **Credits = Trust** - Always show costs before actions. This builds trust.
✅ **Recruiter time is valuable** - Every interaction should feel worth it
✅ **Respect the API** - Pearch does the intelligence, we present it well
✅ **Keep it simple** - Don't over-engineer

These are core to why V1 worked. Carry them forward.

---

## What V1 Got Wrong (Fix This)

🚫 **No real data model** - localStorage doesn't scale
🚫 **Single-tenant thinking** - Everything assumes one user
🚫 **IP-based rate limiting** - Needs per-org limits
🚫 **Weak auth** - Cookie-based auth isn't production-ready
🚫 **No observability** - Can't monitor usage or debug issues
🚫 **No admin tools** - Can't manage customers

V2 must be production-ready from day 1.

---

## Creative Freedom Areas

You have **full creative control** over:

### UI/UX Design
- Visual design language
- Component architecture
- Interaction patterns
- Real-time features
- Mobile experience

### Backend Architecture
- Tech stack choices (within reason - TypeScript recommended)
- Database design
- Caching strategy
- Background job system
- API design

### Feature Prioritization
- What ships in MVP?
- What are the differentiators?
- What gets built later?

### Developer Experience
- Monorepo? Multi-repo?
- Testing strategy
- Documentation approach
- Local development setup

---

## Questions to Answer in Your Analysis

### Business Model
1. How do recruiting companies license this?
2. What's the pricing model?
3. Do they bring their own Pearch API keys or do we manage credits?
4. What's the onboarding flow for new customers?

### Product Differentiation
1. What makes this better than building a Pearch API integration in-house?
2. What features can we add that go beyond Pearch's raw API?
3. What's the "magic moment" for users?
4. How does this fit into their existing workflow?

### Technical Strategy
1. What's the tech stack?
2. How is multi-tenancy implemented?
3. What's the data model?
4. How do we handle Pearch API rate limits across tenants?
5. What's the caching strategy?

### Go-to-Market
1. How do we white-label this?
2. What's the customer onboarding process?
3. How do we handle support?
4. What analytics do we need to track?

---

## Success Criteria

### Phase 1 Complete When:
- [ ] You understand why V1 worked
- [ ] You've identified what to carry forward and what to discard
- [ ] You've documented technical patterns worth keeping
- [ ] You've proposed a bold V2 architecture
- [ ] You've defined what makes this product special
- [ ] Laz approves the strategic direction

### Phase 2 Complete When:
- [ ] Tech stack is chosen and justified
- [ ] Data model is designed
- [ ] Multi-tenant architecture is defined
- [ ] UI/UX philosophy is clear
- [ ] Differentiation strategy is articulated
- [ ] Laz gives the green light to build

### Phase 3 (Build) Success:
- [ ] Production-ready code from day 1
- [ ] Multi-tenant from the start
- [ ] Can onboard a new recruiting company in < 1 hour
- [ ] Credit tracking is accurate and transparent
- [ ] UI feels premium and differentiated
- [ ] Performance is excellent (fast searches, instant UI)
- [ ] Observable (can monitor usage, debug issues)
- [ ] Documented (other devs can understand it)

---

## V1 Repository Map

Quick reference for your analysis:

```
V1 (Proof of Concept)
├── PROJECT_ESSENCE.md          # START HERE - business context
├── PROMPT.md                   # Development philosophy
├── @AGENT.md                   # Build instructions
├── README.md                   # Features & usage
│
├── app/api/
│   ├── search/route.ts         # Study: Pearch integration, response transformation
│   └── enrich/route.ts         # Study: Contact reveal pattern
│
├── lib/
│   ├── pearch.ts               # CRITICAL - API client, cost calculations
│   ├── credits.ts              # Credit tracking (needs total rewrite for multi-tenant)
│   ├── rateLimit.ts            # Rate limiting (IP-based, needs per-org)
│   ├── findSimilar.ts          # Similarity algorithm
│   ├── searchCache.ts          # Caching approach (localStorage, needs Redis)
│   └── exportSearchResults.ts  # Export utilities
│
└── components/                 # UI patterns (reference, not blueprint)
```

---

## Working with Laz

**Communication Style:**
- Direct and concise
- Show > tell (prototypes > explanations)
- Ask clarifying questions early
- Present options with trade-offs, not just recommendations

**When to Check In:**
- After Phase 1 strategic analysis (before any code)
- Before locking in tech stack
- When business model questions arise
- When you have architectural options and need direction

**What Laz Cares About:**
- 🚀 **Shipping something real** - Production-ready, licensable product
- 🏢 **Multi-tenant from day 1** - This will serve multiple companies
- 💰 **Credit transparency** - Trust model is core to product
- 🎨 **Standing out** - This needs to be noticeably better than alternatives
- 🔐 **Production quality** - No "we'll fix it later" shortcuts

---

## Your First Steps

1. **Read V1's `PROJECT_ESSENCE.md`** - Understand the business model
2. **Study `lib/pearch.ts`** - This is the Pearch API integration brain
3. **Review API routes** - See how V1 handled requests
4. **Create `PRODUCT_STRATEGY.md`** - Extract business insights
5. **Create `TECHNICAL_LEARNINGS.md`** - Document patterns
6. **Create `ARCHITECTURE_VISION.md`** - Propose V2 architecture
7. **Present to Laz** - Get approval before building
8. **Build something exceptional** - Production-ready from day 1

---

## Remember

- **V1 proved this works** - You're not validating the concept
- **V2 is the product** - This needs to be licensable to real companies
- **You have creative freedom** - Reimagine everything except core principles
- **Production quality from day 1** - No MVP shortcuts that create tech debt
- **Make it stand out** - What makes this special in the recruiting tech space?

Good luck building something exceptional. 🚀

---

**Questions? Ask Laz before making assumptions.**
**Bold architectural ideas? Present them with reasoning.**
**Ready to build? Get approval first, then ship with confidence.**
