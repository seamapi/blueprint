#!/usr/bin/env tsx

import landlubber from 'landlubber'

import * as blueprint from './blueprint.js'
import * as todo from './todo.js'

const commands = [blueprint, todo]

await landlubber(commands).parse()
