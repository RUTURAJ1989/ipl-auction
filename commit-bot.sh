#!/bin/bash

# Ensure the script stops on errors
set -e

# Force add all changes
git add --all

# Commit with a default message or a provided one
commit_message=${1:-"Forced commit by commit bot"}
git commit -m "$commit_message"

# Force push to the current branch
git push --force
