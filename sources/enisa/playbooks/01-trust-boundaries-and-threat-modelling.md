# Trust boundaries and threat modelling

## Principle

**(secure by design)**

Secure architectures make trust explicit rather than assumed. Trust boundaries define where data, identities and execution contexts cross from a more trusted domain to a less trusted one (or vice versa).

## Objective

Ensure that the system’s architecture and data flows are understood, trust assumptions are explicit and the highest-risk attack paths are identified early, so that security controls and secure defaults are designed in, not retrofitted.

## Checklist

### Draw the system (one diagram)

- Include users/admins, device/app, back-end services, APIs, data stores, third parties.
- Show key data flows and entry points (APIs, admin UI, OTA/update channel, local ports).

### Mark trust boundaries and privileged paths

- Identify where trust changes (internet–back end, tenant–tenant, device–cloud, user–admin).
- Highlight high-privilege flows (auth, key management, updates, admin actions).

### List critical assets

- For instance, list credentials/keys, customer / personally identifiable information, payment tokens, device control functions, availability, audit logs, data, source code and the IDE.

### Identify and prioritise top threats

- Map threats to the relevant entry/exit points, data flows, assets and trust boundaries, for example account takeover, malicious updates, API authorisation bypass, man-in-the-middle attacks and the tampering with, replay of or injection of fabricated or stale data and commands.
- Assign a high, medium or low priority using a documented method appropriate to the product, such as assessing impact, likelihood, plausibility, exploitability and exposure.

### Define mitigations, secure defaults and verification

- For each top threat: required controls and default configuration (deny by default, authn/authz, segmentation, signed updates, rate limits).
- Map each control to a verification method (tests, CI checks, config validation).
- Define refresh triggers (new interface, auth change, new sensitive data, new critical dependency, major architecture change).

## Minimum evidence

- One architecture/data-flow diagram with trust boundaries and entry points (stored in repo/wiki)
- Top threats list (e.g. the top 5 to 10 threat scenarios) with H/M/L priority and owners
- Control/default mapping for each top threat (what control, where enforced, how verified)
- Verification evidence: CI outputs or test results for key negative tests (unauthorised calls fail)

## Release gate

- [ ] Diagram updated for this release (components, flows, dependencies reflect reality)
- [ ] Trust boundaries and privileged paths clearly marked
- [ ] Top threat scenarios reviewed; high risks have mitigations or documented exceptions
- [ ] Secure defaults confirmed for new/exposed interfaces (deny by default, least privilege)
- [ ] Verification in place: at least one negative test per critical boundary / privileged path (unauthorised access is denied)
- [ ] Threat model refresh triggered if any of the following are relevant: new API/interface, auth model change, new sensitive data, major dependency/supplier change, OTA/update changes, major architecture change.
