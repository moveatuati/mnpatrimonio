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
- Shared shell materials and dashboard presentation use semantic CSS tokens in `src/styles.css`, with dashboard-specific classes scoped to the operation view; why: visual refinements must not alter domain rules or other module content.
