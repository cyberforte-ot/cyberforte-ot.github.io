# Code-drawn line icons (24x24, stroke = currentColor). No external images.
# Keys: ENISA playbook numbers "01".."22", OWASP OT risks "ot1".."ot10".

ICONS = {
# 01 Trust boundaries and threat modelling: nodes and a dashed boundary
"01": '<rect x="2.5" y="3.5" width="11" height="17" rx="2" stroke-dasharray="2.2 2.2"/><circle cx="8" cy="8" r="2"/><circle cx="8" cy="16" r="2"/><circle cx="19" cy="12" r="2.5"/><path d="M8 10v4M10 8.6l6.8 2.4M10 15.4l6.8-2.4"/>',
# 02 Least privilege: key
"02": '<circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M21 12v2.5"/><circle cx="8" cy="12" r="1.2"/>',
# 03 Identity and authentication: ID badge
"03": '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="11" r="2.2"/><path d="M5.8 16.2c.6-1.6 1.8-2.4 3.2-2.4s2.6.8 3.2 2.4M14.5 10h4M14.5 13.5h3"/>',
# 04 Attack surface minimisation: three doors, two closed off
"04": '<rect x="3" y="5" width="5" height="14" rx="1"/><rect x="9.5" y="5" width="5" height="14" rx="1"/><rect x="16" y="5" width="5" height="14" rx="1"/><path d="M3.5 6l4 12M7.5 6l-4 12M16.5 6l4 12M20.5 6l-4 12"/><circle cx="13.2" cy="12.5" r=".6"/>',
# 05 Defence in depth: castle with layers
"05": '<path d="M4 21V9h2v2h2V9h2v2h4V9h2v2h2V9h2v12z"/><path d="M10 21v-4a2 2 0 0 1 4 0v4"/><path d="M2 21h20"/><path d="M8 4h8" stroke-dasharray="1.5 2"/>',
# 06 Open design: open book with an eye
"06": '<path d="M12 6.5C10 5 6.5 4.5 3 5v13c3.5-.5 7 0 9 1.5 2-1.5 5.5-2 9-1.5V5c-3.5-.5-7 0-9 1.5z"/><path d="M12 6.5v13"/><path d="M5.5 11.5c1-1.2 2.2-1.8 3-1.8s2 .6 3 1.8"/><circle cx="8.5" cy="11.6" r=".7"/>',
# 07 Life-cycle management: circular arrows
"07": '<path d="M20 12a8 8 0 0 1-13.7 5.6"/><path d="M4 12A8 8 0 0 1 17.7 6.4"/><path d="M17.5 2.8v3.8h-3.8M6.5 21.2v-3.8h3.8"/><circle cx="12" cy="12" r="2"/>',
# 08 User-centric design: person with a friendly cursor
"08": '<circle cx="10" cy="7" r="3"/><path d="M4 20c.8-3.6 3.2-5.5 6-5.5 1.4 0 2.7.4 3.8 1.3"/><path d="M15 12.5l6 2.3-2.7 1-1 2.7z"/>',
# 09 Secure coding: brackets with a tick
"09": '<path d="M8 6l-5 6 5 6M16 6l5 6-5 6"/><path d="M9.2 12.4l2 2 3.8-4.4"/>',
# 10 Logging and alerting: log lines and a bell
"10": '<path d="M3 5h10M3 9h10M3 13h6M3 17h5"/><path d="M14 18.5h7l-1.2-1.6V14a2.8 2.8 0 0 0-5.6 0v2.9z"/><path d="M16.3 20.5a1.2 1.2 0 0 0 2.4 0"/>',
# 11 Configuration and change: sliders
"11": '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
# 12 Incident response: siren light
"12": '<path d="M6 18v-5a6 6 0 0 1 12 0v5"/><path d="M4 18h16v3H4z"/><path d="M12 2v2M4.2 5.2l1.4 1.4M19.8 5.2l-1.4 1.4M12 10v4"/>',
# 13 Vulnerability and patch: plaster
"13": '<rect x="2.6" y="8.2" width="18.8" height="7.6" rx="3.8" transform="rotate(-35 12 12)"/><path d="M9.6 9.6l4.8 4.8" stroke-dasharray="1 2"/><circle cx="10.8" cy="12.6" r=".5"/><circle cx="13.2" cy="11.4" r=".5"/>',
# 14 Supply-chain controls: chain links
"14": '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
# 15 Minimisation of default services: toggles, most off
"15": '<rect x="3" y="4" width="10" height="5" rx="2.5"/><circle cx="5.5" cy="6.5" r="1.4"/><rect x="3" y="11" width="10" height="5" rx="2.5"/><circle cx="5.5" cy="13.5" r="1.4"/><rect x="11" y="17" width="10" height="5" rx="2.5"/><circle cx="18.5" cy="19.5" r="1.4"/><path d="M16 6.5h5M16 13.5h5"/>',
# 16 Restrictive initial access: padlock
"16": '<rect x="5" y="10.5" width="14" height="10.5" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/><path d="M12 14.5v2.5"/><circle cx="12" cy="14.3" r=".8"/>',
# 17 Secure communication: envelope with a lock
"17": '<rect x="2.5" y="5" width="15" height="11" rx="1.5"/><path d="M2.8 5.6l7.2 5.6 7.2-5.6"/><rect x="15" y="15" width="6.5" height="5.5" rx="1"/><path d="M16.5 15v-1.6a1.75 1.75 0 0 1 3.5 0V15"/>',
# 18 Unique device identity: microchip with a unique mark
"18": '<rect x="6" y="6" width="12" height="12" rx="1.5"/><path d="M9 3v3M12 3v3M15 3v3M9 18v3M12 18v3M15 18v3M3 9h3M3 12h3M3 15h3M18 9h3M18 12h3M18 15h3"/><path d="M9.5 13.8c.4-2.4 1.4-3.6 2.5-3.6s2.1 1.2 2.5 3.6M11 14c.2-1.3.6-2 1-2s.8.7 1 2"/>',
# 19 Mandatory onboarding: clipboard with steps
"19": '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M8 10l1.3 1.3L11.5 9M8 15l1.3 1.3 2.2-2.3M13.5 10.2h3M13.5 15.2h3"/>',
# 20 Automated updates: download in a cycle
"20": '<path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v4h-4"/><path d="M12 8v7M9 12.5l3 3 3-3"/>',
# 21 Transparent security posture: gauge
"21": '<path d="M3.5 17a8.5 8.5 0 1 1 17 0"/><path d="M12 17l4-5"/><circle cx="12" cy="17" r="1.4"/><path d="M6 13.5l1 .6M12 8.5v1.2M18 13.5l-1 .6"/>',
# 22 Secure recovery and ownership: handover arrows with a reset
"22": '<path d="M4 9h12l-3-3M20 15H8l3 3"/><circle cx="19" cy="7" r="2.5"/><circle cx="5" cy="17" r="2.5"/>',

# OWASP OT Top 10
"ot1": '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/><path d="M10 8.7a2 2 0 1 1 2.8 1.9c-.5.2-.8.6-.8 1.1v.4"/><circle cx="12" cy="13.6" r=".6"/>',
"ot2": '<path d="M8.5 8.5a3.5 3.5 0 0 1 7 0"/><rect x="7" y="8.5" width="10" height="11" rx="5"/><path d="M12 11v8M3 13h4M17 13h4M4 7.5l3.2 2M20 7.5l-3.2 2M4 19l3.2-2M20 19l-3.2-2"/>',
"ot3": '<path d="M2.5 6h11v10h-11z"/><path d="M13.5 9.5h4l3 3.5v3h-7"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
"ot4": '<path d="M2 12h4l2.5-6 4 12 3-9 1.5 3H22"/>',
"ot5": '<rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M8.5 6.5h7v3h-7z"/><circle cx="9" cy="13" r=".8"/><circle cx="12" cy="13" r=".8"/><circle cx="15" cy="13" r=".8"/><circle cx="9" cy="16.5" r=".8"/><circle cx="12" cy="16.5" r=".8"/><circle cx="15" cy="16.5" r=".8"/>',
"ot6": '<path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M12 2v1.5M12 20.5V22"/>',
"ot7": '<rect x="2.5" y="4" width="7" height="7" rx="1"/><rect x="14.5" y="4" width="7" height="7" rx="1"/><rect x="8.5" y="15" width="7" height="6" rx="1"/><path d="M9.5 7.5h5M6 11v2.5h6V15M18 11v2.5h-6"/>',
"ot8": '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.3 1 2.2h5.2c0-.9.4-1.7 1-2.2A6 6 0 0 0 12 3z"/><path d="M12 7v4M12 13v.2"/>',
"ot9": '<path d="M7 3v5M11 3v5"/><rect x="5" y="8" width="8" height="6" rx="1.5"/><path d="M9 14v2a4 4 0 0 0 4 4h3a3 3 0 0 0 3-3v-1"/><path d="M17 12l4 4M21 12l-4 4"/>',
"ot10": '<path d="M12 2.5l8 3v6c0 5-3.5 8.6-8 10-4.5-1.4-8-5-8-10v-6z"/><path d="M12 8v7M8.5 11.5h7"/>',
}
