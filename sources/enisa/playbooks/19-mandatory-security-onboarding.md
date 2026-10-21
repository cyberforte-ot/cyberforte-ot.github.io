# Mandatory security onboarding

## Principle

**(secure by default)**

Require critical security controls to be configured during initial set-up. Do not allow products to enter an operational state until essential security steps are completed.

## Objective

Ensure that systems start in a secure state by preventing or limiting use before baseline security controls, such as strong authentication or encryption, are configured.

## Checklist

### Identify mandatory security steps

- Define the minimum security controls required before the product can be used (e.g. MFA, encryption keys, admin account set-up).

### Enforce security set-up during first use

- Integrate mandatory security steps into the initial set-up or onboarding flow.
- Do not allow users to skip or defer required security configuration.

### Block operation until onboarding is complete

- Prevent normal operation, privileged actions and external connectivity until mandatory security steps are completed.

### Provide clear, guided configuration

- Guide users through security set-up with clear instructions and sensible defaults.
- Avoid requiring expert knowledge to complete onboarding securely.

### Re-trigger onboarding when security is incomplete

- Re-enforce onboarding if critical security settings are removed, reset or left unconfigured.

## Minimum evidence

- Mandatory security steps defined: documentation identifies which security controls must be completed during onboarding.
- Onboarding enforces a security set-up: configuration, screenshots or test evidence shows that critical security steps cannot be skipped.
- Operation blocked pre-onboarding: configuration, screenshots or test evidence shows that the product cannot enter normal operation before onboarding is complete.
- Guided set-up is provided: screenshots, configuration flows or documentation shows that clear user guidance is provided on security set-up.
- Onboarding is re-enforced on incomplete security configuration: configuration, screenshots or test evidence shows that onboarding is re-triggered if required security settings are missing.

## Release gate

- [ ] Mandatory security steps are defined and enforced during initial set-up
- [ ] Users cannot bypass or skip critical security configuration
- [ ] Product cannot enter normal operation before onboarding completion
- [ ] Security onboarding provides clear guidance and secure defaults
- [ ] Onboarding is re-enforced if critical security settings are removed
