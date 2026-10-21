# Attack surface minimisation

## Principle

**(secure by design)**

Expose only what is strictly necessary. Remove or disable all unnecessary code, services, interfaces, protocols and dependencies by default.

## Objective

Reduce the likelihood and impact of compromise by eliminating unnecessary entry points and limiting attacker options.

## Checklist

### List exposed interfaces

- Identify all externally reachable APIs, ports, local interfaces (HMI), protocols, admin endpoints and update channels.
- Remove or disable anything without a clear, current justification.

### Enforce default deny

- Close all ports, APIs and interfaces by default.
- Explicitly allow only what is required for production.

### Remove development and diagnostic functionality

- Remove debuggers, test endpoints and debug modes from production builds.
- Remove development features.

### Minimise dependencies

- Remove unused libraries, SDKs and optional components from final builds. Remaining libraries should be verified for authenticity and integrity.
- Use the smallest possible operating system, runtime or firmware configuration that supports the product’s intended function.

### Continuously monitor for legacy exposure

- Continuously review exposed interfaces and dependencies.
- Update/remove deprecated APIs, old protocols and unused resources.

### Minimise data collection, processing and retention

- Collect, retain and store only the personal or sensitive data necessary for the product’s intended purpose and securely delete it when no longer required.

## Minimum evidence

- Exposure inventory exists: a maintained list of externally reachable interfaces (APIs, ports, protocols, admin interfaces, update channels) is stored in the repo or product documentation.
- Default deny enforced: network rules, gateway configuration or device settings show that only explicitly required interfaces are enabled in production.
- Minimal build verified: build configuration, manifest, package list or firmware contents show that only required components are included.
- No dev or diagnostic tooling shipped that might enable exploitation: inspection of production artefacts confirms absence (or verification that they cannot impact security) of shells, debuggers, compilers, test interfaces and diagnostic utilities.
- No legacy exposure: release notes, ticket or checklist entry confirms that exposed interfaces and dependencies were reviewed and any unused or legacy elements removed.
- Data inventory and retention record: data inventory with purposes, retention periods and deletion methods is kept.

## Release gate

- [ ] Exposed interfaces reviewed; only required APIs, ports, protocols and management interfaces enabled
- [ ] Default-deny posture confirmed; no unintended network paths or interfaces exposed
- [ ] Production build is minimal; unused libraries, services and optional components removed
- [ ] No development or diagnostic tools present in production unless there is evidence that it cannot impact security
- [ ] Attack surface review completed for this release; deprecated or legacy interfaces updates/removed
- [ ] Unnecessary data processing has been removed and required deletion mechanisms verified
