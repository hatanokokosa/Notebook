default:
    just --list

dev:
    bun dev

deploy:
    bunx vercel --prod

clean:
    rm -rf dist public/_watermarked .cache .astro

push:
    bunx prettier --write .
    git add .
    git commit -m "$(curl -s https://whatthecommit.com/index.txt)"
    git push -f origin main
