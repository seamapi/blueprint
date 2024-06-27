# Seam API Blueprint

[![npm](https://img.shields.io/npm/v/@seamapi/blueprint.svg)](https://www.npmjs.com/package/@seamapi/blueprint)
[![GitHub Actions](https://github.com/seamapi/blueprint/actions/workflows/check.yml/badge.svg)](https://github.com/seamapi/blueprint/actions/workflows/check.yml)

Build tools for the Seam API using this blueprint.

## Description

A blueprint is a simplified description of an API schema that is optimized for code and documentation generation.

The blueprint schema assumes the API follows Seam API design guidelines,
and will evolve with those guidelines and any SDK, documentation, or product quality requirements.

The blueprint defines the following core concepts:

- Endpoint: a path that accepts an HTTP request and returns a response.
- Route: the direct parent path of a collection of one or more endpoints.
- Subroute: A route that is nested under another route.
- Namespace: the direct parent path of a collection routes only: there are no endpoints under this path.
- Resource: every endpoint that returns non-empty data returns a resource or collection of resources.

## Motivation

The scope of the [OpenAPI Specification](https://swagger.io/specification/) covers arbitrarily complicated APIs,
while the Seam API follows very predictable and simplified API design patterns.

For this reason, Seam has encountered several challenges working directly with the OpenAPI Specification:

- Existing tools built on the OpenAPI Specification cannot meet Seam's requirements or require non-trivial extensions.
- Extending the OpenAPI Specification with non-standard properties to support Seam's SDK and documentation requirements
  is not directly compatible with existing tools.
- Seam's requirements and scope are overall simpler than the broad use-cases existing tools based on the OpenAPI Specification are trying to solve.
- All existing Seam tooling must first expend duplicated effort parsing and flattening the OpenAPI Specification into a form more natural to the Seam API.
- This creates a high barrier of entry for working with the Seam API specification as one must first deeply understand how to parse the OpenAPI Specification for any practical application.

The blueprint addresses these concerns:

- The blueprint module centralizes on a source of truth for parsing the OpenAPI Specification into something usable.
- The blueprint schema matches naturally to the Seam API design and is immediately usable for practical application. 
- The blueprint is not limited by the OpenAPI Specification or constrained by the wide scope of supporting any API.
  It is optimized for Seam's requirements and can evolve faster to meet Seam's specific concerns and integrate directly with other Seam integrated tooling.

## Installation

Add this as a dependency to your project using [npm] with

```
$ npm install --save-dev @seamapi/blueprint
```

[npm]: https://www.npmjs.com/

## Usage

```ts
import { createBlueprint } from '@seamapi/blueprint'
import * as types from '@seamapi/types'

const blueprint = createBlueprint(types)
console.log(JSON.stringify(blueprint)
```

## Development and Testing

### Quickstart

```
$ git clone https://github.com/seamapi/blueprint.git
$ cd blueprint
$ nvm install
$ npm install
$ npm run test:watch
```

Primary development tasks are defined under `scripts` in `package.json`
and available via `npm run`.
View them with

```
$ npm run
```

### Source code

The [source code] is hosted on GitHub.
Clone the project with

```
$ git clone git@github.com:seamapi/blueprint.git
```

[source code]: https://github.com/seamapi/blueprint

### Requirements

You will need [Node.js] with [npm] and a [Node.js debugging] client.

Be sure that all commands run under the correct Node version, e.g.,
if using [nvm], install the correct version with

```
$ nvm install
```

Set the active version for each shell session with

```
$ nvm use
```

Install the development dependencies with

```
$ npm install
```

[Node.js]: https://nodejs.org/
[Node.js debugging]: https://nodejs.org/en/docs/guides/debugging-getting-started/
[npm]: https://www.npmjs.com/
[nvm]: https://github.com/creationix/nvm

### Publishing

#### Automatic

New versions are released automatically with [semantic-release]
as long as commits follow the [Angular Commit Message Conventions].

[Angular Commit Message Conventions]: https://semantic-release.gitbook.io/semantic-release/#commit-message-format
[semantic-release]: https://semantic-release.gitbook.io/

#### Manual

Publish a new version by triggering a [version workflow_dispatch on GitHub Actions].
The `version` input will be passed as the first argument to [npm-version].

This may be done on the web or using the [GitHub CLI] with

```
$ gh workflow run version.yml --raw-field version=<version>
```

[GitHub CLI]: https://cli.github.com/
[npm-version]: https://docs.npmjs.com/cli/version
[version workflow_dispatch on GitHub Actions]: https://github.com/seamapi/blueprint/actions?query=workflow%3Aversion

## GitHub Actions

_GitHub Actions should already be configured: this section is for reference only._

The following repository secrets must be set on [GitHub Actions]:

- `NPM_TOKEN`: npm token for installing and publishing packages.
- `GH_TOKEN`: A personal access token for the bot user with
  `packages:write` and `contents:write` permission.
- `GIT_USER_NAME`: The GitHub bot user's real name.
- `GIT_USER_EMAIL`: The GitHub bot user's email.
- `GPG_PRIVATE_KEY`: The GitHub bot user's [GPG private key].
- `GPG_PASSPHRASE`: The GitHub bot user's GPG passphrase.

[GitHub Actions]: https://github.com/features/actions
[GPG private key]: https://github.com/marketplace/actions/import-gpg#prerequisites

## Contributing

> If using squash merge, edit and ensure the commit message follows the [Angular Commit Message Conventions] specification.
> Otherwise, each individual commit must follow the [Angular Commit Message Conventions] specification.

1. Create your feature branch (`git checkout -b my-new-feature`).
2. Make changes.
3. Commit your changes (`git commit -am 'Add some feature'`).
4. Push to the branch (`git push origin my-new-feature`).
5. Create a new draft pull request.
6. Ensure all checks pass.
7. Mark your pull request ready for review.
8. Wait for the required approval from the code owners.
9. Merge when ready.

[Angular Commit Message Conventions]: https://semantic-release.gitbook.io/semantic-release/#commit-message-format

## License

This npm package is licensed under the MIT license.

## Warranty

This software is provided by the copyright holders and contributors "as is" and
any express or implied warranties, including, but not limited to, the implied
warranties of merchantability and fitness for a particular purpose are
disclaimed. In no event shall the copyright holder or contributors be liable for
any direct, indirect, incidental, special, exemplary, or consequential damages
(including, but not limited to, procurement of substitute goods or services;
loss of use, data, or profits; or business interruption) however caused and on
any theory of liability, whether in contract, strict liability, or tort
(including negligence or otherwise) arising in any way out of the use of this
software, even if advised of the possibility of such damage.
