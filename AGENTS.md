<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Business rules and typed models live in `src/domain` with no UI imports; why: spec requires separating rules from interface and keeping them testable.
- Stage 1 is demo-only (fictional data, no backend/auth); why: spec forbids connecting a database or production migrations without authorization.
- The 5×2 simulator must never share state with the real 6×1 schedule; why: explicit spec constraint.
- Full spec is in `docs/FORMOSA-REQUISITOS.md`; read it before changing scheduling logic.
- Operational references are pure, versioned 28-day snapshots in `src/domain/schedule-reference.ts`; validation requires explicit nominal assignments and daily targets with boundary context, never writes storage or grants homologation, because managerial approval is external to the demo.
- Schedule changes are validated atomically by employee/date across all changed dates; explicit daily targets may replace legacy headcount targets, because weekly replanning must not silently invent leave or waive coverage.
- Base roster follows the real Formosa paper sheets (25/10/2026): Sunday alternates (half of each group works, "domingo sim, domingo não"), Sunday turns 08h/09h/15h15 are independent of A/B/C (on Sundays/holidays the assignment code means the turn), each worked Sunday gets "folga antecipada" (Mon–Fri same week) and "folga do 7º dia" exactly 7 days later, Saturday is full team; why: managers validated this against the real schedule and it keeps 11h rest and no 7-day streaks.
- Weekday coverage targets depend on the store's movement calendar (high: day 28 to 18; low: 19 to 27) in `src/domain/movement.ts`; why: the manager stated demand peaks from the 28th to the 18th.
- Hour bank: minutes after the shift end accrue credit; 4h = plan a day off, 7h = give a compensation day off (debits 7h, preferably on low-movement days); early exit/late entry requests use the balance and stay pending without balance; why: rules informed by the Formosa manager.
- Shared shell materials and dashboard presentation use semantic CSS tokens in `src/styles.css`, with dashboard-specific classes scoped to the operation view; why: visual refinements must not alter domain rules or other module content.
