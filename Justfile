default:
    just --list

dev:
    bun dev

deploy:
    bunx vercel --prod

clean:
    rm -rf dist public/_watermarked .cache .astro .omo
    bun run astro sync

rename-images *args:
    bun scripts/rename-images.ts {{args}}

content-ids-write:
    bun run content:ids:write

push:
    bunx prettier --write .
    bun run content:ids:check
    git add .
    git commit -m "$(curl -s https://whatthecommit.com/index.txt)"
    git push -f origin main
