/* CyberForte OT Top 10 diorama: the single source of truth for the ten risk labels, the controls that
   mitigate them, their hooks in the 3D model, and the Purdue levels. Edit the text here only.
   This plain script runs early and renders the scrolling step column; diorama.js (the 3D) reads the same data. */
(function () {
  "use strict";

  var RISKS = [
    { n: 1, slug: "unknown-assets-and-admin-access.html", hook: "risk_01", cam: "cam_risk_01",
      title: "Unknown Assets and Unmanaged External Access",
      where: "The engineering workstation with a supplier's 4G modem",
      tag: "You cannot protect what you do not know you have.",
      control: "Asset inventory and managed remote access",
      objects: ["engineering_workstation", "supplier_4g_modem"], level: "L2" },
    { n: 2, slug: "accessible-devices-with-known-vulnerabilities.html", hook: "risk_02", cam: "cam_risk_02",
      title: "Devices with Known Vulnerabilities/Issues",
      where: "The PLC cabinet still on old firmware",
      tag: "A published weakness is an open invitation, especially if it can be reached.",
      control: "Patching and vulnerability management",
      objects: ["plc_cabinet_02"], level: "L1" },
    { n: 3, slug: "inadequate_supply_chain_management.html", hook: "risk_03", cam: "cam_risk_03",
      title: "Inadequate Supplier/Supply Chain Management",
      where: "The supplier's equipment skid in the yard",
      tag: "Attackers sometimes come in through the people you trust most.",
      control: "Supplier security requirements and vetting",
      objects: ["supplier_skid"], level: "L5" },
    { n: 4, slug: "loss-of-availability.html", hook: "risk_04", cam: "cam_risk_04",
      title: "Loss of Availability",
      where: "The turbine hall that must never stop",
      tag: "In OT, if it stops (or lies), people can get hurt.",
      control: "Redundancy and tested recovery",
      objects: [], level: "L0" },
    { n: 5, slug: "insufficient-access-control.html", hook: "risk_05", cam: "cam_risk_05",
      title: "Insufficient Access Control",
      where: "The control room door and its shared code",
      tag: "Shared passwords on a sticky note are not access control.",
      control: "Individual accounts and least privilege",
      objects: ["control_room_door"], level: "L2" },
    { n: 6, slug: "missing-incident-detection-reaction-capabilities.html", hook: "risk_06", cam: "cam_risk_06",
      title: "Missing Incident Detection/Reaction Capabilities",
      where: "The video wall and the screens nobody watches",
      tag: "The longer an intruder goes unnoticed, the worse it gets.",
      control: "Monitoring and an incident response plan",
      objects: ["video_wall"], level: "L2" },
    { n: 7, slug: "broken-zone-and-conduits-design.html", hook: "risk_07", cam: "cam_risk_07",
      title: "Broken Zones and Conduits Design",
      where: "The wall between office IT and the plant",
      tag: "Split the site into rooms with controlled doorways, not one big open hall.",
      control: "Zones, conduits and an industrial DMZ",
      objects: ["firewall_it", "firewall_ot"], level: "L3.5" },
    { n: 8, slug: "missing-awareness.html", hook: "risk_08", cam: "cam_risk_08",
      title: "Missing Awareness",
      where: "The contractor on site",
      tag: "The best lock is useless if nobody knows it is there, or why to use it.",
      control: "Security awareness training for everyone on site",
      objects: [], level: "L2" },
    { n: 9, slug: "components-with-insufficient-security-capabilities.html", hook: "risk_09", cam: "cam_risk_09",
      title: "Components/Protocols with Insufficient Security Capabilities",
      where: "The control protocols that cannot authenticate",
      tag: "Do not build tomorrow's site on yesterday's insecure parts.",
      control: "Secure protocols and compensating controls",
      objects: ["plc_cabinet_02"], level: "L1" },
    { n: 10, slug: "missing-hardening.html", hook: "risk_10", cam: "cam_risk_10",
      title: "Missing Hardening",
      where: "The server rack with open USB ports",
      tag: "Switch off what you do not need, and add a few extra locks.",
      control: "Hardening: disable what is not needed",
      objects: ["server_rack_usb"], level: "L3" }
  ];

  /* Purdue reference architecture, top to bottom. `objects` are the model parts that live on that level. */
  var PURDUE = [
    { id: "L5", name: "Cloud", desc: "Vendor portals, analytics and remote support outside the site. Reached only through enterprise IT, never straight from the plant.", objects: ["cloud_L5"], risks: [3] },
    { id: "L4", name: "Enterprise IT", desc: "The office network: email, ERP and business systems. Convenient, internet-facing, and the usual way in.", objects: [], risks: [7, 8] },
    { id: "L3.5", name: "Industrial DMZ", desc: "The buffer between office IT and the plant. A firewall on each side; data is handed over here, nothing crosses directly.", objects: ["firewall_it", "firewall_ot", "dmz_walls_segmented"], risks: [7] },
    { id: "L3", name: "Data acquisition", desc: "Site operations: historians, servers and the equipment room that collect and store what the plant does.", objects: ["server_rack_usb"], risks: [10, 6] },
    { id: "L2", name: "Supervisory", desc: "The control room: operator screens, the video wall and the engineering workstation that changes how the plant runs.", objects: ["video_wall", "engineering_workstation"], risks: [1, 5, 6] },
    { id: "L1", name: "Control", desc: "PLCs and embedded controllers that run the process second by second, often speaking protocols with no authentication.", objects: ["plc_cabinet_02"], risks: [2, 9] },
    { id: "L0", name: "Sensors and actuators", desc: "Pumps, valves, motors and sensors: the physical process itself. If this stops or lies, people can get hurt.", objects: [], risks: [4] }
  ];

  window.CF_OT = { risks: RISKS, purdue: PURDUE };

  /* ---------- render the step column (works without WebGL; the 3D module upgrades it) */
  var steps = document.getElementById("dio-steps");
  if (!steps) return;
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var arrow = '<svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var html = '<li class="dio-step dio-step-intro" data-step="0" id="dio-step-0">' +
    '<p class="sc-k">Explore the site</p><h3>Ten risks are hiding in this power plant.</h3>' +
    '<p class="dio-tag">Scroll to visit them one by one, or tap a numbered marker. Drag to look around, pinch or use the buttons to zoom.</p>' +
    '<p class="dio-tag">Use the <strong>Security controls</strong> switch to see what changes when the protections are off.</p></li>';
  RISKS.forEach(function (r) {
    html += '<li class="dio-step" data-step="' + r.n + '" id="risk-' + r.n + '">' +
      '<p class="sc-k">OT risk ' + r.n + ' of 10 · ' + esc(r.where) + '</p>' +
      '<h3>' + esc(r.title) + '</h3>' +
      '<p class="dio-tag">' + esc(r.tag) + '</p>' +
      '<p class="dio-ctl" data-ctl><span class="dio-ctl-dot" aria-hidden="true"></span><span class="dio-ctl-text">Control on: ' + esc(r.control) + '</span></p>' +
      '<p class="dio-actions"><a class="btn primary sm" href="' + esc(r.slug) + '">Read risk ' + r.n + ' ' + arrow + '</a>' +
      '<button class="link-btn dio-view" type="button" data-view="' + r.n + '">Show in 3D</button></p></li>';
  });
  html += '<li class="dio-step dio-step-purdue" data-step="11" id="purdue">' +
    '<p class="sc-k">Purdue reference architecture</p><h3>Seven levels, one site.</h3>' +
    '<p class="dio-tag">The landscape lifts away to show the layers underneath. Hover or tap a level to see what lives there and which risks touch it.</p>' +
    '<ol class="dio-levels" aria-label="Purdue levels">';
  PURDUE.forEach(function (l) {
    html += '<li><button class="dio-level" type="button" data-level="' + l.id + '" aria-pressed="false"><b>' + esc(l.id) + '</b><span>' + esc(l.name) + '</span></button></li>';
  });
  html += '</ol><div class="dio-level-card" id="dio-level-card" aria-live="polite"><p class="dio-level-desc">Each level only talks to its neighbours. The DMZ in the middle is the one doorway between the office and the plant.</p></div></li>';
  steps.innerHTML = html;
})();
