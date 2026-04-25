default:
    just --list

test:
    bun dev

push:
    bunx prettier --write .
    git add .
    git commit -m "$(curl -s https://whatthecommit.com/index.txt)"
    git push -f origin main

deploy:
    bunx vercel --prod
