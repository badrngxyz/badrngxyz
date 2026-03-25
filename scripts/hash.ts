import { argv, env } from 'node:process'

import Sqids from 'sqids'

const sqids = new Sqids({
  alphabet: env.ALPHABET,
  minLength: 6,
})

const releasedAt = Temporal.PlainDate.from(argv[2])
const startedAt = Temporal.PlainDate.from(env.START_DATE)
const inBetween = releasedAt.since(startedAt)

const postHash = sqids.encode([inBetween.days])

console.log(postHash)
