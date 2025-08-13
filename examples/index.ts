#!/usr/bin/env tsx

import landlubber from 'landlubber'

import * as blueprint from './blueprint.js'
import * as search from './search.js'

const commands = [blueprint, search]

await landlubber(commands).parse()
