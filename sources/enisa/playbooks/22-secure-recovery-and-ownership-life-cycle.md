# Secure recovery and ownership life cycle

## Principle

**(secure by default)**

Provide secure, guided recovery and ownership transfer mechanisms by default. Recovery, reset and transfer processes must be easy for users, operators and administrators to follow, while remaining resistant to abuse, account takeover and social engineering.

## Objective

To enable users and administrators to recover access, reset systems or transfer ownership safely.

## Checklist

### Define supported recovery and transfer actions

- Identify supported recovery actions such as credential reset, account recovery, secure factory reset and ownership transfer, clearly defining who is allowed to initiate each action and under what conditions

### Verify identity before recovery or transfer

- Require strong identity verification before allowing recovery, reset or ownership transfer actions.

### Protect recovery paths from abuse

- Ensure that recovery mechanisms cannot be used to bypass normal authentication or authorisation controls.
- Apply monitoring and rate limiting to recovery and reset workflows.

### Ensure secure reset and ownership transfer

- Ensure that factory reset and ownership transfer fully remove previous user access, credentials and secrets.

### Provide guided, secure workflows

- Offer clear recovery and transfer processes that reduce user error

## Minimum evidence

- Recovery and transfer actions are defined: documentation identifies supported recovery, reset and ownership transfer processes.
- Strong verification is enforced: configuration or test evidence shows that recovery and transfer actions require a verified identity.
- Abuse protections are applied: configuration, logs or test evidence shows that rate limiting and monitoring of recovery workflows are in place.
- Secure reset and transfer is verified: test evidence confirms that factory reset and ownership transfer remove prior credentials and access.
- Guided workflows are available: screenshots, CLI commands or documentation demonstrates that recovery and transfer processes are guided.

## Release gate

- [ ] Supported recovery and ownership transfer actions are defined
- [ ] Recovery and transfer actions require strong identity verification
- [ ] Recovery mechanisms cannot bypass normal access controls
- [ ] Factory reset and ownership transfer fully remove prior access
- [ ] Clear guidance is provided on recovery and transfer workflows
