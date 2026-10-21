# Minimisation of default services

## Principle

**(secure by default)**

Disable non-essential features and services by default. Only the functionality required for the core operation of the product should be enabled by default.

## Objective

Reduce the attack surface and ensure that products start in a hardened state, without relying on users to disable specific functionality.

## Checklist

### Define core functionality

- Identify the minimum set of features and services required for the product to operate.

### Disable non-essential features and services by default

- Ensure that optional features and services are disabled by default.

### Require explicit opt-in for additional functionality

- Ensure that non-essential features and services can be enabled only through deliberate user action.

### Explain security implications on enablement

- Inform users of security risks when enabling optional features and services.
- Avoid enabling additional features and services without clear acknowledgement.

### Review defaults on change

- Reassess default-enabled features and services when new features are introduced.

## Minimum evidence

- Core features and services defined: documentation or configuration identifying which features and services are required by default.
- Non-essential features and services disabled: default configuration or build artefacts show optional features and services and modules are off.
- Explicit opt-in required: configuration or documentation shows how additional features and services must be manually enabled.
- Security implications disclosed: documentation, UI text or configuration prompts show that users are informed of security implications when enabling non-essential features and services.
- Defaults reviewed for this release: release notes, checklist or ticket confirms that default settings have been reviewed after changes.

## Release gate

- [ ] Only core functionality is enabled by default
- [ ] Optional features and services are disabled unless explicitly enabled by the user
- [ ] Users are informed of security implications when enabling non-essential features and services
- [ ] No new features or services are enabled by default without review
- [ ] Default configuration has been reviewed and confirmed for this release
