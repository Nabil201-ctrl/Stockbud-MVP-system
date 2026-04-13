#!/usr/bin/env node

import { spawn } from 'node:child_process'

const env = { ...process.env }

// Since we are using PostgreSQL, we can skip the SQLite-specific symlinking and Litestream logic.
// We use 'prisma db push' instead of 'migrate deploy' for the initial setup to handle existing schemas gracefully.
console.log('Running database setup...')
await exec('npx prisma generate')
await exec('npx prisma db push')

// Run the main application command
await exec(process.argv.slice(2).join(' '))

function exec(command) {
  const child = spawn(command, { shell: true, stdio: 'inherit', env })
  return new Promise((resolve, reject) => {
    child.on('exit', code => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`${command} failed rc=${code}`))
      }
    })
  })
}

