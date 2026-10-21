# CyberForte's own plain-words summaries for the OWASP OT Top 10 (2025).
# These are an adaptation of OWASP material and are shared under CC BY-SA 4.0.
# Rules: friendly, short, no em dashes, no "compliant"/"certified", no invented facts or stats.

FRIDGE = dict(
 title="French supermarket refrigeration controllers, October 2026",
 status="Investigation ongoing; the attackers have not been publicly identified.",
 text="Press reports describe an overnight attack on internet-connected refrigeration controllers in hundreds of supermarkets across France. Attackers reportedly switched units into defrost so temperatures rose as high as 50°C, spoiling food, and the Paris prosecutor's office said some fires followed. The manufacturer said the affected units were running outdated firmware and that most were legacy products no longer receiving security updates. Ars Technica reports the controllers were reachable from the internet and had known critical vulnerabilities.",
 links=[
  ("Ars Technica: Fridge hack costing millions and sparking fires stemmed from poor security (14 October 2026)", "https://arstechnica.com/security/2026/10/fridge-hack-costing-millions-and-sparking-fires-stemmed-from-poor-security/"),
  ("SBS News, with Reuters and AFP: Hackers hit French store fridges (13 October 2026)", "https://www.sbs.com.au/news/article/hackers-hit-french-store-fridges-sparks-fires/4y35b0buh"),
 ],
)

