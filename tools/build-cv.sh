#!/bin/bash
# Compile cv-source/cv_zeyulin.tex into files/cv_zeyulin.pdf (needs pdflatex, e.g. MacTeX).
set -eo pipefail
cd "$(dirname "$0")/.."
out=$(mktemp -d)
for pass in 1 2; do pdflatex -interaction=nonstopmode -halt-on-error -output-directory "$out" cv-source/cv_zeyulin.tex > "$out/log.txt" || { tail -30 "$out/log.txt"; exit 1; }; done
cp "$out/cv_zeyulin.pdf" files/cv_zeyulin.pdf
grep -E "Overfull|Underfull|Warning" "$out/cv_zeyulin.log" | grep -v "Underfull \\\\hbox (badness [0-9]\{1,3\})" || true
rm -rf "$out"
echo "wrote files/cv_zeyulin.pdf"
