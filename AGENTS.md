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

## Website preservation
- Serve the uploaded public HTML through TanStack page handlers using the bundled language snapshot, without adding an unrelated backend.
- Keep the original public styles and scripts intact so the imported website retains its established appearance and behavior.
- Resolve imported media through the CDN asset map, and scope the supplied portrait replacement to the homepage hero image only.
- Cache fully prepared HTML per page, language, origin and content version; use optimized CDN image variants and intent-based document prefetching without replacing legacy navigation or styles.
