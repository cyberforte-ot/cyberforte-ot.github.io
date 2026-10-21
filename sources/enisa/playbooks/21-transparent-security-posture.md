# Transparent security posture

## Principle

**(secure by default)**

Make the system’s security posture visible and understandable. Clearly inform users when security protections are weakened and provide a simple path to return to a secure baseline.

## Objective

Reduce risk arising from accidental or uninformed misconfiguration by ensuring that users understand the security state of the system and can easily correct insecure settings.

## Checklist

### Define security states and baseline

- Define the secure baseline and any degraded or unsupported security states.
- Document which configurations cause a transition between states.

### Expose current security status

- Indicate clearly whether the system is operating in a secure or degraded security state.

### Warn on changes that reduce security

- Show clear warnings when users disable security features or apply configurations that increase risk.

### Explain impact in plain language

- Explain to the user the security implications of a change in non-technical terms.

### Provide a simple path to recovery

- Offer the user a simple interaction path to return to the secure baseline.

## Minimum evidence

- Security states defined: documentation identifies the secure baseline and degraded or insecure states, including the configuration changes that trigger such states.
- Security status visible: screenshot, CLI output or documentation clearly shows the current security state.
- Warnings triggered on risk increase: screenshots, prompts or test evidence shows warnings when users apply security-reducing changes.
- Impact explained clearly: warning messages, screenshots or documentation demonstrates that security implications are described in plain, non-technical language.
- Baseline restore available: screenshots, commands or configuration shows a simple action exists to return to the secure baseline.

## Release gate

- [ ] Secure baseline and degraded security states are defined and documented
- [ ] Current security state is clearly visible to the user
- [ ] Users are warned when security protections are reduced
- [ ] Security impact is explained in clear, non-technical language
- [ ] A simple action can be taken to restore the secure baseline
