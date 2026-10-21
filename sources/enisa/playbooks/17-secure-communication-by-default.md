# Secure communication by default

## Principle

**(secure by default)**

Enforce secure communication from the start. All external communications must be encrypted and authenticated by default, with no support for insecure or plain-text protocols for convenience.

## Objective

Protect data in transit and prevent interception, tampering or impersonation by ensuring that communications are always secure, without relying on user configuration or later hardening.

## Checklist

### Protect external communications by default

- Require encrypted communication for all external interfaces from first use.
- Where data or commands pass through intermediaries, assess whether transport protection alone is sufficient or whether additional end-to-end authenticity, integrity and freshness controls are required.

### Disable insecure and plain-text protocols

- Do not allow unencrypted or weak protocols (e.g. HTTP or Telnet) to be used by default or even as fallbacks.

### Authenticate communicating endpoints

- Ensure that external endpoints authenticate each other where appropriate, for example for device-to-cloud, service-to-service and administrative access.

### Enforce secure protocol versions and configurations

- Use modern, secure protocol versions and configurations by default.
- Explicitly disable weak ciphers, legacy versions and insecure negotiation modes.

### Fail securely on connection errors

- Ensure that communication failures result in denied connections rather than downgrading to insecure protocols or configurations.

### Plan for cryptographic change

- Design cryptographic mechanisms so that algorithms, keys, certificates and trust anchors can be replaced or migrated without substantially redesigning the product, where feasible.
- Assess whether the product’s support lifetime, data confidentiality requirements and deployment constraints require preparation for migration to post-quantum cryptography.

## Minimum evidence

- Secure protocols enforced by default: configuration or test evidence shows that encrypted and authenticated communication is required from first connection.
- Insecure protocols disabled: configuration confirms that plain-text or legacy protocols are not enabled or available.
- Endpoint authentication in place: configuration or test evidence shows that mutual or appropriate endpoint authentication takes place for external communications.
- Strong protocol configuration applied: configuration shows that only approved protocol versions and cryptographic settings are enabled.
- No insecure fallback: test evidence shows that connection attempts fail securely rather than downgrading security.
- Cryptographic migration note: identification of critical cryptographic mechanisms and how algorithms, keys, certificates and trust anchors are to be updated or replaced.

## Release gate

- [ ] External communications are encrypted and authenticated from first connection
- [ ] Insecure or plain-text protocols are disabled and unavailable
- [ ] Only approved secure protocol versions and configurations are enabled
- [ ] Endpoint authentication enforced where required
- [ ] Connection failures do not result in insecure fallback
- [ ] Cryptographic mechanisms can be replaced or migrated where required by the product’s risk assessment and support lifetime.
