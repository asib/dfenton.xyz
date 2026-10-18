# Misc entries

Add `public/misc/<slug>/index.html` and `meta.json`. The folder name is the URL slug (lowercase letters, digits, and hyphens), and the page is served at `/misc/<slug>/`.

```json
{
  "title": "Two surfaces, one cutting edge",
  "description": "An interactive exploration of how two surfaces meet to form a cutting edge.",
  "date": "2026-10-18"
}
```

The homepage discovers metadata at build time and lists entries newest first. No registry needs editing. Commit and push to publish through the existing Cloudflare Pages deployment.

Each index.html is a standalone document. Keep local assets in its folder and use relative paths. Include a link back to `/#misc`. Preserve the sandbox when importing a Codex visualization export. Check mobile layout, light/dark appearance, and controls in an ordinary browser; exports may depend on external CDNs.
