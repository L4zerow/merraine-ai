# Agent Build Instructions

## Project Setup
```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Add your PEARCH_API_KEY to .env.local
```

## Running Tests
```bash
npm test
```

## Build Commands
```bash
# Production build
npm run build

# Type checking
npm run type-check
```

## Development Server
```bash
npm run dev
# Opens at http://localhost:3000
```

## Environment Variables
```
PEARCH_API_KEY=your_api_key_here
```

## Key Learnings
- Update this section with build optimizations discovered
- Document any gotchas or special setup requirements

## Feature Completion Checklist

Before marking ANY feature as complete, verify:

- [ ] Build passes (`npm run build`)
- [ ] No TypeScript errors
- [ ] Feature works in browser
- [ ] Credit costs display correctly before actions
- [ ] API errors handled gracefully
- [ ] Changes committed with clear message
- [ ] @fix_plan.md updated
