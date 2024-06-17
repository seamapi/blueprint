#!/usr/bin/env tsx

import landlubber from 'landlubber'

import * as blueprint from './blueprint.js'

const commands = [blueprint]

await landlubber(commands).parse()
