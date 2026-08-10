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

image-add *args:
    bun scripts/add-image.ts {{args}}

content-ids-write:
    bun run content:ids:write

new-practice:
    omp -p "Read past practice; Read new imgs; Proc it; Gen desc(zh_CN) & Link to new practice, del originals"

push:
    bun run format
    bun run content:ids:check
    git add .
    git commit -m "$(curl -s https://whatthecommit.com/index.txt)"
    git push -f origin main
