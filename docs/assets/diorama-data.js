/* CyberForte OT Top 10 diorama: the single source of truth for the ten risk labels, the plain-English
   explanations, the controls that mitigate them, their hooks in the 3D model, and the Purdue levels.
   Titles, kickers and one-liners follow the client's wording (25 Oct). Edit the text here only.
   This plain script runs early and renders the scrolling step column; diorama.js (the 3D) reads the same data. */
(function () {
  "use strict";

  /* Per risk:
     where   the kicker after "OT risk n of 10 ·"
     title   the risk name
     tag     the client's one-liner
     look    what you're looking at (plain English, acronyms explained the first time they appear)
     wrong   what can go wrong
     control what stops it
     off     what changes on screen when the Security controls are switched off (toast + status line)
     hook/cam the empties in the glb; objects: parts that light up when the risk is selected; level: Purdue level */
  var RISKS = [
    { n: 1, slug: "unknown-assets-and-admin-access.html", hook: "risk_01", cam: "cam_risk_01",
      where: "Engineering workstation or maintenance PC with a supplier's 4G modem",
      title: "Unknown Assets and Unmanaged External Remote Access",
      tag: "You cannot protect what you do not know you have. You cannot protect the remote access connectivity you don't know about.",
      look: "The engineering workstation: the PC used to change how the plant runs. A supplier has plugged in a 4G modem (a mobile internet link, see the mast) so they can log in from outside.",
      wrong: "Nobody on site knows the modem is there, so nobody protects it. Anyone who finds that link is straight into the plant.",
      control: "An asset inventory (a list of everything connected) and remote access that is approved, logged and switched off when not in use.",
      off: "Controls off: the 4G modem is live and on nobody's list. The outside world reaches the engineering PC directly.",
      objects: ["engineering_workstation", "supplier_4g_modem", "beacon_mast", "mast"], level: "L2" },
    { n: 2, slug: "accessible-devices-with-known-vulnerabilities.html", hook: "risk_02", cam: "cam_risk_02",
      where: "The PLC cabinet still on old firmware",
      title: "Devices with Known Vulnerabilities/Issues",
      tag: "A published weakness is an open invitation, especially if it can be reached.",
      look: "A PLC cabinet. A PLC (programmable logic controller) is the small computer that actually switches pumps and valves. This one still runs old software.",
      wrong: "Its weakness is published online, so an attacker who can reach the cabinet knows exactly how to break in.",
      control: "Keeping track of known weaknesses, and patching the controller or shielding it when it cannot be patched.",
      off: "Controls off: the old firmware stays, and the cabinet can now be reached from the office network.",
      objects: ["plc_cabinet_02", "leds_plc"], level: "L1" },
    { n: 3, slug: "inadequate_supply_chain_management.html", hook: "risk_03", cam: "cam_risk_03",
      where: "Vulnerable supplier's equipment",
      title: "Inadequate Supplier/Supply Chain Management",
      tag: "Attackers sometimes come in through the people and equipment you trust most.",
      look: "A supplier's equipment skid in the yard (a pre-built unit delivered with its own computer inside), and the supplier's van that brought it.",
      wrong: "If the supplier's kit or laptop is already infected, the attack arrives with the delivery, through a door you trust.",
      control: "Security requirements in supplier contracts, checks on what suppliers bring in, and supervision while they work.",
      off: "Controls off: the supplier's equipment connects unchecked. Whatever it carries comes with it.",
      objects: ["supplier_skid", "supplier_van"], level: "L5" },
    { n: 4, slug: "loss-of-availability.html", hook: "risk_04", cam: "cam_risk_04",
      where: "The production line that must never stop",
      title: "Loss of Availability / Denial of Service / Sabotage",
      tag: "In OT, if it stops (or lies), people can get hurt or the Company can lose millions of $$. Imagine a power cut due to a cyber attack.",
      look: "The turbine hall, where steam turns the generator. This is the process that must never stop.",
      wrong: "A cyber attack that stops or confuses it can mean a power cut, damaged machines, or people hurt.",
      control: "Spare capacity, tested recovery plans, and systems that fail safe when something goes wrong.",
      off: "Controls off: a fault anywhere can now stop the turbine, with no backup ready to take over.",
      objects: [], level: "L0" },
    { n: 5, slug: "insufficient-access-control.html", hook: "risk_05", cam: "cam_risk_05",
      where: "The control room door and its shared code",
      title: "Insufficient Access Control",
      tag: "Shared passwords on a sticky note are not access control.",
      look: "The control room door, with a keypad code that everyone shares.",
      wrong: "A shared code cannot tell who came in. It gets passed around, written down, and never changed.",
      control: "Individual accounts and badges, and access limited to what each person actually needs.",
      off: "Controls off: the door stays open. Anyone can walk up to the operator screens.",
      objects: ["control_room_door"], level: "L2" },
    { n: 6, slug: "missing-incident-detection-reaction-capabilities.html", hook: "risk_06", cam: "cam_risk_06",
      where: "The camera and the screens nobody watches or you don't have",
      title: "Missing Incident Detection/Reaction Capabilities",
      tag: "The longer an intruder goes unnoticed, the worse it gets. What can you do, if you do notice or detect?",
      look: "The control room: operators watch the plant on these screens (SCADA, the supervisory control system). A camera watches the door.",
      wrong: "If nobody watches the screens and alarms, an intruder can work for weeks before anyone notices.",
      control: "Monitoring that raises alarms, someone whose job it is to look, and a rehearsed plan for when they do.",
      off: "Controls off: the alarm on the screens is real, but nobody is set up to notice or react.",
      objects: ["video_wall", "scada_screens"], level: "L2" },
    { n: 7, slug: "broken-zone-and-conduits-design.html", hook: "risk_07", cam: "cam_risk_07",
      where: "The wall between office IT and the plant",
      title: "Incomplete Segregation",
      tag: "Incorrect or Incomplete Segregation of IT and OT (Industrial) Environments can often lead to OT devices being compromised easily. Flat networks are bad!",
      look: "The wall between the office network (IT) and the plant network (OT, the industrial systems). In the middle is the DMZ, a buffer zone with a firewall on each side.",
      wrong: "Without that wall the network is flat: an attacker who gets into someone's email can reach the machines that run the plant.",
      control: "Zones and conduits: the network split into rooms, with controlled doorways between them.",
      off: "Controls off: the wall between office and plant is gone. An attacker in the office can now reach the plant directly.",
      objects: ["firewall_it", "firewall_ot", "dmz_walls_segmented", "dmz_walls_flat"], level: "L3.5" },
    { n: 8, slug: "missing-awareness.html", hook: "risk_08", cam: "cam_risk_08",
      where: "The untrained contractor on site",
      title: "Missing Cybersecurity Training & Awareness",
      tag: "The best lock is useless if nobody knows it is there, or why to use it. Are your employees, contractors and suppliers trained? Do they follow policies and procedures?",
      look: "A contractor on site: badge on, laptop under the arm, and nobody has told them the rules.",
      wrong: "One USB stick, one borrowed password, one phishing email, and the attacker is inside with the contractor's access.",
      control: "Short, regular training for everyone on site, and procedures that people actually follow.",
      off: "Controls off: the contractor was never trained. Whatever they plug in, the plant accepts.",
      objects: [], level: "L2" },
    { n: 9, slug: "components-with-insufficient-security-capabilities.html", hook: "risk_09", cam: "cam_risk_09",
      where: "Control protocols that cannot authenticate",
      title: "Components/Protocols with Insufficient Security Capabilities",
      tag: "Can your control systems authenticate users and devices they communicate with? Can they reject communication with unauthenticated devices?",
      look: "The control protocols: the language the controllers, pumps and sensors use to talk to each other, designed decades ago with no way to check who is speaking.",
      wrong: "Anyone on the network can send a command that looks genuine, and the controller will obey it.",
      control: "Secure versions of the protocols where possible, and compensating controls (segmentation, monitoring) where not.",
      off: "Controls off: commands from the office network reach the controllers unchecked, and they obey.",
      objects: ["plc_cabinet_02", "leds_plc"], level: "L1" },
    { n: 10, slug: "missing-hardening.html", hook: "risk_10", cam: "cam_risk_10",
      where: "The server rack with open USB ports",
      title: "Missing Endpoint Hardening",
      tag: "Switch off what you do not need, and add a few extra locks. Are your endpoints, SCADA servers, Operator workstations hardened?",
      look: "The server rack in the equipment room, with USB ports open and services nobody uses still switched on.",
      wrong: "Every open port and unused service is another way in, and a place for malware to hide.",
      control: "Hardening: switch off what is not needed, lock down USB, and keep the configuration tight.",
      off: "Controls off: the USB ports are open. Anything plugged in runs.",
      objects: ["server_rack_usb", "leds_racks"], level: "L3" }
  ];

  /* Purdue reference architecture, top to bottom. `objects` are the model parts that live on that level. */
  var PURDUE_INTRO = "The Purdue model is a way of stacking a plant's networks: the physical machines at the bottom, the cloud at the top, and a security buffer (the DMZ) in the middle. Each level only talks to its neighbours.";
  var PURDUE = [
    { id: "L5", name: "Cloud", desc: "Level 5, the cloud: services outside the site, such as the equipment vendor's support portal. Reached only through the office network.", objects: ["cloud_L5"], risks: [3] },
    { id: "L4", name: "Enterprise IT", desc: "Level 4, the office network (IT): email, ordering, payroll. Connected to the internet, and the usual way in for an attacker.", objects: [], risks: [7, 8] },
    { id: "L3.5", name: "Industrial DMZ", desc: "Level 3.5, the DMZ: a security buffer between office and plant, with a firewall on each side. Data is handed over here; nothing crosses directly.", objects: ["firewall_it", "firewall_ot", "dmz_walls_segmented"], risks: [7] },
    { id: "L3", name: "Data acquisition", desc: "Level 3, site operations: the servers that collect and store what the plant does (the equipment room).", objects: ["server_rack_usb", "leds_racks"], risks: [10, 6] },
    { id: "L2", name: "Supervisory", desc: "Level 2, supervisory: the control room screens (SCADA) and the engineering workstation that changes how the plant runs.", objects: ["video_wall", "scada_screens", "engineering_workstation"], risks: [1, 5, 6] },
    { id: "L1", name: "Control", desc: "Level 1, control: the controllers (PLCs) that switch pumps and valves, second by second.", objects: ["plc_cabinet_02", "leds_plc"], risks: [2, 9] },
    { id: "L0", name: "Sensors and actuators", desc: "Level 0, the physical process: pumps, valves, motors and sensors. If this stops or lies, people can get hurt.", objects: [], risks: [4] }
  ];

  var INTRO = {
    line: "This is a power plant (left) and its company office (right). Data flows between them along the blue lines.",
    how: "Scroll down to walk through the 10 biggest cyber risks, or tap a number.",
    toggle: "Security controls: switch the protections off to see what an attacker gets."
  };
  var TOAST = {
    off: "Controls off: the wall between office and plant is gone. An attacker in the office can now reach the plant directly.",
    on: "Controls on: office and plant are separated again by the DMZ, a buffer zone with a firewall on each side."
  };

  window.CF_OT = { risks: RISKS, purdue: PURDUE, purdueIntro: PURDUE_INTRO, intro: INTRO, toast: TOAST };

  /* ---------- render the step column (works without WebGL; the 3D module upgrades it) */
  var steps = document.getElementById("dio-steps");
  if (!steps) return;
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var arrow = '<svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var html = '<li class="dio-step dio-step-intro" data-step="0" id="dio-step-0">' +
    '<p class="sc-k">Explore the site</p><h3>Ten cyber risks are hiding in this power plant.</h3>' +
    '<p class="dio-tag">' + esc(INTRO.line) + '</p>' +
    '<p class="dio-tag"><strong>' + esc(INTRO.how) + '</strong></p>' +
    '<p class="dio-ctl dio-intro-toggle"><span class="dio-ctl-dot" aria-hidden="true"></span><span>' + esc(INTRO.toggle) + '</span></p>' +
    '<p class="dio-scroll-cue" aria-hidden="true">Scroll <span>↓</span></p></li>';
  RISKS.forEach(function (r) {
    html += '<li class="dio-step" data-step="' + r.n + '" id="risk-' + r.n + '">' +
      '<p class="sc-k">OT risk ' + r.n + ' of 10 · ' + esc(r.where) + '</p>' +
      '<h3>' + esc(r.title) + '</h3>' +
      '<p class="dio-tag">' + esc(r.tag) + '</p>' +
      '<dl class="dio-explain">' +
      '<dt>What you are looking at</dt><dd>' + esc(r.look) + '</dd>' +
      '<dt>What can go wrong</dt><dd>' + esc(r.wrong) + '</dd>' +
      '<dt>What stops it</dt><dd>' + esc(r.control) + '</dd></dl>' +
      '<p class="dio-ctl" data-ctl><span class="dio-ctl-dot" aria-hidden="true"></span><span class="dio-ctl-text">Controls on: protected.</span></p>' +
      '<p class="dio-actions"><a class="btn primary sm" href="' + esc(r.slug) + '">Read risk ' + r.n + ' ' + arrow + '</a>' +
      '<button class="link-btn dio-view" type="button" data-view="' + r.n + '">Show in 3D</button></p></li>';
  });
  html += '<li class="dio-step dio-step-purdue" data-step="11" id="purdue">' +
    '<p class="sc-k">Purdue reference architecture</p><h3>Seven levels, one site.</h3>' +
    '<p class="dio-tag">' + esc(PURDUE_INTRO) + '</p>' +
    '<p class="dio-tag dio-tag-sub">The landscape lifts away to show the layers under the site. Hover or tap a level.</p>' +
    '<ol class="dio-levels" aria-label="Purdue levels">';
  PURDUE.forEach(function (l) {
    html += '<li><button class="dio-level" type="button" data-level="' + l.id + '" aria-pressed="false"><b>' + esc(l.id) + '</b><span>' + esc(l.name) + '</span></button></li>';
  });
  html += '</ol><div class="dio-level-card" aria-live="polite"><p class="dio-level-desc">Pick a level to see what lives there and which of the ten risks touch it.</p></div></li>';
  steps.innerHTML = html;
})();
