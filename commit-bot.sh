#!/bin/bash

# Ensure the script stops on errors
set -e

# Add all changes
git add .

# Commit with a default message or a provided one
commit_message=${1:-"Automated commit by commit bot"}
git commit -m "$commit_message"

# Push changes to the repository
git push origin main
