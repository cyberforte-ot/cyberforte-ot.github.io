# Automated maintenance and updates

## Principle

**(secure by default)**

Manufacturers should provide secure update mechanisms that minimise user and operational effort. Security updates should be enabled by default, while allowing authorised users or operators to approve or schedule installation where the deployment requires controlled updates.

## Objective

Ensure that vulnerabilities are addressed quickly and the device is left vulnerable for as little time as possible.

## Checklist

### Enable managed security updates by default

- Enable security updates by default, ensuring that the product automatically checks for updates, informs the user and supports timely installation, with escalation where updates are repeatedly deferred.
- Where unattended installation could affect safety, availability or operational continuity, support staged rollout, maintenance windows and authorised operator approval.

### Separate security updates from feature changes

- Ensure that critical security updates can be delivered independently of optional feature/functional updates.

### Verify the authenticity and integrity of updates

- Ensure that updates are cryptographically verified before installation.

### Apply updates safely

- Design updates to minimise disruption and avoid leaving the system in an insecure or unusable state if the update fails.
- Support staged rollout, maintenance windows, operator approval and rollback where required by safety, availability or operational-continuity considerations.

### Inform users of update activity

- Notify users when security updates are applied or when action is required, without requiring them to manage the update process manually.

## Minimum evidence

- Automatic updates enabled: default configuration shows that security updates are enabled out of the box.
- Security updates decoupled: configuration or release notes show that security fixes can be delivered independently of optional feature/functional updates.
- Update verification enforced: configuration or design notes show that updates are authenticated and integrity-checked.
- Safe update mechanism in place: documentation or test evidence shows that updates can be applied without significantly disrupting basic operation.
- Update strategy: documentation or test evidence shows that the update process supports controlled approval, staging and rollback where required by the deployment context.
- User notification supported: logs, UI messages or documentation shows that users are informed of update activity or status.

## Release gate

- [ ] Security update functionality is enabled by default, with an installation approach appropriate to the product’s deployment context
- [ ] Security updates can be delivered independently of features
- [ ] Updates are cryptographically verified before installation
- [ ] Failed updates do not leave the system insecure or unusable
- [ ] Users are informed of update status without manual intervention
