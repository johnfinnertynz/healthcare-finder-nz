# Availability Recheck Report

Generated: 2026-05-31T20:05:30.539Z

## Current Behaviour Before This Change

Scheduled recheck previously existed: yes.

- Before this availability-freshness layer, unavailable providers were usually removed from providers.json and stored in data/monitors/provider-availability-watchlist.json.
- The weekly GitHub Actions workflow already ran tools/check-provider-availability.mjs against that watchlist and uploaded data/reports/provider-availability-monitor.json.
- Live providers did not have explicit availabilityStatus metadata, and the UI ranking did not use availability status directly.
- The link checker checked reachability only; it did not infer provider availability.

## Recheck Cadence

- not_accepting: recheck or flag every 14 days
- referrals_paused: recheck or flag every 14 days
- waitlist: recheck or flag every 30 days
- unknown / not_published: review every 90 days where practical
- accepting: review every 90 days and only use when explicit source evidence exists

Accepting is never inferred from silence. Blocked or unreachable pages create manual review items.

## Status Counts

Live providers:

- accepting: 6
- not_published: 1178
- waitlist: 30

Unavailable watchlist:

- not_accepting: 15
- referrals_paused: 5

Regions most affected by unavailable/watchlist records:

- Auckland: 1
- Canterbury: 1
- Hawke's Bay: 2
- Nelson Marlborough Tasman: 1
- Northland: 6
- Southland: 1
- Tairawhiti: 1
- Taranaki: 4
- Waikato: 2
- West Coast: 1

Findings: 3 total, 0 high (0 unallowlisted), 3 medium, 0 low.

| Severity | Provider | Region / city | Status | Checked | Issue | Suggested action | Source | Allowlisted |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| medium | hawkes-bay-janneke-van-rooijen-psychology - Janneke van Rooijen Psychology | Hawke's Bay / Napier | check_failed | 2026-05-25T02:58:53.843Z | Availability recheck could not read the source (404). | Create a manual call/email/browser review item. Do not infer accepting or unavailable from a blocked page. | https://www.jvrpsychology.com/ | no |
| medium | marlborough-durkin-zintl-psychology - Durkin Zintl Psychology | Nelson Marlborough Tasman / Blenheim and telehealth | check_failed | 2026-05-25T02:58:53.843Z | Availability recheck could not read the source (ERR). | Create a manual call/email/browser review item. Do not infer accepting or unavailable from a blocked page. | https://www.durkinzintlpsychology.co.nz/ | no |
| medium | taranaki-tosca-counselling - Tosca Lammerts van Bueren Counselling | Taranaki / New Plymouth | check_failed | 2026-05-25T02:58:53.843Z | Availability recheck could not read the source (404). | Create a manual call/email/browser review item. Do not infer accepting or unavailable from a blocked page. | https://www.counsellingnewplymouth.nz/ | no |

