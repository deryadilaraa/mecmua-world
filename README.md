# mecmûa — public website

Open https://deryadilaraa.github.io/mecmua-world/

This is a public copy of the mecmua.world website. It opens without a Cloudflare login. The original repository and Cloudflare service remain separate.

## Publishing

Edit files in `dist/` and commit to `main`. GitHub Actions publishes that folder to GitHub Pages automatically. No build step is needed.

## Preview scope

The site, navigation, imagery, search, and browser-based features are available. Library editing and server-stored findings are not enabled on this static copy. Existing browser saves remain local to the browser and origin where they were made.

## Local preview

Run `python3 -m http.server 8000 --directory dist` and open http://localhost:8000/.
