# Care Finder Aotearoa

A low-barrier mental health support finder for people in Aotearoa New Zealand.

Live site: [johnfinnertynz.github.io/healthcare-finder-nz](https://johnfinnertynz.github.io/healthcare-finder-nz/)

Care Finder Aotearoa helps someone take a first step when they need support but do not know who to contact or what to say. It combines a guided intake flow, local provider search, funding guidance, and a first-contact message builder.

This project was built by [John Finnerty](https://johnfinnerty.co.nz), a software developer based in Christchurch, New Zealand.

## What It Does

- Guides people toward suitable first-contact options for mental health support in New Zealand
- Highlights urgent support paths, including 111 and 1737
- Helps users find providers by region, support need, cost barrier, and contact type
- Builds a gentle first-contact message that can be copied or sent by email
- Keeps user answers in the browser instead of requiring an account
- Documents provider data sources and import rules in [PROVIDER_DATABASE.md](PROVIDER_DATABASE.md)

## Why This Exists

Finding mental health support can be hard when someone is overwhelmed, worried about cost, unsure what kind of provider fits, or unable to explain what is happening. This project tries to make the first contact smaller, clearer, and less intimidating.

It is a navigation aid, not a diagnosis, emergency service, or replacement for professional care.

## Project Structure

```text
index.html             Static app shell and content
styles.css             Visual design and responsive layout
script.js              Guided flow, provider matching, and message builder
providers.json         Local provider and directory data
PROVIDER_DATABASE.md   Data rules, fields, and import notes
tools/                 Data import utilities
```

## Local Development

Open `index.html` directly in a browser, or serve the folder locally:

```powershell
python -m http.server 4180 -b 127.0.0.1
```

Then visit:

```text
http://127.0.0.1:4180/
```

## Data Notes

Provider data should be verified before being added. Prefer official provider pages, Healthpoint, professional body directories, Health NZ pages, or the provider's own website.

Do not add personal mobile numbers or private emails unless they are clearly published as professional contact details.

## Safety

If someone might hurt themselves or another person, or cannot stay safe, they should call 111 or go to the nearest emergency department.

For immediate mental health support in New Zealand, call or text 1737 anytime.