SUMMARIES = {
"unknown-assets-and-admin-access": dict(
 n=1, title="Unknown Assets and Unmanaged External Access",
 tagline="You cannot protect what you do not know you have.",
 plain=[
  "Every site has kit that nobody has written down: an old PC under a desk, a remote-access tool a supplier installed years ago, a maintenance VPN account nobody uses any more. OWASP calls this the biggest threat, because unknown things are never patched, never watched and never locked.",
  "The cure starts simple. Walk the site with a notebook if you need to, list every device and every way in from outside, and make documenting changes part of how you work.",
 ],
 why=[
  "OT sites are built to run for years, so forgotten devices and old remote-access routes pile up.",
  "Third-party maintenance access is common in factories, utilities and buildings, and it is often the least watched door.",
  "You cannot segment, harden or monitor something that is not on your list.",
 ],
 reduce=[
  "Build a full inventory: devices, software, remote-access tools, accounts and services.",
  "Find and close (or properly manage) every remote access route, including supplier VPNs and tools like TeamViewer.",
  "Scan and monitor the network for new or unknown devices.",
  "Make \"update the documentation\" a required step in every change.",
 ],
 checklist=[
  "We have an asset list for each site, including software versions.",
  "Every remote access route is known, has an owner and is documented.",
  "Unused maintenance and supplier accounts are removed.",
  "We check the network regularly for devices that are not on the list.",
  "Our change process includes updating the inventory.",
 ],
 example=True),
"accessible-devices-with-known-vulnerabilities": dict(
 n=2, title="Devices with Known Vulnerabilities/Issues",
 tagline="A published weakness is an open invitation, especially if it can be reached.",
 plain=[
  "Once a vulnerability is public, attackers can look it up just like you can. If a device with that weakness is reachable, most other defences stop mattering.",
  "In OT you often cannot just \"click update\": safety, maintenance windows and long equipment lifetimes get in the way. OWASP is clear that this explains the difficulty but is not an excuse. You still need a plan for finding, ranking and dealing with known issues.",
 ],
 why=[
  "OT equipment can stay in service for decades, long after its vendor stops sending fixes.",
  "Patching may need a planned shutdown, so issues wait.",
  "If a vulnerable device can be reached from outside, it can become the attacker's first step in.",
 ],
 reduce=[
  "Keep an asset register with hardware and software versions.",
  "Check those versions against known vulnerabilities, and ask suppliers for SBOMs.",
  "Run a vulnerability management process: rank, patch when you can, mitigate when you cannot.",
  "Segment and restrict access so vulnerable devices are hard to reach.",
  "Make vulnerability notification and fixes part of supplier contracts.",
 ],
 checklist=[
  "We know the firmware and software versions of our OT devices.",
  "We check them against published vulnerabilities on a regular basis.",
  "Each known issue has a decision: patch, mitigate or accept for a set time.",
  "Vulnerable devices are not reachable from the internet.",
  "Our supplier contracts cover vulnerability notification and fixes.",
 ],
 example=True),
"inadequate_supply_chain_management": dict(
 n=3, title="Inadequate Supplier/Supply Chain Management",
 tagline="Attackers sometimes come in through the people you trust most.",
 plain=[
  "Instead of attacking you directly, an attacker can go after a supplier: the software vendor, the equipment maker, the maintenance contractor. Then they ride in on a relationship you already trust.",
  "Supply chain risk covers the whole life of a component, from design and delivery to installation, updates and disposal. Managing it means knowing who your critical suppliers are, checking them regularly, and planning for the day one of them has a problem.",
 ],
 why=[
  "OT relies on a small number of specialist vendors and integrators, often with privileged access.",
  "A single bad update or compromised supplier can hit many sites at once.",
  "Remote maintenance by third parties is routine in plants, utilities and building systems.",
 ],
 reduce=[
  "List your critical suppliers and what access or software each one provides.",
  "Check their security practices regularly, for example with assessments or recognised standards.",
  "Set up a notification route for serious incidents or actively exploited vulnerabilities.",
  "Include supply chain attacks in your incident and crisis exercises.",
  "Test updates and new equipment in a safe test setup before they reach production.",
 ],
 checklist=[
  "We have a list of critical suppliers and the access each one has.",
  "We review critical suppliers' security on a regular basis.",
  "Suppliers know how to tell us about incidents and vulnerabilities, and we know how to reach them.",
  "Our exercises include a supplier being compromised.",
  "New updates and equipment are tested before going live.",
 ]),
"loss-of-availability": dict(
 n=4, title="Loss of Availability",
 tagline="In OT, if it stops (or lies), people can get hurt.",
 plain=[
  "For an office laptop, downtime is annoying. For a production line, a water plant or a building's safety systems, it can be dangerous. Availability is usually the top priority in OT.",
  "OWASP makes a subtle point: integrity is part of availability. If a sensor keeps working but reports fake readings, the system is \"up\" but no longer doing its job. Even well-meant updates can knock things over, as the 2024 CrowdStrike outage showed.",
 ],
 why=[
  "Many OT processes must run continuously and cannot simply be restarted.",
  "Real-time control needs timely, trustworthy data, not just a working network.",
  "OWASP notes anecdotal evidence of OT devices crashing during ordinary network scans.",
 ],
 reduce=[
  "Do a risk assessment focused on what could stop or corrupt your processes.",
  "Build in redundancy and failover, and test it during planned maintenance.",
  "Protect the integrity of critical data and commands where the equipment allows it.",
  "Treat updates, including security tools, as changes that need testing and staging.",
 ],
 checklist=[
  "We know which processes must never stop and what would stop them.",
  "Critical systems have redundancy or a tested fallback.",
  "We test failover during planned maintenance windows.",
  "Updates are tested and staged before reaching critical systems.",
  "We consider fake or tampered data, not only outages, in our risk thinking.",
 ]),
"insufficient-access-control": dict(
 n=5, title="Insufficient Access Control",
 tagline="Shared passwords on a sticky note are not access control.",
 plain=[
  "Access control decides who can do what. In OT it has three layers: organisational (a written list of who may operate what), technical (logins and permissions in the equipment) and physical (locks and guards). Weakness in any one undermines the others.",
  "OWASP highlights shared password lists, too much trust in physical security, and remote access without multi-factor login as common problems. Its words on that last one: not state-of-the-art in 2025, nor in 2024, nor before.",
 ],
 why=[
  "Safety can clash with security: you do not want a password prompt on an emergency stop.",
  "Legacy devices may have no real login or no link to central account management.",
  "Shared accounts on the shop floor mean nobody can prove who did what.",
 ],
 reduce=[
  "Write down who is allowed to operate what (an access matrix).",
  "Use roles and least privilege, and separation of duties for critical tasks.",
  "Require multi-factor login for all remote access.",
  "Change default passwords and disable default accounts.",
  "Review accounts regularly and remove leavers quickly.",
 ],
 checklist=[
  "We have a written access matrix for our OT systems.",
  "All remote access uses multi-factor login.",
  "Default passwords are changed and default accounts disabled.",
  "Shared logins are replaced with personal accounts wherever the equipment allows.",
  "Leavers' accounts are disabled, and we review permissions regularly.",
 ]),
"missing-incident-detection-reaction-capabilities": dict(
 n=6, title="Missing Incident Detection/Reaction Capabilities",
 tagline="The longer an intruder goes unnoticed, the worse it gets.",
 plain=[
  "Prevention never works 100% of the time. When an attacker does get in, what matters is how quickly you notice and how well you respond. Without logs and monitoring, you are effectively blind.",
  "In OT the stakes include loss of control, loss of protection systems and loss of safety. Good detection means logging the right events, storing them off the device, watching them, and having a tested plan for when something looks wrong.",
 ],
 why=[
  "Attacks on OT can look like equipment faults at first.",
  "Logs kept only on the device can be lost or wiped.",
  "Response in OT must avoid making things worse, for example by disrupting real-time control.",
 ],
 reduce=[
  "Log logins, failed logins, executed commands and other key events, with enough context.",
  "Collect logs centrally and monitor them, with clear alert thresholds and escalation.",
  "Use network intrusion detection or prevention configured so it does not disrupt control traffic.",
  "Adopt an incident response and recovery plan, and exercise it.",
 ],
 checklist=[
  "Key security events are logged and sent to a central place.",
  "Someone watches the alerts and knows how to escalate.",
  "Our security tests (scans, pen tests) would trigger an alert.",
  "We have an incident response plan that covers OT.",
  "We have run a technical or tabletop exercise in the last year.",
 ]),
"broken-zone-and-conduits-design": dict(
 n=7, title="Broken Zones and Conduits Design",
 tagline="Split the site into rooms with controlled doorways, not one big open hall.",
 plain=[
  "\"Zones\" are groups of equipment with similar security needs. \"Conduits\" are the controlled paths between them, usually through firewalls. Done well, segmentation stops one problem from spreading everywhere.",
  "OWASP notes that real networks are often very flat. Common mistakes include no buffer zone (DMZ) between office IT and OT, firewall rules that allow far too much, devices plugged into two zones at once, forgotten debug ports and forgotten remote access. The best design is the one that meets your needs without being overly complex.",
 ],
 why=[
  "The most common way into OT, according to OWASP, is from the IT side.",
  "A flat network means one compromised device can reach everything.",
  "Remote access added later can quietly bypass the zones you designed.",
 ],
 reduce=[
  "Inventory your assets and the connections they really need.",
  "Group them into zones based on risk, and define tightly controlled conduits between them.",
  "Put a DMZ between IT and OT.",
  "Tighten firewall rules to specific hosts and ports.",
  "Reassess the zones after network or system changes. IEC 62443-3-2 describes the full method.",
 ],
 checklist=[
  "There is no direct, unrestricted path between office IT and OT.",
  "Firewall rules between zones are specific, not broad ranges.",
  "We know of no devices bridging two zones without control.",
  "All remote access enters through a defined, controlled conduit.",
  "We review the zone design after significant changes.",
 ]),
"missing-awareness": dict(
 n=8, title="Missing Awareness",
 tagline="The best lock is useless if nobody knows it is there, or why to use it.",
 plain=[
  "Many sites already own equipment with good security features that are simply not switched on. Awareness means people understand the risks, the reasons behind the rules, and how to use the tools they have.",
  "OWASP stresses explaining rather than preaching, bringing IT and OT people together, putting security requirements into tenders, making security tests part of acceptance, and extending training to contractors and vendors who have access.",
 ],
 why=[
  "OT culture is rightly built around safety and uptime, so security can feel like an outsider's demand.",
  "A cyber attack can look like a mechanical failure, so operators need to be able to tell the difference.",
  "Contractors often have privileged access with less training than in-house staff.",
 ],
 reduce=[
  "Add security requirements to tenders and security tests to acceptance tests.",
  "Train by role, and explain why each measure protects people's daily work.",
  "Fold cybersecurity into existing safety (HSSE) programmes.",
  "Run realistic exercises where it is unclear if a fault is cyber or mechanical.",
  "Require training for third parties before granting access.",
 ],
 checklist=[
  "Our tenders include security requirements.",
  "Security testing is part of acceptance (for example at FAT or SAT).",
  "Staff get role-based training that explains the why.",
  "Contractors complete security training before getting access.",
  "We have practised a \"failure or attack?\" scenario.",
 ]),
"components-with-insufficient-security-capabilities": dict(
 n=9, title="Components/Protocols with Insufficient Security Capabilities",
 tagline="Do not build tomorrow's site on yesterday's insecure parts.",
 plain=[
  "Some equipment and protocols were designed before security was a concern: no proper login, no protection against tampered messages. Over decades, almost every OT site ends up with some of this legacy.",
  "OWASP's advice is to avoid choosing such components and protocols for new work, and to pick parts that can be updated and leave room for future security features. Where you are stuck with legacy, isolate it, watch it and add compensating controls around it.",
 ],
 why=[
  "OT lifetimes are long, so today's purchase is tomorrow's legacy.",
  "Several common industrial protocols accept any well-formed command from anyone who can reach them.",
  "There is economic pressure to reuse old kit in new projects.",
 ],
 reduce=[
  "Review the components and protocols in use and identify the legacy ones.",
  "Do not choose legacy systems or protocols for new deployments if you can avoid it.",
  "Prefer components that can be updated and support modern security features.",
  "Isolate and monitor legacy systems, and apply compensating controls.",
  "Plan replacement where possible.",
 ],
 checklist=[
  "We know which of our components and protocols lack basic security features.",
  "New purchases are checked for updatability and security features.",
  "Legacy systems are isolated from the rest of the network.",
  "Legacy systems are monitored for unusual activity.",
  "There is a replacement or compensating-control plan for each one.",
 ]),
"missing-hardening": dict(
 n=10, title="Missing Hardening",
 tagline="Switch off what you do not need, and add a few extra locks.",
 plain=[
  "Hardening does not fix a specific bug. It makes the attacker's job much harder: remove unused services, close unused ports, disable default accounts, and add extra layers like firewalls and allow-listing.",
  "OWASP included it because the data they gathered showed missing hardening was a common part of successful attacks. In OT, where you cannot always patch quickly, hardening buys you safe time.",
 ],
 why=[
  "OT systems often cannot be patched without downtime, so extra layers matter more.",
  "Maintenance work can quietly undo hardening if nobody checks afterwards.",
  "Default accounts and open interfaces (USB, Telnet, debug ports) are easy wins for attackers.",
 ],
 reduce=[
  "Use an established hardening guide (such as CIS Benchmarks or the vendor's own guide).",
  "Disable unused services and interfaces, and default accounts and passwords.",
  "Use application allow-listing where possible.",
  "Ask integrators for a hardening concept in the tender and check it at acceptance.",
  "Reapply and verify hardening after maintenance.",
 ],
 checklist=[
  "We follow a named hardening guide for our main systems.",
  "Unused services, ports and interfaces (including USB and debug) are disabled.",
  "Default accounts and passwords are disabled or changed.",
  "Hardening is checked again after every maintenance visit.",
  "Our tenders ask for documented hardening, tested at acceptance.",
 ]),
}
