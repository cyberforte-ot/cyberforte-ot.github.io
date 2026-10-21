# Restrictive initial access

## Principle

**(secure by default)**

Ship systems in the most restrictive access state possible. Eliminate shared or default credentials and require a secure access set-up before any privileged or sensitive operations are allowed.

## Objective

To prevent immediate compromise after deployment by ensuring that attackers cannot gain access through default or weak initial access.

## Checklist

### Eliminate shared default credentials

- Do not ship products with universal usernames or passwords (e.g. ‘admin/admin’ or ‘root/root’).

### Require unique credentials for each device or instance

- Ensure that each device or instance has unique credentials generated at manufacture, provisioning or first boot.

### Enforce a secure initial set-up

- Require a credential change, key provisioning or account creation before allowing privileged or sensitive access.

### Restrict initial permissions

- Grant the minimum permissions required for initial operation.
- Avoid granting full administrative access by default.

### Protect initial access paths

- Ensure that first-boot, onboarding and recovery interfaces are authenticated and not unnecessarily exposed.

## Minimum evidence

- No default credentials shipped: build configuration or documentation confirms that no shared or hard-coded credentials exist.
- Unique credentials enforced: provisioning records, configuration or device inventory shows per-device or per-instance credentials.
- Secure set-up required: configuration or test evidence shows credential change or secure set-up is mandatory before privileged or sensitive access.
- Initial permissions restricted: access model or configuration shows limited permissions at first use.
- Initial access paths controlled: configuration or test evidence shows that onboarding and recovery interfaces are protected.

## Release gate

- [ ] No shared or default credentials present in production builds
- [ ] Unique credentials generated for each device or instance
- [ ] Secure set-up enforced before privileged or sensitive access
- [ ] Initial permissions are restrictive by default
- [ ] Initial access and onboarding paths are protected and reviewed
