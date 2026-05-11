default:
    just --list

dev:
    bun dev

dev-watermark:
    BLIND_WATERMARK_ENABLED=true bun dev

deploy:
    bunx vercel --prod

clean:
    rm -rf dist public/_watermarked .cache .astro result tools/blind-watermark/target

push:
    bunx prettier --write .
    git add .
    git commit -m "$(curl -s https://whatthecommit.com/index.txt)"
    git push -f origin main

blind-watermark-musl:
    nix build -f tools/blind-watermark/package.nix
    mkdir -p tools/bin
    cp result/bin/kokosa-blind-watermark tools/bin/blind-watermark-linux-x64
    chmod 755 tools/bin/blind-watermark-linux-x64

extract-watermark image seed="kokosa" length="80" strength="15":
    tools/bin/blind-watermark-linux-x64 extract --input "{{image}}" --length {{length}} --seed "{{seed}}" --strength {{strength}}
