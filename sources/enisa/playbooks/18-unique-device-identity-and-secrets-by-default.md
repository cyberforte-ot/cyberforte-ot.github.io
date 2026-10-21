# Unique device identity and secrets by default

## Principle

**(secure by default)**

Ship each product instance with a unique cryptographic identity and secrets by default if it uses any private/secret value. Do not use shared credentials, keys or certificates across devices or installations.

## Objective

Prevent large-scale compromise by ensuring that a breach of one device or a leaked secret cannot be reused to attack other devices, customers or the wider installed base.

## Checklist

### Generate unique identities per device or instance

- Assign a unique device identity (e.g. key pair or certificate) to every device or installation.

### Eliminate shared or hard-coded secrets

- Do not use shared credentials, default keys or embedded secrets across products.

### Protect secrets against extraction

- Store device identities and per-device secrets using platform-appropriate controls that protect against extraction, tampering or unauthorised replacement (e.g. secure storage, hardware-backed protection or restricted access).

### Use unique secrets for security-critical functions

- Ensure that security-critical functions like authentication, secure communications and update verification rely on per-device secrets, not shared material.

### Support revocation and replacement

- Ensure that device identities and secrets can be revoked and rotated if compromise is suspected.

## Minimum evidence

- Unique device identities issued: device inventory or provisioning records show a unique identity (e.g. key pair or certificate) for each device or instance.
- No shared secrets present: build artefacts or configuration confirms that no shared credentials or hard-coded secrets exist.
- Secrets protected at rest: documentation or configuration shows that secrets are stored using appropriate protection mechanisms.
- Security functions use unique secrets: configuration or design notes show that authentication, communication and update processes rely on per-device secrets.
- Revocation supported: documentation or configuration shows that device identities or secrets can be revoked or replaced.

## Release gate

- [ ] Unique cryptographic identity generated for each device or instance
- [ ] No shared or default secrets present in production builds
- [ ] Secrets are protected against extraction
- [ ] Security-critical functions use per-device secrets
- [ ] Identity and secret revocation or replacement is supported
