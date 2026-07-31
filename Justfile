default:
    just --list

dev:
    bun run dev

deploy:
    bun node_modules/vercel/dist/vc.js --prod

clean:
    rm -rf dist public/_watermarked .cache .astro .omo
    bun node_modules/astro/bin/astro.mjs sync

rename-images *args:
    bun scripts/rename-images.ts {{args}}

content-ids-write:
    bun run content:ids:write

push:
    bun run format
    bun run content:ids:check
    git add .
    git commit -m "$(curl -s https://whatthecommit.com/index.txt)"
    git push -f origin main
