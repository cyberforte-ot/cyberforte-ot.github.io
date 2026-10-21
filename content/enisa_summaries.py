# CyberForte's own plain-words summaries for the 22 ENISA playbooks.
# These are NOT ENISA text. Licensed CC BY 4.0 (same as the source).
# Rules: friendly, short, no em dashes, no "compliant"/"certified", no invented facts or stats.

SUMMARIES = {
"01": dict(
 tagline="Draw your product, find the doors, decide which ones need a lock first.",
 plain=[
  "Before you can protect something, you need to see it. This playbook asks you to draw one simple picture of your product: who uses it, what it talks to, where data goes, and where someone could get in.",
  "Then you mark the \"trust boundaries\". Those are the places where something you control meets something you do not, like the internet meeting your back end, or a normal user meeting admin powers. That is where attackers try their luck, so that is where your best locks go.",
 ],
 example="Picture a smart thermostat. Its app, its cloud, its update channel and the little local port a technician plugs into are all doors. A one-page drawing shows which doors open onto the street.",
 checklist=[
  "We have one up-to-date diagram of the product, its users, services and data flows.",
  "The diagram marks where trust changes (internet to back end, user to admin, device to cloud).",
  "We have written down what is most valuable: keys, customer data, control functions, logs.",
  "We have a short list of our top threats, each with a high, medium or low priority and an owner.",
  "Each top threat has a planned control and a way to test that it works.",
  "We know what changes (new interface, new data, new supplier) should make us redo this.",
 ]),
"02": dict(
 tagline="Give every person and program only the keys they need, only for as long as they need them.",
 plain=[
  "Least privilege is the hotel key card idea. Guests open their own room, cleaners open the floors they clean, and only the manager has the master key. Nobody gets the master key \"just in case\".",
  "In your product this means each user role and each service gets the smallest set of permissions that still lets it do its job. Admin rights are personal, protected with multi-factor login, and handed out for a short time when needed. If something is broken into, the damage stays small.",
 ],
 example="A support engineer needs to read a customer's settings, not delete their account. Give them read access, and make delete a separate, logged, time-limited step.",
 checklist=[
  "We have a simple table of roles and services and what each one is allowed to do.",
  "Every service has its own identity. No shared admin accounts or shared admin keys.",
  "Access is denied by default and only the needed paths are opened.",
  "Admins use named accounts with multi-factor login, and extra rights expire on their own.",
  "We review broad or unused permissions regularly and remove them.",
 ]),
"03": dict(
 tagline="Know exactly who (or what) is knocking, on every door, every time.",
 plain=[
  "Every user, device, service and admin should have its own identity, and every way into the product should check it. That includes the app, the APIs, the device talking to the cloud and the maintenance screens.",
  "Pick one \"source of truth\" that creates and removes identities, so you are not managing logins in five places. Ask for stronger proof, such as multi-factor login, for the risky actions. And make sessions and passwords expire, so an old login cannot be reused forever.",
 ],
 example="Being on the factory network is not the same as being logged in. A management page that trusts anyone who can reach it is a door with no lock.",
 checklist=[
  "We know which system is the source of truth for users, devices, services and admins.",
  "Every actor has its own identity. No shared production accounts or passwords.",
  "Every interface asks for login, or is clearly marked as public with protections in place.",
  "Privileged and sensitive actions need stronger login, such as multi-factor.",
  "Sessions time out and credentials can be rotated or revoked quickly.",
 ]),
"04": dict(
 tagline="Fewer doors means fewer break-ins. Close everything you do not need.",
 plain=[
  "Every open port, API, debug tool and extra library is one more place an attacker can try. This playbook says: list everything that is reachable, and switch off anything without a clear reason to exist today.",
  "Ship a lean product. Remove test endpoints and debug modes from production builds, drop libraries you do not use, and keep only the data you really need. Then keep checking, because old features have a habit of hanging around.",
 ],
 example="A forgotten Telnet service or a debug page left on from testing is a classic way in. If nobody needs it in the field, it should not be in the field.",
 checklist=[
  "We keep a list of every reachable interface: APIs, ports, admin pages, update channels.",
  "Everything is closed by default and only what production needs is open.",
  "Debuggers, test endpoints and developer features are removed from production builds.",
  "Unused libraries and optional components are removed from the final build.",
  "We only collect and keep the data we need, and we can delete it.",
  "We review exposure for every release and remove legacy leftovers.",
 ]),
"05": dict(
 tagline="Layers, like a castle: wall, moat, gate and guards, so one failure is not the end.",
 plain=[
  "No single lock is perfect. Defence in depth means you put several independent protections around the things that matter most, so if one fails or is bypassed, the next one still holds.",
  "The layers should not all share the same weak spot. Two locks that open with the same key are really one lock. Add logging and alerts at each layer too, so you notice when someone is testing the gates, and have a way to isolate a part that has been compromised.",
 ],
 example="A device might check a signed update file, run it only after login, and log the change. Three layers, three chances to stop or spot a bad update.",
 checklist=[
  "Our most important assets are each protected by more than one control.",
  "Those controls do not depend on the same login system or the same single point.",
  "Security events are logged at several layers (login, network, application, data).",
  "Suspicious activity raises an alert and someone knows what to do about it.",
  "We can slow attackers down (rate limits, step-up login) and isolate a compromised part.",
 ]),
"06": dict(
 tagline="Good security still works when the attacker has read the manual.",
 plain=[
  "Hiding how something works is not a real lock. Sooner or later, someone reverse-engineers it. Open design means your product stays safe even if an attacker knows exactly how it is built.",
  "In practice: use well-known, well-tested standards instead of home-made encryption, write down your security design and the reasons behind it, publish a secure set-up guide, give people a way to report weaknesses, and keep a list of the components inside your product (an SBOM).",
 ],
 example="A home-made \"secret\" protocol between your device and its app feels clever, until one curious person posts how it works online. Standard TLS does not have that problem.",
 checklist=[
  "We have a short security design note covering login, encryption, updates, logging and defaults.",
  "We use standard, widely reviewed protocols and libraries. No home-made crypto.",
  "Our APIs and their security rules are documented, with a secure configuration guide.",
  "There is a working way for anyone to report a vulnerability to us.",
  "We produce a list of components (SBOM) and a security changelog for releases.",
 ]),
"07": dict(
 tagline="Security is not a launch-day job. It lasts from the first sketch to the last switch-off.",
 plain=[
  "Products live for years, and their security has to be looked after the whole time. This playbook asks you to decide, and say clearly, how long you will support a product and what happens at end of life.",
  "Make the product safely updatable, keep track of vulnerabilities in what you ship, log the important events, learn from what happens in the field, and plan for a clean retirement: wiping data and revoking keys when a device is switched off for good.",
 ],
 example="A customer should be able to find out, in plain words, until when your product gets security updates and what they should do after that date.",
 checklist=[
  "Each product has a clear life-cycle state and a stated support period.",
  "Updates are authenticated and there is a rollback or recovery plan.",
  "We track and decide on vulnerabilities, including in third-party parts, and keep an SBOM.",
  "Important events (logins, admin actions, updates) are logged.",
  "We feed field feedback, support cases and incidents back into our risk thinking.",
  "There is a decommissioning checklist: wipe data, revoke keys, tell customers what to do.",
 ]),
"08": dict(
 tagline="If the safe way is the easy way, people will take it.",
 plain=[
  "Security that is confusing gets switched off or worked around. User-centric design means making the secure path the default and the simplest one, so good outcomes do not depend on the user being an expert.",
  "Ship with safe settings on, guide people through a short first-run set-up, write warnings that say what happened and what to do next, and keep roles simple, such as admin, operator and viewer. Then watch real people use it and fix whatever trips them up.",
 ],
 example="\"Error 0x80\" helps nobody. \"Your password was used from a new location. If this was not you, reset it here\" does.",
 checklist=[
  "We have a list of what ships switched on and off, and why.",
  "First-time set-up is guided and forces safe steps, such as changing initial credentials.",
  "Warnings and errors explain what happened, the impact and how to fix it.",
  "Roles and permissions match how people really work.",
  "We have tested key security steps with a few real or proxy users and fixed what confused them.",
 ]),
"09": dict(
 tagline="Write code that is hard to get wrong, then check it automatically.",
 plain=[
  "Many security bugs come from a handful of familiar mistakes. The smartest move is to choose tools that make those mistakes impossible, such as memory-safe languages or database tools that stop injection by design.",
  "For what is left, agree a short set of coding rules, keep secrets out of your code, review the sensitive changes with a second pair of eyes, and let your build pipeline run security scans and tests on every change. AI-written code gets the same checks as human-written code.",
 ],
 example="An API key pasted into source code \"just for now\" tends to end up in a repository forever. A secret manager plus automatic secret scanning stops that.",
 checklist=[
  "We have considered which common bug types we can rule out by our choice of tools.",
  "We have a short secure coding baseline and a list of banned patterns for our stack.",
  "Secrets are never stored in source code, and secret scanning is switched on.",
  "Changes to login, encryption, updates and external interfaces get a peer review.",
  "Security scans and negative tests run automatically on each change.",
  "AI-generated code goes through the same review and checks.",
 ]),
"10": dict(
 tagline="Keep a diary of what matters, keep it safe, and get a tap on the shoulder when something looks wrong.",
 plain=[
  "If you cannot see it, you cannot stop it or explain it later. This playbook asks for a small set of high-value security logs: logins, failed logins, admin actions, permission changes, updates and configuration changes.",
  "Send those logs to one central place, protect them from tampering, keep them for a set time and make sure all clocks agree. Then start with a handful of alerts that really matter, give each one an owner, and practise what you would do when one goes off.",
 ],
 example="Ten failed admin logins in a minute, followed by a new admin account, is worth a phone call. A thousand routine messages a minute is not.",
 checklist=[
  "We have a short list of must-log security events, without personal or secret data.",
  "Logs show who did what and when, and admin actions are tied to named people.",
  "Logs are collected centrally, access is restricted and retention is set.",
  "A small set of high-signal alerts is switched on, each with an owner.",
  "We have a one-page triage plan and have practised it recently.",
 ]),
"11": dict(
 tagline="No silent changes. Every setting is written down, reviewed and easy to roll back.",
 plain=[
  "Many security problems are not bugs but settings: a port opened during a late-night fix and never closed. This playbook asks you to treat configuration like code, kept in version control and reviewed before it goes live.",
  "Agree a secure baseline, check automatically that reality still matches it (no \"silent drift\"), keep test and production apart, and make sure every change has a way back. Emergency changes are fine when they are rare, logged and reviewed afterwards.",
 ],
 example="If you cannot answer \"who changed this firewall rule, when and why?\", you have drift. Version control answers it in seconds.",
 checklist=[
  "Production configuration and infrastructure settings are in version control and peer reviewed.",
  "We have a written secure baseline and new components start from it.",
  "Development, test and production are separated, and few people can deploy to production.",
  "Each production change has a rollback plan, and rollback has been tested.",
  "Security-affecting changes are tagged and get a quick risk review.",
  "Emergency changes are logged and reviewed afterwards.",
 ]),
"12": dict(
 tagline="Hope for the best, plan for the bad day, and rehearse it.",
 plain=[
  "Something will go wrong eventually: a leaked key, a compromised account, ransomware. The difference between a bad day and a disaster is usually preparation. Decide now who leads, who decides, and who talks to customers.",
  "Write a short runbook (spot it, size it, contain it, fix it, recover, learn), make sure you can quickly revoke keys, disable accounts and roll back releases, and keep tested backups. Then spend 30 to 60 minutes each quarter walking through one realistic scenario.",
 ],
 example="\"We found an API key on a public website\" is a great tabletop exercise. Who rotates it, how fast, and who tells which customers?",
 checklist=[
  "We have named an incident lead and backups, with an up-to-date contact list.",
  "We have a one-page incident runbook and at least one scenario checklist.",
  "We can quickly revoke keys, disable accounts and roll back releases.",
  "Backups are automatic and protected, and a restore has been tested recently.",
  "We run a short tabletop exercise regularly and act on what we learn.",
 ]),
"13": dict(
 tagline="Find the holes, decide what to fix first, fix it, and tell people.",
 plain=[
  "Vulnerabilities will turn up in your code, your libraries and your devices. What matters is having a simple, repeatable route from \"someone spotted a problem\" to \"the fix is installed\".",
  "Collect reports from every source, give one person the job of tracking them, rank them by severity (and flag anything internet-facing or already being exploited), patch dependencies on a regular rhythm, test fixes properly, and publish clear security notes. Keep an eye on any legal reporting deadlines that apply to you.",
 ],
 example="A researcher emails about a flaw. Within your agreed time, someone acknowledges it, rates it, decides fix or mitigate, and the fix ships with a short advisory.",
 checklist=[
  "We collect vulnerability reports from scans, advisories, customers and researchers.",
  "One owner triages and tracks them, with realistic target times we have set ourselves.",
  "We rate severity and flag internet-exposed and known-exploited issues.",
  "Dependencies are updated on a regular cadence.",
  "Fixes are reviewed and tested, and updates can be delivered and rolled back safely.",
  "We publish security notes and check how the fix rolled out.",
 ]),
"14": dict(
 tagline="Know what goes into your product, and protect the factory that builds it.",
 plain=[
  "Your product is built from other people's parts: libraries, tools, cloud services, contractors, chips, even AI models. If one of them is compromised, so are you. This playbook focuses on the spots where a compromise would hurt most.",
  "Keep a list of your key suppliers and components (and an SBOM for each release), review new dependencies before they come in, lock down your build pipeline and its secrets, sign what you release, ask critical suppliers a few baseline questions, and have a plan B if a key supplier fails.",
 ],
 example="A popular open-source library gets a malicious update. With an SBOM you can answer \"are we affected?\" in minutes instead of days.",
 checklist=[
  "We have a list of critical suppliers and components, including any AI models we use.",
  "An SBOM or dependency snapshot is stored with every release.",
  "New dependencies and major upgrades are reviewed, and dependency scanning runs in CI.",
  "Build and deploy permissions are minimal and build secrets are protected.",
  "Release files are signed.",
  "Critical suppliers have a security contact and commit to telling us about vulnerabilities.",
 ]),
"15": dict(
 tagline="Out of the box, only the essentials are switched on.",
 plain=[
  "Every feature that is on by default is one more thing a customer has to know about and secure. This playbook says: ship with only the core functions running, and let people switch extras on deliberately.",
  "When someone does turn on an optional feature, tell them in plain words what risk comes with it. And each time you add a new feature, check again whether it really needs to be on by default.",
 ],
 example="A device with a built-in web server, remote access and file sharing all running from day one has three extra doors. If most customers never use them, keep them off until asked.",
 checklist=[
  "We have defined the core functions the product needs to work.",
  "Optional features and services are off by default.",
  "Turning them on needs a deliberate action by the user.",
  "Users are told about the security implications when they enable extras.",
  "Defaults are reviewed whenever we add new features.",
 ]),
"16": dict(
 tagline="No \"admin/admin\". Every unit starts locked, with its own key.",
 plain=[
  "The first minutes after a device is plugged in are risky. If every unit ships with the same username and password, anyone who reads the manual can get in. This playbook says: ship in the most locked-down state possible.",
  "Give each device or installation its own unique credentials, make people set up proper access before they can do anything sensitive, start with minimal permissions, and protect the first-boot, onboarding and recovery screens so they are not an easy way in.",
 ],
 example="A sticker with a unique password on each device, plus a forced password change at first login, beats a shared default every time.",
 checklist=[
  "No universal default usernames or passwords in production builds.",
  "Each device or instance gets unique credentials at manufacture, provisioning or first boot.",
  "A secure set-up step is required before privileged or sensitive access.",
  "Initial permissions are minimal, not full admin.",
  "First-boot, onboarding and recovery interfaces are protected and not needlessly exposed.",
 ]),
"17": dict(
 tagline="Everything that leaves the box is encrypted and checked, from day one.",
 plain=[
  "Data travelling over a network can be read or changed on the way unless it is protected. This playbook says all external communication should be encrypted and authenticated by default, with no plain-text fallback \"for convenience\".",
  "Use modern protocol versions, switch off weak ciphers, make both ends prove who they are where it matters, and refuse the connection rather than quietly downgrading when something fails. Also design so you can swap algorithms and certificates later, including planning ahead for post-quantum cryptography where your product lives a long time.",
 ],
 example="If the secure connection fails and your device silently falls back to plain HTTP, an attacker only needs to break the secure one to get the easy one.",
 checklist=[
  "All external interfaces use encrypted communication from first use.",
  "Plain-text and weak protocols (such as HTTP or Telnet) are not allowed, not even as a fallback.",
  "Endpoints authenticate each other where appropriate.",
  "Modern protocol versions are used and weak ciphers are disabled.",
  "Connection failures are denied, not downgraded.",
  "Keys, certificates and algorithms can be replaced without redesigning the product.",
 ]),
"18": dict(
 tagline="One stolen key should open one door, not every door you have ever sold.",
 plain=[
  "If thousands of devices share the same secret, one leak compromises them all. This playbook asks that every device or installation gets its own unique identity and its own secrets.",
  "Store those secrets so they are hard to extract, use per-device secrets for the important jobs (login, secure communication, checking updates), and make sure you can revoke and replace them if something goes wrong.",
 ],
 example="Reported, October 2026: press reports on the attack on supermarket refrigeration controllers in France describe a daily password that was generated the same way on every unit. Unique per-device secrets are exactly what stops one discovery from becoming a mass break-in.",
 example_link=("Ars Technica, 14 October 2026", "https://arstechnica.com/security/2026/10/fridge-hack-costing-millions-and-sparking-fires-stemmed-from-poor-security/"),
 checklist=[
  "Every device or installation has its own unique identity, such as its own key pair or certificate.",
  "No shared credentials, default keys or embedded secrets across products.",
  "Secrets are stored with protection against extraction and tampering.",
  "Login, secure communication and update checks use per-device secrets.",
  "Identities and secrets can be revoked and rotated.",
 ]),
"19": dict(
 tagline="The product will not go to work until the safety steps are done.",
 plain=[
  "Optional security set-up tends to be skipped. This playbook makes the essentials non-negotiable: the product does not enter normal operation until key steps, such as creating a proper admin account or setting up encryption, are complete.",
  "Make that set-up guided and easy, so no expert knowledge is needed. And if someone later resets or removes a critical setting, bring the onboarding back until it is fixed.",
 ],
 example="A new router that will not connect to the internet until you have set your own admin password is mandatory onboarding in action.",
 checklist=[
  "We have defined the minimum security steps needed before first use.",
  "Those steps are built into first-time set-up and cannot be skipped.",
  "Normal operation, privileged actions and external connections wait until they are done.",
  "Set-up is guided with clear instructions and sensible defaults.",
  "Onboarding comes back if critical security settings are removed or reset.",
 ]),
"20": dict(
 tagline="Security updates arrive by themselves, safely, without wrecking the day.",
 plain=[
  "A fix only helps once it is installed. This playbook says security updates should be on by default, checked for authenticity, and easy to apply, so devices stay unprotected for as short a time as possible.",
  "Where an unexpected restart could affect safety or production, let authorised operators approve or schedule updates, use maintenance windows and staged rollouts, and make sure a failed update does not leave the system broken. Keep security fixes separate from feature changes, and tell users what happened.",
 ],
 example="Reported, October 2026: the refrigeration controllers hit in the French supermarket attack were described by their maker as running outdated firmware, with many legacy units no longer receiving updates. Updates that arrive and install safely are the cure.",
 example_link=("SBS News (Reuters, AFP), 13 October 2026", "https://www.sbs.com.au/news/article/hackers-hit-french-store-fridges-sparks-fires/4y35b0buh"),
 checklist=[
  "Security updates are enabled by default and the product checks for them.",
  "Operators can approve or schedule updates where safety or uptime needs it.",
  "Security updates can be shipped separately from feature updates.",
  "Updates are cryptographically verified before installation.",
  "A failed update leaves the system safe and usable, with rollback where needed.",
  "Users are told when updates are applied or when they need to act.",
 ]),
"21": dict(
 tagline="A clear dashboard light: are we in a safe state, and how do we get back if not?",
 plain=[
  "People weaken security by accident all the time, usually without knowing. This playbook asks you to make the security state of your product visible, like a warning light on a car dashboard.",
  "Define what \"secure\" looks like, show clearly when the product drifts into a weaker state, warn in plain language when someone switches a protection off, and give them a simple button or path to return to the safe baseline.",
 ],
 example="\"Remote access is open to the internet. This lets anyone try to log in. Turn it off?\" is far more useful than a tiny toggle buried in a settings page.",
 checklist=[
  "We have defined the secure baseline and the weaker states.",
  "The product clearly shows whether it is in a secure or degraded state.",
  "Users see a warning when they switch off security features.",
  "The impact is explained in non-technical words.",
  "There is a simple way back to the secure baseline.",
 ]),
"22": dict(
 tagline="Resets, recoveries and handovers that help the owner, not the intruder.",
 plain=[
  "Password resets, factory resets and selling or handing over a device are all moments when control changes hands. They are also favourite targets for attackers and social engineers.",
  "Decide which recovery and transfer actions you support and who may start them, check identity properly before allowing them, watch and rate-limit those workflows, and make sure a reset or handover really removes the previous owner's access, credentials and secrets.",
 ],
 example="A second-hand device that still lets its first owner log in remotely has not really been handed over. A proper reset wipes the old keys and accounts.",
 checklist=[
  "We have listed the supported recovery, reset and transfer actions and who may start each.",
  "Strong identity checks come before recovery, reset or transfer.",
  "Recovery paths cannot be used to skip normal login, and they are monitored and rate-limited.",
  "Factory reset and ownership transfer fully remove previous access and secrets.",
  "Recovery and transfer steps are guided to reduce user error.",
 ]),
}
