# Strong identity and authentication architecture

## Principle

**(secure by design)**

Design identity and authentication as a core part of the architecture. Use authoritative identity mechanisms for users, devices, services and administrators across interfaces.

## Objective

Prevent impersonation and unauthorised access.

## Checklist

### Define authoritative identity sources

- Identify and document the authoritative identity source (i.e. a system that acts as the single source of truth for creating, authentication/authorisation, and revoking identities) for users, devices, services and administrators.

### Use unique identities for all actors

- Assign a unique identity to each user, device, service and administrator, prohibiting shared accounts/credentials, especially for administrative and service access.

### Apply authentication across all interfaces

- Enforce authentication/authorisation on all access paths, including user interfaces, APIs, device-to-cloud communication and management interfaces.

### Strengthen authentication for high-risk access

- Require stronger authentication for privileged actions and sensitive operations (e.g. MFA, device binding, or cryptographic credentials).

### Manage sessions and credentials securely

- Ensure that sessions are time limited, bound to identity and invalidated on logout or credential change.
- Rotate, revoke and expire credentials automatically when no longer needed or when compromise is suspected.

## Minimum evidence

- Authoritative identity sources defined: a diagram or table exists showing the identity source for users, devices, services and administrators.
- No shared identities: identity inventory shows unique identities, no shared production accounts or credentials.
- Authentication enforced: configuration or test evidence shows that all interfaces enforce authentication or are explicitly defined as public with appropriate protections applied. Network location or reachability alone is not treated as authentication, unless explicitly justified by the product context and risk assessment and supported by appropriate compensating controls.
- Strong auth for privileged access: policy or configuration shows that MFA or equivalent is enforced for administrative or sensitive actions.
- Sessions and credentials controlled: configuration or logs show session expiry, revocation on logout or credential change, and credential rotation or expiry in place.

## Release gate

- [ ] Authoritative identity sources defined and documented
- [ ] Unique identities enforced; no shared production accounts or credentials
- [ ] Authentication required on all access paths (UI, APIs, device-to-cloud, management interfaces)
- [ ] Strong authentication enforced for privileged or sensitive actions
- [ ] Sessions and credentials are time limited, revocable and expire automatically
