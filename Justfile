default:
    just --list

dev:
    bun dev

deploy:
    bunx vercel --prod

clean:
    rm -rf dist public/_watermarked .cache .astro
    bun run astro sync

rename-images *args:
    bun scripts/rename-images.ts {{args}}

clean-workflow-artifacts:
    if test -e .superpowers; then rip .superpowers; fi
    if test -e docs/superpowers; then rip docs/superpowers; fi

push:
    bunx prettier --write .
    git add .
    git commit -m "$(curl -s https://whatthecommit.com/index.txt)"
    git push -f origin main
