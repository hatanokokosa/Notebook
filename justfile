default:
  just --list

test:
  pnpm dev

push:
  git add .
  git commit -m "$(curl -s https://whatthecommit.com/index.txt)"
  git push -f origin main
