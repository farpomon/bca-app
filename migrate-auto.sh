#!/bin/bash
# Automatically respond to drizzle-kit migration prompts
# This script sends Enter key presses to select the default "create column" option

cd /home/ubuntu/bca-app

# Use expect to automate the interactive prompts
expect << 'EOF'
set timeout 300
spawn pnpm db:push

# Handle all column creation prompts by pressing Enter (selects default option)
expect {
  "create column" {
    send "\r"
    exp_continue
  }
  "rename column" {
    send "\r"
    exp_continue
  }
  "Migration completed" {
    exit 0
  }
  "Error" {
    exit 1
  }
  eof {
    exit 0
  }
  timeout {
    puts "Migration timed out"
    exit 1
  }
}
EOF
