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
- The 5×2 simulator must never share state with the real schedule; why: explicit spec constraint.
- MN Patrimônios serves condominiums with two groups only (`GroupId = "P" | "S"`): P = agente de portaria in 12×36 (art. 59-A CLT; day 07–19 and night 19–07 turmas, team 0/1 alternate days; DSR/holidays compensated; 36h rest), S = serviços gerais in 6×1 (Mon–Sat 7h20, Sunday DSR) until the EC 141/2026 transition; why: client operates only these two functions.
- Legal timeline lives in `LABOR_LAW` (`src/domain/config.ts`): EC 141/2026 promulgated 16/10/2026; S switches automatically to 5×2 42h on 2026-12-15 and 40h on 2027-12-15 (`serviceRegime(date)`); why: the amendment is promulgated and the schedule must follow the date. Confirm dates with the client's accountant/union before production.
- Shifts come from `employeeShift(employee, date)` (night shift crosses midnight); never read `GROUPS[g].shift` for a person; why: portaria has two turns and S changes by regime.
- Sunday S work is optional (`rules.sunday.S`, default 0); whoever works it gets "folga antecipada" (same week) and "folga do 7º dia" (+7); why: prevents 7-day streaks (art. 67 CLT) and double pay.
- Hour bank: minutes after shift end (beyond 5 min tolerance, art. 58 §1) accrue; 1 jornada (7h20 S / 11h P) = compensation day off; deadline 6 months (art. 59 §5); why: electronic point (Portaria MTP 671/2021) feeds the bank.
- Vacations: 5–30 days per period blocks; start-day rule (art. 134 §3) is a non-blocking note; why: CLT art. 130/134.
- Shared shell materials use semantic CSS tokens in `src/styles.css`; primary buttons, active tabs and selected filters use the darker `--mn-action` blue; why: client asked for a light screen with darker action controls.
