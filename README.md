# KingdomDapp Contracts

An AlgoKit TypeScript contract workspace for KingdomDapp experiments.

The nested project includes source, deployment configuration, generated artifacts, and Vitest scripts. Read the contract methods and tests for current behavior; compilation and test setup do not imply a deployed or audited application.

## Start reading

- [`projects/`](projects/)

## Development

Use Node.js and npm compatible with the versions recorded in the package manifest and lockfile. Each package is installed from its own directory.

The dependency manifest is [`projects/kingdom_dapp_contracts/package.json`](projects/kingdom_dapp_contracts/package.json). It does not define a complete development-server command. Install dependencies with `npm ci` from its directory, then inspect the source entry point and configuration.
